const Joi = require("joi");
const { constants } = require("../../../utils/constant");
const {
  search,
  page,
  size,
  sort,
  sortOrder,
  _id,
  id,
} = require("../../../utils/validation");

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

const updatePassword = Joi.object().keys({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string().required().regex(pwd),
  confirmPassword: Joi.string().required().regex(pwd),
});

const updateAdminProfile = Joi.object().keys({
  fullName: Joi.string().optional(),
  phone: Joi.string().length(10).pattern(constants.regexForMobile),
  countryCode: Joi.string().default("India").optional(),
  email: Joi.string().optional(),
  password: Joi.string().optional(),
  profilePic: Joi.string().optional(),
  social: Joi.array().optional().allow("", null),
  isDeleted: Joi.boolean().optional(),
  status: Joi.number().optional(),
  createdBy: Joi.date().optional(),
  modifiedBy: Joi.date().optional(),
});

const userTypeList = Joi.object({
  status: Joi.number().valid(
    constants.USER_STATUS_LIST.DELETE,
    constants.USER_STATUS_LIST.REJECT,
    constants.USER_STATUS_LIST.INACTIVE
  ),
  search,
  page,
  size,
  sort,
  sortOrder,
});

const feedbackList = Joi.object({
  status: Joi.number()
    .valid(
      constants.PROFILE_STATUS.PENDING,
      constants.PROFILE_STATUS.APPROVE,
      constants.PROFILE_STATUS.REJECT
    )
    .required(),
  totalPoint: Joi.number().min(0).max(5).default(0),
  page,
  size,
  sort,
  sortOrder,
});

const feedbackId = Joi.object({
  feedbackId: id,
});

const editFeedback = Joi.object({
  status: Joi.number().valid(
    constants.PROFILE_STATUS.APPROVE,
    constants.PROFILE_STATUS.REJECT
  ),
  reason: Joi.string().trim().default(null),
  isDeleted: Joi.boolean().valid(true),
});

const userDocumentDetails = Joi.object({
  id,
});

const addSocial = Joi.object().keys({
  socialMediaId: _id,
  url: Joi.string().trim().uri(),
});

const updateSocial = Joi.object().keys({
  socialMediaId: _id,
  url: Joi.string().trim().uri(),
});

const deleteSocial = Joi.object().keys({
  id: Joi.string().optional(),
});

const findSocial = Joi.object().keys({
  id: Joi.string().optional(),
});

const dashboardCount = Joi.object({
  startDate: Joi.date().required(),
  endDate: Joi.date().required(),
});

const dashboardAppointmentCount = Joi.object({
  startDate: Joi.date().required(),
  endDate: Joi.date().required(),
  specialization: Joi.array().items(_id).default([]),
  doctors: Joi.array().items(_id).default([]),
  hospitals: Joi.array().items(_id).default([]),
  surgeryTypes: Joi.array().items(_id).default([]),
  typeOfList: Joi.number()
    .valid(...Object.values(constants.ADMIN_DASHBOARD_TYPE_LIST))
    .required(),
});

const appointmentSpecializationListByDateRange = Joi.object({
  startDate: Joi.date().required(),
  endDate: Joi.date().required(),
  specialization: Joi.array().items(_id),
  doctors: Joi.array().items(_id),
  hospitals: Joi.array().items(_id),
});

module.exports = {
  adminLogin,
  forgotPassword,
  updatePassword,
  updateAdminProfile,
  userTypeList,
  feedbackList,
  editFeedback,
  feedbackId,
  userDocumentDetails,
  addSocial,
  updateSocial,
  deleteSocial,
  findSocial,
  dashboardCount,
  dashboardAppointmentCount,
  appointmentSpecializationListByDateRange
};
