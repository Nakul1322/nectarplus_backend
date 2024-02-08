const { Router } = require("express");
const patientController = require("./controller");
const { validate, isAdmin, isAdminCreator, verifyAuthToken } = require("../../../middlewares");
const schema = require("./schema");

const router = Router({ mergeParams: true });

router.get(
  "/homepage",
  validate(schema.commonList, 'query'),
  patientController.homepageSuggestionList
);

router.get(
  "/feedback/list",
  verifyAuthToken,
  validate(schema.feedbackList, 'query'),
  patientController.patientFeedbackHistory
);

router.get(
  "/admin",
  verifyAuthToken,
  isAdmin,
  validate(schema.patientList, 'query'),
  patientController.patientList
);

router.get(
  "/doctor/list",
  verifyAuthToken,
  validate(schema.getPatientList, 'query'),
  patientController.getPatientList
);

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

router.get(
  "/doctor/appointment/list",
  verifyAuthToken,
  validate(schema.patientAppointmentList, 'query'),
  patientController.patientAppointmentList
);

router.get(
  "/doctor/record",
  verifyAuthToken,
  validate(schema.patientId, 'query'),
  patientController.getPatientData
);

router.put(
  "/doctor/record",
  verifyAuthToken,
  validate(schema.patientId, 'query'),
  patientController.editPatientData
);

router.get(
  "/hospital",
  verifyAuthToken,
  validate(schema.hospitalPatientList, 'query'),
  patientController.hospitalPatientList
);

router.get(
  "/hospital/appointment-list",
  verifyAuthToken,
  validate(schema.hospitalAppointmentList, 'query'),
  patientController.hospitalAppointmentLists
);

router.get(
  "/hospital/history",
  verifyAuthToken,
  validate(schema.historyRecord, 'query'),
  patientController.patientHistoryRecordHospital
);

router.get(
  "/profile",
  verifyAuthToken,
  patientController.patientProfile
);

router.put(
  "/profile",
  validate(schema.editPatientData),
  verifyAuthToken,
  patientController.patientEditProfile
);

router.get(
  "/establishment-details",
  validate(schema.recordId, 'query'),
  patientController.establishmentDetails
);

module.exports = router;
