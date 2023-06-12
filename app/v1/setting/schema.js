const Joi = require("joi");
const { constants } = require('../../../utils/constant');
const { id, _id } = require('../../../utils/validation');

const editDoctorProfile = Joi.object({
	fullName: Joi.string().trim().min(3).max(50),
	about: Joi.string().trim().min(5).max(500),
	experience: Joi.number().min(1).max(100),
	profilePic: Joi.string().trim().uri(),
	specialization: Joi.array().items(_id).min(1),
	isDeleted: Joi.boolean().valid(true)
})

const type = Joi.
	number().
	valid(...Object.values(constants.DOCTOR_PROFILE)).
	required()

const recordId = Joi.object({
	recordId: _id,
	type: Joi.
		number().
		valid(...Object.values(constants.DOCTOR_PROFILE))
})

const recordList = Joi.object({ type })

const services = Joi.object({
	name: Joi.string().trim().required()
})

const education = Joi.object({
	degree: Joi.string().trim().min(1),
	college: Joi.string().trim().min(1),
	year: Joi.string().trim().min(1)
}).min(1)

const medicalRegistration = Joi.object({
	registrationNumber: Joi.string().trim().min(1),
	council: Joi.string().trim().min(1),
	year: Joi.string().trim().min(1)
}).min(1)

const awardsAndRecognition = Joi.object({
	name: Joi.string().trim().min(1),
	year: Joi.string().trim().min(1)
}).min(1)

const membership = Joi.object({ name: Joi.string().trim().required() })

const socials = Joi.object({
	socialMediaId: _id,
	url: Joi.string().trim().uri(),
})

const addDoctorSettings = Joi.object({
	type,
	isDeleted: Joi.boolean().valid(true),
	isEdit: Joi.boolean(),
	records: Joi.any().
		when('type',
			{
				is: constants.DOCTOR_PROFILE.EDUCATION,
				then: education
			}).
		when('type',
			{
				is: constants.DOCTOR_PROFILE.AWARDS_AND_RECOGNITION,
				then: awardsAndRecognition
			}).
		when('type',
			{
				is: constants.DOCTOR_PROFILE.MEDICAL_REGISTRATION,
				then: medicalRegistration
			}).
		when('type',
			{
				is: constants.DOCTOR_PROFILE.SERVICES,
				then: services
			}).when('type',
				{
					is: constants.DOCTOR_PROFILE.MEMBERSHIPS,
					then: membership
				}).
		when('type',
			{
				is: constants.DOCTOR_PROFILE.SOCIALS,
				then: socials
			}),
});

module.exports = {
	recordList,
	recordId,
	editDoctorProfile,
	addDoctorSettings
};
