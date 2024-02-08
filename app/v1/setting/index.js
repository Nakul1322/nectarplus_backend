const { Router } = require("express");
const settingController = require("./controller");
const {
  validate,
  isDoctorHospitalAdmin,
  isDoctor,
  verifyAuthToken,
} = require("../../../middlewares");
const schema = require("./schema");

const router = Router({ mergeParams: true });


router.get("/profile", verifyAuthToken, settingController.getDoctorProfile);

router.put(
  "/profile",
  verifyAuthToken,
  validate(schema.editDoctorProfile),
  settingController.editDoctorProfile
);

router.get(
  "/record",
  verifyAuthToken,
  validate(schema.recordId, "query"),
  settingController.getDoctorSettingsByID
);

router.get(
  "/list",
  verifyAuthToken,
  validate(schema.recordList, "query"),
  settingController.getDoctorSettingsList
);

router.put(
  "/list",
  verifyAuthToken,
  validate(schema.recordId, "query"),
  validate(schema.addDoctorSettings),
  settingController.addDoctorSettings
);

module.exports = router;
