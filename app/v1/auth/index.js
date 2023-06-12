const { Router } = require("express");
const authController = require("./controller");
const { validate, verifyAuthToken, isAdmin, isAdminCreator, isCreator } = require("../../../middlewares/index");
const schema = require("./schema");

const router = Router({ mergeParams: true });

router.get("/deleteAccount", verifyAuthToken, authController.deleteAccount);

router.post(
  "/login",
  validate(schema.login),
  authController.login
);
router.post(
  "/verify-otp",
  // verifyAuthToken,
  // isAdminCreator,
  validate(schema.verifyOTP),
  authController.verifyOtp
);
router.post(
  "/resend-otp",
  // verifyAuthToken,
  // isAdminCreator,
  validate(schema.sendOTP),
  authController.resendOtp
);
router.post(
  "/signup",
  // verifyAuthToken,
  // isCreator,
  validate(schema.signUp),
  authController.signUp
);
router.post("/logout", verifyAuthToken, isAdminCreator, authController.logOut);

router.post(
  "/guest/verify-otp",
  validate(schema.guestVerifyOtp),
  authController.guestVerifyOtp
);
router.post(
  "/guest/resend-otp",
  validate(schema.guestResendOtp),
  authController.guestResendOtp
);

module.exports = router;
