const Joi = require("joi");
const { constants } = require("../../../utils/constant");
const {
  search,
  page,
  size,
  sort,
  sortOrder,
  _id,
  id,
  isExport,
} = require("../../../utils/validation");

const type = Joi.number()
  .valid(...Object.values(constants.MASTER_DATA))
  .required();

const masterList = Joi.object({
  search,
  page,
  size,
  sort,
  sortOrder,
  type,
  isExport,
  recordId: _id,
});

const masterListData = Joi.object({
  search,
  page,
  size,
  sort,
  sortOrder,
  isExport,
  recordId: _id,
});

const recordId = Joi.object({ id });

const masterData = Joi.object({ type });

const addMasterData = Joi.object({
  content: Joi.object({
    name: Joi.string().trim(),
    image: Joi.string().trim(),
    description: Joi.string().trim().default(null),
    links: Joi.string().trim().default(null),
  }),
  type,
});

module.exports = {
  masterList,
  masterData,
  recordId,
  masterListData,
  addMasterData,
};
