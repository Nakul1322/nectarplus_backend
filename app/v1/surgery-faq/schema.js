const Joi = require("joi");
const { id, _id } = require("../../../utils/validation");

const addFAQ = Joi.object().keys({
  question: Joi.string().min(10).max(200).required(),
  answer: Joi.string().min(2).max(500).required(),
  surgeryId: id,
});

const updateFAQ = Joi.object().keys({
  question: Joi.string().min(10).max(200).required(),
  answer: Joi.string().min(2).max(500).required(),
});

const deleteFAQ = Joi.object().keys({
  id,
});

const findFAQ = Joi.object().keys({
  id,
});

const getAllFaqBySurgery = Joi.object().keys({
  surgeryId: _id,
  slug: Joi.string().trim()
});

module.exports = {
  addFAQ,
  findFAQ,
  updateFAQ,
  deleteFAQ,
  getAllFaqBySurgery,
};
