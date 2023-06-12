const Joi = require('joi');
const { constants } = require('./constant');

const search = Joi.
    string().
    min(constants.LIST.MIN_VALUE).
    trim();

const page = Joi.
    number().
    min(constants.LIST.MIN_VALUE).
    default(constants.LIST.MIN_VALUE);

const size = Joi.
    number().
    min(constants.LIST.MIN_VALUE).
    default(constants.LIST.DEFAULT_PAGINATION_LIMIT).
    optional();

const sort = Joi.
    string().
    trim().
    default(constants.LIST.DEFAULT_SORT).
    optional();

const sortOrder = Joi.
    string().
    trim().
    valid(constants.LIST.ORDERING_KEYS.ASC, constants.LIST.ORDERING_KEYS.DESC).
    default(constants.LIST.ORDERING_KEYS.DESC).
    optional();

const id = Joi.
    string().
    trim().
    hex().
    length(constants.ID_LENGTH).
    required();

const _id = Joi.
    string().
    trim().
    hex().
    length(constants.ID_LENGTH);

const isExport = Joi.boolean();

module.exports = { search, page, size, sort, sortOrder, id, _id, isExport };
