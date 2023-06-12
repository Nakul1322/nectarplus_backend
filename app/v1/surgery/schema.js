const Joi = require("joi");

const addSurgery = Joi.object().keys({
    title: Joi.string().required(),
    seoTitle: Joi.string().required(),
    seoDescription: Joi.string().optional().allow(null),
    name: Joi.string().optional().allow(null),
    imageUrl:Joi.string().optional().allow(null),
    description:Joi.string().optional().allow(null),
    createdBy:Joi.string().optional().allow(null),
    modifiedBy:Joi.string().optional().allow(null),
    components:Joi.array().optional()
});

const updateSurgery = Joi.object().keys({
    title: Joi.string().optional(),
    seoTitle: Joi.string().optional(),
    seoDescription: Joi.string().optional().allow(null),
    name: Joi.string().optional().allow(null),
    imageUrl:Joi.string().optional().allow(null),
    description:Joi.string().optional().allow(null),
    createdBy:Joi.string().optional().allow(null),
    modifiedBy:Joi.string().optional().allow(null),
    components:Joi.array().optional()
});

const deleteSurgery = Joi.object().keys({
    id: Joi.string().optional()
});

const findSurgery = Joi.object().keys({
    id: Joi.string().optional()
});

const addEnquireSurgery = Joi.object().keys({
    leadId: Joi.string().optional(),
    source: Joi.string().optional(),
    city: Joi.string().optional(),
    treatmentType: Joi.string().optional(),
    name: Joi.string().optional(),
    phone: Joi.string().optional(),
    claimedDate: Joi.date().optional(),
    followup: Joi.date().optional(),
    comments: Joi.string().optional(),
});

const updateEnquireSurgery = Joi.object().keys({
    leadId: Joi.string().optional(),
    source: Joi.string().optional(),
    city: Joi.string().optional(),
    treatmentType: Joi.string().optional(),
    name: Joi.string().optional(),
    phone: Joi.string().optional(),
    claimedDate: Joi.date().optional(),
    followup: Joi.date().optional(),
    comments: Joi.string().optional(),
});

const deleteEnquireSurgery = Joi.object().keys({
    id: Joi.string().optional()
});

const findEnquireSurgery = Joi.object().keys({
    id: Joi.string().optional()
});

module.exports = {
    addSurgery,
    findSurgery,
    updateSurgery,
    deleteSurgery,
    addEnquireSurgery,
    findEnquireSurgery,
    updateEnquireSurgery,
    deleteEnquireSurgery,
};