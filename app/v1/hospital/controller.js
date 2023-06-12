const { User, FAQ, EstablishmentTiming, Doctor, Hospital, EstablishmentMaster, Appointment } = require("../../../models/index");
const { common, hospital } = require("../../../services/index");
const { response, constants } = require("../../../utils/index");
const httpStatus = require("http-status");
const { getPagination, filterFormatter } = require('../../../utils/helper');
const { Types } = require('mongoose');
const video = require("../../../models/video");
const e = require("express");
const { ObjectId } = require('mongoose').Types;


exports.hospitalDetails = async (req, res) => {
  try {
    const { hospitalId, type } = req.query;
    const condition = {
      '_id': new ObjectId(hospitalId),
      'userType': constants.USER_TYPES.HOSPITAL,
    };
    const hospitalDetails = await hospital.hospitalDetails(condition, type);
    if (!hospitalDetails) {
      return response.error(
        { msgCode: 'HOSPITAL_NOT_FOUND' },
        res,
        httpStatus.NOT_FOUND
      );
    }

    return response.success({ msgCode: 'HOSPITAL_DATA', data: hospitalDetails }, res, httpStatus.OK);
  } catch (err) {
    return response.error(
      { msgCode: 'SOMETHING_WENT_WRONG' },
      res,
      httpStatus.SOMETHING_WENT_WRONG
    );
  }
};

exports.hospitalList = async (req, res) => {
  try {
    const { search, sort, page, size, sortOrder, city, hospitalType, isExport } = req.query;
    let cityFilter, hospitalTypeFilter;
    const condition = {
      'userType': constants.USER_TYPES.HOSPITAL,
      '$or': [{
        'fullName': { $regex: new RegExp(search, 'i') }
      },
      {
        'phone': { $regex: new RegExp(search, 'i') }
      }]
    };
    const hospitalCondition = { "hospital.isVerified": 2, "hospital.steps": 4, "hospital.profileScreen": 5 }

    const sortCondition = {};
    let sortKey = sort;
    if (constants.NAME_CONSTANT.includes(sort)) sortKey = 'lowerName';
    sortCondition[`${sortKey}`] = constants.LIST.ORDER[sortOrder];
    const { offset, limit } = getPagination(page, size);
    const filterQuery = {};
    if (city) {
      cityFilter = filterFormatter(city, 2, "hospital.address.city");
      filterQuery["$or"] = cityFilter;
    }
    if (hospitalType) {
      hospitalTypeFilter = filterFormatter(hospitalType);
      filterQuery["hospital.hospitalType"] = { $in: hospitalTypeFilter }
    }

    const hospitalList = await hospital.hospitalList(condition, sortCondition, offset, limit, filterQuery, isExport, hospitalCondition);
    const msgCode = hospitalList.count === 0 ? 'NO_RECORD_FETCHED' : 'HOSPITAL_LIST';
    return response.success({ msgCode, data: hospitalList }, res, httpStatus.OK);
  } catch (err) {
    console.log(err);
    return response.error(
      { msgCode: 'SOMETHING_WENT_WRONG' },
      res,
      httpStatus.SOMETHING_WENT_WRONG
    );
  }
};

exports.addHospital = async (req, res) => {
  try {
    const { fullName, hospitalType, address, phone } = req.body;
    const hospitalDetails = {
      userType: constants.USER_TYPES.HOSPITAL,
      fullName,
      phone
    };

    const addUser = await common.create(User.model, hospitalDetails);
    const addHospital = await common.create(Hospital.model, {
      // isVerified: 1, steps: 2, profileScreen: 2,
      userId: new ObjectId(addUser?._id), hospitalType, address
    })
    if ((!addHospital) || (!addUser)) {
      return response.error(
        { msgCode: 'FAILED_TO_ADD' },
        res,
        httpStatus.BAD_REQUEST
      );
    }

    return response.success({ msgCode: 'HOSPITAL_ADDED', data: addHospital }, res, httpStatus.CREATED);
  } catch (err) {
    return response.error(
      { msgCode: 'SOMETHING_WENT_WRONG' },
      res,
      httpStatus.SOMETHING_WENT_WRONG
    );
  }
};

exports.editHospital = async (req, res) => {
  try {
    const { fullName, hospitalType, address, status, phone } = req.body;
    const { hospitalId } = req.query;

    const condition = {
      '_id': new ObjectId(hospitalId),
      'userType': constants.USER_TYPES.HOSPITAL,
    };

    const userDetails = await common.getByCondition(User.model, condition);
    const hospitalDetails = await common.getByCondition(Hospital.model, { userId: new ObjectId(hospitalId) });
    if ((!hospitalDetails) || (!userDetails)) {
      return response.error({ msgCode: 'HOSPITAL_NOT_FOUND' }, res, httpStatus.NOT_FOUND);
    }
    if (fullName || phone) await common.updateById(User.model, userDetails?._id, { fullName, phone })
    if (hospitalType || address || status) await common.updateById(User.model, hospitalDetails._id, { status, address, hospitalType })
    return response.success({ msgCode: 'HOSPITAL_UPDATED' }, res, httpStatus.OK);
  } catch (error) {
    return response.error({ msgCode: 'SOMETHING_WRONG' }, res, httpStatus.SOMETHING_WRONG);
  }
};

exports.addHospitalProfile = async (req, res) => {
  try {
    const { fullName, type, city } = req.body;
    const { userId } = req.data;
    const condition = {
      _id: userId,
      'userType': constants.USER_TYPES.HOSPITAL,
      'status': { '$ne': constants.PROFILE_STATUS.DELETE },
    };

    const findHospital = await common.getByCondition(User.model, condition);
    if (!findHospital) {
      return response.error(
        { msgCode: 'USER_NOT_FOUND' },
        res,
        httpStatus.BAD_REQUEST
      );
    }

    const hospitalDetails = {
      userType: constants.USER_TYPES.HOSPITAL,
      steps: constants.PROFILE_STEPS.SECTION_B,
      fullName,
      establishmentDetail: [{ city, type }]
    };

    const updateData = await common.updateById(User.model, id, hospitalDetails);
    if (!updateData) {
      return response.error({ msgCode: 'UPDATE_ERROR' }, res, httpStatus.FORBIDDEN);
    }

    return response.success({ msgCode: 'PROFILE_UPDATED', data: findHospital._id }, res, httpStatus.CREATED);
  } catch (err) {
    return response.error(
      { msgCode: 'SOMETHING_WENT_WRONG' },
      res,
      httpStatus.SOMETHING_WENT_WRONG
    );
  }
};

