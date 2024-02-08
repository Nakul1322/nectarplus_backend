const { Router } = require("express");
const hospitalController = require("./controller");
const {
  validate,
  isAdmin,
  isHospital,
  verifyAuthToken,
} = require("../../../middlewares");
const schema = require("./schema");

const router = Router({ mergeParams: true });

router.get(
  "/profile",
  validate(schema.hospitalProfile, "query"),
  hospitalController.hospitalAboutUs
);

router.get(
  "/admin/list",
  verifyAuthToken,
  isAdmin,
  validate(schema.hospitalList, "query"),
  hospitalController.hospitalList
);

router.put(
  "/admin",
  validate(schema.hospitalDetails, "query"),
  validate(schema.editHospitalDetails),
  hospitalController.editHospital
);

router.post(
  "/admin",
  validate(schema.addHospitalDetails),
  hospitalController.addHospital
);

router.get(
  "/admin",
  validate(schema.hospitalDetails, "query"),
  hospitalController.hospitalDetails
);

router.put(
  "/profile",
  verifyAuthToken,
  validate(schema.editProfileDetails),
  hospitalController.editHospitalProfile
);

router.get(
  "/profile",
  verifyAuthToken,
  validate(schema.editProfileDetails),
  hospitalController.editHospitalProfile
);

router.get(
  "/doctor-list",
  verifyAuthToken,
  validate(schema.hospitalDoctorList, "query"),
  hospitalController.doctorList
);

router.get(
  "/view-doctor-profile",
  verifyAuthToken,
  hospitalController.viewDoctorProfile
);

router.get(
  "/get-doctor-profile-for-edit",
  verifyAuthToken,
  isHospital,
  hospitalController.getDoctorProfileForEdit
);

router.put(
  "/edit-doctor-profile",
  verifyAuthToken,
  hospitalController.editDoctorProfile
);

router.get(
  "/hospital-find-doctor",
  verifyAuthToken,
  hospitalController.hospitalfindDoctor
);

router.post(
  "/hospital-add-doctor",
  verifyAuthToken,
  hospitalController.hospitalAddDoctor
);

router.delete(
  "/hospital-remove-doctor",
  verifyAuthToken,
  hospitalController.hospitalRemoveDoctor
);

router.get(
  "/doctor-request-list",
  verifyAuthToken,
  validate(schema.commonList, "query"),
  hospitalController.doctorRequestList
);

router.put(
  "/hospital-accept-doctor",
  verifyAuthToken,
  hospitalController.hospitalAcceptDoctor
);

router.get(
  "/hospital-profile",
  verifyAuthToken,
  hospitalController.hospitalProfile
);

router.get(
  "/hospital-complete-profile",
  hospitalController.hospitalCompleteProfile
);

router.put(
  "/hospital-update-profile",
  verifyAuthToken,
  hospitalController.hospitalUpdateProfile
);

router.post(
  "/hospital-add-service",
  verifyAuthToken,
  hospitalController.hospitaladdService
);

router.get(
  "/hospital-get-service",
  verifyAuthToken,
  hospitalController.hospitalGetService
);

router.delete(
  "/hospital-delete-service",
  verifyAuthToken,
  validate(schema.hospitalDeleteService, "query"),
  hospitalController.hospitalDeleteService
);

router.get(
  "/hospital-get-timing",
  verifyAuthToken,
  hospitalController.hospitalGetTiming
);

router.post(
  "/hospital-add-timing",
  verifyAuthToken,
  hospitalController.hospitalAddTiming
);

router.put(
  "/hospital-update-timing",
  verifyAuthToken,
  hospitalController.hospitalUpdateTiming
);

router.get(
  "/hospital-get-address",
  verifyAuthToken,
  hospitalController.hospitalGetAddress
);

router.put(
  "/hospital-update-address",
  verifyAuthToken,
  validate(schema.hospitalUpdateAddress),
  hospitalController.hospitalUpdateAddress
);

router.get(
  "/hospital-get-images",
  verifyAuthToken,
  hospitalController.hospitalGetImages
);

router.post(
  "/hospital-add-images",
  verifyAuthToken,
  hospitalController.hospitalAddImages
);

router.delete(
  "/hospital-delete-images",
  verifyAuthToken,
  validate(schema.hospitalDeleteImage, "query"),
  hospitalController.hospitalDeleteImages
);

router.post(
  "/hospital-add-social",
  verifyAuthToken,
  hospitalController.hospitalAddSocial
);

router.get(
  "/hospital-social-data",
  verifyAuthToken,
  hospitalController.hospitalSocialData
);

