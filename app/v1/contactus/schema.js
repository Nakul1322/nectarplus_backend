const Joi = require("joi");

const addContactUs = Joi.object().keys({
    name: Joi.string().required(),
    phone: Joi.string().required(),
    email: Joi.string().required().allow(null),
    comment: Joi.string().optional().allow(null)
});

const updateContactUs = Joi.object().keys({
    name: Joi.string().optional(),
    phone: Joi.string().optional(),
    email: Joi.string().optional().allow(null),
    comment: Joi.string().optional().allow(null),
});

const deleteContactUs = Joi.object().keys({
    id: Joi.string().optional()
});

const findContactUs = Joi.object().keys({
    id: Joi.string().optional()
});

module.exports = {
    addContactUs,
    findContactUs,
    updateContactUs,
    deleteContactUs
};