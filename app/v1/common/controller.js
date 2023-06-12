const httpStatus = require("http-status");
const { common, hospital } = require("../../../services/index");
const { response, constants } = require("../../../utils/index");
const { readExcelFile } = require("../../../utils/helper");
const { getPagination } = require('../../../utils/helper');
const {
  Hospital,
  Doctor,
  Specialization,
  DegreeMaster,
  User,
  HospitalType,
  Patient, 
  Admin
} = require("../../../models/index");
const { imageUpload } = require("../../../utils/imageUpload")

const uploadFile = (req, res, next) => {
  if (!req?.files?.file[0]) {
    return response.error(
      { msgCode: "MISSING_FILE" },
      res,
      httpStatus.BAD_REQUEST
    );
  }
  const file = req?.files?.file[0];

  const ALLOWD_FILES = ["png", "jpeg", "jpg", "pdf"];
  const ALLOWD_FILES_TYPES = [
    "image/png",
    "image/jpeg",
    "image/jpg",
    "application/pdf",
  ];
  // Allowed file size in mb
  const ALLOWED_FILE_SIZE = 5 * 1024 * 1024;
  // Get the extension of the uploaded file
  // const fileExtension = path.extname(file?.fieldName).slice(1);

  // Check if the uploaded file is allowed
  if (
    // !ALLOWD_FILES.includes(fileExtension) ||
    !ALLOWD_FILES_TYPES.includes(file.mimetype)
  ) {
    //throw Error('Invalid file');
    return response.error(
      { msgCode: "NOT_VALID_IMAGE" },
      res,
      httpStatus.BAD_REQUEST
    );
  }

  if (file.size > ALLOWED_FILE_SIZE) {
    return response.error(
      { msgCode: "IMAGE_IS_LARGE" },
      res,
      httpStatus.BAD_REQUEST
    );
  }
  return next();
};

const addFile = async (req, res) => {
  try {
    const file = req?.files?.file[0];
    const fileUpload = await imageUpload(file);

    if (!fileUpload) {
      response.error({ msgCode: "FILE_NOT_ADDED" }, res, httpStatus.FORBIDDEN);
    }
    response.success(
      { msgCode: "FILE_ADDED", data: { uri: fileUpload } },
      res,
      httpStatus.OK
    );
  } catch (error) {
    return response.error(
      { msgCode: "INTERNAL_SERVER_ERROR" },
      res,
      httpStatus.INTERNAL_SERVER_ERROR
    );
  }
};

const importDataToDoctor = async (req, res) => {
  try {
    const { file } = req.files;
    // Read data from the Excel file
    const rows = await readExcelFile(file.tempFilePath, file.name, 1);

    for (const row of rows) {
      const specializations =
        row.Specialization && typeof row.Specialization === "string"
          ? row.Specialization.split(",")
          : [];
      const specializationDocs = await Specialization.model.find({
        name: { $in: specializations },
      });
      const specializationIds = specializationDocs.map((doc) => doc._id);

      const degrees =
        row.Degree && typeof row.Degree === "string"
          ? row.Degree.split(",")
          : [];
      const degreeMasterIds = [];
      for (const degreeName of degrees) {
        let degreeMaster = await DegreeMaster.model.findOne({
          name: degreeName,
        });
        if (!degreeMaster) {
          degreeMaster = new DegreeMaster.model({
            name: degreeName,
            // Add createdBy and modifiedBy if needed
          });
          await degreeMaster.save();
        }
        degreeMasterIds.push(degreeMaster._id);
      }

      const newUser = new User.model({
        phone: row.Mobile,
        fullName: row.Name,
        // Add any other required fields for the User model
      });
      await newUser.save();

      const newDoctor = new Doctor.model({
        profilePic: row.Image,
        specialization: specializationIds,
        address: row.Locality,
        education: degreeMasterIds,
        email: row.Email,
        joiningDate: row.joiningDate,
        userId: newUser._id,
        // Add any other required fields for the Doctor model
      });
      await newDoctor.save();
    }

    console.log("Data imported successfully!");
    response.success({ msgCode: "FILE_ADDED" }, res, httpStatus.OK);
  } catch (error) {
    console.error("Error in importDataToDoctor:", error); // Log the error message
    return response.error(
      { msgCode: "INTERNAL_SERVER_ERROR" },
      res,
      httpStatus.INTERNAL_SERVER_ERROR
    );
  }
};

