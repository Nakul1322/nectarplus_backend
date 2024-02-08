const { Router } = require("express");
const appointmentController = require("./controller");
const { validate, verifyAuthToken, isAdmin } = require("../../../middlewares");
const schema = require("./schema");

const router = Router({ mergeParams: true });

router.get(
  "/appointment-history",
  validate(schema.appointmentHistory, "query"),
  verifyAuthToken,
  appointmentController.appointmentHistory
);

router.post(
  "/list",
  verifyAuthToken,
  isAdmin,
  validate(schema.appointmentList, "query"),
  validate(schema.appointmentListFilterForExport),
  appointmentController.appointmentList
);

router.get(
  "/get-all-appointment-feedbacks",
  appointmentController.getAllAppointmentFeedbacks
);

router.get(
  "/available-slots",
  validate(schema.availableSlots, "query"),
  appointmentController.bookedSlots
);

router.get(
  "/find-appointment/:id",
  verifyAuthToken,
  appointmentController.findAppointment
);

router.get(
  "/my-appointments/:id",
  verifyAuthToken,
  appointmentController.myAppointments
);

router.get(
  "/appointment-rescheduling-status/:id",
  verifyAuthToken,
  appointmentController.appointmentRescheduleStatus
);

router.post(
  "/appointment-rescheduling/:id",
  verifyAuthToken,
  appointmentController.appointmentReschedule
);

router.put(
  "/appointment-cancellation/:id",
  verifyAuthToken,
  appointmentController.appointmentCancellation
);

router.post(
  "/book-appointment",
  verifyAuthToken,
  appointmentController.bookAppointment
);

router.get(
  "/available-slots-count",
  validate(schema.availableSlotsCount, "query"),
  appointmentController.bookedSlotsCount
);

module.exports = router;
