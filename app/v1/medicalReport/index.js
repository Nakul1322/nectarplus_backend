const { Router } = require("express");
const medicalReportsController = require("./controller");
const { validate, verifyAuthToken } = require("../../../middlewares/index");
const schema = require("./schema");

const router = Router({ mergeParams: true });

router.get(
  "/all-medical-reports",
  verifyAuthToken,
  validate(schema.getAllMedicalReports, "query"),
  medicalReportsController.allMedicalReports
);

router.delete(
  "/report/:id",
  verifyAuthToken,
  validate(schema.reportId, "params"),
  medicalReportsController.medicalReportsDelete
);

router.post(
  "/",
  verifyAuthToken,
  medicalReportsController.addMedicalReports
);

router.get(
  "/:id",
  verifyAuthToken,
  validate(schema.reportId, "params"),
  medicalReportsController.findMedicalReports
);

router.put(
  "/:id",
  verifyAuthToken,
  validate(schema.reportId, "params"),
  medicalReportsController.medicalReportsUrlUpdate
); 

router.delete(
  "/:id",
  verifyAuthToken,
  validate(schema.reportId, "params"),
  medicalReportsController.medicalReportsUrlDelete
);

module.exports = router;
