const express = require("express");
const stream = require("stream");
const multer = require("multer");
const csvParser = require("csv-parser");
const axios = require("axios");

const app = express(express.json());
const PORT = process.env.PORT || 3000;
const URL = "https://httpbin.org/post";
const upload = multer({ storage: multer.memoryStorage() });
let transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL,
        pass: process.env.PASSWORD,
    }
});

// Validate each row of the CSV file
function validateRow(data, index) {
    if (Object.keys(data).length !== 7) {
        throw `Invalid number of columns at row ${index + 1}`;
    }

    const studentId = parseInt(data.Student_Id);
    const regex = /^[a-zA-Z]+$/;
    const emailRegex = /^[a-zA-Z0-9]+@[a-zA-Z0-9]+\.[a-zA-Z]{2,4}$/;
    const uploadDate = new Date(data.Upload_Date);
    const titleCode = parseInt(data.Title_Code);
    const percentage = parseFloat(data.Percentage);
    const cleanData = {};

    if (studentId != data.Student_Id || data.Student_Id.split(".").length > 1) {
        throw `Invalid Student_Id at row ${index + 1}`;
    }

    if (regex.test(data.First_Name) === false) {
        throw `Invalid First_Name at row ${index + 1}`;
    }

    if (regex.test(data.Last_Name) === false) {
        throw `Invalid Last_Name at row ${index + 1}`;
    }

    if (emailRegex.test(data.Email) === false) {
        throw `Invalid Email at row ${index + 1}`;
    }

    if (isNaN(uploadDate.getTime())) {
        throw `Invalid Upload_Date at row ${index + 1}`;
    }

    if (titleCode != data.Title_Code || data.Title_Code.split(".").length > 1) {
        throw `Invalid Title_Code at row ${index + 1}`;
    }

    if (percentage.toFixed(2) != data.Percentage || percentage < 0.00 || percentage > 1.00) {
        throw `Invalid Percentage at row ${index + 1}`;
    }

    cleanData.Student_Id = studentId;
    cleanData.First_Name = data.First_Name;
    cleanData.Last_Name = data.Last_Name;
    cleanData.Email = data.Email;
    cleanData.Upload_Date = uploadDate;
    cleanData.Title_Code = titleCode;
    cleanData.Percentage = percentage;

    return cleanData;
}

function sendEmail (statusCode, message){
    const status = statusCode === 200 ? "Success" : "Partial Failure";
    let mailOptions = {
        from: process.env.EMAIL,
        to: process.env.SYSTEM_ADMIN_EMAIL,
        subject: `CSV Upload ${status}`,
        text: message
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.log(error);
        } else {
            console.log(`Email sent: ${info.response}`)
        }
    });
}

// Handle POST request
app.post("/upload", upload.single("sample"), (req, res) => {
    if (!req.file || req.file.mimetype !== "text/csv") {
        return res.status(400).send("Please upload a CSV file");
    } else if (req.file.size === 0) {
        return res.status(400).send("File is empty");
    }

    const requiredHeaders = ["Student_Id", "First_Name", "Last_Name", "Email", "Upload_Date", "Title_Code", "Percentage"];
    const buffer = req.file.buffer;
    const cleanedData = [];
    const N = 10;
    let row = 1;

    stream.Readable.from(buffer)
        .pipe(csvParser())
        .on("headers", (headers) => {
            // Compare parsed headers with required headers
            for (let i = 0; i < headers.length; i++) {
                if (headers[i] !== requiredHeaders[i]) {
                    return res.status(400).send("Invalid CSV headers");
                }
            }
        })
        .on("data", (data) => {
            try {
                if (row >= N) {
                    return res.status(400).send(`Only ${N} rows are allowed`);
                }

                // Store cleaned data in an array
                cleanedData.push(validateRow(data, row));

                row++;
            } catch (error) {
                return res.status(400).send(error);
            }
        }).on("end", async () => {
            for (let i = 0; i < cleanedData.length; i++) {
                try {
                    await axios.post(URL, cleanedData[i]);
                } catch (error) {
                    sendEmail(error.response.status, `Error sending row ${i + 1}`);
                    return res.status(500).send(`Error sending row ${i + 1}`);
                }
            }
            sendEmail(200, "All rows sent successfully");
            return res.status(200).send("File uploaded successfully");
        })
})

app.listen(PORT, () => {
    console.log(`Server listening on ${PORT}`);
})
