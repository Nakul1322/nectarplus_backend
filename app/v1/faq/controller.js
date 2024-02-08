const httpStatus = require("http-status");
const { response } = require("../../../utils/index");
const { common } = require("../../../services/index");
const {
  FAQ,
  Doctor,
  EstablishmentMaster,
  Hospital,
} = require("../../../models/index");
const { constants } = require("../../../utils/constant");
const { ObjectId } = require("mongoose").Types;

const addFAQ = async (req, res) => {
  try {
    const content = req.body;
    const data = await common.create(FAQ.model, content);
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
    let data;
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
      data = await common.findAll(FAQ.model, {
        userId: new ObjectId(findDoctor.userId),
        userType: constants.USER_TYPES.DOCTOR,
        isDeleted: false,
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
      data = await common.findAll(FAQ.model, {
        userId: new ObjectId(findEstablishmentUserId.userId),
        userType: constants.USER_TYPES.HOSPITAL,
        isDeleted: false,
      });
    } else {
      data = await common.findAll(FAQ.model, {
        userType: constants.USER_TYPES.PATIENT,
        isDeleted: false,
      });
    }
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
    const data = await common.updateById(FAQ.model, id, content);
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
    await common.removeById(FAQ.model, id); // Deleting the FAQ data
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
    const data = await common.getById(FAQ.model, id);
    return response.success({ msgCode: "FAQ_FOUND", data }, res, httpStatus.OK);
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
