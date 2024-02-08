const Joi = require("joi");
const {
  search,
  page,
  size,
  sort,
  sortOrder,
  id,
  _id,
  isExport,
} = require("../../../utils/validation");

const reportId = Joi.object({
  id,
});

const addFAQ = Joi.object().keys({
  question: Joi.string().required(),
  answer: Joi.string().required(),
  userType: Joi.number().optional().allow(null),
  userId: Joi.string().optional().allow(null),
});

const updateFAQ = Joi.object().keys({
  question: Joi.string().optional(),
  answer: Joi.string().optional(),
  userType: Joi.number().optional().allow(null),
  userId: Joi.string().optional().allow(null),
});

const deleteFAQ = Joi.object().keys({
  id: Joi.string().optional(),
});

const findFAQ = Joi.object().keys({
  id: Joi.string().optional(),
});

const getAllMedicalReports = Joi.object({
  to: Joi.date(),
  from: Joi.date(),
  page,
  size,
});

module.exports = {
  addFAQ,
  findFAQ,
  updateFAQ,
  deleteFAQ,
  reportId,
  getAllMedicalReports,
};
