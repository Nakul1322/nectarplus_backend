const httpStatus = require("http-status");
const { response, constants } = require("../../../utils/index");
const { common } = require("../../../services/index");
const {
  Video,
  Doctor,
  EstablishmentMaster,
  Hospital,
} = require("../../../models/index");
const { ObjectId } = require("mongoose").Types;

const addVideo = async (req, res) => {
  try {
    const content = req.body;
    const addVideo = await common.create(Video.model, content);
    return response.success(
      { msgCode: "VIDEO_ADDED", data: addVideo },
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

const allVideo = async (req, res) => {
  try {
    let videoList;
    const { id, establishmentId, doctorProfileSlug, establishmentProfileSlug } =
      req.query;
    if (id || doctorProfileSlug) {
      let findDoctor;
      if (doctorProfileSlug) {
        findDoctor = await common.getByCondition(Doctor.model, {
          profileSlug: doctorProfileSlug,
        });
      } else {
        findDoctor = await common.getById(Doctor.model, id);
      }
      videoList = await common.findAll(Video.model, {
        userId: new ObjectId(findDoctor.userId),
        userType: constants.USER_TYPES.DOCTOR,
      });
    } else if (establishmentId || establishmentProfileSlug) {
      let findEstablishment;
      if (establishmentProfileSlug)
        findEstablishment = await common.getByCondition(
          EstablishmentMaster.model,
          { profileSlug: establishmentProfileSlug }
        );
      else
        findEstablishment = await common.getById(
          EstablishmentMaster.model,
          establishmentId
        );
      const findEstablishmentUserId = await common.getById(
        Hospital.model,
        findEstablishment.hospitalId
      );
      videoList = await common.findAll(Video.model, {
        userId: new ObjectId(findEstablishmentUserId.userId),
        userType: constants.USER_TYPES.HOSPITAL,
      });
    } else {
      videoList = await common.findAll(Video.model, {
        userId: new ObjectId(userId),
      });
    }
    return response.success(
      {
        msgCode: "VIDEO_LIST",
        data: { count: videoList.length, data: videoList },
      },
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

const updateVideo = async (req, res) => {
  try {
    const { id } = req.query;
    const updates = req.body;
    const updateVideo = await common.updateById(Video.model, id, updates);
    return response.success(
      { msgCode: "VIDEO_UPDATED", data: updateVideo },
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

const deleteVideo = async (req, res) => {
  try {
    const { id } = req.query;
    await common.removeById(Video.model, id); // Deleting the Video data
    return response.success(
      { msgCode: "VIDEO_DELETED", data: {} },
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

const findVideo = async (req, res) => {
  try {
    const { id } = req.query;
    const videoData = await common.getById(Video.model, id);
    return response.success(
      { msgCode: "VIDEO_FOUND", data: videoData },
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
  addVideo,
  allVideo,
  updateVideo,
  deleteVideo,
  findVideo,
};
