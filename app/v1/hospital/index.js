const { Router } = require("express");
const hospitalController = require("./controller");
const { validate, isAdmin, isHospital, verifyAuthToken } = require("../../../middlewares");
const schema = require("./schema");

const router = Router({ mergeParams: true });

// router.get("/speciality/:id", hospitalController.hospitalSpeciality);
// router.get("/reviews/:id", hospitalController.hospitalReviews);
router.get("/profile/:id", hospitalController.hospitalAboutUs);
//  Admin - Hospital Module

router.get("/admin/list",
  // isAdmin,
  validate(schema.hospitalList, 'query'),
  hospitalController.hospitalList);

router.put(
  "/admin",
  // isAdmin,
  validate(schema.hospitalDetails, 'query'),
  validate(schema.editHospitalDetails),
  hospitalController.editHospital
);

router.post(
  "/admin",
  // isAdmin,
  validate(schema.addHospitalDetails),
  hospitalController.addHospital
);

router.get("/admin",
  // isAdmin,
  validate(schema.hospitalDetails, 'query'),
  hospitalController.hospitalDetails);

// Hopspital - Profile Module 

router.put(
  "/profile",
  verifyAuthToken,
  validate(schema.editProfileDetails),
  hospitalController.editHospitalProfile
)

router.get(
  "/profile",
  verifyAuthToken,
  validate(schema.editProfileDetails),
  hospitalController.editHospitalProfile
)

//Our Doctor Section........
router.get("/doctorList",verifyAuthToken,validate(schema.hospitalDoctorList, 'query'), hospitalController.doctorList);
router.get("/viewDoctorProfile",verifyAuthToken, hospitalController.viewDoctorProfile);
router.get("/getDoctorProfileForEdit",verifyAuthToken,hospitalController.getDoctorProfileForEdit);
router.put("/editDoctorProfile",verifyAuthToken, hospitalController.editDoctorProfile); //(schema.hospitalUpdateDoctorProfile)
router.post("/hospitalAddDoctor",verifyAuthToken, hospitalController.hospitalAddDoctor); //(schema.hospitalAddDoctor) verifyAuthToken,isHospital,
router.delete("/hospitalRemoveDoctor",verifyAuthToken, hospitalController.hospitalRemoveDoctor);
router.get("/doctorRequestList",verifyAuthToken,validate(schema.commonList, 'query'),hospitalController.doctorRequestList)
router.put("/hospitalAcceptDoctor",verifyAuthToken,hospitalController.hospitalAcceptDoctor);

// Hospital setting Api's...........
router.get("/hospitalProfile",verifyAuthToken,hospitalController.hospitalProfile)
router.get("/hospitalCompleteProfile", hospitalController.hospitalCompleteProfile);
router.put("/hospitalUpdateProfile",verifyAuthToken,validate(schema.hospitalUpdateProfile), hospitalController.hospitalUpdateProfile); 
router.post("/hospitaladdService",verifyAuthToken,validate(schema.hospitalAddService), hospitalController.hospitaladdService); 
router.get("/hospitalGetService",verifyAuthToken,hospitalController.hospitalGetService)
router.delete("/hospitalDeleteService",verifyAuthToken,validate(schema.hospitalDeleteService,'query'), hospitalController.hospitalDeleteService);
router.get("/hospitalGetTiming",verifyAuthToken,hospitalController.hospitalGetTiming)
router.post("/hospitalAddTiming", verifyAuthToken,hospitalController.hospitalAddTiming); //(schema.hospitalUpdateTiming)
router.put("/hospitalUpdateTiming", verifyAuthToken,hospitalController.hospitalUpdateTiming); //validate(schema.hospitalUpdateTiming),
router.get("/hospitalGetAddress",verifyAuthToken,hospitalController.hospitalGetAddress)
router.put("/hospitalUpdateAddress",verifyAuthToken,validate(schema.hospitalUpdateAddress),hospitalController.hospitalUpdateAddress); 
router.get("/hospitalGetImages",verifyAuthToken,hospitalController.hospitalGetImages);
router.post("/hospitalAddImages",verifyAuthToken,validate(schema.hospitalAddImages),hospitalController.hospitalAddImages);         
router.delete("/hospitalDeleteImages",verifyAuthToken,validate(schema.hospitalDeleteImage,'query'), hospitalController.hospitalDeleteImages);
router.post("/hospitalAddSocial",verifyAuthToken, hospitalController.hospitalAddSocial);   //(schema.hospitalAddSocial)
router.get("/hospitalSocialData",verifyAuthToken,hospitalController.hospitalSocialData);
router.delete("/hospitalDeleteSocial",verifyAuthToken, hospitalController.hospitalDeleteSocial);
router.put("/hospitalUpdateSocial",verifyAuthToken, hospitalController.hospitalUpdateSocial);   //(schema.hospitalUpdateSocial)
router.delete("/hospitalDeleteAccount",verifyAuthToken, hospitalController.hospitalDeleteAccount);

// .......Super Admin Api for Hospital.............
router.get("/hospitalApproveList",verifyAuthToken,validate(schema.commonList, 'query'),hospitalController.adminHospitalListForApprove);
router.patch("/adminActionHospital",verifyAuthToken,validate(schema.paramsId, 'query'), validate(schema.adminActionHospital),hospitalController.adminActionHospital);
router.get("/adminViewHospital",verifyAuthToken,validate(schema.paramsId, 'query'),hospitalController.adminViewHospital)

// Procedure - List
router.get("/procedure",
   verifyAuthToken,
  validate(schema.procedureList, 'query'),
  hospitalController.procedureSpecialityList
);

// Procedure - Add
router.post(
  "/procedure",
  verifyAuthToken,
  validate(schema.procedureByID),
  hospitalController.addProcedureSpeciality
);

// Procedure - Delete
router.delete(
  "/procedure",
  verifyAuthToken,
  validate(schema.procedureByID, 'query'),
  hospitalController.deleteProcedureSpeciality
);

// Speciality - List
router.get("/speciality",
  verifyAuthToken,
  validate(schema.specialityList, 'query'),
  hospitalController.procedureSpecialityList
);

// Speciality - Add
router.post(
  "/speciality",
  verifyAuthToken,
  validate(schema.specialityByID),
  hospitalController.addProcedureSpeciality
);

// Speciality - Delete
router.delete(
  "/speciality",
  verifyAuthToken,
  validate(schema.specialityByID, 'query'),
  hospitalController.deleteProcedureSpeciality
);

// Calender - appointment reschedule
router.post(
  "/appointment",
  verifyAuthToken,
  validate(schema.appointmentId, 'query'),
  validate(schema.rescheduleAppointment),
  hospitalController.rescheduleAppointment
);

// Calender - appointment change status
router.put(
  "/appointment",
  // isAdmin,
  validate(schema.appointmentId, 'query'),
  validate(schema.changeAppointmentStatus),
  hospitalController.changeAppointmentStatus
);

// Calender - appointment listing according to date
router.get(
  "/appointment",
  verifyAuthToken,
  validate(schema.dateTimeObject, 'query'),
  hospitalController.appointmentListByDate
);

// Calendar - main list
router.get(
  "/calendar",
  verifyAuthToken,
  validate(schema.calendarList, 'query'),
  hospitalController.calendarList
);

// patient hospital details - service list
router.get("/service/list",
  // isAdmin,
  validate(schema.patientHospitalServiceList, 'query'),
  hospitalController.patientHospitalDetailList
);

// patient hospital details - service list
router.get("/review/list",
  // isAdmin,
  validate(schema.hospitalReviewList, 'query'),
  hospitalController.hospitalReviewList
);

module.exports = router;