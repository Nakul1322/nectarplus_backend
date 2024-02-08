const { patient, common } = require("../../../services/index");
const {
  response,
  constants,
  getAgeGroup,
  getBloodGroup,
} = require("../../../utils/index");
const moment = require("moment");
const httpStatus = require("http-status");
const { getPagination } = require("../../../utils/helper");
const {
  User,
  Appointment,
  PatientClinicalRecord,
  Patient,
  Doctor,
  Hospital,
} = require("../../../models/index");
const doctor = require("../../../models/doctor");
const user = require("../../../models/user");
const { ObjectId } = require("mongoose").Types;

const patientList = async (req, res) => {
  try {
    const {
      search,
      sort,
      page,
      size,
      sortOrder,
      bloodGroup,
      gender,
      age,
      isExport,
    } = req.query;
    const sortCondition = {};
    let sortKey = sort;
    if (constants.NAME_CONSTANT.includes(sort)) sortKey = "lowerName";
    sortCondition[`${sortKey}`] = constants.LIST.ORDER[sortOrder];

    const { limit, offset } = getPagination(page, size);
    const condition = {
      userType: constants.USER_TYPES.PATIENT,
    };

    if (gender) condition["patient.gender"] = gender;
    if (bloodGroup) {
      const bloodGroups = getBloodGroup(bloodGroup);
      condition["patient.bloodGroup"] = { $in: bloodGroups };
    }
    if (age) {
      condition["$or"] = getAgeGroup(age);
    }
    const searchQuery = {
      $or: [
        {
          fullName: { $regex: new RegExp(search, "i") },
        },
        {
          phone: { $regex: new RegExp(search, "i") },
        },
      ],
    };
    const patientDataList = await patient.patientList(
      condition,
      sortCondition,
      offset,
      limit,
      searchQuery,
      isExport
    );

    const msgCode = !patientDataList?.count
      ? "NO_RECORD_FETCHED"
      : "PATIENT_LIST";
    return response.success(
      { msgCode, data: patientDataList },
      res,
      httpStatus.OK
    );
  } catch (error) {
    return response.error(
      { msgCode: "SOMETHING_WENT_WRONG" },
      res,
      httpStatus.SOMETHING_WENT_WRONG
    );
  }
};

const getPatientRecord = async (req, res) => {
  try {
    const { patientId, appointmentId } = req.query;
    let condition = {
      userType: constants.USER_TYPES.PATIENT,
      status: { $ne: constants.PROFILE_STATUS.DELETE },
      _id: patientId,
    };

    const patientRecord = await common.getByCondition(User.model, condition);
    if (!patientRecord)
      response.success(
        { msgCode: "USER_NOT_FOUND" },
        res,
        httpStatus.NOT_FOUND
      );

    condition = { _id: appointmentId };
    const appointmentRecord = await common.getByCondition(
      Appointment.model,
      condition
    );
    if (!appointmentRecord)
      response.success(
        { msgCode: "APPOINTMENT_NOT_FOUND" },
        res,
        httpStatus.NOT_FOUND
      );

    condition = { appointmentId, userId: patientId };
    const clinicalRecord = await common.getByCondition(
      PatientClinicalRecord.model,
      condition
    );

    const msgCode = !clinicalRecord
      ? "NO_RECORD_FETCHED"
      : "PATIENT_CLINICAL_RECORD";
    return response.success(
      { msgCode, data: clinicalRecord },
      res,
      httpStatus.OK
    );
  } catch (error) {
    return response.error(
      { msgCode: "SOMETHING_WENT_WRONG" },
      res,
      httpStatus.SOMETHING_WENT_WRONG
    );
  }
};

