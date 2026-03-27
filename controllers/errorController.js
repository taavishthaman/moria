const AppError = require("../utils/appError");

const sendErrorDev = (err, res) => {
  res.status(err.statusCode).json({
    status: err.status,
    error: err,
    meesage: err.message,
    stack: err.stack,
  });
};

const handlePrismaClientKnownRequestErrorDB = (err) => {
  const message = err.meta.message;
  return new AppError(message, 400);
};

const handleDuplicateFieldsErrorDB = (err) => {
  const message = `Duplicate field value: ${err.meta.target[0]}. Please use another value!`;
  return new AppError(message, 400);
};

const handlePrismaClientValidationErrorDB = () => {
  const message = "Invalid request data";
  return new AppError(message, 400);
};

const sendErrorProd = (err, res) => {
  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
    });
  } else {
    //Generic error message
    res.status(500).json({
      status: "err",
      message: "Something went very wrong!",
    });
  }
};

module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || "error";

  if (process.env.NODE_ENV === "development") {
    sendErrorDev(err, res);
  } else if (process.env.NODE_ENV === "production") {
    let error = { ...err, name: err.name };

    if (error.code === "P2002") {
      error = handleDuplicateFieldsErrorDB(error);
    } else if (error.name === "PrismaClientKnownRequestError") {
      error = handlePrismaClientKnownRequestErrorDB(error);
    } else if (error.name === "PrismaClientValidationError") {
      error = handlePrismaClientValidationErrorDB();
    }

    sendErrorProd(error, res);
  }
};
