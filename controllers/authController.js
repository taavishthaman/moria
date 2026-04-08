const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const { promisify } = require("util");
const prisma = require("../lib/prisma");
const APIFeatures = require("../utils/apiFeatures");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const sendEmail = require("../utils/email");

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user.user_id);

  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000,
    ),
    httpOnly: true,
  };

  if (process.env.NODE_ENV === "production") {
    cookieOptions.secure = true;
  }

  res.cookie("jwt", token, cookieOptions);

  user.password = undefined;

  res.status(statusCode).json({
    status: "success",
    token,
    data: {
      user,
    },
  });
};

const checkCorrectPassword = async (candidatePassword, userPassword) => {
  return await bcrypt.compare(candidatePassword, userPassword);
};

const changedPasswordAfter = function (user, JWTTimestamp) {
  if (user.password_changed_at) {
    const changedTimestamp = parseInt(
      user.password_changed_at.getTime() / 1000,
      10,
    );

    return JWTTimestamp < changedTimestamp;
  }

  return false;
};

const createPasswordResetToken = () => {
  const resetToken = crypto.randomBytes(32).toString("hex");
  const passwordResetToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  const passwordResetExpires = Date.now() + 10 * 60 * 1000;

  return {
    resetToken,
    passwordResetToken,
    passwordResetExpires,
  };
};

exports.signup = catchAsync(async (req, res, next) => {
  //Check if password matches passwordConfirm
  const { password, passwordConfirm } = req.body;
  if (!password || !passwordConfirm || password !== passwordConfirm) {
    return next(new AppError("Passwords do not match", 400));
  }

  const encryptedPassword = await bcrypt.hash(password, 12);

  const newUser = await prisma.user.create({
    data: {
      name: req.body.name,
      username: req.body.username,
      email: req.body.email,
      password: encryptedPassword, //Needs to be encrypted
    },
  });

  createSendToken(newUser, 201, res);
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  //1) Check if email and password are sent in the request
  if (!email || !password) {
    return next(new AppError("Please provide email and password", 400));
  }

  //2) Check if user exists and password is correct
  const user = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (!user || !(await checkCorrectPassword(password, user.password))) {
    return next(new AppError("Email or password is incorrect!", 401));
  }

  //3) If everything is good, send token to the client
  createSendToken(user, 200, res);
});

exports.protect = catchAsync(async (req, res, next) => {
  //1) Getting the token and check if it exists
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return next(
      new AppError("You are not logged in! Please login to get access.", 401),
    );
  }

  //2) Verify the token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  //3) Check if user still exists
  const currentUser = await prisma.user.findUnique({
    where: {
      user_id: decoded.id,
    },
  });

  if (!currentUser) {
    return next(
      new AppError("The user belonging to this token no longer exists!", 401),
    );
  }

  //4) Check if user changed password after the token was issued
  if (changedPasswordAfter(currentUser, decoded.iat)) {
    return next(
      new AppError("User currently changed password! Please login again!", 401),
    );
  }

  req.user = currentUser;
  next();
});

exports.isLoggedIn = catchAsync(async (req, res, next) => {
  if (req.headers.authorization) {
    const decoded = await promisify(jwt.verify)(
      req.headers.authorization.split(" ")[1],
      process.env.JWT_SECRET,
    );

    const currentUser = await prisma.user.findUnique({
      where: {
        user_id: decoded.id,
      },
    });

    if (!currentUser) {
      return next(
        new AppError("The user belonging to this token no longer exists!", 401),
      );
    } else {
      const currentUserCopy = {
        ...currentUser,
        password: null,
        password_changed_at: null,
        password_reset_token: null,
        password_reset_expires: null,
      };
      res.locals.user = currentUserCopy;
      res.status(200).json({
        status: "success",
        data: {
          currentUserCopy,
        },
      });
    }
  } else {
    return next(new AppError("JWT token is missing or invalid", 401));
  }
});

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    console.log(req.user);
    if (!roles.includes(req.user.user_role)) {
      return next(
        new AppError("You do not have permissions to perform this action", 403),
      );
    }

    next();
  };
};

exports.forgotPassword = catchAsync(async (req, res, next) => {
  //1) Get User based on posted email
  const user = await prisma.user.findUnique({
    where: {
      email: req.body.email,
    },
  });

  if (!user) {
    return next(new AppError("There is no user with that email address", 404));
  }

  //2) Generate the random reset token
  const { resetToken, passwordResetToken, passwordResetExpires } =
    createPasswordResetToken();

  await prisma.user.update({
    where: {
      email: req.body.email,
    },
    data: {
      password_reset_token: passwordResetToken,
      password_reset_expires: new Date(passwordResetExpires),
    },
  });

  //3) Send it to user's email
  const resetURL = `${req.protocol}://${req.get("host")}/api/v1/users/resetPassword/${resetToken}`;
  const message = `Forgot your password? Submit a PATCH request with your new password and passwordConfirm to: ${resetURL}.\n If you didn't forget your password, please ignore this email`;

  try {
    await sendEmail({
      email: req.body.email,
      subject: "Your password reset token (valid for 10 minutes)",
      message,
    });

    res.status(200).json({
      status: "success",
      message: "Token sent to the email!",
    });
  } catch (err) {
    await prisma.user.update({
      where: {
        email: req.body.email,
      },
      data: {
        password_reset_token: null,
        password_reset_expires: null,
      },
    });

    return next(
      new AppError("There was an error sending this email. Try again later!"),
      500,
    );
  }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  //1) Get user based on the token
  const hashedToken = crypto
    .createHash("sha256")
    .update(req.params.token)
    .digest("hex");

  const user = await prisma.user.findFirst({
    where: {
      password_reset_token: hashedToken,
      password_reset_expires: {
        gte: new Date(),
      },
    },
  });

  //2) If the token has not expired and there is a user, check if password and passwordConfirm match, encrypt the password and set the new password
  if (!user) {
    return next(new AppError("Token is invalid or has expired!", 400));
  }

  const { password, passwordConfirm } = req.body;

  if (!password || !passwordConfirm || password !== passwordConfirm) {
    return next(new AppError("Passwords do not match", 400));
  }

  const encryptedPassword = await bcrypt.hash(password, 12);

  const updatedUser = await prisma.user.update({
    where: {
      email: user.email,
    },
    data: {
      password: encryptedPassword,
      password_reset_token: null,
      password_reset_expires: null,
    },
  });

  createSendToken(updatedUser, 200, res);
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  //Check if password matches passwordConfirm
  const { password, passwordConfirm } = req.body;
  if (!password || !passwordConfirm || password !== passwordConfirm) {
    return next(new AppError("Passwords do not match", 400));
  }

  //1) Get user from the table
  const user = await prisma.user.findUnique({
    where: {
      user_id: req.user.user_id,
    },
  });

  //2) Check if POSTed current password is correct
  if (!(await checkCorrectPassword(req.body.passwordCurrent, user.password))) {
    return next(new AppError("The current password is wrong!", 401));
  }

  //3) If so update the password
  const encryptedPassword = await bcrypt.hash(req.body.password, 12);
  await prisma.user.update({
    where: {
      user_id: req.user.user_id,
    },
    data: {
      password: encryptedPassword,
      password_changed_at: new Date(),
    },
  });

  //4) Log user in, send JWT
  createSendToken(user, 200, res);
});