const importDataToHospital = async (req, res) => {
  try {
    const { file } = req.files;
    // Read data from the Excel file
    const rows = await readExcelFile(file.tempFilePath, file.name, 2);

    for (const row of rows) {
      const specializations =
        row.Specialization && typeof row.Specialization === "string"
          ? row.Specialization.split(",")
          : [];
      const specializationDocs = await Specialization.model.find({
        name: { $in: specializations },
      });
      const specializationIds = specializationDocs.map((doc) => doc._id);
      const typeOfHospital =
        row["Type of Hospital"] && typeof row["Type of Hospital"] === "string"
          ? row["Type of Hospital"].split(",")
          : [];
      const hospitalTypeIds = [];
      for (const typeName of typeOfHospital) {
        let hosptialTypes = await HospitalType.model.findOne({
          name: typeName,
        });
        if (!hosptialTypes) {
          hosptialTypes = new HospitalType.model({
            name: typeName,
            // Add createdBy and modifiedBy if needed
          });
          await hosptialTypes.save();
        }
        hospitalTypeIds.push(hosptialTypes._id);
      }

      const newUser = new User.model({
        phone: row.Mobile,
        fullName: row.Name,
        // Add any other required fields for the User model
      });
      await newUser.save();

      const newHospital = new Hospital.model({
        image: [{ url: row.Image }],
        specialization: specializationIds,
        address: row.Locality,
        hospitalType: hospitalTypeIds,
        totalDoctor: row['Total Doctors'],
        joiningDate: row.joiningDate,
        userId: newUser._id,
        // Add any other required fields for the Doctor model
      });
      await newHospital.save();
    }

    console.log("Data imported successfully!");
    response.success({ msgCode: "FILE_ADDED" }, res, httpStatus.OK);
  } catch (error) {
    console.error("Error in importDataToDoctor:", error); // Log the error message
    return response.error(
      { msgCode: "INTERNAL_SERVER_ERROR" },
      res,
      httpStatus.INTERNAL_SERVER_ERROR
    );
  }
};

const checkEmailExists = async (req, res) => {
  try {
      const { search } = req.query;
      const condition = {
        '$or': [{
          'email': { $regex: new RegExp(`^${search}$`, 'i') }
        }]
      };
      const dataDoctor = await common.count(Doctor.model, condition);
      const dataAdmin = await common.count(Admin.model, condition);
      const dataPatient = await common.count(Patient.model, condition);
      const msgCode = (dataDoctor + dataAdmin + dataPatient > 0) ? "EMAIL_EXISTS" : "EMAIL_AVAILABLE"
      return response.success(
        { msgCode, data: { isTaken: dataDoctor + dataAdmin + dataPatient > 0 }  },
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

const medicalRegistrationExists = async (req, res) => {
  try {
      const { search } = req.query;
      const condition = {
        '$or': [{
          'medicalRegistration.registrationNumber': { $regex: new RegExp(`^${search}$`, 'i') }
        }]
      };
      const dataDoctor = await common.count(Doctor.model, condition);
      const msgCode = (dataDoctor > 0) ? "MEDICAL_REGISTRATION_EXISTS" : "MEDICAL_REGISTRATION_AVAILABLE"
      return response.success(
        { msgCode, data: { isTaken: dataDoctor > 0 }  },
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

const hospitalListByAddress = async (req, res) => {
  try {
    const { search, sort, page, size, sortOrder } = req.query;
      const condition = {
        'userType': constants.USER_TYPES.HOSPITAL,
        '$or': [{
          'fullName': { $regex:  new RegExp(search, 'i') }
        }]
      };
      const sortCondition = {};
      let sortKey = sort;
      if (constants.NAME_CONSTANT.includes(sort)) sortKey = 'lowerName'
      else sortKey = sort || 'createdAt';
      sortCondition[`${sortKey}`] = constants.LIST.ORDER[sortOrder || 'DESC'];
      const { offset, limit } = getPagination(page, size);  
      const hospitalQuery = { "hospital.address.landmark": { $exists: true } }
      const hospitalList = await hospital.hospitalListForAddress(condition, sortCondition, offset, limit, hospitalQuery);
      const msgCode = hospitalList.count === 0 ? 'NO_RECORD_FETCHED' : 'ACT_RULE_LIST';
      return response.success({ msgCode, data: hospitalList }, res, httpStatus.OK);
    } catch (error) {
      return response.error(
          { msgCode: "INTERNAL_SERVER_ERROR" },
          res,
          httpStatus.INTERNAL_SERVER_ERROR
      );
  }
};

module.exports = {
  uploadFile,
  addFile,
  importDataToDoctor,
  importDataToHospital,
  checkEmailExists,
  hospitalListByAddress,
  medicalRegistrationExists
};
