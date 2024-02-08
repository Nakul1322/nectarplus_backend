const Joi = require("joi");
const { constants } = require("../../../utils/constant");
const {
  search,
  page,
  size,
  sort,
  sortOrder,
  _id,
  isExport,
  id,
} = require("../../../utils/validation");

const addSurgery = Joi.object().keys({
  title: Joi.string().required(),
  seoTitle: Joi.string().required(),
  seoDescription: Joi.string().optional().allow(null),
  name: Joi.string().optional().allow(null),
  imageUrl: Joi.string().optional().allow(null),
  description: Joi.string().optional().allow(null),
  createdBy: Joi.string().optional().allow(null),
  modifiedBy: Joi.string().optional().allow(null),
  components: Joi.array().optional(),
  departmentId: id,
  faq: Joi.array().items({
    question: Joi.string().required(),
    answer: Joi.string().required(),
  }).default([]),
});

const updateSurgery = Joi.object().keys({
  title: Joi.string().optional(),
  seoTitle: Joi.string().optional(),
  seoDescription: Joi.string().optional().allow(null),
  name: Joi.string().optional().allow(null),
  imageUrl: Joi.string().optional().allow(null),
  description: Joi.string().optional().allow(null),
  createdBy: Joi.string().optional().allow(null),
  modifiedBy: Joi.string().optional().allow(null),
  components: Joi.array().optional(),
  departmentId: id,
});

const deleteSurgery = Joi.object().keys({
  id: Joi.string().optional(),
});

const findSurgery = Joi.object().keys({
  id: Joi.string().optional(),
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
  countryCode: Joi.string().trim().default("+91").optional(),
});

const updateEnquireSurgery = Joi.object().keys({
  followUpDate: Joi.date(),
  comments: Joi.string(),
  status: Joi.number().valid(...Object.values(constants.SURGERY_LEAD_TYPES)),
  claimByUserType: Joi.number().valid(
    ...Object.values(constants.SURGERY_CLAIM_BY)
  ),
});

const deleteEnquireSurgery = Joi.object().keys({
  id: Joi.string().optional(),
});

const findEnquireSurgery = Joi.object().keys({
  id: Joi.string().optional(),
});

const enquiryVerifyOtp = Joi.object().keys({
  phone: Joi.string().required(),
  id: Joi.string().trim().hex().length(24).required(),
  otp: Joi.string().required(),
});

const enquiryResendOtp = Joi.object().keys({
  phone: Joi.string().required(),
  id: Joi.string().trim().hex().length(24).required(),
});

const enquiryLeadList = Joi.object({
  status: Joi.array().items(
    Joi.number().valid(...Object.values(constants.SURGERY_LEAD_TYPES))
  ),
  source: Joi.array().items(
    Joi.number().valid(...Object.values(constants.SURGERY_LEAD_SOURCES))
  ),
  service: Joi.array().items(_id),
  typeOfList: Joi.number()
    .valid(...Object.values(constants.SURGERY_ENQUIRY_LIST_TYPE))
    .default(constants.SURGERY_ENQUIRY_LIST_TYPE.ALL_TIME),
  search,
  page,
  size,
  sort,
  sortOrder,
  isExport,
  startDate: Joi.date(),
  endDate: Joi.date(),
  surgeryTypes: Joi.array().items(_id).default([]),
});

const allSurgeryList = Joi.object({
  search,
  page,
  size,
  sort,
  sortOrder,
  isExport,
});

const departmentId = Joi.object().keys({
  id,
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
  enquiryVerifyOtp,
  enquiryResendOtp,
  enquiryLeadList,
  allSurgeryList,
  departmentId,
};
