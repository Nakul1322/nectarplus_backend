const { Router } = require("express");
const controller = require("./controller");
const { validate, verifyAuthToken, isAdmin } = require("../../../middlewares");
const schema = require("./schema");
const { uploadFiles } = require("../../../utils/multer");
const router = Router({ mergeParams: true });

router.post(
  "/import/doctor",
  verifyAuthToken,
  isAdmin,
  uploadFiles([{ name: "file", count: 1 }]),
  controller.importDataToDoctor
);

router.post(
  "/import/hospital",
  verifyAuthToken,
  isAdmin,
  uploadFiles([{ name: "file", count: 1 }]),
  controller.importDataToHospital
);

router.get(
  "/notification",
  verifyAuthToken,
  validate(schema.notificationList, "query"),
  controller.notificationList
);

router.post(
  "/",
  verifyAuthToken,
  uploadFiles([{ name: "file", count: 1 }]),
  controller.uploadFile,
  controller.addFile
);

router.get(
  "/email-exist",
  validate(schema.searchQuery, "query"),
  controller.checkEmailExists
);

router.get(
  "/medical-registration-exist",
  validate(schema.searchQuery, "query"),
  controller.medicalRegistrationExists
);

router.get(
  "/hospital-for-address",
  validate(schema.hospitalSearch, "query"),
  controller.hospitalListByAddress
);

router.post(
  "/profile-update-send-otp",
  verifyAuthToken,
  validate(schema.sendOTP),
  controller.updateProfileSendOTP
);

router.post(
  "/profile-update-verify-otp",
  verifyAuthToken,
  validate(schema.verifyOTP),
  controller.updateProfileVerifyOTP
);

router.put(
  "/notification",
  verifyAuthToken,
  controller.changeReadStatus
);

router.get(
  "/slug-for-id",
  validate(schema.slugForId, "query"),
  controller.slugForId
);

router.get(
  "/sitemap-xml",
  controller.generateSiteMap
);

module.exports = router;
