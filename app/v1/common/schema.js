const Joi = require("joi");
const { constants } = require("../../../utils/constant");
const {
  search,
  page,
  size,
  sort,
  sortOrder,
  id,
  isExport,
} = require("../../../utils/validation");

const notificationList = Joi.object({
  page,
  size,
  type: Joi.number().valid(...Object.values(constants.NOTIFICATION_TYPE)),
});

const type = Joi.number()
  .valid(...Object.values(constants.MASTER_DATA))
  .required();

const searchQuery = Joi.object({
  search,
});

const hospitalSearch = Joi.object({
  search,
  page,
  size,
  sort,
  sortOrder,
});

const masterList = Joi.object({
  search,
  page,
  size,
  sort,
  sortOrder,
  type,
  isExport,
});

const recordId = Joi.object({ id });

const masterData = Joi.object({ type });

const sendOTP = Joi.object({
  phone: Joi.string().length(10).pattern(constants.regexForMobile).trim(),
  email: Joi.string().trim().lowercase(),
  countryCode: Joi.string().trim().default("+91"),
});

const verifyOTP = Joi.object({
  phone: Joi.string().length(10).pattern(constants.regexForMobile).trim(),
  otp: Joi.string().required(),
  email: Joi.string().trim().lowercase(),
  countryCode: Joi.string().trim().default("+91"),
  deviceId: Joi.string().trim().default("test101"),
  deviceToken: Joi.string().trim().default("test1234567899"),
  deviceType: Joi.string().trim().default("web"),
  browser: Joi.string().trim().default(null),
  os: Joi.string().trim().default(null),
  osVersion: Joi.string().trim().default(null),
});

const doctorBulkImport = Joi.object({
  Name: Joi.string().trim().required(),
  Phone: Joi.string().length(10).pattern(constants.regexForMobile).required(),
  Specialization: Joi.string().trim().required(),
  Gender: Joi.string().trim().required(),
  RegistrationNumber: Joi.string().trim().required(),
  RegistrationCouncil: Joi.string().trim().required(),
  RegistrationYear: Joi.string().trim().required(),
  Degree: Joi.string().trim().required(),
  College: Joi.string().trim().required(),
  YearOfCompletion: Joi.string().trim().required(),
  Experience: Joi.string().trim().required(),
  Owner: Joi.string().trim().required(),
  EstablishmentName: Joi.string().trim().min(1).max(100).required(),
  HospitalType: Joi.string().trim().required(),
  Street: Joi.string().trim().required(),
  Locality: Joi.string().trim().required(),
  City: Joi.string().trim().required(),
  State: Joi.string().trim().required(),
  Pincode: Joi.string()
    .length(6)
    .pattern(constants.REGEX_FOR_PINCODE)
    .trim()
    .required(),
  Country: Joi.string().trim().default("India"),
  ChangePhone: Joi.string().length(10).pattern(constants.regexForMobile),
});

const hospitalBulkImport = Joi.object({
  Name: Joi.string().trim().required(),
  Phone: Joi.string().length(10).pattern(constants.regexForMobile).required(),
  Specialization: Joi.string().trim().required(),
  Gender: Joi.string().trim().required(),
  RegistrationNumber: Joi.string().trim().required(),
  RegistrationCouncil: Joi.string().trim().required(),
  RegistrationYear: Joi.string().trim().required(),
  Degree: Joi.string().trim().required(),
  College: Joi.string().trim().required(),
  YearOfCompletion: Joi.string().trim().required(),
  Experience: Joi.string().trim().required(),
  Owner: Joi.string().trim().required(),
  EstablishmentName: Joi.string().trim().min(1).max(100).required(),
  HospitalType: Joi.string().trim().required(),
  Street: Joi.string().trim().required(),
  Locality: Joi.string().trim().required(),
  City: Joi.string().trim().required(),
  State: Joi.string().trim().required(),
  Pincode: Joi.string()
    .length(6)
    .pattern(constants.REGEX_FOR_PINCODE)
    .trim()
    .required(),
  Country: Joi.string().trim().default("India"),
  ChangePhone: Joi.string().length(10).pattern(constants.regexForMobile),
});

const slugForId = Joi.object({
  profileSlug: Joi.string().trim(),
  city: Joi.string().trim(),
});

module.exports = {
  masterList,
  masterData,
  recordId,
  notificationList,
  searchQuery,
  hospitalSearch,
  sendOTP,
  verifyOTP,
  hospitalBulkImport,
  doctorBulkImport,
  slugForId,
};
