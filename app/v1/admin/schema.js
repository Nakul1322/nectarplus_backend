const Joi = require("joi");
const pwd =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%#*?&])[A-Za-z\d@$!%*#?&]{8,25}$/;

const adminLogin = Joi.object().keys({
  email: Joi.string().required(),
  password: Joi.string().required(),
  deviceId: Joi.string().required(),
  deviceToken: Joi.string().required(),
  deviceType: Joi.string().required(),
});

const forgotPassword = Joi.object().keys({
  email: Joi.string().required(),
  newPassword: Joi.string().required().regex(pwd),
  confirmPassword: Joi.string().required().regex(pwd),
});

const updateAdminProfile = Joi.object().keys({
  fullName: Joi.string().optional(),
  phone: Joi.string().optional(),
  countryCode: Joi.string().optional(),
  email: Joi.string().optional(),
  password: Joi.string().optional(),
  profilePic:Joi.string().optional(),
  social:Joi.array().optional().allow('',null),
  isDeleted:Joi.boolean().optional(),
  status:Joi.number().optional(),
  createdBy:Joi.date().optional(),
  modifiedBy:Joi.date().optional()
});

module.exports = {
  adminLogin,
  forgotPassword,
  updateAdminProfile
};
