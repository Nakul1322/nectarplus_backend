const { Router } = require("express");
const surgeryController = require("./controller");
const {
  validate,
  verifyAuthToken,
  isAdmin,
} = require("../../../middlewares/index");
const schema = require("./schema");

const router = Router({ mergeParams: true });

router.get("/find", validate(schema.findSurgery), surgeryController.findSurgeryBySlug);

router.get(
  "/department",
  surgeryController.departmentList
);

router.get(
  "/department-surgery",
  validate(schema.departmentId, 'query'),
  surgeryController.departmentSurgeryList
);

router.post(
  "/resend-otp",
  validate(schema.enquiryResendOtp),
  surgeryController.enquiryResendOtp
);

router.put(
  "/verify-otp",
  validate(schema.enquiryVerifyOtp),
  surgeryController.enquiryVerifyOtp
);

router.post(
  "/",
  verifyAuthToken,
  isAdmin,
  validate(schema.addSurgery),
  surgeryController.addSurgery
);

router.get(
  "/all-surgery",
  validate(schema.allSurgeryList, 'query'),
  surgeryController.allSurgery
);

router.get("/:id", validate(schema.findSurgery), surgeryController.findSurgery);

router.put(
  "/:id",
  verifyAuthToken,
  isAdmin,
  validate(schema.updateSurgery),
  surgeryController.updateSurgery
);

router.delete(
  "/:id",
  verifyAuthToken,
  isAdmin,
  validate(schema.deleteSurgery),
  surgeryController.deleteSurgery
);

router.post(
  "/enquire",
  validate(schema.addEnquireSurgery),
  surgeryController.addEnquireSurgery
);

router.post(
  "/all-enquires",
  verifyAuthToken,
  isAdmin,
  validate(schema.enquiryLeadList),
  surgeryController.allEnquiresList
);

router.get(
  "/enquire/:id",
  validate(schema.findEnquireSurgery),
  surgeryController.findEnquireSurgery
);

router.put(
  "/enquire/:id",
  verifyAuthToken,
  isAdmin,
  validate(schema.updateEnquireSurgery),
  surgeryController.updateEnquireSurgery
);

router.delete(
  "/enquire/:id",
  validate(schema.deleteEnquireSurgery),
  surgeryController.deleteEnquireSurgery
);

module.exports = router;