const getPatientList = async (req, res) => {
  try {
    const { userId } = req.data;
    const doctorData = await common.getByCondition(Doctor.model, {
      userId: new ObjectId(userId),
    });
    if (!doctorData)
      return response.success(
        { msgCode: "NOT_FOUND" },
        res,
        httpStatus.NOT_FOUND
      );

    const { search, sort, page, size, sortOrder, type } = req.query;
    const sortCondition = {};
    sortCondition[`${sort}`] = constants.LIST.ORDER[sortOrder];

    const { limit, offset } = getPagination(page, size);
    const searchQuery = search || "";
    const condition = { doctorId: new ObjectId(doctorData?._id), self: true };
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).setHours(
      24,
      0,
      0,
      0
    );
    const today = new Date(Date.now()).setHours(24, 0, 0, 0);
    if (type === constants.DOCTOR_PATIENT_LIST.TODAY)
      condition.date = { $gte: new Date(yesterday), $lte: new Date(today) };
    const patientData = await patient.getPatientList(
      condition,
      sortCondition,
      offset,
      limit,
      searchQuery
    );

    const msgCode =
      patientData.count === 0 ? "NO_RECORD_FETCHED" : "PATIENT_CLINICAL_RECORD";
    return response.success({ msgCode, data: patientData }, res, httpStatus.OK);
  } catch (error) {
    console.log(error);
    return response.error(
      { msgCode: "SOMETHING_WENT_WRONG" },
      res,
      httpStatus.SOMETHING_WENT_WRONG
    );
  }
};

const addPatientRecord = async (req, res) => {
  try {
    const { patientId, appointmentId } = req.query;
    const { type, records } = req.body;

    const recordKey = constants.PATIENT_CLINICAL_RECORDS_KEY[type];

    const condition = { appointmentId, userId: patientId };
    const clinicalRecord = await common.getByCondition(
      PatientClinicalRecord.model,
      condition
    );
    if (clinicalRecord) {
      if (recordKey in clinicalRecord) {
        return response.error(
          { msgCode: "CLINICAL_RECORD_EXISTS" },
          res,
          httpStatus.FORBIDDEN
        );
      } else {
        const updates = {};
        updates[`${recordKey}`] = records;
        const updateRecord = await common.updateByCondition(
          PatientClinicalRecord.model,
          condition,
          updates
        );
        if (!updateRecord)
          return response.error(
            { msgCode: "UPDATE_ERROR" },
            res,
            httpStatus.FORBIDDEN
          );
        return response.success(
          { msgCode: "CLINICAL_RECORD_ADDED" },
          res,
          httpStatus.OK
        );
      }
    } else {
      const addRecord = {};
      addRecord[`${recordKey}`] = records;
      const addedRecord = await common.create(
        PatientClinicalRecord.model,
        addRecord
      );
      if (!addedRecord)
        return response.error(
          { msgCode: "FAILED_TO_ADD" },
          res,
          httpStatus.FORBIDDEN
        );
      return response.success(
        { msgCode: "CLINICAL_RECORD_ADDED", data: addedRecord },
        res,
        httpStatus.OK
      );
    }
  } catch (error) {
    return response.error(
      { msgCode: "SOMETHING_WENT_WRONG" },
      res,
      httpStatus.SOMETHING_WENT_WRONG
    );
  }
};

const editPatientRecord = async (req, res) => {
  try {
    const { patientId, appointmentId } = req.query;
    const { type, records } = req.body;

    const recordKey = constants.PATIENT_CLINICAL_RECORDS_KEY[type];

    const condition = { appointmentId, userId: patientId };
    condition[`${recordKey}.isDeleted`] = false;
    const clinicalRecord = await common.getByCondition(
      PatientClinicalRecord.model,
      condition
    );
    if (!clinicalRecord)
      return response.error(
        { msgCode: "CLINICAL_RECORD_NOT_FOUND" },
        res,
        httpStatus.FORBIDDEN
      );
    const updates = {};
    if (
      type === constants.PATIENT_CLINICAL_RECORDS.VITAL_SIGNS ||
      type === constants.PATIENT_CLINICAL_RECORDS.CLINICAL_NOTES
    )
      updates[`${recordKey}`] = records;
    else
      updates[`${recordKey}.$`] = { ...userDetails[recordKey][0], ...records };
    const updateRecord = await common.updateByCondition(
      PatientClinicalRecord.model,
      condition,
      updates
    );
    if (!updateRecord)
      return response.error(
        { msgCode: "UPDATE_ERROR" },
        res,
        httpStatus.FORBIDDEN
      );
    return response.success(
      { msgCode: "CLINICAL_RECORD_UPDATED" },
      res,
      httpStatus.OK
    );
  } catch (error) {
    return response.error(
      { msgCode: "SOMETHING_WENT_WRONG" },
      res,
      httpStatus.SOMETHING_WENT_WRONG
    );
  }
};

