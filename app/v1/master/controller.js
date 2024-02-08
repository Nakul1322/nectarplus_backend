const httpStatus = require("http-status");
const { response } = require("../../../utils/index");
const { common, adminService } = require("../../../services/index");
const { constants } = require("../../../utils/constant");
const { ObjectId } = require("mongoose").Types;
const { getPagination } = require("../../../utils/helper");
const {
  HospitalType,
  StateMaster,
  ProcedureMaster,
  SurgeryMaster,
  SocialMedia,
  Specialization,
  Doctor,
  Hospital,
  EstablishmentMaster,
  User,
} = require("../../../models/index");
const slugify = require("slugify");

const MASTER_DATA_MODELS = {
  1: HospitalType,
  2: StateMaster,
  4: ProcedureMaster,
  8: SurgeryMaster,
  9: SocialMedia,
  10: Specialization,
};

const MASTER_DATA_MODELS_REQ_URL = {
  "hospital-type": HospitalType,
  state: StateMaster,
  procedure: ProcedureMaster,
  surgery: SurgeryMaster,
  "social-media": SocialMedia,
  specialization: Specialization,
};

const addMaster = async (req, res) => {
  try {
    const { type, content } = req.body;
    const model = MASTER_DATA_MODELS[type].model;
    const { name } = content;
    const findMaster = await common.getByCondition(model, {
      name,
    });
    if (findMaster)
      return response.error(
        { msgCode: "MASTER_EXISTS" },
        res,
        httpStatus.BAD_REQUEST
      );

    const baseSlug = slugify(name, {
      lower: true,
      remove: undefined,
      strict: true,
    });
    content.slug = baseSlug;
    const data = await common.create(model, content);
    return response.success(
      { msgCode: "MASTER_ADDED", data },
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

const getAllMasterDataList = async (req, res) => {
  try {
    const { type, search, sort, page, size, sortOrder, recordId } = req.query;
    const isExport = true;
    const model = MASTER_DATA_MODELS[type].model;
    const sortCondition = {};
    sortCondition[`${sort}`] = constants.LIST.ORDER[sortOrder];

    const { limit, offset } = getPagination(page, size);
    const condition = {
      $or: [
        {
          name: { $regex: new RegExp(search, "i") },
        },
      ],
      isDeleted: false,
    };
    if (type === constants.MASTER_DATA.CITY)
      condition.stateId = new ObjectId(recordId);
    const data = await common.getMasterData(
      model,
      condition,
      sortCondition,
      offset,
      limit,
      isExport
    );
    return response.success(
      { msgCode: "MASTER_LIST", data },
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

const updateMaster = async (req, res) => {
  try {
    const { id } = req.params;
    const { type } = req.query;
    const model = MASTER_DATA_MODELS[type].model;
    const content = req.body;
    content.name = content?.name.trim();
    const data = await common.updateById(model, id, content);
    return response.success(
      { msgCode: "MASTER_UPDATED", data },
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

const deleteMaster = async (req, res) => {
  try {
    const { id } = req.params;
    const { type } = req.query;
    const model = MASTER_DATA_MODELS[type].model;
    if (type === 4) {
      const doctorCount = await common.count(Doctor.model, {
        procedure: new ObjectId(id),
      });
      const hospitalCount = await common.count(Hospital.model, {
        procedure: new ObjectId(id),
      });
      if (doctorCount + hospitalCount > 0)
        return response.error(
          { msgCode: "MASTER_NOT_DELETED", data: {} },
          res,
          httpStatus.BAD_REQUEST
        );
    }
    if (type === 10) {
      const doctorCount = await common.count(Doctor.model, {
        specialization: new ObjectId(id),
      });
      if (doctorCount > 0)
        return response.error(
          { msgCode: "MASTER_NOT_DELETED", data: {} },
          res,
          httpStatus.BAD_REQUEST
        );
    }
    const data = await common.updateById(model, id, { isDeleted: true });
    return response.success(
      { msgCode: "MASTER_DELETED", data },
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

const getMasterDataByID = async (req, res) => {
  try {
    const { id } = req.params;
    const { type } = req.query;
    const model = MASTER_DATA_MODELS[type].model;
    const data = await common.getById(model, id);
    return response.success(
      { msgCode: "MASTER_FOUND", data },
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

const getAllMasterData = async (req, res) => {
  try {
    const { search, sort, page, size, sortOrder } = req.query;
    const model =
      MASTER_DATA_MODELS_REQ_URL[req.url.split("/")[1].split("?")[0]].model;
    const isExport = true;
    const sortCondition = {};
    if (req.url.split("/")[1].split("?")[0] === "specialization")
      sortCondition["name"] = constants.LIST.ORDER.ASC;
    else sortCondition[`${sort}`] = constants.LIST.ORDER[sortOrder];

    const { limit, offset } = getPagination(page, size);
    const condition = {
      isDeleted: false,
      $or: [
        {
          name: { $regex: new RegExp(search, "i") },
        },
      ],
    };
    const data = await common.getMasterData(
      model,
      condition,
      sortCondition,
      offset,
      limit,
      isExport
    );
    return response.success(
      { msgCode: "MASTER_LIST", data },
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

const littleToCriticalIssueList = async (req, res) => {
  try {
    const { specializationMasterList } =
      await adminService.specializationMaster(constants.arrayForSpecialization);
    return response.success(
      { msgCode: "MASTER_LIST", data: specializationMasterList },
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

// Doctor
const generateSlug = async (req, res) => {
  try {
    const model = User.model;
    const allSpecializations = await common.findAll(model, {
      userType: 2,
    });
    const specializationCount = {};
    await allSpecializations.map(async (specialization) => {
      let slugStr = "";
      const doctor = await common.getByCondition(Doctor.model, {
        userId: specialization._id,
      });
      const specializationMaster = await common.getById(
        Specialization.model,
        doctor.specialization[0]
      );
      const isValid =
        specialization?.fullName && specializationMaster?.name ? true : false;
      if (isValid)
        slugStr =
          slugStr +
          " " +
          specialization?.fullName +
          " " +
          specializationMaster?.name;
      else slugStr = "test data";
      const baseSlug = slugify(slugStr, {
        lower: true,
        remove: undefined,
        strict: true,
      });
      let slug = baseSlug.trim();
      let slugCount = 1;
      while (true) {
        const existingData = await Doctor.model.findOne({
          profileSlug: slug,
          _id: { $ne: specialization._id },
        });
        if (!existingData) {
          const operation = await common.updateById(Doctor.model, doctor?._id, {
            profileSlug: slug,
          });
          console.log(operation.profileSlug);
          break;
        }
        slug = `${baseSlug.trim()}-${slugCount}`;
        slugCount++;
        console.log(slug)
      }
    });
    allSpecializations.map((specialization) => {
      specializationCount[`${specialization.profileSlug}`] =
        specializationCount[`${specialization.profileSlug}`]?.count + 1 || 1;
    });

    return response.success(
      { msgCode: "SUCCESS", data: specializationCount },
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
  addMaster,
  getAllMasterData,
  updateMaster,
  deleteMaster,
  getMasterDataByID,
  getAllMasterDataList,
  littleToCriticalIssueList,
  generateSlug,
};
