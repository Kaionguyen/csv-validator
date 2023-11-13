const express = require("express");
const fs = require("fs");
const stream = require("stream");
const multer = require("multer");
const csvParser = require("csv-parser");
const axios = require("axios");

const app = express(express.json());
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server listening on ${PORT}`);
})