const patientAppointmentList = async (req, res) => {
  try {
    const { userId } = req.data;
    const { patientId, status, toDate, fromDate } = req.query;
    const doctorUser = await common.getByCondition(Doctor.model, {
      userId: new ObjectId(userId),
    });
    if (!doctorUser)
      return response.error(
        { msgCode: "NOT_FOUND" },
        res,
        httpStatus.NOT_FOUND
      );

    const condition = {
      doctorId: new ObjectId(doctorUser._id),
      patientId: new ObjectId(patientId),
    };
    if (status || status === constants.BOOKING_STATUS.BOOKED)
      condition.status = status;
    else condition["status"] = { $ne: constants.BOOKING_STATUS.RESCHEDULE };
    if (fromDate) condition.date = { $gte: fromDate, $lte: toDate };
    else condition.date = { $lte: toDate };
    const appointmentList = await patient.appointmentList(condition);
    const msgCode =
      appointmentList.count === 0
        ? "NO_RECORD_FETCHED"
        : "APPOINTMENT_LIST_FETCHED";
    return response.success(
      { msgCode, data: appointmentList },
      res,
      httpStatus.OK
    );
  } catch (error) {
    console.log(error);
    return response.error(
      { msgCode: "SOMETHING_WENT_WRONG" },
      res,
      httpStatus.SOMETHING_WENT_WRONG
    );
  }
};

const getPatientData = async (req, res) => {
  try {
    const { patientId } = req.query;
    const condition = {
      _id: new ObjectId(patientId),
    };

    const userDetails = await patient.getPatientData(condition);
    if (!userDetails) {
      return response.error(
        { msgCode: "USER_NOT_FOUND" },
        res,
        httpStatus.NOT_FOUND
      );
    }
    return response.success(
      { msgCode: "PATIENT_DATA", data: userDetails },
      res,
      httpStatus.OK
    );
  } catch (error) {
    console.log(error);
    return response.error(
      { msgCode: "SOMETHING_WENT_WRONG" },
      res,
      httpStatus.SOMETHING_WENT_WRONG
    );
  }
};

const editPatientData = async (req, res) => {
  try {
    const { patientId } = req.query;
    const {
      email,
      bloodGroup,
      gender,
      dob,
      address,
      languagePreference,
      profilePic,
    } = req.body;
    const condition = {
      _id: new ObjectId(patientId),
    };

    const userDetails = await common.getByCondition(Patient.model, condition);
    if (!userDetails) {
      return response.error(
        { msgCode: "USER_NOT_FOUND" },
        res,
        httpStatus.NOT_FOUND
      );
    }

    const updates = {
      email,
      bloodGroup,
      gender,
      dob,
      address,
      languagePreference,
      profilePic,
    };
    const updateRecord = await common.updateByCondition(
      Patient.model,
      condition,
      updates
    );
    if (!updateRecord)
      return response.error(
        { msgCode: "UPDATE_ERROR" },
        res,
        httpStatus.FORBIDDEN
      );
    return response.success(
      { msgCode: "PATIENT_DATA_UPDATED" },
      res,
      httpStatus.OK
    );
  } catch (error) {
    return response.error(
      { msgCode: "SOMETHING_WENT_WRONG" },
      res,
      httpStatus.SOMETHING_WENT_WRONG
    );
  }
};

