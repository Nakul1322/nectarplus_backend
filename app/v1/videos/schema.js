const Joi = require("joi");
const { id } = require('../../../utils/validation');

const addVideo = Joi.object({
	title: Joi.string().trim().required(),
	url: Joi.string().trim().uri().required(),
    userId: Joi.string().trim().optional()
})

const updateVideo = Joi.object().keys({
	title: Joi.string().trim(),
	url: Joi.string().trim().uri(),
    userId: Joi.string().trim().optional()
});

const findVideo = Joi.object().keys({
    id
});

module.exports = {
    addVideo,
    updateVideo,
    findVideo
};