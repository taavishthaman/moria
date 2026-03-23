const express = require("express");
const dotenv = require("dotenv");
const feedbackRouter = require("./routers/feedbackRoutes");

dotenv.config({ path: "./.env" });

const app = express();

app.use(express.json());

app.use("/api/v1/feedback", feedbackRouter);

module.exports = app;
