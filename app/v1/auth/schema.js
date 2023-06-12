const Joi = require("joi");
const pwd =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%#*?&])[A-Za-z\d@$!%*#?&]{8,25}$/;

const signUp = Joi.object().keys({
  fullName: Joi.string().required(),
  phone: Joi.string().required(),
  userType: Joi.number().required(),
  mode: Joi.number().optional()
});

const login = Joi.object().keys({
  phone: Joi.string().required(),
  userType: Joi.number().required(),
  mode: Joi.number().optional()
});

const verifyOTP = Joi.object().keys({
  phone: Joi.string().required(),
  userType: Joi.number().required(),
  otp: Joi.string().required(),
  mode: Joi.number().optional()
});

const sendOTP = Joi.object().keys({
  phone: Joi.string().required(),
  userType: Joi.number().required(),
});

const forgotPassword = Joi.object().keys({
  email: Joi.string().trim().email().lowercase().required(),
});

const resetPassword = Joi.object().keys({
  oldPassword: Joi.string().optional(),
  newPassword: Joi.string().required().regex(pwd),
});

const creatorSignup = Joi.object().keys({
  // password: Joi.string().required().regex(pwd),
  fullName: Joi.string().required(),   //.min(3).max(20)
  phone: Joi.number().required(),
  userType: Joi.number().required(),
  mode: Joi.number().required(),
  otp: Joi.object({
    phoneOtp: Joi.string().allow(null).default(null),
    emailOtp: Joi.string().allow(null).default(null),
  }),
  steps: Joi.number().optional(),
  status: Joi.number().optional(),
  actionAt: Joi.date().optional(),
  joiningDate: Joi.date().optional(),
  profilePic: Joi.string().optional(),
  gender: Joi.number().optional(),
  bloodGroup: Joi.string().optional(),
  dob: Joi.date().optional(),
  address: Joi.object({
    house: Joi.string().allow(null).default(null),
    street: Joi.string().allow(null).default(null),
    city: Joi.string().allow(null).default(null),
    state: Joi.string().allow(null).default(null),
    pincode: Joi.string().allow(null).default(null),
    coordinates: Joi.array().items(Joi.number()).optional(),
    country: Joi.string().allow(null).default(null),
  }),

});

const sendInvite = Joi.object().keys({
  name: Joi.string().trim().min(2).max(50).required(),
  email: Joi.string().trim().email().lowercase().required(),
});

const guestVerifyOtp = Joi.object().keys({
  phone: Joi.string().required(),
  otp: Joi.string().required(),
  userType: Joi.number().optional(),
});

const guestResendOtp = Joi.object().keys({
  phone: Joi.string().required(),
  userType: Joi.number().optional(),
});

module.exports = {
  signUp,
  verifyOTP,
  forgotPassword,
  resetPassword,
  login,
  sendOTP,
  creatorSignup,
  sendInvite,
  guestVerifyOtp,
  guestResendOtp
  //getEmail
};