const hospitalPatientList = async (req, res) => {
  try {
    const { userId } = req.data;
    const { establishmentMasterId } = await patient.getEstablishmentId(
      Hospital.model,
      { userId: new ObjectId(userId) }
    );
    const { search, sort, page, size, sortOrder, isExport } = req.query;
    const sortCondition = {};
    let sortKey = sort;
    if (constants.NAME_CONSTANT.includes(sort)) sortKey = "lowerName";
    sortCondition[`${sortKey}`] = constants.LIST.ORDER[sortOrder];

    const { limit, offset } = getPagination(page, size);
    const searchQuery = {
      $or: [
        {
          "patientUser.fullName": { $regex: new RegExp(search, "i") },
        },
        {
          "patientUser.phone": { $regex: new RegExp(search, "i") },
        },
      ],
    };
    const condition = { establishmentId: new ObjectId(establishmentMasterId) };
    const hospitalPatientData = await patient.hospitalPatientList(
      condition,
      sortCondition,
      offset,
      limit,
      searchQuery,
      isExport
    );

    const msgCode = !hospitalPatientData?.count
      ? "NO_RECORD_FETCHED"
      : "PATIENT_LIST";
    return response.success(
      { msgCode, data: hospitalPatientData },
      res,
      httpStatus.OK
    );
  } catch (error) {
    console.log(error);
    return response.error(
      { msgCode: "SOMETHING_WENT_WRONG" },
      res,
      httpStatus.SOMETHING_WENT_WRONG
    );
  }
};

const patientHistoryRecordHospital = async (req, res) => {
  try {
    const { userId } = req.data;
    const { establishmentMasterId } = await patient.getEstablishmentId(
      Hospital.model,
      { userId: new ObjectId(userId) }
    );
    const { search, sort, page, size, sortOrder, patientId } = req.query;
    const sortCondition = {};
    let sortKey = sort;
    if (constants.NAME_CONSTANT.includes(sort)) sortKey = "lowerName";
    sortCondition[`${sortKey}`] = constants.LIST.ORDER[sortOrder];
    const { limit, offset } = getPagination(page, size);
    const searchQuery = {
      $or: [
        {
          "doctorUser.fullName": { $regex: new RegExp(search, "i") },
        },
      ],
    };
    const condition = {
      establishmentId: new ObjectId(establishmentMasterId),
      patientId: new ObjectId(patientId),
      status:  { $ne: constants.BOOKING_STATUS.RESCHEDULE }
    };
    const patientHospitalRecord = await patient.patientHospitalRecord(
      condition,
      sortCondition,
      offset,
      limit,
      searchQuery
    );

    const msgCode = !patientHospitalRecord?.count
      ? "NO_RECORD_FETCHED"
      : "PATIENT_LIST";
    return response.success(
      { msgCode, data: patientHospitalRecord },
      res,
      httpStatus.OK
    );
  } catch (error) {
    console.log(error);
    return response.error(
      { msgCode: "SOMETHING_WENT_WRONG" },
      res,
      httpStatus.SOMETHING_WENT_WRONG
    );
  }
};

const patientProfile = async (req, res) => {
  try {
    const { userId } = req.data;
    const condition = { _id: new ObjectId(userId) };
    const patientProfileData = await patient.patientProfile(condition);

    const msgCode = !patientProfileData ? "NO_RECORD_FETCHED" : "FETCHED";
    return response.success(
      { msgCode, data: patientProfileData },
      res,
      httpStatus.OK
    );
  } catch (error) {
    console.log(error);
    return response.error(
      { msgCode: "SOMETHING_WENT_WRONG" },
      res,
      httpStatus.SOMETHING_WENT_WRONG
    );
  }
};

const establishmentDetails = async (req, res) => {
  try {
    const { recordId } = req.query;
    const condition = { _id: new ObjectId(recordId) };
    const establishmentDetail = await patient.establishmentDetails(condition);

    const msgCode = !establishmentDetail ? "NO_RECORD_FETCHED" : "FETCHED";
    return response.success(
      { msgCode, data: establishmentDetail },
      res,
      httpStatus.OK
    );
  } catch (error) {
    console.log(error);
    return response.error(
      { msgCode: "SOMETHING_WENT_WRONG" },
      res,
      httpStatus.SOMETHING_WENT_WRONG
    );
  }
};

