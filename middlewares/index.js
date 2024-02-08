const errorHandler = require("./error-handler");
const {
  generateAuthJwt,
  verifyAuthToken,
  isAdmin,
  isAdminCreator,
  isCreator,
  isDoctor,
  isHospital,
  isPatient,
  isDoctorHospitalAdmin,
  verifyApiKey
} = require("./auth");
const { validate } = require("./request-validator");

module.exports = {
  errorHandler,
  generateAuthJwt,
  verifyAuthToken,
  validate,
  isAdmin,
  isAdminCreator,
  isCreator,
  isDoctor,
  isHospital,
  isPatient,
  isDoctorHospitalAdmin,
  verifyApiKey
};
