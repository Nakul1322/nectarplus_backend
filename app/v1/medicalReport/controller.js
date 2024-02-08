const httpStatus = require("http-status");
const { response } = require("../../../utils/index");
const { common, patient } = require("../../../services/index");
const {
  MedicalReport,
  Doctor,
  EstablishmentMaster,
  Hospital,
} = require("../../../models/index");
const { constants } = require("../../../utils/constant");
const { getPagination } = require("../../../utils/helper");
const { ObjectId } = require("mongoose").Types;

const addMedicalReports = async (req, res) => {
  try {
    const content = req.body;
    const decode = req.data;
    content.userId = decode.userId;
    const data = await common.create(MedicalReport.model, content);
    return response.success(
      { msgCode: "MEDICAL_REPORT_ADDED", data },
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

const allMedicalReports = async (req, res) => {
  try {
    const decode = req.data;
    const { page, size, from, to } = req.query;
    const { limit, offset } = getPagination(page, size);
    const condition = {
      userId: new ObjectId(decode.userId),
      status: { $ne: -1 },
    };
    if (from && to) {
      condition["date"] = {
        $gte: from,
        $lte: to,
      };
    }
    const patientHospitalRecord = await patient.medicalReportList(
      condition,
      offset,
      limit
    );

    const msgCode = !patientHospitalRecord?.count
      ? "NO_RECORD_FETCHED"
      : "MEDICAL_REPORT_LIST";
    return response.success(
      { msgCode, data: patientHospitalRecord },
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

const updateMedicalReports = async (req, res) => {
  try {
    const { id } = req.params;
    const content = req.body;
    const data = await common.updateById(MedicalReport.model, id, content);
    return response.success(
      { msgCode: "MEDICAL_REPORT_UPDATED", data },
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

const deleteMedicalReports = async (req, res) => {
  try {
    const { id } = req.params;
    await common.removeById(MedicalReport.model, id); // Deleting the MedicalReports data
    return response.success(
      { msgCode: "MEDICAL_REPORT_DELETED", data: {} },
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

const findMedicalReports = async (req, res) => {
  try {
    const { id } = req.params;
    const data = await common.getById(MedicalReport.model, id);
    return response.success(
      { msgCode: "MEDICAL_REPORT_FOUND", data },
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

const medicalReportsUrlUpdate = async (req, res) => {
  try {
    const { id } = req.params;
    const content = req.body;
    const data = await common.push(
      MedicalReport.model,
      { _id: new ObjectId(id) },
      content
    );
    return response.success(
      { msgCode: "MEDICAL_REPORT_DELETED", data },
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

const medicalReportsUrlDelete = async (req, res) => {
  try {
    const { id } = req.params;
    const data = await common.updateByCondition(
      MedicalReport.model,
      { "url._id": new ObjectId(id) },
      { "url.$.status": 1 }
    );
    return response.success(
      { msgCode: "MEDICAL_REPORT_DELETED", data },
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

const medicalReportsDelete = async (req, res) => {
  try {
    const { id } = req.params;
    const data = await common.updateById(MedicalReport.model, id, {
      status: -1,
    });
    return response.success(
      { msgCode: "MEDICAL_REPORT_DELETED", data },
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
  addMedicalReports,
  allMedicalReports,
  updateMedicalReports,
  deleteMedicalReports,
  findMedicalReports,
  medicalReportsUrlUpdate,
  medicalReportsUrlDelete,
  medicalReportsDelete,
};