const homepageSuggestionList = async (req, res) => {
  try {
    const { search, sort, page, size, sortOrder } = req.query;
    const sortCondition = {};
    let sortKey = sort;
    sortCondition[`${sortKey}`] = constants.LIST.ORDER[sortOrder];

    const { limit, offset } = getPagination(page, size);
    const condition = {
      status: constants.PROFILE_STATUS.APPROVE,
      isDeleted: false,
    };
    const searchQuery = {
      $or: [
        {
          fullName: { $regex: new RegExp(search, "i") },
        },
        {
          "specialization.name": { $regex: new RegExp(search, "i") },
        },
        {
          "doctor.service.name": { $regex: new RegExp(search, "i") },
        },
      ],
    };
    const hospitalSearchQuery = {
      $or: [
        {
          "establishmentMaster.name": { $regex: new RegExp(search, "i") },
        },
        {
          "hospital.service.name": { $regex: new RegExp(search, "i") },
        },
        {
          "hospitalTypeMaster.name": { $regex: new RegExp(search, "i") },
        },
        {
          "establishmentMaster.address.pincode": {
            $regex: new RegExp(search, "i"),
          },
        },
        {
          "establishmentMaster.address.city": {
            $regex: new RegExp(search, "i"),
          },
        },
        {
          "stateMaster.name": { $regex: new RegExp(search, "i") },
        },
      ],
    };
    const masterQuery = {
      name: { $regex: new RegExp(search, "i") },
      isDeleted: false
    };
    const serviceQuery = {
      "name": { $regex: new RegExp(search, "i") },
    };
    const suggestionList = await patient.suggestionList(
      condition,
      sortCondition,
      offset,
      limit,
      { searchQuery, masterQuery, hospitalSearchQuery, serviceQuery }
    );

    const msgCode = !suggestionList?.count
      ? "NO_RECORD_FETCHED"
      : "PATIENT_LIST";
    return response.success(
      { msgCode, data: suggestionList },
      res,
      httpStatus.OK
    );
  } catch (error) {
    return response.error(
      { msgCode: "SOMETHING_WENT_WRONG" },
      res,
      httpStatus.SOMETHING_WENT_WRONG
    );
  }
};

const patientFeedbackHistory = async (req, res) => {
  try {
    const { userId } = req.data;
    const { _id } = await common.getByCondition(Patient.model, {
      userId: new ObjectId(userId),
    });
    const { toDate, fromDate, sort, page, size, sortOrder } = req.query;
    const sortCondition = {};
    let sortKey = sort;
    if (constants.NAME_CONSTANT.includes(sort)) sortKey = "lowerName";
    sortCondition[`${sortKey}`] = constants.LIST.ORDER[sortOrder];
    const { limit, offset } = getPagination(page, size);
    const condition = {
      patientId: new ObjectId(_id),
      status: constants.BOOKING_STATUS.COMPLETE,
    };
    const feedbackList = await patient.patientFeedbackHistory(
      condition,
      sortCondition,
      offset,
      limit,
      {
        fromDate,
        toDate,
      }
    );

    const msgCode = !feedbackList?.count
      ? "NO_RECORD_FETCHED"
      : "FEEDBACK_LIST";
    return response.success(
      { msgCode, data: feedbackList },
      res,
      httpStatus.OK
    );
  } catch (error) {
    console.log(error);
    return response.error(
      { msgCode: "SOMETHING_WENT_WRONG" },
      res,
      httpStatus.SOMETHING_WENT_WRONG
    );
  }
};