exports.editHospitalProfile = async (req, res) => {
  try {
    const { steps, records, isEdit, isSaveAndExit } = req.body;
    const { userId } = req.data;
    let { profileScreen } = req.body;
    let establishmentTimingData = {};

    const condition = {
      _id: new ObjectId(userId),
      'userType': constants.USER_TYPES.HOSPITAL,
    };

    const findUser = await hospital.hospitalDetails(condition, constants.HOSPITAL_DETAIL_TYPE.HOSPITAL);
    if ((!findUser?._id) || (!findUser?.hospitalId)) {
      return response.error(
        { msgCode: 'USER_NOT_FOUND' },
        res,
        httpStatus.NOT_FOUND
      );
    }
    if (records.hospitalTiming) {
      if (records?.hospitalTiming?.length !== 0)
        records?.hospitalTiming?.map((data) => {
          establishmentTimingData[`${constants.DAYS_OF_WEEK[data?.id]}`] =
            data?.timing;
        });
    }
      await common.updateByCondition(EstablishmentMaster.model,
        { _id: new ObjectId(findUser?.hospitalMasterId) },
        {
          name: records?.fullName,
          city: records?.city,
          hospitalTypeId: new ObjectId(records.hospitalType),
          establishmentProof: records?.establishmentProof || null,
          propertyStatus: records.isOwner 
          ? constants.ESTABLISHMENT_PROOF['THE OWNER OF THE ESTABLISHMENT'] :  
          constants.ESTABLISHMENT_PROOF['HAVE RENTED AT OTHER ESTABLISHMENT'],
          address: records?.address
        })


    if (findUser.hospitalTimingId)
      await common.updateByCondition(EstablishmentTiming.model,
        { _id: new ObjectId(findUser?.hospitalTimingId) },
        { ...establishmentTimingData })
    else {
      await common.create(EstablishmentTiming.model,
        {
          ...establishmentTimingData,
          isOwner: true,
          isApproved: true,
          establishmentId: new Object(findUser?.hospitalMasterId)
        })
    }
    const updates = records;
    if (!isEdit && !isSaveAndExit) {
      switch (steps) {
        case constants.PROFILE_STEPS.SECTION_A:
          updates.steps = constants.PROFILE_STEPS.SECTION_B;
          break;
        case constants.PROFILE_STEPS.SECTION_B:
          updates.steps = constants.PROFILE_STEPS.SECTION_C;
          break;
        case constants.PROFILE_STEPS.SECTION_C:
          if (records.hospitalTiming) {
            updates.steps = constants.PROFILE_STEPS.COMPLETED;
            updates.isVerified = constants.PROFILE_STATUS.APPROVE;
          }
          break;
      }
    }
    if (!profileScreen) {
      switch (steps) {
        case constants.PROFILE_STEPS.SECTION_A:
          profileScreen = constants.HOSPITAL_SCREENS.ESTABLISHMENT_PROOF;
          break;
        case constants.PROFILE_STEPS.SECTION_B:
          profileScreen = constants.HOSPITAL_SCREENS.ESTABLISHMENT_LOCATION;
          break;
        case constants.PROFILE_STEPS.SECTION_C:
          if (records.hospitalTiming) {
            profileScreen = constants.HOSPITAL_SCREENS.COMPLETED;
          }
          break;
      }
    }
    if ((((!isEdit) && profileScreen))) updates.profileScreen = profileScreen;

    const updateData = await common.updateByCondition(Hospital.model, { userId: new ObjectId(userId) }, updates);
    if (!updateData) {
      return response.error({ msgCode: 'UPDATE_ERROR' }, res, httpStatus.FORBIDDEN);
    };

    return response.success({ msgCode: 'HOSPITAL_UPDATED', data: updateData }, res, httpStatus.OK);
  } catch (err) {
    console.log(err);
    return response.error(
      { msgCode: 'SOMETHING_WENT_WRONG' },
      res,
      httpStatus.SOMETHING_WENT_WRONG
    );
  }
};

//...........Super Admin portal Api for Hospital(Shubham).....................

exports.adminHospitalListForApprove = async (req, res) => {
  try {
    const { search, page, size, sortBy, order } = req.query
    const { limit, offset } = getPagination(page, size);
    const condition = {
      isVerified: constants.PROFILE_STATUS.PENDING,
      steps:constants.PROFILE_STEPS.COMPLETED

    };
    const data = await hospital.hospitalApprovalList(condition, limit, offset, sortBy, order, search);
    return response.success(
      { msgCode: "HOSPITAL_DATA", data },
      res,
      httpStatus.OK
    );
  } catch (error) {
    console.log("catch error", error.message);
    return response.error(
      { msgCode: "INTERNAL_SERVER_ERROR" },
      res,
      httpStatus.INTERNAL_SERVER_ERROR
    );
  }
};

