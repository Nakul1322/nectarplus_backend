const users = require("./user");
const common = require("./common");
const doctor = require("./doctor");
const appointmentService = require("./appointment")
const patient = require('./patient')
const hospital = require("./hospital");
const notification = require("./notification");
const surgery =  require("./surgery")
const adminService = require("./admin");

module.exports = {
  users,
  common,
  appointmentService,
  patient,
  doctor,
  hospital,
  notification,
  surgery,
  adminService
};
