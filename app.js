const express = require("express");
const morgan = require("morgan");
const dotenv = require("dotenv");
const rateLimit = require("express-rate-limit");
const mongoSanitize = require("express-mongo-sanitize");
const helmet = require("helmet");
const xss = require("xss-clean");
const feedbackRouter = require("./routers/feedbackRoutes");
const userRouter = require("./routers/userRoutes");
const categoryRouter = require("./routers/catgeoryRoutes");
const globalErrorHandler = require("./controllers/errorController");
const AppError = require("./utils/appError");

dotenv.config({ path: "./.env" });

const app = express();

//1) GLOBAL MIDDLEWARES
app.use(helmet());

//Development logging
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

//Limit requests from the same API
const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000,
  message: "Too many requests from this IP, please try again in an hour!",
});

app.use("/api", limiter);

//Body parser, reading data from body into req.body
app.use(
  express.json({
    limit: "10kb",
  }),
);

//Data sanitization against noSQL query injection
//app.use(mongoSanitize());

// Data sanitization against XSS attacks
//app.use(xss());

app.use("/api/v1/user", userRouter);
app.use("/api/v1/feedback", feedbackRouter);
app.use("/api/v1/category", categoryRouter);

app.all(/(.*)/, (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

app.use(globalErrorHandler);

module.exports = app;
