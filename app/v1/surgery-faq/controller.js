const httpStatus = require("http-status");
const { response } = require("../../../utils/index");
const { common } = require("../../../services/index");
const { SurgeryFAQ, SurgeryMaster } = require("../../../models/index");
const { ObjectId } = require("mongoose").Types;

const addFAQ = async (req, res) => {
  try {
    const content = req.body;
    const data = await common.create(SurgeryFAQ.model, content);
    return response.success({ msgCode: "FAQ_ADDED", data }, res, httpStatus.OK);
  } catch (error) {
    console.log(error);
    return response.error(
      { msgCode: "INTERNAL_SERVER_ERROR" },
      res,
      httpStatus.INTERNAL_SERVER_ERROR
    );
  }
};

const allFAQ = async (req, res) => {
  try {
    const { surgeryId, slug } = req.query;
    const condition = {
      isDeleted: false,
    };
    if (surgeryId) condition.surgeryId = new ObjectId(surgeryId);
    if (slug) {
      const surgeryMaster = await common.getByCondition(SurgeryMaster.model, {
        slug,
      });
      condition.surgeryId = surgeryMaster._id;
    }
    const data = await common.findAll(SurgeryFAQ.model, condition);
    return response.success(
      { msgCode: "FAQ_LIST", data: { count: data?.length || 0, data } },
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

const updateFAQ = async (req, res) => {
  try {
    const { id } = req.params;
    const content = req.body;
    const data = await common.updateById(SurgeryFAQ.model, id, content);
    return response.success(
      { msgCode: "FAQ_UPDATED", data },
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

const deleteFAQ = async (req, res) => {
  try {
    const { id } = req.params;
    await common.updateById(SurgeryFAQ.model, id, { isDeleted: true }); // Deleting the FAQ data
    return response.success(
      { msgCode: "FAQ_DELETED", data: {} },
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

const findFAQ = async (req, res) => {
  try {
    const { id } = req.params;
    const data = await common.getById(SurgeryFAQ.model, id);
    return response.success(
      { msgCode: "FAQ_FOUND", data: data.isDeleted ? {} : data },
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
  addFAQ,
  allFAQ,
  updateFAQ,
  deleteFAQ,
  findFAQ,
};