router.delete(
  "/hospital-delete-social",
  verifyAuthToken,
  hospitalController.hospitalDeleteSocial
);

router.put(
  "/hospital-update-social",
  verifyAuthToken,
  hospitalController.hospitalUpdateSocial
);

router.delete(
  "/hospital-delete-account",
  verifyAuthToken,
  hospitalController.hospitalDeleteAccount
);

router.post(
  "/hospital-add-faq",
  verifyAuthToken,
  hospitalController.hospitalAddFaq
);

router.put(
  "/hospital-update-faq",
  verifyAuthToken,
  hospitalController.hospitalUpdateFaq
);

router.get(
  "/hospital-faq-list",
  verifyAuthToken,
  hospitalController.hospitalFaqList
);

router.delete(
  "/hospital-delete-faq",
  verifyAuthToken,
  hospitalController.hospitalDeleteFAQ
);

router.post(
  "/hospital-add-videos",
  verifyAuthToken,
  hospitalController.hospitalAddVideos
);

router.delete(
  "/hospital-delete-videos",
  verifyAuthToken,
  hospitalController.hospitalDeleteVideos
);

router.put(
  "/hospital-update-videos",
  verifyAuthToken,
  hospitalController.hospitalUpdateVideos
);

router.get(
  "/hospital-video-list",
  verifyAuthToken,
  hospitalController.hospitalVideoList
);

router.get(
  "/hospital-approve-list",
  verifyAuthToken,
  isAdmin,
  validate(schema.commonList, "query"),
  hospitalController.adminHospitalListForApprove
);

router.patch(
  "/admin-action-hospital",
  verifyAuthToken,
  validate(schema.paramsId, "query"),
  validate(schema.adminActionHospital),
  hospitalController.adminActionHospital
);

router.get(
  "/admin-view-hospital",
  verifyAuthToken,
  validate(schema.paramsId, "query"),
  hospitalController.adminViewHospital
);

router.get(
  "/procedure",
  verifyAuthToken,
  validate(schema.procedureList, "query"),
  hospitalController.procedureSpecialityList
);

router.post(
  "/procedure",
  verifyAuthToken,
  validate(schema.procedureByID),
  hospitalController.addProcedureSpeciality
);

router.delete(
  "/procedure",
  verifyAuthToken,
  validate(schema.procedureByID, "query"),
  hospitalController.deleteProcedureSpeciality
);

router.get(
  "/speciality",
  verifyAuthToken,
  validate(schema.specialityList, "query"),
  hospitalController.procedureSpecialityList
);

router.post(
  "/speciality",
  verifyAuthToken,
  validate(schema.specialityByID),
  hospitalController.addProcedureSpeciality
);

router.delete(
  "/speciality",
  verifyAuthToken,
  validate(schema.specialityByID, "query"),
  hospitalController.deleteProcedureSpeciality
);

router.post(
  "/appointment",
  verifyAuthToken,
  validate(schema.appointmentId, "query"),
  validate(schema.rescheduleAppointment),
  hospitalController.rescheduleAppointment
);

router.put(
  "/appointment",
  verifyAuthToken,
  validate(schema.appointmentId, "query"),
  validate(schema.changeAppointmentStatus),
  hospitalController.changeAppointmentStatus
);

router.get(
  "/appointment",
  verifyAuthToken,
  validate(schema.dateTimeObject, "query"),
  hospitalController.appointmentListByDate
);

router.get(
  "/calendar",
  verifyAuthToken,
  validate(schema.calendarList, "query"),
  hospitalController.calendarList
);

router.get(
  "/service/list",
  validate(schema.patientHospitalServiceList, "query"),
  hospitalController.patientHospitalDetailList
);

router.get(
  "/review/list",
  validate(schema.hospitalReviewList, "query"),
  hospitalController.hospitalReviewList
);

router.post("/find-hospital-list", hospitalController.findHospitalList);

router.post(
  "/find-doctor-list",
  validate(schema.findDoctorList, "query"),
  hospitalController.findDoctorList
);

router.get(
  "/dashboard/appointment-count",
  verifyAuthToken,
  hospitalController.dashboardCount
);

router.post(
  "/dashboard/appointment-count",
  validate(schema.hospitalSpecialityGraph),
  verifyAuthToken,
  hospitalController.hospitalSpecialityGraph
);

router.get(
  "/speciality/list",
  verifyAuthToken,
  hospitalController.hospitalSpecialityList
);

router.post(
  "/dashboard/doctor-appointment-count",
  validate(schema.hospitalDoctorGraph),
  verifyAuthToken,
  hospitalController.hospitalDoctorGraph
);

module.exports = router;
