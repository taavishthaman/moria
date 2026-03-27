const express = require("express");
const dotenv = require("dotenv");
const feedbackRouter = require("./routers/feedbackRoutes");
const userRouter = require("./routers/userRoutes");
const globalErrorHandler = require("./controllers/errorController");
const AppError = require("./utils/appError");

dotenv.config({ path: "./.env" });

const app = express();

app.use(express.json());

app.use("/api/v1/user", userRouter);
app.use("/api/v1/feedback", feedbackRouter);

app.all(/(.*)/, (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

app.use(globalErrorHandler);

module.exports = app;
