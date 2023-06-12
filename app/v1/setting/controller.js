const httpStatus = require("http-status");
const { response } = require("../../../utils/index");
const { common, users, doctor } = require("../../../services/index");
const { User, Doctor } = require("../../../models/index");
const { constants } = require("../../../utils/constant");
const { ObjectId } = require('mongoose').Types;

exports.getDoctorProfile = async (req, res) => {
  try {
    const { userId } = req.data;
    const condition = {
      '_id': new ObjectId(userId),
      'userType': constants.USER_TYPES.DOCTOR
    };

    const userDetails = await doctor.getProfile(condition);
    if (!userDetails) {
      return response.error(
        { msgCode: 'ACCOUNT_NOT_FOUND' },
        res,
        httpStatus.NOT_FOUND
      );
    }

    return response.success({ msgCode: 'ACCOUNT_DATA', data: userDetails }, res, httpStatus.OK);
  } catch (err) {
    return response.error(
      { msgCode: 'SOMETHING_WENT_WRONG' },
      res,
      httpStatus.SOMETHING_WENT_WRONG
    );
  }
};


exports.editDoctorProfile = async (req, res) => {
  try {
    const { fullName, about, experience, profilePic, specialization, isDeleted } = req.body;
    const { userId } = req.data;
    const condition = {
      '_id': new ObjectId(userId),
      'userType': constants.USER_TYPES.DOCTOR
    };

    const userDetails = await common.getByCondition(User.model, condition);
    if (!userDetails) {
      return response.error(
        { msgCode: 'ACCOUNT_NOT_FOUND' },
        res,
        httpStatus.NOT_FOUND);
    }
    let updateData;
    if (fullName) updateData = await common.updateByCondition(User.model, condition, { fullName })
    let updates = {};
    if (isDeleted) updates = { isVerified: constants.PROFILE_STATUS.DELETE };
    else {
      updates = {
        about,
        experience,
        profilePic,
        specialization: specialization.length !== 0 ? specialization.map((data) => new ObjectId(data)) : []
      }
    updateData = await common.updateByCondition(Doctor.model, { userId: new ObjectId(userId) }, updates);

    }
    if (!updateData) {
      return response.error({ msgCode: 'UPDATE_ERROR' }, res, httpStatus.FORBIDDEN);
    }
    const msgCode = isDeleted ? 'ACCOUNT_DELETED' : 'ACCOUNT_UPDATED'
    return response.success({ msgCode }, res, httpStatus.OK);
  } catch (error) {
    console.log(error);
    return response.error({ msgCode: 'SOMETHING_WRONG' }, res, httpStatus.SOMETHING_WRONG);
  }
};


exports.getDoctorSettingsByID = async (req, res) => {
  try {
    const { recordId, type } = req.query;
    const { userId } = req.data;
    const condition = {
      'userId': new ObjectId(userId),
    };
    const recordKey = constants.DOCTOR_PROFILE_RECORD_KEY[`${type}`];
    condition[`${recordKey}._id`] = new ObjectId(recordId);
    const userDetails = await users.getDoctorSettingsByID(Doctor.model, condition, recordKey);
    if (!userDetails) {
      return response.error(
        { msgCode: 'NOT_FOUND' },
        res,
        httpStatus.NOT_FOUND
      );
    }
    const msgCode = constants.DOCTOR_PROFILE_MESSAGE[`${type}`];
    return response.success({
      msgCode, data: userDetails
    },
      res,
      httpStatus.OK);
  } catch (err) {
    console.log(err);
    return response.error(
      { msgCode: 'SOMETHING_WENT_WRONG' },
      res,
      httpStatus.SOMETHING_WENT_WRONG
    );
  }
};


exports.getDoctorSettingsList = async (req, res) => {
  try {
    const { type } = req.query;
    const { userId } = req.data;
    const condition = {
      'userId': new ObjectId(userId),
    };
    const recordKey = constants.DOCTOR_PROFILE_RECORD_KEY[`${type}`];
    const userDetails = type !==  constants.DOCTOR_PROFILE.SOCIALS ? 
    await common.getByCondition(Doctor.model, condition) : 
    await doctor.getForSetting(Doctor.model, condition);

    const data = type !== constants.DOCTOR_PROFILE.SOCIALS ? {
      count: userDetails[`${recordKey}`]?.length  || 0,
      list: userDetails[`${recordKey}`].reverse() || []
    }  : { count: userDetails.length || 0, list: userDetails ? userDetails.reverse(): [] };
    return response.success({
      data
    },
      res,
      httpStatus.OK
    );
  } catch (err) {
    console.log(err)
    return response.error(
      { msgCode: 'SOMETHING_WENT_WRONG' },
      res,
      httpStatus.SOMETHING_WENT_WRONG
    );
  }
};

exports.addDoctorSettings = async (req, res) => {
  try {
    const { type, records, isDeleted, isEdit } = req.body;
    const { userId } = req.data;
    const { recordId } = req.query;
    const condition = {
      'userId': new ObjectId(userId),
    };
    const recordKey = constants.DOCTOR_PROFILE_RECORD_KEY[`${type}`];
    if (recordId) { 
    condition[`${recordKey}._id`] = new ObjectId(recordId);
  }
    const userDetails = await users.getDoctorSettingsByID(Doctor.model, condition, recordKey);
    if (!userDetails) {
      return response.error(
        { msgCode: 'NOT_FOUND' },
        res,
        httpStatus.NOT_FOUND
      );
    };
    if (!isDeleted) { 
      let similarRecord;
      if (type === constants.DOCTOR_PROFILE.SOCIALS) {
        if (!isEdit) similarRecord = await common.getByCondition(Doctor.model, { userId: new ObjectId(userId), "social.socialMediaId": new ObjectId(records.socialMediaId) });
      }
      else {
        similarRecord = await doctor.similarRecord(Doctor.model, { userId: new ObjectId(userId) }, records, recordKey);
      }
      if (similarRecord) return response.error({ msgCode: 'RECORD_EXISTS' }, res, httpStatus.FORBIDDEN);
    }
    const updates = {};
    if (isEdit) {
      if (isDeleted) {
        const pullObject = {};
        pullObject[`${recordKey}`] = userDetails[recordKey][0];
        const deleteRecord = await common.pullObject(Doctor.model, condition, pullObject);
        if (!deleteRecord) return response.error({ msgCode: 'FAILED_TO_DELETE' }, res, httpStatus.FORBIDDEN);
        return response.success({ msgCode: 'DELETE_SUCCESS' }, res, httpStatus.OK);
      }
      else {
        updates[`${recordKey}.$`] = { ...userDetails[recordKey][0], ...records, };
        const updateUser = await common.updateByCondition(Doctor.model, condition, updates)
        if (!updateUser) {
          return response.error({ msgCode: 'UPDATE_ERROR' }, res, httpStatus.FORBIDDEN);
        }
        return response.success({ msgCode: 'UPDATE_SUCCESS' }, res, httpStatus.OK);
      }
    } else {
      updates[`${recordKey}`] = records;
      const updateUser = await common.push(Doctor.model, condition, updates)
      if (!updateUser) {
        return response.error({ msgCode: 'UPDATE_ERROR' }, res, httpStatus.FORBIDDEN);
      }
      return response.success({
        msgCode: 'DATA_ADDED', data: {}
      },
        res,
        httpStatus.OK);
    }
  } catch (error) {
    console.log(error);
    return response.error({ msgCode: 'SOMETHING_WRONG' }, res, httpStatus.SOMETHING_WRONG);
  }
};