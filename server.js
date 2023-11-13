const express = require("express");
const fs = require("fs");
const stream = require("stream");
const multer = require("multer");
const csvParser = require("csv-parser");
const axios = require("axios");

const app = express(express.json());
const PORT = process.env.PORT || 3000;

const upload = multer({ storage: multer.memoryStorage() });

app.post("/upload", upload.single("sample"), (req, res) => {
    if (!req.file || req.file.mimetype !== "text/csv") {
        return res.status(400).send("Please upload a CSV file");
    } else if (req.file.size === 0) {
        return res.status(400).send("File is empty");
    }

    const buffer = req.file.buffer;

    stream.Readable.from(buffer.toString("utf8"))
        .pipe(csvParser())
        .on("data", (data) => {
            console.log(data);
        })
        .on("end", () => {
            console.log("CSV file successfully processed");
        });
    res.send("File uploaded successfully");
})

app.listen(PORT, () => {
    console.log(`Server listening on ${PORT}`);
})
