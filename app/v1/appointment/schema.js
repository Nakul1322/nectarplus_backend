const Joi = require("joi");
const { constants } = require("../../../utils/constant");
const {
  search,
  page,
  size,
  sort,
  sortOrder,
  _id,
  id,
  isExport,
} = require("../../../utils/validation");

const appointmentList = Joi.object({
  status: Joi.number().valid(
    constants.BOOKING_STATUS.BOOKED,
    constants.BOOKING_STATUS.COMPLETE,
    constants.BOOKING_STATUS.CANCEL
  ),
  toDate: Joi.date().default(new Date(Date.now() + 15 * 24 * 60 * 60 * 1000)),
  fromDate: Joi.date(),
  search,
  page,
  size,
  sort,
  sortOrder,
  isExport,
});

const appointmentListFilterForExport = Joi.object({
  specialization: Joi.array().items(_id).default([]),
  doctors: Joi.array().items(_id).default([]),
  hospitals: Joi.array().items(_id).default([]),
  forDashboard: Joi.boolean().default(false)
});

const appointmentHistory = Joi.object({
  status: Joi.number().valid(
    constants.BOOKING_STATUS.BOOKED,
    constants.BOOKING_STATUS.COMPLETE,
    constants.BOOKING_STATUS.CANCEL
  ),
  to: Joi.date(),
  from: Joi.date(),
  page,
  size,
});

const availableSlots = Joi.object({
  establishmentId: id,
  docId: id,
  dateString: Joi.string().trim().required(),
});

const availableSlotsCount = Joi.object({
  establishmentId: id,
  doctorId: id
});

module.exports = { appointmentList, availableSlots, appointmentHistory, availableSlotsCount, appointmentListFilterForExport };
