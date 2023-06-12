const { Router } = require("express");
const appointmentController = require("./controller");
const { validate, isAdmin, verifyAuthToken, } = require("../../../middlewares");
const schema = require("./schema");

const router = Router({ mergeParams: true });

router.get(
  "/list",
  // isAdmin,
  validate(schema.appointmentList, 'query'),
  appointmentController.appointmentList
);

router.get(
  "/getAllAppointmentFeedbacks",
  //validate(schema.appointmentList, 'query'),
  appointmentController.getAllAppointmentFeedbacks
);

router.get(
  "/:doctorId",
  //validate(schema.appointmentList, 'query'),
  appointmentController.bookedSlots
);

router.get(
  "/findAppointment/:id",
  //validate(schema.appointmentList, 'query'),
  // verifyAuthToken,
  appointmentController.findAppointment
);

router.get(
  "/myAppointments/:id",
  //validate(schema.appointmentList, 'query'),
  appointmentController.myAppointments
);

router.get(
  "/appointmentReschedulingStatus/:id",
  //validate(schema.appointmentList, 'query'),
  appointmentController.appointmentRescheduleStatus
);

router.post(
  "/appointmentRescheduling/:id",
  //validate(schema.appointmentList, 'query'),
  appointmentController.appointmentReschedule
);

router.put(
  "/appointmentCancellation/:id",
  //validate(schema.appointmentList, 'query'),
  appointmentController.appointmentCancellation
);

router.post(
  "/bookAppointment",
  //validate(schema.appointmentList, 'query'),
  verifyAuthToken,
  appointmentController.bookAppointment
);

module.exports = router;