const patientEditProfile = async (req, res) => {
  try {
    const { userId } = req.data;
    const {
      isDeleted,
      bloodGroup,
      gender,
      dob,
      address,
      languagePreference,
      profilePic,
      fullName,
    } = req.body;
    const condition = {
      userId: new ObjectId(userId),
    };
    const userDetails = await common.getByCondition(User.model, {
      _id: new ObjectId(userId),
      isDeleted: false,
    });
    const patientDetails = await common.getByCondition(
      Patient.model,
      condition
    );
    if (!userDetails || !patientDetails) {
      return response.error(
        { msgCode: "USER_NOT_FOUND" },
        res,
        httpStatus.NOT_FOUND
      );
    }
    const userRecord = await common.updateByCondition(
      User.model,
      { _id: new ObjectId(userId) },
      { fullName, isDeleted },
    );
    if (!userRecord)
      return response.error(
        { msgCode: "UPDATE_ERROR" },
        res,
        httpStatus.FORBIDDEN
      );
    const patientUpdate = {
      bloodGroup,
      gender,
      dob,
      address,
      languagePreference,
      profilePic,
    };
    const patientRecord = await common.updateByCondition(
      Patient.model,
      condition,
      patientUpdate
    );
    if (!patientRecord)
      return response.error(
        { msgCode: "UPDATE_ERROR" },
        res,
        httpStatus.FORBIDDEN
      );
    return response.success(
      { msgCode: "PATIENT_DATA_UPDATED" },
      res,
      httpStatus.OK
    );
  } catch (error) {
    return response.error(
      { msgCode: "SOMETHING_WENT_WRONG" },
      res,
      httpStatus.SOMETHING_WENT_WRONG
    );
  }
};

const hospitalAppointmentLists = async (req, res) => {
  try {
    const { userId } = req.data;
    const { establishmentMasterId } = await patient.getEstablishmentId(
      Hospital.model,
      { userId: new ObjectId(userId) }
    );
    const {
      search,
      sort,
      page,
      size,
      sortOrder,
      isExport,
      doctorId,
      status,
      toDate,
      fromDate,
      typeOfList,
    } = req.query;
    const sortCondition = {};
    let sortKey = sort;
    if (constants.NAME_CONSTANT.includes(sort)) sortKey = "lowerName";
    sortCondition[`${sortKey}`] = constants.LIST.ORDER[sortOrder];

    const { limit, offset } = getPagination(page, size);
    const searchQuery = {
      $or: [
        {
          "patientUser.fullName": { $regex: new RegExp(search, "i") },
        },
        {
          "doctorUser.fullName": { $regex: new RegExp(search, "i") },
        },
      ],
    };
    const condition = {
      establishmentId: new ObjectId(establishmentMasterId),
      isDeleted: false,
    };
    if (typeOfList !== constants.HOSPITAL_APPOINTMENT_LIST_TYPES.TODAY)
      condition.status = constants.BOOKING_STATUS.BOOKED;
    if (doctorId) condition.doctorId = new ObjectId(doctorId);
    if (status === constants.BOOKING_STATUS.BOOKED || status)
      condition.status = status;
    if (fromDate) condition.date = { $gte: fromDate, $lte: toDate };
    else condition.date = { $lte: toDate };
    if (typeOfList === constants.HOSPITAL_APPOINTMENT_LIST_TYPES.TODAY)
      condition.date = {
        $gte: new Date(moment().startOf("day")),
        $lte: new Date(moment().endOf("day")),
      };
    const hospitalAppointmentList = await patient.hospitalAppointmentList(
      condition,
      sortCondition,
      offset,
      limit,
      searchQuery,
      isExport
    );

    const msgCode = !hospitalAppointmentList?.count
      ? "NO_RECORD_FETCHED"
      : "FETCHED";
    return response.success(
      { msgCode, data: hospitalAppointmentList },
      res,
      httpStatus.OK
    );
  } catch (error) {
    console.log(error);
    return response.error(
      { msgCode: "SOMETHING_WENT_WRONG" },
      res,
      httpStatus.SOMETHING_WENT_WRONG
    );
  }
};

module.exports = {
  patientList,
  getPatientList,
  getPatientRecord,
  addPatientRecord,
  // editPatientRecord,
  patientAppointmentList,
  getPatientData,
  editPatientData,
  hospitalPatientList,
  patientHistoryRecordHospital,
  patientProfile,
  establishmentDetails,
  homepageSuggestionList,
  patientFeedbackHistory,
  patientEditProfile,
  hospitalAppointmentLists,
};
