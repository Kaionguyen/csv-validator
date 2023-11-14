const express = require("express");
const fs = require("fs");
const stream = require("stream");
const multer = require("multer");
const csvParser = require("csv-parser");
const axios = require("axios");

const app = express(express.json());
const PORT = process.env.PORT || 3000;
const N = 10;

const upload = multer({ storage: multer.memoryStorage() });

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
}

app.post("/upload", upload.single("sample"), (req, res) => {
    if (!req.file || req.file.mimetype !== "text/csv") {
        return res.status(400).send("Please upload a CSV file");
    } else if (req.file.size === 0) {
        return res.status(400).send("File is empty");
    }

    const requiredHeaders = ["Student_Id", "First_Name", "Last_Name", "Email", "Upload_Date", "Title_Code", "Percentage"];

    const buffer = req.file.buffer;

    let row = 1;

    stream.Readable.from(buffer)
        .pipe(csvParser())
        .on("headers", (headers) => {
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
                validateRow(data, row);
                row++;
            } catch (error) {
                return res.status(400).send(error);
            }
        })
        .on("end", () => {
            res.send("File uploaded successfully");
        });
})

app.listen(PORT, () => {
    console.log(`Server listening on ${PORT}`);
})
