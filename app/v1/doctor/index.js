const { Router } = require("express");
const doctorController = require("./controller");
const { validate, verifyAuthToken, isAdmin, isAdminCreator, isCreator, isDoctor } = require("../../../middlewares/index");
const schema = require("./schema");
const { doctor } = require("../../../services");

const router = Router({ mergeParams: true });

router.get("/specialityFirstLetterList/:id", doctorController.specialityFirstLetterList);
router.get(
    "/admin",
    // validate(schema.doctorList, 'query'),
    doctorController.doctorList
  );
router.get("/speciality/:id", doctorController.doctorSpeciality);
router.get("/reviews/:id", doctorController.doctorReviews);
router.get("/profile/:id", doctorController.doctorAboutUs);
router.get("/establishmentProfile/:id", doctorController.doctorListBasedOnEstablishmentSpecility);
router.get("/establishmentspecialityList/:id", doctorController.establishmentspecialityListDoc);
router.get("/getAllDoctorsByCity", doctorController.getAllDoctorByCity);
router.get("/getAllSpecializations", doctorController.getAllSpecializations);
router.put(
    "/doctorUpdateProfile",
    verifyAuthToken,
    validate(schema.doctorCompleteProfile),
    doctorController.doctorUpdateProfile
);

router.get(
    "/getDoctorProfile",
    verifyAuthToken,
    validate(schema.getDoctorProfile, 'query'),
    doctorController.getDoctorProfile
);
router.post("/getCalender",verifyAuthToken, doctorController.getCalender);
router.post("/doctorCancelAppointment", doctorController.doctorCancelAppointment); //validate(schema.cancelAppointment),
router.post("/doctorCompleteAppointment", validate(schema.completeAppointment), doctorController.doctorCompleteAppointment);
router.delete("/doctorDeleteAppointment",validate(schema.completeAppointment,'query'),doctorController.doctorDeleteAppointment);
router.patch("/doctorEditAppointment",doctorController.doctorEditAppointment);
router.get("/doctorEstablishmentList",verifyAuthToken, doctorController.doctorEstablishmentList);
router.post("/doctorAddEstablishment",verifyAuthToken, doctorController.doctorAddEstablishment);
router.get("/establishmentData",verifyAuthToken,doctorController.establishmentData);
router.get("/doctorEstablishmentRequest",verifyAuthToken,validate(schema.commonList,'query'),doctorController.doctorEstablishmentRequest);
router.put("/doctorEditEstablishment",verifyAuthToken,doctorController.doctorEditEstablishment);
router.patch("/doctorAcceptEstablishment",verifyAuthToken, doctorController.doctorAcceptEstablishment);
router.post("/doctorAppointmentDashboard",verifyAuthToken, doctorController.doctorAppointmentDashboard);
router.get("/doctorAppointmentList",verifyAuthToken,validate(schema.doctorPatientList,'query'), doctorController.doctorAppointmentList);
router.post("/getAllDoctors", doctorController.getAllDoctors);
router.get("/getAllTopRatedDoctors", doctorController.getAllTopRatedDoctors);
router.post("/adminAddDoctor",validate(schema.adminAddDoctor), verifyAuthToken,doctorController.adminAddDoctor); //,validate(schema.adminAddDoctor)
router.get("/adminDoctorList",validate(schema.adminDoctorList,'query'),verifyAuthToken,doctorController.adminDoctorList);
router.put("/adminEditDoctor", validate(schema.doctorId, 'query'),validate(schema.adminEditDoctor),verifyAuthToken,doctorController.adminEditDoctor); //,validate(schema.adminEditDoctor)
router.get("/doctorApprovalList",validate(schema.commonList, 'query'),verifyAuthToken, doctorController.adminDoctorApprovalList);
router.patch("/adminActionDoctor",validate(schema.doctorId, 'query'), validate(schema.adminActionDoctor),verifyAuthToken, doctorController.adminActionDoctor);
router.patch("/adminActiveInactive", validate(schema.doctorId, 'query'), validate(schema.doctorStatus),verifyAuthToken, doctorController.adminActiveInactiveDoctor); //
router.put("/deleteProfile", doctorController.deleteDocProfile);



module.exports = router;