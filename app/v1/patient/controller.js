const { patient, common } = require("../../../services/index");
const { response, constants, getAgeGroup, getBloodGroup } = require("../../../utils/index");
const httpStatus = require("http-status");
const { getPagination } = require('../../../utils/helper');
const { User, Appointment, PatientClinicalRecord, Patient, Doctor, Hospital } = require("../../../models/index");
const doctor = require("../../../models/doctor");
const user = require("../../../models/user");
const { ObjectId } = require('mongoose').Types;

const patientList = async (req, res) => {
  try {
    const { search, sort, page, size, sortOrder, bloodGroup, gender, age, isExport } = req.query;
    const sortCondition = {};
    let sortKey = sort;
    if (constants.NAME_CONSTANT.includes(sort)) sortKey = 'lowerName';
    sortCondition[`${sortKey}`] = constants.LIST.ORDER[sortOrder];

    const { limit, offset } = getPagination(page, size);
    const condition = {
      'userType': constants.USER_TYPES.PATIENT
    };

    if (gender) condition['patient.gender'] = gender;
    if (bloodGroup) {
      const bloodGroups = getBloodGroup(bloodGroup);
      condition['patient.bloodGroup'] = { '$in': bloodGroups };
    }
    if (age) {
      condition['$or'] = getAgeGroup(age);
    }
    const searchQuery = {'$or': [{
      'fullName': { $regex: new RegExp(search, 'i') }
    },
    {
      'phone': { $regex: new RegExp(search, 'i') }
    }]};
    const patientList = await patient.patientList(condition, sortCondition, offset, limit, searchQuery, isExport);

    const msgCode = !patientList?.count ? 'NO_RECORD_FETCHED' : 'PATIENT_LIST';
    return response.success({ msgCode, data: patientList }, res, httpStatus.OK);
  } catch (err) {
    return response.error(
      { msgCode: 'SOMETHING_WENT_WRONG' },
      res,
      httpStatus.SOMETHING_WENT_WRONG
    );
  }
};

const getPatientRecord = async (req, res) => {
  try {
    const { patientId, appointmentId } = req.query;
    let condition = {
      'userType': constants.USER_TYPES.PATIENT,
      'status': { '$ne': constants.PROFILE_STATUS.DELETE },
      '_id': patientId
    };

    const patientRecord = await common.getByCondition(User.model, condition);
    if (!patientRecord) response.success({ msgCode: 'USER_NOT_FOUND' }, res, httpStatus.NOT_FOUND);

    condition = { _id: appointmentId };
    const appointmentRecord = await common.getByCondition(Appointment.model, condition);
    if (!appointmentRecord) response.success({ msgCode: 'APPOINTMENT_NOT_FOUND' }, res, httpStatus.NOT_FOUND);

    condition = { appointmentId, userId: patientId };
    const clinicalRecord = await common.getByCondition(PatientClinicalRecord.model, condition);

    const msgCode = !clinicalRecord ? 'NO_RECORD_FETCHED' : 'PATIENT_CLINICAL_RECORD';
    return response.success({ msgCode, data: clinicalRecord }, res, httpStatus.OK);
  } catch (err) {
    return response.error(
      { msgCode: 'SOMETHING_WENT_WRONG' },
      res,
      httpStatus.SOMETHING_WENT_WRONG
    );
  }
};

const getPatientList = async (req, res) => {
  try {
    const { userId } = req.data;
    const doctorData = await common.getByCondition(Doctor.model, { userId: new ObjectId(userId) });
    if (!doctorData) return response.success({ msgCode: 'NOT_FOUND' }, res, httpStatus.NOT_FOUND);

    const { search, sort, page, size, sortOrder, type } = req.query;
    const sortCondition = {};
    sortCondition[`${sort}`] = constants.LIST.ORDER[sortOrder];

    const { limit, offset } = getPagination(page, size);
    const searchQuery = search;
    const condition = { doctorId: new ObjectId(doctorData?._id), self: true };
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).setHours(18, 30, 0, 0);

    if (type === constants.DOCTOR_PATIENT_LIST.TODAY) condition.date = { $gte: new Date(yesterday) }
    const getPatientList = await patient.getPatientList(condition, sortCondition, offset, limit, searchQuery);

    const msgCode = getPatientList.count === 0 ? 'NO_RECORD_FETCHED' : 'PATIENT_CLINICAL_RECORD';
    return response.success({ msgCode, data: getPatientList }, res, httpStatus.OK);
  } catch (err) {
    console.log(err)
    return response.error(
      { msgCode: 'SOMETHING_WENT_WRONG' },
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
    const clinicalRecord = await common.getByCondition(PatientClinicalRecord.model, condition);
    if (clinicalRecord) {
      if (recordKey in clinicalRecord) {
        return response.error({ msgCode: 'CLINICAL_RECORD_EXISTS' }, res, httpStatus.FORBIDDEN);
      }
      else {
        const updates = {};
        updates[`${recordKey}`] = records;
        const updateRecord = await common.updateByCondition(PatientClinicalRecord.model, condition, updates);
        if (!updateRecord) return response.error({ msgCode: 'UPDATE_ERROR' }, res, httpStatus.FORBIDDEN);
        return response.success({ msgCode: 'CLINICAL_RECORD_ADDED' }, res, httpStatus.OK);
      }
    }
    else {
      const addRecord = {};
      addRecord[`${recordKey}`] = records;
      const addedRecord = await common.create(PatientClinicalRecord.model, addRecord);
      if (!addedRecord) return response.error({ msgCode: 'FAILED_TO_ADD' }, res, httpStatus.FORBIDDEN);
      return response.success({ msgCode: 'CLINICAL_RECORD_ADDED', data: addedRecord }, res, httpStatus.OK);
    }
  } catch (err) {
    return response.error(
      { msgCode: 'SOMETHING_WENT_WRONG' },
      res,
      httpStatus.SOMETHING_WENT_WRONG
    );
  }
};

