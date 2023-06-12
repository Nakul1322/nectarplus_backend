const httpStatus = require("http-status");
const { response } = require("../../../utils/index");
const { common } = require("../../../services/index");
const { Feedback, MasterFeedback } = require("../../../models/index");
const { constants } = require("../../../utils/constant");

const addMasterFeedback = async (req, res) => {
  try {
    const content = req.body;
    const data = await common.create(MasterFeedback.model, content);
    return response.success(
      { msgCode: "MASTER_FEEDBACK_ADDED", data },
      res,
      httpStatus.OK
    );
  } catch (error) {
    console.log("🚀 ~ file: controller.js ~ line 301 ~ login ~ error", error);
    return response.error(
      { msgCode: "INTERNAL_SERVER_ERROR" },
      res,
      httpStatus.INTERNAL_SERVER_ERROR
    );
  }
};

const allMasterFeedback = async (req, res) => {
  try {
    const data = await common.findAll(MasterFeedback.model, {});
    return response.success(
      { msgCode: "MASTER_FEEDBACK_LIST", data },
      res,
      httpStatus.OK
    );
  } catch (error) {
    console.log("🚀 ~ file: controller.js ~ line 301 ~ login ~ error", error);
    return response.error(
      { msgCode: "INTERNAL_SERVER_ERROR" },
      res,
      httpStatus.INTERNAL_SERVER_ERROR
    );
  }
};

const updateMasterFeedback = async (req, res) => {
  try {
    const { id } = req.params;
    const content = req.body;
    const data = await common.updateById(MasterFeedback.model, id, content);
    return response.success(
      { msgCode: "MASTER_FEEDBACK_UPDATED", data },
      res,
      httpStatus.OK
    );
  } catch (error) {
    console.log("🚀 ~ file: controller.js ~ line 301 ~ login ~ error", error);
    return response.error(
      { msgCode: "INTERNAL_SERVER_ERROR" },
      res,
      httpStatus.INTERNAL_SERVER_ERROR
    );
  }
};

const deleteMasterFeedback = async (req, res) => {
  try {
    const { id } = req.params;
    await common.removeById(MasterFeedback.model, id); // Deleting the master feedback data
    return response.success(
      { msgCode: "MASTER_FEEDBACK_DELETED", data: {} },
      res,
      httpStatus.OK
    );
  } catch (error) {
    console.log("🚀 ~ file: controller.js ~ line 301 ~ login ~ error", error);
    return response.error(
      { msgCode: "INTERNAL_SERVER_ERROR" },
      res,
      httpStatus.INTERNAL_SERVER_ERROR
    );
  }
};

const findMasterFeedback = async (req, res) => {
  try {
    const { id } = req.params;
    const data = await common.getById(MasterFeedback.model, id);
    return response.success(
      { msgCode: "MASTER_FEEDBACK_FOUND", data },
      res,
      httpStatus.OK
    );
  } catch (error) {
    console.log("🚀 ~ file: controller.js ~ line 301 ~ login ~ error", error);
    return response.error(
      { msgCode: "INTERNAL_SERVER_ERROR" },
      res,
      httpStatus.INTERNAL_SERVER_ERROR
    );
  }
};

//******************************************************   FEEDBACK MODULE  ***********************************************************************/
const addFeedback = async (req, res) => {
  try {
    const content = req.body;
    const data = await common.create(Feedback.model, content);
    return response.success(
      { msgCode: "FEEDBACK_ADDED", data },
      res,
      httpStatus.OK
    );
  } catch (error) {
    console.log("🚀 ~ file: controller.js ~ line 301 ~ login ~ error", error);
    return response.error(
      { msgCode: "INTERNAL_SERVER_ERROR" },
      res,
      httpStatus.INTERNAL_SERVER_ERROR
    );
  }
};

const allFeedback = async (req, res) => {
  try {
    const data = await common.findAll(Feedback.model, {});
    return response.success(
      { msgCode: "FEEDBACK_LIST", data },
      res,
      httpStatus.OK
    );
  } catch (error) {
    console.log("🚀 ~ file: controller.js ~ line 301 ~ login ~ error", error);
    return response.error(
      { msgCode: "INTERNAL_SERVER_ERROR" },
      res,
      httpStatus.INTERNAL_SERVER_ERROR
    );
  }
};

const updateFeedback = async (req, res) => {
  try {
    const { id } = req.params;
    const content = req.body;
    const data = await common.updateById(Feedback.model, id, content);
    return response.success(
      { msgCode: "FEEDBACK_UPDATED", data },
      res,
      httpStatus.OK
    );
  } catch (error) {
    console.log("🚀 ~ file: controller.js ~ line 301 ~ login ~ error", error);
    return response.error(
      { msgCode: "INTERNAL_SERVER_ERROR" },
      res,
      httpStatus.INTERNAL_SERVER_ERROR
    );
  }
};

const deleteFeedback = async (req, res) => {
  try {
    const { id } = req.params;
    await common.removeById(Feedback.model, id); // Deleting the feedback data
    return response.success(
      { msgCode: "FEEDBACK_DELETED", data: {} },
      res,
      httpStatus.OK
    );
  } catch (error) {
    console.log("🚀 ~ file: controller.js ~ line 301 ~ login ~ error", error);
    return response.error(
      { msgCode: "INTERNAL_SERVER_ERROR" },
      res,
      httpStatus.INTERNAL_SERVER_ERROR
    );
  }
};

const findFeedback = async (req, res) => {
  try {
    const { id } = req.params;
    const data = await common.getById(Feedback.model, id);
    return response.success(
      { msgCode: "FEEDBACK_FOUND", data },
      res,
      httpStatus.OK
    );
  } catch (error) {
    console.log("🚀 ~ file: controller.js ~ line 301 ~ login ~ error", error);
    return response.error(
      { msgCode: "INTERNAL_SERVER_ERROR" },
      res,
      httpStatus.INTERNAL_SERVER_ERROR
    );
  }
};

module.exports = {
  addMasterFeedback,
  allMasterFeedback,
  updateMasterFeedback,
  deleteMasterFeedback,
  findMasterFeedback,
  addFeedback,
  allFeedback,
  updateFeedback,
  deleteFeedback,
  findFeedback,
};
