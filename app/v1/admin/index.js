const { Router } = require("express");
const adminController = require("./controller");
const {
  validate,
  verifyAuthToken,
  isAdmin,
} = require("../../../middlewares/index");
const schema = require("./schema");

const router = Router({ mergeParams: true });

router.get(
  "/dashboard/appointment-count",
  verifyAuthToken,
  isAdmin,
  adminController.adminDashboard
);

router.get(
  "/dashboard/count",
  verifyAuthToken,
  isAdmin,
  validate(schema.dashboardCount, "query"),
  adminController.adminDashboardCount
);

router.get(
  "/dashboard/registration/count",
  verifyAuthToken,
  isAdmin,
  validate(schema.dashboardCount, "query"),
  adminController.registrationCount
);

router.post(
  "/dashboard/appointment-surgery-lead/count",
  verifyAuthToken,
  isAdmin,
  validate(schema.dashboardAppointmentCount),
  adminController.appointmentSugeryLeadCount
);

router.post(
  "/dashboard/appointment-surgery-lead/count/range-specialization",
  verifyAuthToken,
  isAdmin,
  validate(schema.appointmentSpecializationListByDateRange),
  adminController.appointmentSpecializationListByDateRange
);

router.post(
  "/admin-login",
  validate(schema.adminLogin),
  adminController.adminLogin,
  adminController.createSession
);

router.post(
  "/admin-forgot-password",
  validate(schema.forgotPassword),
  adminController.forgotPassword
);

router.put(
  "/update-profile",
  verifyAuthToken,
  validate(schema.updateAdminProfile),
  adminController.updateAdminProfile
);

router.get(
  "/get-profile",
  verifyAuthToken,
  isAdmin,
  adminController.getAdminProfile
);

router.get(
  "/get-all-user-type-status",
  verifyAuthToken,
  isAdmin,
  validate(schema.userTypeList, "query"),
  adminController.getAllUserTypeStatus
);

router.get(
  "/feedbacks",
  verifyAuthToken,
  validate(schema.feedbackList, "query"),
  adminController.getAllFeedbackList
);

router.put(
  "/feedbacks",
  verifyAuthToken,
  validate(schema.feedbackId, "query"),
  validate(schema.editFeedback),
  adminController.editFeedback
);

router.get(
  "/get-user-details",
  verifyAuthToken,
  validate(schema.userDocumentDetails, "query"),
  adminController.getUserDocumentDetails
);

router.get(
  "/feedbacks-details",
  verifyAuthToken,
  validate(schema.feedbackId, "query"),
  adminController.getFeedbackById
);

router.put(
  "/update-admin-password",
  verifyAuthToken,
  isAdmin,
  validate(schema.updatePassword),
  adminController.updateAdminPassword
);

router.post(
  "/social",
  verifyAuthToken,
  isAdmin,
  validate(schema.addSocial),
  adminController.addSocial
);

router.get("/social", verifyAuthToken, isAdmin, adminController.socialList);

router.get(
  "/social/:id",
  verifyAuthToken,
  isAdmin,
  validate(schema.findSocial, "query"),
  adminController.findSocialById
);

router.put(
  "/social/:id",
  verifyAuthToken,
  isAdmin,
  validate(schema.findSocial, "query"),
  validate(schema.updateSocial),
  adminController.updateSocial
);

router.delete(
  "/social/:id",
  verifyAuthToken,
  isAdmin,
  validate(schema.findSocial, "query"),
  adminController.deleteSocial
);

router.get(
  "/doctor-verified-list",
  verifyAuthToken,
  isAdmin,
  adminController.doctorVerifiedList
);

module.exports = router;
