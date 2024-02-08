const { Router } = require("express");
const authController = require("./controller");
const { validate, verifyAuthToken } = require("../../../middlewares/index");
const schema = require("./schema");

const router = Router({ mergeParams: true });

router.get("/delete-account", verifyAuthToken, authController.deleteAccount);

router.post("/login", validate(schema.login), authController.login);

router.post(
  "/verify-otp",
  validate(schema.verifyOTP),
  authController.verifyOtp
);

router.post("/resend-otp", verifyAuthToken, validate(schema.sendOTP), authController.resendOtp);

router.post("/signup", validate(schema.signUp), authController.signUp);

router.post("/logout", verifyAuthToken, authController.logOut);

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

router.post("/check-number", authController.checkNumber);

router.post(
  "/get-otp-via-call",
  validate(schema.sendOTP),
  authController.getOTPViaCall
);

module.exports = router;