exports.adminActionHospital = async (req, res) => {
  try {
    const { isVerified, rejectReason } = req.body;
    const { hospitalId } = req.query
    const condition = {
      userId: hospitalId,
      isVerified: constants.PROFILE_STATUS.PENDING
    }
    const findHospital = await common.getByCondition(Hospital.model, condition);
    console.log(findHospital);
    if (!findHospital) {
      return response.success(
        { msgCode: "DATA_NOT_FOUND" },
        res,
        httpStatus.NOT_FOUND
      );
    }
    const dataToupdate = {
      isVerified,
      rejectReason
    };
    const updateData = await common.updateByCondition(Hospital.model, condition, dataToupdate)
    if (!updateData) {
      return response.error(
        { msgCode: "UPDATE_ERROR" },
        res,
        httpStatus.NOT_ACCEPTABLE
      );
    }
    return response.success(
      { msgCode: "HOSPITAL_STATUS_UPDATED", },
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

exports.adminViewHospital = async (req, res) => {
  try {
    const { hospitalId } = req.query
    const condition = { userId: new Types.ObjectId(hospitalId) };
    const data = await hospital.adminViewHospital(condition);
    return response.success(
      { msgCode: "HOSPITAL_DATA", data },
      res,
      httpStatus.OK
    );
  } catch (error) {
    console.log("catch error", error.message);
    return response.error(
      { msgCode: "INTERNAL_SERVER_ERROR" },
      res,
      httpStatus.INTERNAL_SERVER_ERROR
    );
  }
};

// ...................Our Doctor Section Hospital................. 

exports.doctorRequestList = async (req, res) => {
  try {
    const decode = req.data;
    console.log(decode);
    const { page, size, sortBy, order } = req.query;

    const hospitalCondition = {
      userId: new Types.ObjectId(decode.userId),
    }
    const findHospital = await common.getByCondition(Hospital.model, hospitalCondition);

    const establishmentCondition = {
      hospitalId: findHospital._id
    }
    const findEstablishmentMaster = await common.getByCondition(EstablishmentMaster.model, establishmentCondition);

    const condition = {
      establishmentId: findEstablishmentMaster._id,
      doctorId: { $exists: true },
      isVerified: constants.PROFILE_STATUS.PENDING,
    };
    const { limit, offset } = getPagination(page, size);
    const findEstablishment = await hospital.doctorRequestList(
      condition,
      limit,
      offset,
      sortBy,
      order
    );
    if (!findEstablishment) {
      return response.success(
        { msgCode: "DATA_NOT_FOUND" },
        res,
        httpStatus.NOT_FOUND
      );
    }
    return response.success(
      { msgCode: "FETCHED", data: findEstablishment },
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

exports.hospitalAcceptDoctor = async (req, res) => {
  try {
    const decode = req.data;
    console.log(decode);
    const { isVerified, rejectReason } = req.body;
    const { doctorId } = req.query
    const hospitalCondition = {
      userId: new Types.ObjectId(decode.userId),
    }
    const findHospital = await common.getByCondition(Hospital.model, hospitalCondition);

    const establishmentCondition = {
      hospitalId: findHospital._id
    }
    const findEstablishmentMaster = await common.getByCondition(EstablishmentMaster.model, establishmentCondition);

    const condition = {
      establishmentId: findEstablishmentMaster._id,
      doctorId: doctorId,
      isVerified: constants.PROFILE_STATUS.PENDING,
    }
    const findData = await common.getByCondition(EstablishmentTiming.model, condition);
    if (!findData) {
      return response.success(
        { msgCode: "DATA_NOT_FOUND" },
        res,
        httpStatus.NOT_FOUND
      );
    }
    const dataToupdate = {
      isVerified,
      rejectReason
    };
    const updateData = await common.updateByCondition(EstablishmentTiming.model, condition, dataToupdate)
    if (!updateData) {
      return response.error(
        { msgCode: "UPDATE_ERROR" },
        res,
        httpStatus.NOT_ACCEPTABLE
      );
    }
    return response.success(
      { msgCode: "DATA_UPDATE", },
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

exports.viewDoctorProfile = async (req, res) => {
  try {
    const { userId } = req.query;
    //find Doctor
    const condition = {
      userId: new Types.ObjectId(userId),
    };
    const findDoctor = await hospital.doctorProfile(condition);
    console.log(findDoctor);
    if (!findDoctor) {
      return response.success(
        { msgCode: "USER_NOT_FOUND" },
        res,
        httpStatus.NOT_FOUND
      );
    }
    return response.success(
      { msgCode: "FETCHED", data: findDoctor },
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

exports.getDoctorProfileForEdit = async (req, res) => {
  try {
    const decode = req.data
    console.log(decode)
    const { doctorId } = req.query;
    const hospitalCondition = {
      userId: decode.userId //token id
    }
    const findHospital = await common.getByCondition(Hospital.model, hospitalCondition);
    console.log(findHospital)
    if (!findHospital) {
      return response.success(
        { msgCode: "DATA_NOT_FOUND" },
        res,
        httpStatus.NOT_FOUND
      );
    }
    const establishmentCondition = {
      hospitalId: findHospital._id
    }
    const findestablishment = await common.getByCondition(EstablishmentMaster.model, establishmentCondition);
    console.log(findestablishment)
    if (!findestablishment) {
      return response.success(
        { msgCode: "DATA_NOT_FOUND" },
        res,
        httpStatus.NOT_FOUND
      );
    }
    const condition = {
      establishmentId: findestablishment._id,
      doctorId: doctorId,
    };
    const findDoctor = await common.getByCondition(EstablishmentTiming.model, condition);
    if (!findDoctor) {
      return response.success(
        { msgCode: "DATA_NOT_FOUND" },
        res,
        httpStatus.NOT_FOUND
      );
    }
    return response.success(
      { msgCode: "DOCTOR_LIST", data: findDoctor },
      res,
      httpStatus.OK
    );
  } catch (error) {
    console.log("catch error", error.message);
    return response.error(
      { msgCode: "INTERNAL_SERVER_ERROR" },
      res,
      httpStatus.INTERNAL_SERVER_ERROR
    );
  }
};

exports.editDoctorProfile = async (req, res) => {
  try {
    const decode = req.data
    console.log(decode)
    const { doctorId } = req.query;
    const { speciality, procedure, consultationFees, mon, tue, wed, thu, fri, sat, sun } = req.body;
    const hospitalCondition = {
      userId: decode.userId //token id
    }
    const findHospital = await common.getByCondition(Hospital.model, hospitalCondition);
    console.log(findHospital)
    if (!findHospital) {
      return response.success(
        { msgCode: "DATA_NOT_FOUND" },
        res,
        httpStatus.NOT_FOUND
      );
    }
    const establishmentCondition = {
      hospitalId: findHospital._id
    }
    const findestablishment = await common.getByCondition(EstablishmentMaster.model, establishmentCondition);
    console.log(findestablishment)
    if (!findestablishment) {
      return response.success(
        { msgCode: "DATA_NOT_FOUND" },
        res,
        httpStatus.NOT_FOUND
      );
    }
    const condition = {
      establishmentId: findestablishment._id,
      doctorId: doctorId,
    };
    const findDoctor = await common.getByCondition(EstablishmentTiming.model, condition);
    if (!findDoctor) {
      return response.success(
        { msgCode: "DATA_NOT_FOUND" },
        res,
        httpStatus.NOT_FOUND
      );
    }
    const dataToupdate = {
      speciality,
      procedure,
      consultationFees,
      mon,
      tue,
      wed,
      thu,
      fri,
      sat,
      sun
    }
    const updateData = await common.updateByCondition(EstablishmentTiming.model, condition, dataToupdate)
    return response.success(
      { msgCode: "DATA_UPDATE", },
      res,
      httpStatus.OK
    );

  } catch (error) {
    console.log("catch error", error.message);
    return response.error(
      { msgCode: "INTERNAL_SERVER_ERROR" },
      res,
      httpStatus.INTERNAL_SERVER_ERROR
    );
  }
};

exports.hospitalAddDoctor = async (req, res) => {
  try {
    const decode = req.data
    console.log(decode)
    const hospitalCondition = {
      userId: new Types.ObjectId(decode.userId) //token id
    }
    const findHospital = await common.getByCondition(Hospital.model, hospitalCondition);
    console.log("HospitalDetail", findHospital)
    if (!findHospital) {
      return response.success(
        { msgCode: "DATA_NOT_FOUND" },
        res,
        httpStatus.NOT_FOUND
      );
    }
    const establishmentCondition = {
      hospitalId: findHospital._id
    }
    const findestablishment = await common.getByCondition(EstablishmentMaster.model, establishmentCondition);
    console.log("establishmentDetail", findestablishment)
    if (!findestablishment) {
      return response.success(
        { msgCode: "DATA_NOT_FOUND" },
        res,
        httpStatus.NOT_FOUND
      );
    }
    const { phone, publicUrl, specility, consultationFees } = req.body;
    let condition = {};
    if (phone) {
      const findUser = await common.findObject(User.model, { phone: phone })
      console.log("DoctorDetail", findUser)
      condition = {
        userId: new Types.ObjectId(findUser._id)
      }
    }
    if (publicUrl) {
      condition.publicUrl = publicUrl
    }
    const findDoctor = await common.getByCondition(Doctor.model, condition);
    console.log("findDoctor", findDoctor, condition)
    if (!findDoctor) {
      return response.success(
        { msgCode: "USER_NOT_FOUND" },
        res,
        httpStatus.NOT_FOUND
      );
    }
    const doctorDetails = {
      doctorId: findDoctor._id,
      establishmentId: findestablishment._id, //decode.userId
      specility,
      consultationFees

    };
    const addDoctor = await common.create(EstablishmentTiming.model, doctorDetails);
    if (!addDoctor) {
      return response.error(
        { msgCode: 'FAILED_TO_ADD' },
        res,
        httpStatus.BAD_REQUEST
      );
    }

    return response.success({ msgCode: 'DOCTOR_ADDED', data: addDoctor }, res, httpStatus.CREATED);
  } catch (err) {
    console.log(err);
    return response.error(
      { msgCode: 'INTERNAL_SERVER_ERROR' },
      res,
      httpStatus.INTERNAL_SERVER_ERROR
    );
  }
};

exports.hospitalRemoveDoctor = async (req, res) => {
  try {
    const decode = req.data
    console.log(decode)
    const hospitalCondition = {
      userId: decode.userId //token id
    }
    const findHospital = await common.getByCondition(Hospital.model, hospitalCondition);
    console.log(findHospital)
    if (!findHospital) {
      return response.success(
        { msgCode: "DATA_NOT_FOUND" },
        res,
        httpStatus.NOT_FOUND
      );
    }
    const establishmentCondition = {
      hospitalId: findHospital._id
    }
    const findestablishment = await common.getByCondition(EstablishmentMaster.model, establishmentCondition);
    console.log(findestablishment)
    if (!findestablishment) {
      return response.success(
        { msgCode: "DATA_NOT_FOUND" },
        res,
        httpStatus.NOT_FOUND
      );
    }
    const { establishmentTimingId, doctorId } = req.query
    const condition = {
      establishmentId: findestablishment._id,
      _id: establishmentTimingId,
      doctorId
    }
    const findDoctor = await common.getByCondition(EstablishmentTiming.model, condition);
    if (!findDoctor) {
      return response.success(
        { msgCode: "USER_NOT_FOUND" },
        res,
        httpStatus.NOT_FOUND
      );
    }
    const removeDoctor = await common.deleteByField(EstablishmentTiming.model, condition)
    if (!removeDoctor) {
      return response.error(
        { msgCode: "FAILED_TO_DELETE" },
        res,
        httpStatus.FORBIDDEN
      );
    }
    return response.success(
      { msgCode: "DATA_DELETED", },
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

exports.doctorList = async (req, res) => {
  try {
    const decode = req.data
    const hospitalCondition = {
      userId: new Types.ObjectId(decode.userId),
    }
    const findHospital = await common.getByCondition(Hospital.model, hospitalCondition);
    if (!findHospital) {
      return response.success(
        { msgCode: "DATA_NOT_FOUND" },
        res,
        httpStatus.NOT_FOUND
      );
    }
    const establishmentCondition = {
      hospitalId: findHospital._id
    }
    const findEstablishmentMaster = await common.getByCondition(EstablishmentMaster.model, establishmentCondition);
    if (!findEstablishmentMaster) {
      return response.success(
        { msgCode: "DATA_NOT_FOUND" },
        res,
        httpStatus.NOT_FOUND
      );
    }
    const { search, page, size, sortBy, order } = req.query;
    const { limit, offset } = getPagination(page, size);
    const condition1 = {
      establishmentId: findEstablishmentMaster._id,
      doctorId: { $exists: true },
      isVerified: constants.PROFILE_STATUS.APPROVE
    }
    const doctorlist = await hospital.doctorList(condition1, limit, offset, search, sortBy, order);
    if (!doctorlist) {
      return response.success(
        { msgCode: "DATA_NOT_FOUND" },
        res,
        httpStatus.NOT_FOUND
      );
    }
    return response.success(
      { msgCode: "DOCTOR_LIST", data: doctorlist },
      res,
      httpStatus.OK
    );
  } catch (error) {
    console.log("catch error", error.message);
    return response.error(
      { msgCode: "INTERNAL_SERVER_ERROR" },
      res,
      httpStatus.INTERNAL_SERVER_ERROR
    );
  }
};

// ...................Hospital Setting Profile Api's.............

exports.hospitalCompleteProfile = async (req, res) => {
  try {
    const { hospitalId } = req.query;
    const condition = {
      userId: new Types.ObjectId(hospitalId)
    }
    const hospitalProfile = await hospital.hospitalProfile(condition);
    if (!hospitalProfile) {
      return response.success(
        { msgCode: "USER_NOT_FOUND" },
        res,
        httpStatus.NOT_FOUND
      );
    }
    return response.success(
      { msgCode: "FETCHED", data: hospitalProfile },
      res,
      httpStatus.OK
    );
  } catch (error) {
    console.log("catch error", error.message);
    return response.error(
      { msgCode: "INTERNAL_SERVER_ERROR" },
      res,
      httpStatus.INTERNAL_SERVER_ERROR
    );
  }
};

exports.hospitalProfile = async (req, res) => {
  try {
    const decode = req.data
    console.log(decode)
    const condition = {
      userId: new Types.ObjectId(decode.userId)
    };
    const hospitalProfile = await hospital.hospitalProfile(condition);
    if (!hospitalProfile) {
      return response.success(
        { msgCode: "USER_NOT_FOUND" },
        res,
        httpStatus.NOT_FOUND
      );
    }
    return response.success(
      { msgCode: "FETCHED", data: hospitalProfile },
      res,
      httpStatus.OK
    );
  } catch (error) {
    console.log("catch error", error.message);
    return response.error(
      { msgCode: "INTERNAL_SERVER_ERROR" },
      res,
      httpStatus.INTERNAL_SERVER_ERROR
    );
  }
};

exports.hospitalUpdateProfile = async (req, res) => {
  try {
    const decode = req.data
    const { profilePic, fullName, hospitalType, about, totalBed, ambulance } = req.body;
    console.log(decode)
    const condition = {
      _id: new Types.ObjectId(decode.userId)
    };
    const hospitalDetails = await common.getByCondition(User.model, condition);
    if (!hospitalDetails) {
      return response.error({ msgCode: 'HOSPITAL_NOT_FOUND' }, res, httpStatus.NOT_FOUND);
    }
    const dataToupdate1 = {
      fullName,
    }
    const condition1 = {
      userId: new Types.ObjectId(decode.userId)
    };
    const dataToupdate2 = {
      profilePic,
      about,
      totalBed,
      ambulance,
      hospitalType
    }
    await Promise.all([
      common.updateByCondition(User.model, condition, dataToupdate1),
      common.updateByCondition(Hospital.model, condition1, dataToupdate2)
    ])
    return response.success({ msgCode: 'HOSPITAL_UPDATED' }, res, httpStatus.OK);
  } catch (error) {
    return response.error(
      { msgCode: "INTERNAL_SERVER_ERROR" },
      res,
      httpStatus.INTERNAL_SERVER_ERROR
    );
  }
};

exports.hospitaladdService = async (req, res) => {
  try {
    const decode = req.data
    const { service } = req.body;
    const condition = {
      userId: new Types.ObjectId(decode.userId),
      status: { $ne: constants.PROFILE_STATUS.DELETE },
    };
    const hospitalDetails = await common.getByCondition(Hospital.model, condition);
    if (!hospitalDetails) {
      return response.error({ msgCode: 'HOSPITAL_NOT_FOUND' }, res, httpStatus.NOT_FOUND);
    }
    const dataToadd = {
      service
    }

    const addservices = await common.push(Hospital.model, condition, dataToadd);
    if (!addservices) {
      return response.error({ msgCode: 'FAILED_TO_ADD' }, res, httpStatus.FORBIDDEN);
    }

    return response.success({ msgCode: 'DATA_CREATED' }, res, httpStatus.OK);
  } catch (error) {
    return response.error(
      { msgCode: "INTERNAL_SERVER_ERROR" },
      res,
      httpStatus.INTERNAL_SERVER_ERROR
    );
  }
};

exports.hospitalGetService = async (req, res) => {
  try {
    const decode = req.data
    console.log(decode)
    const condition = {
      userId: new Types.ObjectId(decode.userId)
    };
    const hospitalservice = await hospital.hospitalserviceData(condition);
    if (!hospitalservice) {
      return response.success(
        { msgCode: "DATA_NOT_FOUND" },
        res,
        httpStatus.NOT_FOUND
      );
    }
    return response.success(
      { msgCode: "FETCHED", data: hospitalservice },
      res,
      httpStatus.OK
    );
  } catch (error) {
    console.log("catch error", error.message);
    return response.error(
      { msgCode: "INTERNAL_SERVER_ERROR" },
      res,
      httpStatus.INTERNAL_SERVER_ERROR
    );
  }
};

exports.hospitalDeleteService = async (req, res) => {
  try {
    const decode = req.data
    const { serviceId } = req.query;

    const condition = {
      userId: new Types.ObjectId(decode.userId),
      status: { $ne: constants.PROFILE_STATUS.DELETE },
    };
    const hospitalDetails = await common.getByCondition(Hospital.model, condition);
    if (!hospitalDetails) {
      return response.error({ msgCode: 'HOSPITAL_NOT_FOUND' }, res, httpStatus.NOT_FOUND);
    }

    const deleteCondition = {
      service: { _id: serviceId }
    }


    const deleteservice = await common.pullObject(Hospital.model, condition, deleteCondition);
    if (!deleteservice) {
      return response.error({ msgCode: 'FAILED_TO_DELETE' }, res, httpStatus.FORBIDDEN);
    }

    return response.success({ msgCode: 'DATA_DELETED' }, res, httpStatus.OK);
  } catch (error) {
    console.log(error)
    return response.error(
      { msgCode: "INTERNAL_SERVER_ERROR" },
      res,
      httpStatus.INTERNAL_SERVER_ERROR
    );
  }
};

exports.hospitalGetTiming = async (req, res) => {
  try {
    const decode = req.data
    console.log(decode)
    const hospitalCondition = {
      userId: new Types.ObjectId(decode.userId),
    }
    const findHospital = await common.getByCondition(Hospital.model, hospitalCondition);
    if (!findHospital) {
      return response.success(
        { msgCode: "DATA_NOT_FOUND" },
        res,
        httpStatus.NOT_FOUND
      );
    }
    const establishmentCondition = {
      hospitalId: findHospital._id
    }
    const findEstablishmentMaster = await common.getByCondition(EstablishmentMaster.model, establishmentCondition);
    if (!findEstablishmentMaster) {
      return response.success(
        { msgCode: "DATA_NOT_FOUND" },
        res,
        httpStatus.NOT_FOUND
      );
    }
    const condition = {
      establishmentId: findEstablishmentMaster._id
    };
    const hospitalTiming = await hospital.hospitalTimingData(condition);
    if (!hospitalTiming) {
      return response.success(
        { msgCode: "USER_NOT_FOUND" },
        res,
        httpStatus.NOT_FOUND
      );
    }
    return response.success(
      { msgCode: "FETCHED", data: hospitalTiming },
      res,
      httpStatus.OK
    );
  } catch (error) {
    console.log("catch error", error.message);
    return response.error(
      { msgCode: "INTERNAL_SERVER_ERROR" },
      res,
      httpStatus.INTERNAL_SERVER_ERROR
    );
  }
};

exports.hospitalAddTiming = async (req, res) => {
  try {
    const decode = req.data
    console.log(decode)
    const { mon, tue, wed, thu, fri, sat, sun } = req.body;
    const condition = {
      userId: new Types.ObjectId(decode.userId),
    };
    const hospitalDetails = await common.getByCondition(Hospital.model, condition);
    if (!hospitalDetails) {
      return response.error({ msgCode: 'HOSPITAL_NOT_FOUND' }, res, httpStatus.NOT_FOUND);
    }

    const dataToadd = {
      establishmentId: new Types.ObjectId(decode.userId),
      mon,
      tue,
      wed,
      thu,
      fri,
      sat,
      sun
    }

    const addTiming = await common.create(EstablishmentTiming.model, dataToadd);
    if (!addTiming) {
      return response.error({ msgCode: 'FAILED_TO_ADD' }, res, httpStatus.FORBIDDEN);
    }

    return response.success({ msgCode: 'DATA_CREATED' }, res, httpStatus.OK);
  } catch (error) {
    console.log(error);
    return response.error(
      { msgCode: "INTERNAL_SERVER_ERROR" },
      res,
      httpStatus.INTERNAL_SERVER_ERROR
    );
  }
};

exports.hospitalUpdateTiming = async (req, res) => {
  try {
    const decode = req.data
    console.log(decode)
    const hospitalCondition = {
      userId: new Types.ObjectId(decode.userId),
    }
    const findHospital = await common.getByCondition(Hospital.model, hospitalCondition);
    if (!findHospital) {
      return response.success(
        { msgCode: "DATA_NOT_FOUND" },
        res,
        httpStatus.NOT_FOUND
      );
    }
    const establishmentCondition = {
      hospitalId: findHospital._id
    }
    const findEstablishmentMaster = await common.getByCondition(EstablishmentMaster.model, establishmentCondition);
    if (!findEstablishmentMaster) {
      return response.success(
        { msgCode: "DATA_NOT_FOUND" },
        res,
        httpStatus.NOT_FOUND
      );
    }
    const { mon, tue, wed, thu, fri, sat, sun, } = req.body;
    const { establishmentTimingId } = req.query;
    const condition = { establishmentId: findEstablishmentMaster._id };
    const hospitalDetails = await common.getByCondition(EstablishmentTiming.model, condition);
    if (!hospitalDetails) {
      return response.error({ msgCode: 'HOSPITAL_NOT_FOUND' }, res, httpStatus.NOT_FOUND);
    }
    const updateCondition = { _id: establishmentTimingId, establishmentId: findEstablishmentMaster._id, };
    const dataToupdate = { mon, tue, wed, thu, fri, sat, sun, };
    const updateTiming = await common.updateByCondition(EstablishmentTiming.model, updateCondition, dataToupdate);
    if (!updateTiming) {
      return response.error({ msgCode: 'UPDATE_ERROR' }, res, httpStatus.FORBIDDEN);
    }
    return response.success({ msgCode: 'DATA_UPDATE' }, res, httpStatus.OK);
  } catch (error) {
    return response.error(
      { msgCode: "INTERNAL_SERVER_ERROR" },
      res,
      httpStatus.INTERNAL_SERVER_ERROR
    );
  }
};

exports.hospitalGetAddress = async (req, res) => {
  try {
    const decode = req.data
    console.log(decode)
    const condition = {
      userId: new Types.ObjectId(decode.userId)
    };
    const hospitalAddress = await hospital.hospitalAddressData(condition);
    if (!hospitalAddress) {
      return response.success(
        { msgCode: "USER_NOT_FOUND" },
        res,
        httpStatus.NOT_FOUND
      );
    }
    return response.success(
      { msgCode: "FETCHED", data: hospitalAddress },
      res,
      httpStatus.OK
    );
  } catch (error) {
    console.log("catch error", error.message);
    return response.error(
      { msgCode: "INTERNAL_SERVER_ERROR" },
      res,
      httpStatus.INTERNAL_SERVER_ERROR
    );
  }
};

exports.hospitalUpdateAddress = async (req, res) => {
  try {
    const decode = req.data
    console.log(decode)
    const condition = {
      userId: new Types.ObjectId(decode.userId)
    };
    const { address, location } = req.body;
    const hospitalDetails = await common.getByCondition(Hospital.model, condition);
    if (!hospitalDetails) {
      return response.error({ msgCode: 'HOSPITAL_NOT_FOUND' }, res, httpStatus.NOT_FOUND);
    }
    const dataToupdate = {
      address,
      location
    };
    const updateAddress = await common.updateByCondition(Hospital.model, condition, dataToupdate);
    if (!updateAddress) {
      return response.error({ msgCode: 'UPDATE_ERROR' }, res, httpStatus.FORBIDDEN);
    }

    return response.success({ msgCode: 'DATA_UPDATE' }, res, httpStatus.OK);
  } catch (error) {
    return response.error(
      { msgCode: "INTERNAL_SERVER_ERROR" },
      res,
      httpStatus.INTERNAL_SERVER_ERROR
    );
  }
};

exports.hospitalGetImages = async (req, res) => {
  try {
    const decode = req.data
    console.log(decode)
    const condition = {
      userId: new Types.ObjectId(decode.userId)
    };
    const hospitalImages = await hospital.hospitalImagesData(condition);
    if (!hospitalImages) {
      return response.success(
        { msgCode: "USER_NOT_FOUND" },
        res,
        httpStatus.NOT_FOUND
      );
    }
    return response.success(
      { msgCode: "FETCHED", data: hospitalImages },
      res,
      httpStatus.OK
    );
  } catch (error) {
    console.log("catch error", error.message);
    return response.error(
      { msgCode: "INTERNAL_SERVER_ERROR" },
      res,
      httpStatus.INTERNAL_SERVER_ERROR
    );
  }
};

exports.hospitalAddImages = async (req, res) => {
  try {
    const { image } = req.body;
    const decode = req.data
    console.log(decode)
    const condition = {
      userId: new Types.ObjectId(decode.userId)
    };
    const hospitalDetails = await common.getByCondition(Hospital.model, condition);
    if (!hospitalDetails) {
      return response.error({ msgCode: 'HOSPITAL_NOT_FOUND' }, res, httpStatus.NOT_FOUND);
    }

    const dataToadd = {
      image
    }

    const addImages = await common.push(Hospital.model, condition, dataToadd);
    if (!addImages) {
      return response.error({ msgCode: 'FAILED_TO_ADD' }, res, httpStatus.FORBIDDEN);
    }

    return response.success({ msgCode: 'DATA_CREATED' }, res, httpStatus.OK);
  } catch (error) {
    return response.error(
      { msgCode: "INTERNAL_SERVER_ERROR" },
      res,
      httpStatus.INTERNAL_SERVER_ERROR
    );
  }
};

exports.hospitalDeleteImages = async (req, res) => {
  try {
    const { imageId } = req.query;
    const decode = req.data
    console.log(decode)
    const condition = {
      userId: new Types.ObjectId(decode.userId)
    };
    const hospitalDetails = await common.getByCondition(Hospital.model, condition);
    if (!hospitalDetails) {
      return response.error({ msgCode: 'HOSPITAL_NOT_FOUND' }, res, httpStatus.NOT_FOUND);
    }
    const deleteCondition = {
      image: { _id: imageId }
    }
    const deleteImages = await common.pullObject(Hospital.model, condition, deleteCondition);
    if (!deleteImages) {
      return response.error({ msgCode: 'FAILED_TO_DELETE' }, res, httpStatus.FORBIDDEN);
    }

    return response.success({ msgCode: 'DATA_DELETED' }, res, httpStatus.OK);
  } catch (error) {
    console.log(error)
    return response.error(
      { msgCode: "INTERNAL_SERVER_ERROR" },
      res,
      httpStatus.INTERNAL_SERVER_ERROR
    );
  }
};

exports.hospitalAddSocial = async (req, res) => {
  try {
    const { social } = req.body;
    const decode = req.data
    console.log(decode)
    const condition = {
      userId: new Types.ObjectId(decode.userId),
      status: { $ne: constants.PROFILE_STATUS.DELETE }
    };
    const hospitalDetails = await common.getByCondition(Hospital.model, condition);
    if (!hospitalDetails) {
      return response.error({ msgCode: 'HOSPITAL_NOT_FOUND' }, res, httpStatus.NOT_FOUND);
    }
    const dataToadd = {
      social
    }
    const addsocial = await common.push(Hospital.model, condition, dataToadd);
    if (!addsocial) {
      return response.error({ msgCode: 'FAILED_TO_ADD' }, res, httpStatus.FORBIDDEN);
    }
    return response.success({ msgCode: 'DATA_CREATED' }, res, httpStatus.OK);
  } catch (error) {
    return response.error(
      { msgCode: "INTERNAL_SERVER_ERROR" },
      res,
      httpStatus.INTERNAL_SERVER_ERROR
    );
  }
};

exports.hospitalSocialData = async (req, res) => {
  try {
    const decode = req.data
    console.log(decode)
    const condition = {
      userId: new Types.ObjectId(decode.userId)
    };
    const socialData = await hospital.hospitalSocialData(condition);
    if (!socialData) {
      return response.success(
        { msgCode: "USER_NOT_FOUND" },
        res,
        httpStatus.NOT_FOUND
      );
    }
    return response.success(
      { msgCode: "FETCHED", data: socialData },
      res,
      httpStatus.OK
    );
  } catch (error) {
    console.log("catch error", error.message);
    return response.error(
      { msgCode: "INTERNAL_SERVER_ERROR" },
      res,
      httpStatus.INTERNAL_SERVER_ERROR
    );
  }
};

exports.hospitalDeleteSocial = async (req, res) => {
  try {
    const { socialId } = req.query;
    const decode = req.data
    console.log(decode)
    const condition = {
      userId: new Types.ObjectId(decode.userId),
      status: { $ne: constants.PROFILE_STATUS.DELETE }
    };
    const hospitalDetails = await common.getByCondition(Hospital.model, condition);
    if (!hospitalDetails) {
      return response.error({ msgCode: 'HOSPITAL_NOT_FOUND' }, res, httpStatus.NOT_FOUND);
    }
    const deleteCondition = {
      social: { _id: socialId }
    }
    const deletesocial = await common.pullObject(Hospital.model, condition, deleteCondition);
    if (!deletesocial) {
      return response.error({ msgCode: 'FAILED_TO_DELETE' }, res, httpStatus.FORBIDDEN);
    }

    return response.success({ msgCode: 'DATA_DELETED' }, res, httpStatus.OK);
  } catch (error) {
    console.log(error)
    return response.error(
      { msgCode: "INTERNAL_SERVER_ERROR" },
      res,
      httpStatus.INTERNAL_SERVER_ERROR
    );
  }
};

exports.hospitalUpdateSocial = async (req, res) => {
  try {
    const { social } = req.body;
    const { socialId } = req.query;
    const decode = req.data
    console.log(decode)
    const condition = {
      userId: new Types.ObjectId(decode.userId),
      status: { $ne: constants.PROFILE_STATUS.DELETE }
    };
    const hospitalDetails = await common.getByCondition(Hospital.model, condition);
    if (!hospitalDetails) {
      return response.error({ msgCode: 'HOSPITAL_NOT_FOUND' }, res, httpStatus.NOT_FOUND);
    }
    const dataToupdate = {
      "social.$": social
    };
    const updateCondition = { 'social._id': socialId }

    const updateSocial = await common.updateByCondition(Hospital.model, updateCondition, dataToupdate);
    if (!updateSocial) {
      return response.error({ msgCode: 'UPDATE_ERROR' }, res, httpStatus.FORBIDDEN);
    }

    return response.success({ msgCode: 'DATA_UPDATE' }, res, httpStatus.OK);
  } catch (error) {
    return response.error(
      { msgCode: "INTERNAL_SERVER_ERROR" },
      res,
      httpStatus.INTERNAL_SERVER_ERROR
    );
  }
};

exports.hospitalDeleteAccount = async (req, res) => {
  try {
    const decode = req.data
    console.log(decode)
    const condition = {
      _id: new Types.ObjectId(decode.userId),
      isDeleted: { $ne: true }
    };
    const hospitalDetails = await common.getByCondition(User.model, condition);
    if (!hospitalDetails) {
      return response.error({ msgCode: 'HOSPITAL_NOT_FOUND' }, res, httpStatus.NOT_FOUND);
    }
    const dataToupdate = {
      isDeleted: true,
    };
    const updateHospital = await common.updateByCondition(User.model, condition, dataToupdate);
    if (!updateHospital) {
      return response.error({ msgCode: 'UPDATE_ERROR' }, res, httpStatus.FORBIDDEN);
    }

    return response.success({ msgCode: 'ACCOUNT_DELETED' }, res, httpStatus.OK);
  } catch (error) {
    return response.error(
      { msgCode: "INTERNAL_SERVER_ERROR" },
      res,
      httpStatus.INTERNAL_SERVER_ERROR
    );
  }
};

exports.procedureSpecialityList = async (req, res) => {
  try {
    const { type } = req.query;
    const { userId } = req.data;
    const condition = { userId: new ObjectId(userId) };
    const procdeureSpecialityList = await hospital.getHospitalDataByID(Hospital.model, condition, type);
    const msgCode = procdeureSpecialityList.length === 0 ? 'NO_RECORD_FETCHED' : 'FECTHED';
    return response.success({ msgCode, data: procdeureSpecialityList }, res, httpStatus.OK);
  } catch (err) {
    return response.error(
      { msgCode: 'SOMETHING_WENT_WRONG' },
      res,
      httpStatus.SOMETHING_WENT_WRONG
    );
  }
};

exports.addProcedureSpeciality = async (req, res) => {
  try {
    const { type, recordId } = req.body;
    const { userId } = req.data;
    const condition = { userId: new ObjectId(userId) }
    const recordKey = constants.SPECIALITY_PROCEDURE_RECORD_KEY[type];
    // const procedureSpecialityExists = await common.getByCondition(Hospital.model, { userId:  new ObjectId(userId), `${recordKey}`: new ObjectId(recordId) })
    // console.log(procedureSpecialityExists)
    // if (procedureSpecialityExists) return response.error(
    //   { msgCode: type === constants.SPECIALITY_PROCEDURE.PROCEDURE ? 'PROCEDURE_EXISTS' : 'SPECIALITY_EXISTS' },
    //   res,
    //   httpStatus.BAD_REQUEST
    // );

    const updates = {};
    updates[`${recordKey}`] = recordId;
    const addProcedureSpecialty = await common.push(Hospital.model, condition, updates);
    if (!addProcedureSpecialty) {
      return response.error(
        { msgCode: 'FAILED_TO_ADD' },
        res,
        httpStatus.BAD_REQUEST
      );
    }

    return response.success({ msgCode: 'ADDED', data: addProcedureSpecialty }, res, httpStatus.CREATED);
  } catch (err) {
    return response.error(
      { msgCode: 'SOMETHING_WENT_WRONG' },
      res,
      httpStatus.SOMETHING_WENT_WRONG
    );
  }
};

exports.deleteProcedureSpeciality = async (req, res) => {
  try {
    const { type, recordId } = req.query;
    const { userId } = req.data;
    const condition = { userId: new ObjectId(userId) }
    const recordKey = constants.SPECIALITY_PROCEDURE_RECORD_KEY[type];
    const updates = {};
    updates[`${recordKey}`] = new ObjectId(recordId);
    const deleteProcedureSpecialty = await common.pullObject(Hospital.model, condition, updates);
    if (!deleteProcedureSpecialty) {
      return response.error(
        { msgCode: 'FAILED_TO_DELETE' },
        res,
        httpStatus.BAD_REQUEST
      );
    }
    return response.success({ msgCode: 'DELETED', data: {} }, res, httpStatus.OK);
  } catch (error) {
    console.log(error);
    return response.error({ msgCode: 'SOMETHING_WRONG' }, res, httpStatus.SOMETHING_WRONG);
  }
};

exports.hospitalAboutUs = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(id);
    const data = await hospital.hospitalAboutUs(id);
    return response.success(
      { msgCode: "DOCTOR_ABOUT_US", data },
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

exports.rescheduleAppointment = async (req, res) => {
  try {
    const { appointmentId } = req.query;
    const { date, email, notes } = req.body;
    const condition = {
      _id: new ObjectId(appointmentId),
      status: { $ne: constants.BOOKING_STATUS.RESCHEDULE }
    };
    const findAppointment = await common.getByCondition(Appointment.model, condition);
    if (!findAppointment) {
      return response.success(
        { msgCode: "APPOINTMENT_NOT_FOUND" },
        res,
        httpStatus.NOT_FOUND
      );
    }
    await common.updateById(Appointment.model, appointmentId, { status: constants.BOOKING_STATUS.RESCHEDULE }); // Updating the status of appointment

    const newAppointmentData = {
      doctorId: findAppointment?.doctorId,
      establishmentId: findAppointment?.establishmentId,
      slotTime: findAppointment?.slotTime,
      consultationFees: findAppointment?.consultationFees,
      date,
      slot: findAppointment?.slot,
      patientId: findAppointment?.patientId,
      self: findAppointment?.self,
      fullName: findAppointment?.fullName,
      phone: findAppointment?.phone,
      email,
      city: findAppointment?.city,
      reason: findAppointment?.reason,
      notes,
      status: 0,
    };
    // create a new appointment in case of reschedule to keep track of old timing.
    const createAppointment = await common.create(Appointment.model, newAppointmentData);

    if (!createAppointment) {
      return response.error(
        { msgCode: "FAILED_TO_ADD" },
        res,
        httpStatus.BAD_REQUEST
      );
    }
    return response.success(
      { msgCode: "APPOINTMENT_RESCHEDULE", data: createAppointment },
      res,
      httpStatus.CREATED
    );
  } catch (error) {
    return response.error(
      { msgCode: "INTERNAL_SERVER_ERROR" },
      res,
      httpStatus.INTERNAL_SERVER_ERROR
    );
  }
};

exports.changeAppointmentStatus = async (req, res) => {
  try {
    const { appointmentId } = req.query;
    const { status, reason, isDeleted } = req.body;
    const condition = {
      _id: new ObjectId(appointmentId),
      status: { $ne: constants.BOOKING_STATUS.RESCHEDULE }
    };
    const findAppointment = await common.getByCondition(Appointment.model, condition);
    if (!findAppointment) {
      return response.success(
        { msgCode: "APPOINTMENT_NOT_FOUND", data: {} },
        res,
        httpStatus.NOT_FOUND
      );
    }
    let updateAppointment;
    if (isDeleted) await common.removeById(Appointment.model, appointmentId);
    else updateAppointment = await common.updateById(Appointment.model, appointmentId, { status, reason }); 
    
    if (!isDeleted){
    if (!updateAppointment) {
      return response.error(
        { msgCode: "FAILED_TO_UPDATE" },
        res,
        httpStatus.BAD_REQUEST
      );
      }
    }
    const msgCode = isDeleted ? 
    "APPOINTMENT_DELETED"  : 
    status === constants.BOOKING_STATUS.CANCEL 
    ? 
    "APPOINTMENT_CANCELLATION" 
    : "APPOINTMENT_COMPLETED";
    return response.success(
      { msgCode, data: updateAppointment || {} },
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

exports.appointmentListByDate = async (req, res) => {
  try {
    const { toDate, fromDate, page, size, sort, sortOrder } = req.query;
    const { userId } = req.data;
    const sortCondition = {};
    let sortKey = sort;
    if (constants.NAME_CONSTANT.includes(sort)) sortKey = 'lowerName';
    sortCondition[`${sortKey}`] = constants.LIST.ORDER[sortOrder];
    const { offset, limit } = getPagination(page, size);
    const condition = {
      'date': { $gte: fromDate, $lte: toDate },
      status: { $ne: constants.BOOKING_STATUS.RESCHEDULE }
    };
    const appointmentList = await hospital.appointmentList(condition, userId, sortCondition, offset, limit);
    const msgCode = appointmentList.count === 0 ? 'NO_RECORD_FETCHED' : 'APPOINTMENT_LIST_FETCHED';
    return response.success({ msgCode, data: appointmentList }, res, httpStatus.OK);
  } catch (err) {
    console.log(err);
    return response.error(
      { msgCode: 'SOMETHING_WENT_WRONG' },
      res,
      httpStatus.SOMETHING_WENT_WRONG
    );
  }
};

exports.calendarList = async (req, res) => {
  try {
    const { doctorId, fromDate, toDate, page, size } = req.query;
    const { userId } = req.data;
    const { offset, limit } = getPagination(page, size);
    const condition = {
      'date': { $gte: fromDate, $lte: toDate },
      status: { $ne: constants.BOOKING_STATUS.RESCHEDULE }
    };
    if (doctorId) condition.doctorId = new ObjectId(doctorId)
    const appointmentList = await hospital.calendarList(condition, { "hospital.userId": new ObjectId(userId) }, offset, limit);
    const msgCode = appointmentList.count === 0 ? 'NO_RECORD_FETCHED' : 'APPOINTMENT_LIST_FETCHED';
    return response.success({ msgCode, data: appointmentList }, res, httpStatus.OK);
  } catch (err) {
    console.log(err);
    return response.error(
      { msgCode: 'SOMETHING_WENT_WRONG' },
      res,
      httpStatus.SOMETHING_WENT_WRONG
    );
  }
};

exports.patientHospitalDetailList = async (req, res) => {
  try {
    const { search, sort, page, size, sortOrder, establishmentId } = req.query;
    const condition = {
      _id: new ObjectId(establishmentId)
    };

    const searchQuery = { "hospital.service.name": { $regex: new RegExp(search, 'i') } };

    const sortCondition = {};
    let sortKey = sort;
    if (constants.NAME_CONSTANT.includes(sort)) sortKey = 'lowerName';
    else sortKey = 'serviceId';
    sortCondition[`${sortKey}`] = constants.LIST.ORDER[sortOrder];
    const { offset, limit } = getPagination(page, size);
    const detailsList = await hospital.detailsList(condition, sortCondition, offset, limit, searchQuery);
    const msgCode = detailsList.count === 0 ? 'NO_RECORD_FETCHED' : 'HOSPITAL_LIST';
    return response.success({ msgCode, data: detailsList }, res, httpStatus.OK);
  } catch (err) {
    console.log(err);
    return response.error(
      { msgCode: 'SOMETHING_WENT_WRONG' },
      res,
      httpStatus.SOMETHING_WENT_WRONG
    );
  }
};

exports.hospitalReviewList = async (req, res) => {
  try {
    const { search, sort, page, size, establishmentId } = req.query;
    const condition = {
      establishmentId: new ObjectId(establishmentId),
      treatment: { $regex: new RegExp(search, 'i') },
      // status: constants.STATUS.APPROVE
    };
    
    const sortCondition = {};
    sortCondition["createdAt"] = sort === 1 ? 1 : -1;
    
    const { offset, limit } = getPagination(page, size);

    const reviewList = await hospital.reviewList(condition, sortCondition, offset, limit);
    const waitTimeData = reviewList.data.map((feedback) => {
      const experience = feedback.experience.find(
        (exp) => exp.questionNo === 3
      );
      return { waitTime: experience.option, points: experience.point };
    });
    let waitTimePoints = 0;
    const waitTimeLength = waitTimeData.length;
    waitTimeData.forEach((data) => {
      switch (data.waitTime) {
        case "Less than 15 minutes":
          waitTimePoints += 5;
          break;
        case "15-30 minutes":
          waitTimePoints += 4.5;
          break;
        case "30-45 minutes":
          waitTimePoints += 4;
          break;
        case "More than 1 hour":
          waitTimePoints += 3.5;
          break;
        default:
          break;
      }
    });
    const totalPoints = reviewList.data.reduce(
      (sum, feedback) => sum + feedback.totalPoint,
      0
    );
    const averagePoints = totalPoints / reviewList.data.length;
    const averageWaitTime =
      Math.round((waitTimePoints / waitTimeLength) * 100) / 100;

    const msgCode = reviewList.count === 0 ? 'NO_RECORD_FETCHED' : 'REVIEW_LIST';
    return response.success({ msgCode, data: { averageWaitTime, averagePoints, valueForMoney: 4.5, reviewList } }, res, httpStatus.OK);
  } catch (err) {
    console.log(err);
    return response.error(
      { msgCode: 'SOMETHING_WENT_WRONG' },
      res,
      httpStatus.SOMETHING_WENT_WRONG
    );
  }
};

