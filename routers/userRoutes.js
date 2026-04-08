const express = require("express");
const authController = require("../controllers/authController");

const router = express.Router();

router.post("/signup", authController.signup);
router.post("/login", authController.login);
router.post("/forgotPassword", authController.forgotPassword);
router.patch("/resetPassword/:token", authController.resetPassword);

router.get("/me", authController.protect, authController.isLoggedIn);

router.post(
  "/updateMyPassword",
  authController.protect,
  authController.updatePassword,
);

module.exports = router;
