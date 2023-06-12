const Joi = require("joi");
const { constants } = require('../../../utils/constant');
const { search, page, size, sort, sortOrder, _id, id, isExport } = require('../../../utils/validation');

const type = Joi.number().valid(...Object.values(constants.MASTER_DATA)).required();

const searchQuery = Joi.object({
  search
})

const hospitalSearch = Joi.object({
  search,
  page,
  size,
  sort,
  sortOrder
})

const masterList = Joi.object({
  search,
  page,
  size,
  sort,
  sortOrder,
  type,
  isExport
})

const recordId = Joi.object({ id })

const masterData = Joi.object({type})

module.exports = {
  masterList,
  masterData,
  recordId,
  searchQuery,
  hospitalSearch
};