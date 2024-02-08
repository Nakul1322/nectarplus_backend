const httpStatus = require("http-status");
const { response } = require("../../../utils/index");
const { common } = require("../../../services/index");
const { StateMaster, HospitalType } = require("../../../models/index");

const addState = async (req, res) => {
  try {
    const { content, type } = req.body;
    const model = constants.ModelConstant[type];
    const data = await common.create(model, content);
    return response.success(
      { msgCode: "STATE_ADDED", data },
      res,
      httpStatus.OK
    );
  } catch (error) {
    console.log(error);
    return response.error(
      { msgCode: "INTERNAL_SERVER_ERROR" },
      res,
      httpStatus.INTERNAL_SERVER_ERROR
    );
  }
};

const allState = async (req, res) => {
  try {
    const data = await common.findAll(StateMaster.model, { isDeleted: false });
    return response.success(
      { msgCode: "STATE_LIST", data },
      res,
      httpStatus.OK
    );
  } catch (error) {
    console.log(error);
    return response.error(
      { msgCode: "INTERNAL_SERVER_ERROR" },
      res,
      httpStatus.INTERNAL_SERVER_ERROR
    );
  }
};

const updateState = async (req, res) => {
  try {
    const { id } = req.query;
    const content = req.body;
    const data = await common.updateById(StateMaster.model, id, content);
    return response.success(
      { msgCode: "STATE_UPDATED", data },
      res,
      httpStatus.OK
    );
  } catch (error) {
    console.log(error);
    return response.error(
      { msgCode: "INTERNAL_SERVER_ERROR" },
      res,
      httpStatus.INTERNAL_SERVER_ERROR
    );
  }
};

const deleteState = async (req, res) => {
  try {
    const { id } = req.query;
    const data = await common.removeById(StateMaster.model, id);
    return response.success(
      { msgCode: "STATE_DELETED", data },
      res,
      httpStatus.OK
    );
  } catch (error) {
    console.log(error);
    return response.error(
      { msgCode: "INTERNAL_SERVER_ERROR" },
      res,
      httpStatus.INTERNAL_SERVER_ERROR
    );
  }
};

const findState = async (req, res) => {
  try {
    const { id } = req.params;
    const data = await common.getById(StateMaster.model, id);
    return response.success(
      { msgCode: "STATE_FOUND", data: data.isDeleted ? {} : data },
      res,
      httpStatus.OK
    );
  } catch (error) {
    console.log(error);
    return response.error(
      { msgCode: "INTERNAL_SERVER_ERROR" },
      res,
      httpStatus.INTERNAL_SERVER_ERROR
    );
  }
};

module.exports = {
  addState,
  allState,
  updateState,
  deleteState,
  findState,
};
