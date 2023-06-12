const Joi = require("joi");
const { id } = require("../../../utils/validation");

const addMasterFeedback = Joi.object().keys({
  sno: Joi.number().required(),
  question: Joi.string().required(),
  pointAvailable: Joi.boolean().optional(),
  status: Joi.number().optional().allow(null),
  options: Joi.array()
    .items(
      Joi.object({
        opt: Joi.string().optional(),
        point: Joi.number().min(0).optional(),
      })
    )
    .optional(),
});

const updateMasterFeedback = Joi.object().keys({
  sno: Joi.number().optional(),
  question: Joi.string().optional(),
  pointAvailable: Joi.boolean().optional(),
  status: Joi.number().optional().allow(null),
  options: Joi.array()
    .items(
      Joi.object({
        opt: Joi.string().optional(),
        point: Joi.number().min(0).optional(),
      })
    )
    .optional(),
});

const deleteMasterFeedback = Joi.object().keys({
  id: Joi.string().optional(),
});

const findMasterFeedback = Joi.object().keys({
  id: Joi.string().optional(),
});

const addFeedback = Joi.object().keys({
  hospitalId: id.optional(),
  userId: id,
  doctorId: id,
  status: Joi.number().integer().valid(0, 1).required(),
  point: Joi.number().min(0).max(5).required(),
  rating: Joi.number().min(0).max(5).required(),
  replyMsg: Joi.string().trim().required(),
  replyId: Joi.string().length(24).hex().required(),
  feedback: Joi.object({
    masterFeedbackId: id,
    selectedOptionId: Joi.array().items(id).required(),
    point: Joi.number().min(0).max(5).required(),
  }).required(),
});

const updateFeedback = Joi.object().keys({
  hospitalId: id,
  userId: id,
  doctorId: id,
  status: Joi.number().integer().valid(0, 1).optional(),
  point: Joi.number().integer().min(0).max(10).optional(),
  rating: Joi.number().integer().min(0).max(5).optional(),
  replyMsg: Joi.string().trim().optional(),
  replyId: Joi.string().length(24).hex().optional(),
  feedback: Joi.object({
    masterFeedbackId: id,
    selectedOptionId: Joi.array().items(id).optional(),
    point: Joi.number().integer().min(0).max(10).optional(),
  }).optional(),
});

const deleteFeedback = Joi.object().keys({
  id: id,
});

const findFeedback = Joi.object().keys({
  id: id,
});

module.exports = {
  addMasterFeedback,
  findMasterFeedback,
  updateMasterFeedback,
  deleteMasterFeedback,
  addFeedback,
  findFeedback,
  updateFeedback,
  deleteFeedback,
};
