const { Router } = require("express");
const patientController = require("./controller");
const { validate, isAdmin, isAdminCreator, verifyAuthToken } = require("../../../middlewares");
const schema = require("./schema");

const router = Router({ mergeParams: true });

// Admin module

router.get(
  "/admin",
  // isAdmin,
  validate(schema.patientList, 'query'),
  patientController.patientList
);

// Doctor module

// Patient side list
router.get(
  "/doctor/list",
  verifyAuthToken,
  validate(schema.getPatientList, 'query'),
  patientController.getPatientList
);

// crud for patientClinicalRecords - missing edit n delete

router.get(
  "/doctor/appointment/record",
  verifyAuthToken,
  validate(schema.appointmentId, 'query'),
  patientController.getPatientRecord
);

router.post(
  "/doctor/appointment/record",
  verifyAuthToken,
  validate(schema.appointmentId, 'query'),
  validate(schema.addPatientRecord),
  patientController.addPatientRecord
)

// Patient Appointment List
router.get(
  "/doctor/appointment/list",
  verifyAuthToken,
  validate(schema.patientId, 'query'),
  patientController.patientAppointmentList
);

// Get patient record
router.get(
  "/doctor/record",
  verifyAuthToken,
  validate(schema.patientId, 'query'),
  patientController.getPatientData
);

// Doctor edit patient data

router.put(
  "/doctor/record",
  verifyAuthToken,
  validate(schema.patientId, 'query'),
  patientController.editPatientData
);

// router.put(
//   "/doctor/appointment/record",
//   isDoctor,
//   validate(schema.appointmentId, 'query'),
//   validate(schema.editPatientRecord),
//   patientController.editPatientRecord
// );

//  Hospital Module - patient listing
router.get(
  "/hospital",
  // isAdmin,
  validate(schema.hospitalPatientList, 'query'),
  patientController.hospitalPatientList
);


module.exports = router;
