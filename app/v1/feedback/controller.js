const httpStatus = require("http-status");
const { response } = require("../../../utils/index");
const { common, adminService } = require("../../../services/index");
const {
  Feedback,
  MasterFeedback,
  Patient,
  AppointmentFeedback,
  Notification
} = require("../../../models/index");
const { constants } = require("../../../utils/constant");
const { Types } = require("mongoose");
const { ObjectId } = require("mongoose").Types;

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
    console.log(error);
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
    console.log(error);
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
    console.log(error);
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
    console.log(error);
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
    console.log(error);
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
    const { userId } = req.data;
    const content = req.body;
    // Add points for each experience option
    const pointsMapping = {
      Yes: 1,
      "Less than 15 minutes": 1,
      "15-30 minutes": 0.75,
      "30-45 minutes": 0.5,
      "More than 1 hour": 1,
      "Doctor friendliness": 0.25,
      "Explanation of the health issue": 0.25,
      "Treatment satisfaction": 0.25,
      "Value for money": 0.25,
      Excellent: 1,
      Good: 0.75,
      "Not Good": 0.5,
      "Very Bad": 0.25,
      // Add other options mapping here
    };
    content.experience = content.experience.map((exp) => {
      if (exp.questionNo === 5) {
        let point = 0;
        exp.option.map((options) => {
          point += pointsMapping[options] || 0;
        });
        return { ...exp, point };
      } else {
        const point = pointsMapping[exp.option] || 0;
        return { ...exp, point };
      }
    });
    // Calculate total points
    content.totalPoint = content.experience.reduce(
      (total, exp) => total + exp.point,
      0
    );
    content.anonymous = content?.anonymous === "" ? false : content?.anonymous;
    const findPatient = await Patient.model.findOne({
      userId: new Types.ObjectId(userId),
    });
    content.patientId = findPatient?._id || null;
    const data = await common.create(AppointmentFeedback.model, content);
    const superadminArray = await adminService.superAdminList();
    await common.create(Notification.model, {
      userType: constants.USER_TYPES.ADMIN,
      eventType: constants.NOTIFICATION_TYPE.FEEDBACK_GIVEN_PATIENT,
      senderId: new ObjectId(userId),
      receiverId: superadminArray,
      title: constants.MESSAGES.FEEDBACK_GIVEN_PATIENT.TITLE,
      body: constants.MESSAGES.FEEDBACK_GIVEN_PATIENT.BODY,
    });
    // shoot email using 3rd party service to doctor's email , and sms.
    return response.success(
      { msgCode: "FEEDBACK_ADDED", data },
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

const allFeedback = async (req, res) => {
  try {
    const data = await common.findAll(Feedback.model, {});
    return response.success(
      { msgCode: "FEEDBACK_LIST", data },
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
    console.log(error);
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
    console.log(error);
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
    console.log(error);
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
