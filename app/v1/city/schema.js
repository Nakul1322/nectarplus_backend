const Joi = require("joi");

const addFAQ = Joi.object().keys({
    question: Joi.string().required(),
    answer: Joi.string().required(),
    userType: Joi.number().optional().allow(null),
    userId: Joi.string().optional().allow(null)
});

const updateFAQ = Joi.object().keys({
    question: Joi.string().optional(),
    answer: Joi.string().optional(),
    userType: Joi.number().optional().allow(null),
    userId: Joi.string().optional().allow(null),
});

const deleteFAQ = Joi.object().keys({
    id: Joi.string().optional()
});

const findFAQ = Joi.object().keys({
    id: Joi.string().optional()
});

module.exports = {
    addFAQ,
    findFAQ,
    updateFAQ,
    deleteFAQ
};