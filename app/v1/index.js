const { Router } = require("express");
const { verifyAuthToken } = require("../../middlewares");

const authController = require("./auth");
const doctorController = require("./doctor");
const patientController = require("./patient");
const adminController = require("./admin");
const faqController = require("./faq");
const feedbackController = require("./feedback");
const appointmentController = require("./appointment");
const cityController = require("./city");
const stateController = require("./state");
const contactUsController = require("./contactus");
const videoController = require("./videos");
const hospitalController = require("./hospital");
const medicalReportsController = require("./medicalReport");
const settingController = require("./setting");
const masterController = require("./master");
const surgeryController = require("./surgery");
const commonController = require("./common");
const surgeryFaqController = require("./surgery-faq");

const router = Router();

router.use("/auth", authController);
router.use("/doctor", doctorController);
router.use("/master", masterController);
router.use("/admin", adminController);
router.use("/faq", faqController);
router.use("/appointment", appointmentController);
router.use("/city", cityController);
router.use("/common", commonController);
router.use("/state", stateController);
router.use("/contactus", contactUsController);
router.use("/surgery", surgeryController);
router.use("/video", videoController);
router.use("/feedback", feedbackController);
router.use("/doctor", doctorController);
router.use("/hospital", hospitalController);
router.use("/medical-reports", medicalReportsController);
router.use("/patient", patientController);
router.use("/surgery-faq", surgeryFaqController);
router.use(verifyAuthToken);
router.use("/admin", adminController);
router.use("/setting", settingController);

module.exports = router;