const editPatientRecord = async (req, res) => {
  try {
    const { patientId, appointmentId, recordId } = req.query;
    const { type, records, isDeleted } = req.body;

    const recordKey = constants.PATIENT_CLINICAL_RECORDS_KEY[type];

    const condition = { appointmentId, userId: patientId };
    condition[`${recordKey}.isDeleted`] = false;
    const clinicalRecord = await common.getByCondition(PatientClinicalRecord.model, condition);
    if (!clinicalRecord) return response.error({ msgCode: 'CLINICAL_RECORD_NOT_FOUND' }, res, httpStatus.FORBIDDEN);
    const updates = {};
    if ((type === constants.PATIENT_CLINICAL_RECORDS.VITAL_SIGNS) || (type === constants.PATIENT_CLINICAL_RECORDS.CLINICAL_NOTES)) updates[`${recordKey}`] = records;
    else updates[`${recordKey}.$`] = { ...userDetails[recordKey][0], ...records, };
    const updateRecord = await common.updateByCondition(PatientClinicalRecord.model, condition, updates);
    if (!updateRecord) return response.error({ msgCode: 'UPDATE_ERROR' }, res, httpStatus.FORBIDDEN);
    return response.success({ msgCode: 'CLINICAL_RECORD_UPDATED' }, res, httpStatus.OK);
  } catch (err) {
    return response.error(
      { msgCode: 'SOMETHING_WENT_WRONG' },
      res,
      httpStatus.SOMETHING_WENT_WRONG
    );
  }
};

const patientAppointmentList = async (req, res) => {
  try {
    const { userId } = req.data;
    const { patientId } = req.query
    const condition = { doctorId: new ObjectId(userId), userId: new ObjectId(patientId) }
    const appointmentList = await patient.appointmentList(condition);
    const msgCode = appointmentList.count === 0 ? 'NO_RECORD_FETCHED' : 'APPOINTMENT_LIST_FETCHED';
    return response.success({ msgCode, data: appointmentList }, res, httpStatus.OK);
  } catch (err) {
    return response.error(
      { msgCode: 'SOMETHING_WENT_WRONG' },
      res,
      httpStatus.SOMETHING_WENT_WRONG
    );
  }
};


const getPatientData = async (req, res) => {
  try {
    const { patientId } = req.query;
    const condition = {
      '_id': new ObjectId(patientId),
    };

    const userDetails = await patient.getPatientData(condition);
    if (!userDetails) {
      return response.error(
        { msgCode: 'USER_NOT_FOUND' },
        res,
        httpStatus.NOT_FOUND
      );
    }
    return response.success({ msgCode: 'PATIENT_DATA', data: userDetails }, res, httpStatus.OK);
  } catch (err) {
    console.log(err)
    return response.error(
      { msgCode: 'SOMETHING_WENT_WRONG' },
      res,
      httpStatus.SOMETHING_WENT_WRONG
    );
  }
};

const editPatientData = async (req, res) => {
  try {
    const { patientId } = req.query;
    const { email, bloodGroup, gender, dob, address, languagePreference, profilePic } = req.body;
    const condition = {
      '_id': new ObjectId(patientId),
    };

    const userDetails = await common.getByCondition(Patient.model, condition);
    if (!userDetails) {
      return response.error(
        { msgCode: 'USER_NOT_FOUND' },
        res,
        httpStatus.NOT_FOUND
      );
    }

    const updates = { email, bloodGroup, gender, dob, address, languagePreference, profilePic };
    const updateRecord = await common.updateByCondition(Patient.model, condition, updates)
    if (!updateRecord) return response.error({ msgCode: 'UPDATE_ERROR' }, res, httpStatus.FORBIDDEN);
    return response.success({ msgCode: 'PATIENT_DATA_UPDATED' }, res, httpStatus.OK);
  } catch (err) {
    return response.error(
      { msgCode: 'SOMETHING_WENT_WRONG' },
      res,
      httpStatus.SOMETHING_WENT_WRONG
    );
  }
};


const hospitalPatientList = async (req, res) => {
  try {
    const { userId } = req.data;
    const { establishmentMasterId } = await patient.getEstablishmentId(Hospital.model, { userId: new ObjectId(userId) })
    const { search, sort, page, size, sortOrder, isExport } = req.query;
    const sortCondition = {};
    let sortKey = sort;
    if (constants.NAME_CONSTANT.includes(sort)) sortKey = 'lowerName';
    sortCondition[`${sortKey}`] = constants.LIST.ORDER[sortOrder];

    const { limit, offset } = getPagination(page, size);
    const searchQuery = {'$or': [{
      'fullName': { $regex: new RegExp(search, 'i') }
    },
    {
      'phone': { $regex: new RegExp(search, 'i') }
    }]};
    const condition = { establishmentId: new ObjectId("64831706f66209b4908c8e3c" || establishmentMasterId) }
    const hospitalPatientList = await patient.hospitalPatientList(condition, sortCondition, offset, limit, searchQuery, isExport);

    const msgCode = !hospitalPatientList?.count ? 'NO_RECORD_FETCHED' : 'PATIENT_LIST';
    return response.success({ msgCode, data: hospitalPatientList }, res, httpStatus.OK);
  } catch (err) {
    console.log(err);
    return response.error(
      { msgCode: 'SOMETHING_WENT_WRONG' },
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
  hospitalPatientList
};
