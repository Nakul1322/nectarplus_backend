const Joi = require("joi");
const { constants } = require("../../../utils/constant");

const pwd =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%#*?&])[A-Za-z\d@$!%*#?&]{8,25}$/;

const signUp = Joi.object().keys({
  fullName: Joi.string().required(),
  phone: Joi.string().length(10).pattern(constants.regexForMobile).required(),
  userType: Joi.number().required(),
  mode: Joi.number().optional(),
  countryCode: Joi.string().trim().default("+91"),
});

const login = Joi.object().keys({
  phone: Joi.string().length(10).pattern(constants.regexForMobile).required(),
  userType: Joi.number().required(),
  mode: Joi.number().optional(),
  countryCode: Joi.string().trim().default("+91"),
});

const verifyOTP = Joi.object().keys({
  phone: Joi.string().length(10).pattern(constants.regexForMobile).required(),
  userType: Joi.number().required(),
  otp: Joi.string().required(),
  mode: Joi.number().optional(),
  countryCode: Joi.string().trim().default("+91"),
  deviceId: Joi.string().trim().default(null),
  deviceToken: Joi.string().trim().default(null),
  deviceType: Joi.string().trim().default(constants.DEVICE_TYPE.DESKTOP),
  browser: Joi.string().trim().default(null),
  os: Joi.string().trim().default(null),
  osVersion: Joi.string().trim().default(null),
});

const sendOTP = Joi.object().keys({
  phone: Joi.string().length(10).pattern(constants.regexForMobile),
  userType: Joi.number().required(),
  countryCode: Joi.string().trim().default("+91"),
  email: Joi.string().trim().lowercase(),
  isLogin: Joi.boolean().default(true),
});

const forgotPassword = Joi.object().keys({
  email: Joi.string().trim().lowercase().required(),
});

const resetPassword = Joi.object().keys({
  oldPassword: Joi.string().optional(),
  newPassword: Joi.string().required().regex(pwd),
});

const sendInvite = Joi.object().keys({
  name: Joi.string().trim().min(2).max(50).required(),
  email: Joi.string().trim().lowercase().required(),
});

const guestVerifyOtp = Joi.object().keys({
  phone: Joi.string().length(10).pattern(constants.regexForMobile).required(),
  otp: Joi.string().required(),
  userType: Joi.number().optional(),
  countryCode: Joi.string().trim().default("+91"),
});

const guestResendOtp = Joi.object().keys({
  phone: Joi.string().length(10).pattern(constants.regexForMobile).required(),
  userType: Joi.number().optional(),
  countryCode: Joi.string().trim().default("+91"),
});

module.exports = {
  signUp,
  verifyOTP,
  forgotPassword,
  resetPassword,
  login,
  sendOTP,
  sendInvite,
  guestVerifyOtp,
  guestResendOtp,
};
