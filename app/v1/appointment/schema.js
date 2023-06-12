const Joi = require('joi');
const { constants } = require('../../../utils/constant');
const { search, page, size, sort, sortOrder, _id, id, isExport } = require('../../../utils/validation');

const appointmentList = Joi.object({
  status: Joi.number().valid(constants.BOOKING_STATUS.BOOKED, constants.BOOKING_STATUS.COMPLETE, constants.BOOKING_STATUS.CANCEL),
  toDate: Joi.date().default(new Date(Date.now() + (15 * 24 * 60 * 60 * 1000))),
  fromDate: Joi.date(),
  search,
  page,
  size,
  sort,
  sortOrder,
  isExport
});



module.exports = { search, page, size, sort, sortOrder, appointmentList, id, _id };
