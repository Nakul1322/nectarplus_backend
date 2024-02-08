const { ObjectId } = require("mongoose").Types;
const momentTZ = require("moment-timezone");
const httpStatus = require("http-status");
const { Types } = require("mongoose");
const moment = require("moment");

const {
  User,
  FAQ,
  EstablishmentTiming,
  Doctor,
  Hospital,
  EstablishmentMaster,
  Appointment,
  ProcedureMaster,
  Specialization,
  Notification,
  AppointmentFeedback,
  Video,
} = require("../../../models/index");
const {
  common,
  hospital,
  users,
  doctor,
  adminService,
} = require("../../../services/index");
const {
  response,
  constants,
  sendSms,
  sendEmail,
} = require("../../../utils/index");
const { getPagination, filterFormatter } = require("../../../utils/helper");
const config = require("../../../config/index");
const environment = config.ENVIRONMENT === constants.SERVER.PROD;

exports.hospitalDetails = async (req, res) => {
  try {
    const { hospitalId, type } = req.query;
    const condition = {
      _id: new ObjectId(hospitalId),
      userType: constants.USER_TYPES.HOSPITAL,
    };
    const hospitalDetails = await hospital.hospitalDetails(condition, type);
    if (!hospitalDetails) {
      return response.error(
        { msgCode: "HOSPITAL_NOT_FOUND" },
        res,
        httpStatus.NOT_FOUND
      );
    }

    return response.success(
      { msgCode: "HOSPITAL_DATA", data: hospitalDetails },
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

exports.hospitalList = async (req, res) => {
  try {
    const {
      search,
      sort,
      page,
      size,
      sortOrder,
      city,
      hospitalType,
      isExport,
    } = req.query;
    let cityFilter, hospitalTypeFilter;
    const condition = {
      userType: constants.USER_TYPES.HOSPITAL,
    };
    const hospitalCondition = {
      $or: [
        {
          "hospital.isVerified": constants.PROFILE_STATUS.PENDING,
          "hospital.steps": { $ne: constants.PROFILE_STEPS.COMPLETED },
        },
        {
          "hospital.isVerified": {
            $in: [
              constants.PROFILE_STATUS.APPROVE,
              constants.PROFILE_STATUS.REJECT,
            ],
          },
        },
      ],
    };
    const searchQuery = {
      $or: [
        {
          "establishmentMaster.name": { $regex: new RegExp(search, "i") },
        },
        {
          phone: { $regex: new RegExp(search, "i") },
        },
      ],
    };
    const sortCondition = {};
    let sortKey = sort;
    if (constants.NAME_CONSTANT.includes(sort)) sortKey = "lowerName";
    sortCondition[`${sortKey}`] = constants.LIST.ORDER[sortOrder];
    const { offset, limit } = getPagination(page, size);
    const filterQuery = {};
    if (city) {
      cityFilter = filterFormatter(city, 2, "hospital.address.city");
      filterQuery["$or"] = cityFilter;
    }
    if (hospitalType) {
      hospitalTypeFilter = filterFormatter(hospitalType);
      filterQuery["hospital.hospitalType"] = { $in: hospitalTypeFilter };
    }

    const hospitalList = await hospital.hospitalList(
      condition,
      sortCondition,
      offset,
      limit,
      filterQuery,
      isExport,
      { searchQuery, hospitalCondition }
    );
    const msgCode =
      hospitalList.count === 0 ? "NO_RECORD_FETCHED" : "HOSPITAL_LIST";
    return response.success(
      { msgCode, data: hospitalList },
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

exports.addHospital = async (req, res) => {
  try {
    const {
      fullName,
      hospitalType,
      address,
      phone,
      location,
      isLocationShared,
    } = req.body;
    if (phone) {
      const phoneExists = await common.getByCondition(User.model, {
        phone,
        userType: constants.USER_TYPES.HOSPITAL,
      });
      if (phoneExists)
        return response.error(
          { msgCode: "PHONE_EXISTS" },
          res,
          httpStatus.FORBIDDEN
        );
    }
    const hospitalDetails = {
      userType: constants.USER_TYPES.HOSPITAL,
      fullName,
      phone,
    };

    const addUser = await common.create(User.model, hospitalDetails);
    const addHospital = await common.create(Hospital.model, {
      userId: new ObjectId(addUser?._id),
      hospitalType,
      address,
      location,
      isLocationShared,
    });
    const addMaster = await common.create(EstablishmentMaster.model, {
      hospitalId: new ObjectId(addHospital?._id),
      hospitalTypeId: hospitalType,
      address,
      name: fullName,
      location,
      isLocationShared,
    });

    if (!addHospital || !addUser || !addMaster) {
      return response.error(
        { msgCode: "FAILED_TO_ADD" },
        res,
        httpStatus.BAD_REQUEST
      );
    }

    return response.success(
      { msgCode: "HOSPITAL_ADDED", data: addHospital },
      res,
      httpStatus.CREATED
    );
  } catch (error) {
    return response.error(
      { msgCode: "SOMETHING_WENT_WRONG" },
      res,
      httpStatus.SOMETHING_WENT_WRONG
    );
  }
};

const updateEstablishmentMaster = async (
  fullName,
  hospitalType,
  address,
  location,
  establishmentDetails,
  isLocationShared
) => {
  if (fullName || hospitalType || address || location)
    await common.updateById(
      EstablishmentMaster.model,
      establishmentDetails._id,
      {
        name: fullName || establishmentDetails.name,
        address,
        hospitalTypeId: hospitalType || establishmentDetails.hospitalTypeId,
        location: location || establishmentDetails.location,
        isLocationShared,
      }
    );
};

// cognitive complexity
exports.editHospital = async (req, res) => {
  try {
    const {
      fullName,
      hospitalType,
      address,
      isVerified,
      phone,
      location,
      isLocationShared,
    } = req.body;
    const { hospitalId } = req.query;

    const condition = {
      _id: new ObjectId(hospitalId),
      userType: constants.USER_TYPES.HOSPITAL,
    };
    if (phone) {
      const phoneExists = await common.getByCondition(User.model, {
        phone,
        userType: constants.USER_TYPES.HOSPITAL,
        _id: { $ne: new ObjectId(hospitalId) },
      });
      if (phoneExists)
        return response.error(
          { msgCode: "PHONE_EXISTS" },
          res,
          httpStatus.FORBIDDEN
        );
    }
    const userDetails = await common.getByCondition(User.model, condition);
    const hospitalDetails = await common.getByCondition(Hospital.model, {
      userId: new ObjectId(hospitalId),
    });
    const establishmentDetails = await common.getByCondition(
      EstablishmentMaster.model,
      {
        hospitalId: new ObjectId(hospitalDetails._id),
      }
    );
    if (!hospitalDetails || !userDetails) {
      return response.error(
        { msgCode: "HOSPITAL_NOT_FOUND" },
        res,
        httpStatus.NOT_FOUND
      );
    }
    if (fullName || phone || isVerified)
      await common.updateById(User.model, userDetails?._id, {
        fullName,
        phone,
        status: isVerified || userDetails.status,
      });
    if (hospitalType || address)
      await common.updateById(Hospital.model, hospitalDetails._id, {
        address,
        hospitalType,
        location: location || hospitalDetails.location,
        isLocationShared,
      });

    await updateEstablishmentMaster(
      fullName,
      hospitalType,
      address,
      location,
      establishmentDetails,
      isLocationShared
    );
    if (isVerified === constants.PROFILE_STATUS.DEACTIVATE)
      await common.updateManyByCondition(
        Appointment.model,
        {
          establishmentId: new Types.ObjectId(establishmentDetails._id),
          isDeleted: false,
        },
        { status: constants.BOOKING_STATUS.CANCEL }
      );
    return response.success(
      { msgCode: "HOSPITAL_UPDATED" },
      res,
      httpStatus.OK
    );
  } catch (error) {
    return response.error(
      { msgCode: "SOMETHING_WRONG" },
      res,
      httpStatus.SOMETHING_WRONG
    );
  }
};

exports.addHospitalProfile = async (req, res) => {
  try {
    const { fullName, type, city } = req.body;
    const { userId } = req.data;
    const condition = {
      _id: userId,
      userType: constants.USER_TYPES.HOSPITAL,
      status: { $ne: constants.PROFILE_STATUS.DELETE },
    };

    const findHospital = await common.getByCondition(User.model, condition);
    if (!findHospital) {
      return response.error(
        { msgCode: "USER_NOT_FOUND" },
        res,
        httpStatus.BAD_REQUEST
      );
    }

    const hospitalDetails = {
      userType: constants.USER_TYPES.HOSPITAL,
      steps: constants.PROFILE_STEPS.SECTION_B,
      fullName,
      establishmentDetail: [{ city, type }],
    };

    const updateData = await common.updateById(User.model, id, hospitalDetails);
    if (!updateData) {
      return response.error(
        { msgCode: "UPDATE_ERROR" },
        res,
        httpStatus.FORBIDDEN
      );
    }

    return response.success(
      { msgCode: "PROFILE_UPDATED", data: findHospital._id },
      res,
      httpStatus.CREATED
    );
  } catch (error) {
    return response.error(
      { msgCode: "SOMETHING_WENT_WRONG" },
      res,
      httpStatus.SOMETHING_WENT_WRONG
    );
  }
};

// cognitive complexity
exports.editHospitalProfile = async (req, res) => {
  try {
    const { steps, records, isEdit, isSaveAndExit } = req.body;
    const { userId } = req.data;
    let { profileScreen } = req.body;

    const condition = {
      _id: new ObjectId(userId),
      userType: constants.USER_TYPES.HOSPITAL,
    };

    const findUser = await hospital.hospitalDetails(
      condition,
      constants.HOSPITAL_DETAIL_TYPE.HOSPITAL
    );
    if (!findUser?._id || !findUser?.hospitalId) {
      return response.error(
        { msgCode: "USER_NOT_FOUND" },
        res,
        httpStatus.NOT_FOUND
      );
    }
    let establishmentTimingData = {};
    if (records?.hospitalTiming)
      establishmentTimingData = { ...records?.hospitalTiming };
    await common.updateByCondition(
      EstablishmentMaster.model,
      { _id: new ObjectId(findUser?.hospitalMasterId) },
      {
        name: records?.fullName,
        hospitalTypeId: new ObjectId(
          records?.hospitalType || findUser.sectionA.hospitalType
        ),
        establishmentProof: records?.establishmentProof || null,
        propertyStatus: records.isOwner
          ? constants.ESTABLISHMENT_PROOF["THE OWNER OF THE ESTABLISHMENT"]
          : constants.ESTABLISHMENT_PROOF["HAVE RENTED AT OTHER ESTABLISHMENT"],
        address: records?.address,
        location: records?.location,
      },
      constants.USER_TYPES.HOSPITAL
    );

    if (findUser.hospitalTimingId)
      await common.updateByCondition(
        EstablishmentTiming.model,
        { _id: new ObjectId(findUser?.hospitalTimingId) },
        establishmentTimingData
      );
    else {
      await common.create(EstablishmentTiming.model, {
        ...establishmentTimingData,
        isOwner: true,
        isVerified: constants.PROFILE_STATUS.APPROVE,
        establishmentId: new Object(findUser?.hospitalMasterId),
        createdBy: new ObjectId(userId),
      });
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
    if (!isEdit && profileScreen) updates.profileScreen = profileScreen;

    const updateData = await common.updateByCondition(
      Hospital.model,
      { userId: new ObjectId(userId) },
      updates
    );
    if (!updateData) {
      return response.error(
        { msgCode: "UPDATE_ERROR" },
        res,
        httpStatus.FORBIDDEN
      );
    }
    if (
      steps === constants.PROFILE_STEPS.SECTION_C &&
      findUser.steps !== constants.PROFILE_STEPS.COMPLETED
    ) {
      const superadminArray = await adminService.superAdminList();
      await common.create(Notification.model, {
        userType: constants.USER_TYPES.ADMIN,
        eventType: constants.NOTIFICATION_TYPE.HOSPITAL_SIGN_UP_PROOFS,
        senderId: new ObjectId(userId),
        receiverId: superadminArray,
        title: constants.MESSAGES.HOSPITAL_SIGN_UP_PROOFS.TITLE,
        body: constants.MESSAGES.HOSPITAL_SIGN_UP_PROOFS.BODY,
      });
      if (environment) {
        await sendSms.sendOtp(
          hospitalProject.phone,
          hospitalProject.countryCode,
          {
            name: hospitalProject.sectionA.fullName.substring(0, 30),
          },
          constants.SMS_TEMPLATES.HOSPITAL_REGISTRATION
        );
      }
    }

    return response.success(
      { msgCode: "HOSPITAL_UPDATED", data: updateData },
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

exports.adminHospitalListForApprove = async (req, res) => {
  try {
    const { search, page, size, sortBy, order } = req.query;
    const { limit, offset } = getPagination(page, size);
    const condition = {
      isVerified: constants.PROFILE_STATUS.PENDING,
      steps: constants.PROFILE_STEPS.COMPLETED,
    };
    const hospitalQuery = {
      "userTableDetails.isDeleted": false,
      "userTableDetails.status": constants.PROFILE_STATUS.ACTIVE,
    };
    const data = await hospital.hospitalApprovalList(
      condition,
      hospitalQuery,
      limit,
      offset,
      sortBy,
      order,
      search
    );
    return response.success(
      { msgCode: "HOSPITAL_DATA", data },
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

exports.adminActionHospital = async (req, res) => {
  try {
    const { isVerified, rejectReason } = req.body;
    const { hospitalId } = req.query;
    const condition = {
      userId: hospitalId,
      isVerified: constants.PROFILE_STATUS.PENDING,
    };
    const findHospital = await common.getByCondition(Hospital.model, condition);
    if (!findHospital) {
      return response.success(
        { msgCode: "DATA_NOT_FOUND" },
        res,
        httpStatus.NOT_FOUND
      );
    }
    const dataToupdate = {
      isVerified,
      rejectReason,
    };
    const updateData = await common.updateByCondition(
      Hospital.model,
      condition,
      dataToupdate
    );
    if (!updateData) {
      return response.error(
        { msgCode: "UPDATE_ERROR" },
        res,
        httpStatus.NOT_ACCEPTABLE
      );
    }
    if (isVerified === constants.PROFILE_STATUS.APPROVE && environment) {
      const userData = await common.getById(User.model, hospitalId);
      const establishmentData = await common.getByCondition(
        EstablishmentMaster.model,
        { hospitalId: findHospital._id }
      );
      const loginLink = constants.SCREEN.HOSPITAL_LOGIN;
      await sendSms.sendOtp(
        userData.phone,
        userData.countryCode,
        {
          name: establishmentData?.name.substring(0, 30),
          loginLink,
        },
        constants.SMS_TEMPLATES.HOSPITAL_ACCEPT
      );
    }
    return response.success(
      { msgCode: "HOSPITAL_STATUS_UPDATED" },
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

exports.adminViewHospital = async (req, res) => {
  try {
    const { hospitalId } = req.query;
    const condition = { userId: new Types.ObjectId(hospitalId) };
    const data = await hospital.adminViewHospital(condition);
    // needed by front end
    data[0].identityProof = [];
    data[0].medicalProof = [];
    return response.success(
      { msgCode: "HOSPITAL_DATA", data },
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

// ...................Our Doctor Section Hospital.................

exports.doctorRequestList = async (req, res) => {
  try {
    const decode = req.data;
    const { page, size, sortBy, order } = req.query;

    const hospitalCondition = {
      userId: new Types.ObjectId(decode.userId),
    };
    const findHospital = await common.getByCondition(
      Hospital.model,
      hospitalCondition
    );

    const establishmentCondition = {
      hospitalId: findHospital._id,
    };
    const findEstablishmentMaster = await common.getByCondition(
      EstablishmentMaster.model,
      establishmentCondition
    );

    const condition = {
      establishmentId: findEstablishmentMaster._id,
      doctorId: { $exists: true },
      isVerified: constants.PROFILE_STATUS.PENDING,
      createdBy: { $ne: new Types.ObjectId(decode.userId) },
    };
    const doctorQuery = {
      "doctorData.isVerified": constants.PROFILE_STATUS.APPROVE,
      "doctorUser.isDeleted": false,
    };

    const { limit, offset } = getPagination(page, size);
    const findEstablishment = await hospital.doctorRequestList(
      condition,
      doctorQuery,
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
    console.log(error);
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
    const { isVerified, rejectReason } = req.body;
    const { doctorId } = req.query;
    const hospitalCondition = {
      userId: new Types.ObjectId(decode.userId),
    };
    const findHospital = await common.getByCondition(
      Hospital.model,
      hospitalCondition
    );

    const establishmentCondition = {
      hospitalId: findHospital._id,
    };
    const findEstablishmentMaster = await common.getByCondition(
      EstablishmentMaster.model,
      establishmentCondition
    );

    const condition = {
      establishmentId: findEstablishmentMaster._id,
      doctorId: doctorId,
      isVerified: constants.PROFILE_STATUS.PENDING,
    };
    const findData = await common.getByCondition(
      EstablishmentTiming.model,
      condition
    );
    if (!findData) {
      return response.success(
        { msgCode: "DATA_NOT_FOUND" },
        res,
        httpStatus.NOT_FOUND
      );
    }
    const dataToupdate = {
      isVerified,
      rejectReason,
    };
    const increaseDoctor = {
      totalDoctor: findHospital.totalDoctor + 1,
    };
    if (isVerified == 2) {
      await common.updateByCondition(
        Hospital.model,
        hospitalCondition,
        increaseDoctor
      );
    }
    const updateData = await common.updateByCondition(
      EstablishmentTiming.model,
      condition,
      dataToupdate
    );
    if (!updateData) {
      return response.error(
        { msgCode: "UPDATE_ERROR" },
        res,
        httpStatus.NOT_ACCEPTABLE
      );
    }
    return response.success({ msgCode: "DATA_UPDATE" }, res, httpStatus.OK);
  } catch (error) {
    console.log(error);
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
    console.log(error);
    return response.error(
      { msgCode: "INTERNAL_SERVER_ERROR" },
      res,
      httpStatus.INTERNAL_SERVER_ERROR
    );
  }
};

exports.getDoctorProfileForEdit = async (req, res) => {
  try {
    const decode = req.data;
    const { doctorId } = req.query;
    const hospitalCondition = {
      userId: decode.userId, //token id
    };
    const findHospital = await common.getByCondition(
      Hospital.model,
      hospitalCondition
    );
    if (!findHospital) {
      return response.success(
        { msgCode: "DATA_NOT_FOUND" },
        res,
        httpStatus.NOT_FOUND
      );
    }
    const establishmentCondition = {
      hospitalId: findHospital._id,
    };
    const findEstablishment = await common.getByCondition(
      EstablishmentMaster.model,
      establishmentCondition
    );
    if (!findEstablishment) {
      return response.success(
        { msgCode: "DATA_NOT_FOUND" },
        res,
        httpStatus.NOT_FOUND
      );
    }
    const condition = {
      establishmentId: findEstablishment._id,
      doctorId: doctorId,
    };
    const findDoctor = await common.getByCondition(
      EstablishmentTiming.model,
      condition
    );
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
    console.log(error);
    return response.error(
      { msgCode: "INTERNAL_SERVER_ERROR" },
      res,
      httpStatus.INTERNAL_SERVER_ERROR
    );
  }
};

exports.editDoctorProfile = async (req, res) => {
  try {
    const decode = req.data;
    const { doctorId } = req.query;
    const {
      specility,
      procedure,
      consultationFees,
      mon,
      tue,
      wed,
      thu,
      fri,
      sat,
      sun,
    } = req.body;
    const hospitalCondition = {
      userId: decode.userId, //token id
    };
    const findHospital = await common.getByCondition(
      Hospital.model,
      hospitalCondition
    );
    if (!findHospital) {
      return response.success(
        { msgCode: "DATA_NOT_FOUND" },
        res,
        httpStatus.NOT_FOUND
      );
    }
    const establishmentCondition = {
      hospitalId: findHospital._id,
    };
    const findEstablishment = await common.getByCondition(
      EstablishmentMaster.model,
      establishmentCondition
    );
    if (!findEstablishment) {
      return response.success(
        { msgCode: "DATA_NOT_FOUND" },
        res,
        httpStatus.NOT_FOUND
      );
    }
    const condition = {
      establishmentId: findEstablishment._id,
      doctorId: doctorId,
      isDeleted: false,
    };
    const findDoctor = await common.getByCondition(
      EstablishmentTiming.model,
      condition
    );
    if (!findDoctor) {
      return response.success(
        { msgCode: "DATA_NOT_FOUND" },
        res,
        httpStatus.NOT_FOUND
      );
    }
    const updateSpecility = {
      specialization: specility,
    };
    const specilityCondition = {
      _id: doctorId,
    };
    await common.updateByCondition(
      Doctor.model,
      specilityCondition,
      updateSpecility,
      constants.USER_TYPES.DOCTOR
    );
    const dataToupdate = {
      procedure,
      consultationFees,
      mon,
      tue,
      wed,
      thu,
      fri,
      sat,
      sun,
    };
    const dataToDelete = {
      mon: [],
      tue: [],
      wed: [],
      thu: [],
      fri: [],
      sat: [],
      sun: [],
    };
    await common.deleteTimeField(
      EstablishmentTiming.model,
      condition,
      dataToDelete
    );
    await common.updateByCondition(
      EstablishmentTiming.model,
      condition,
      dataToupdate
    );
    return response.success({ msgCode: "DATA_UPDATE" }, res, httpStatus.OK);
  } catch (error) {
    console.log(error);
    return response.error(
      { msgCode: "INTERNAL_SERVER_ERROR" },
      res,
      httpStatus.INTERNAL_SERVER_ERROR
    );
  }
};

exports.hospitalfindDoctor = async (req, res) => {
  try {
    const { phone, publicUrl } = req.query;
    let resObejct = {};
    const phoneCondition = {
      phone: phone,
      userType: constants.USER_TYPES.DOCTOR,
    };
    if (phone) {
      const findUser = await users.userWithDoctor(phoneCondition);
      if (!findUser) {
        return response.success(
          { msgCode: "USER_NOT_FOUND" },
          res,
          httpStatus.NOT_FOUND
        );
      }
      resObejct = findUser;
    }
    if (publicUrl) {
      const _id = publicUrl.split("id=")[1].substring(0, 24);
      const findDoctor = await doctor.doctorDetails({
        _id: new Types.ObjectId(_id),
      }); // _id:new Types.ObjectId(publicUrl)
      if (!findDoctor) {
        return response.success(
          { msgCode: "USER_NOT_FOUND" },
          res,
          httpStatus.NOT_FOUND
        );
      }
      resObejct = findDoctor;
    }
    return response.success(
      { msgCode: "DATA_FOUND", data: resObejct },
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

exports.hospitalAddDoctor = async (req, res) => {
  try {
    const decode = req.data;
    const hospitalCondition = {
      userId: new Types.ObjectId(decode.userId), //token id
    };
    const findHospital = await common.getByCondition(
      Hospital.model,
      hospitalCondition
    );
    if (!findHospital) {
      return response.success(
        { msgCode: "DATA_NOT_FOUND" },
        res,
        httpStatus.NOT_FOUND
      );
    }
    const establishmentCondition = {
      hospitalId: findHospital._id,
    };
    const findEstablishment = await common.getByCondition(
      EstablishmentMaster.model,
      establishmentCondition
    );
    if (!findEstablishment) {
      return response.success(
        { msgCode: "DATA_NOT_FOUND" },
        res,
        httpStatus.NOT_FOUND
      );
    }
    const { phone, consultationFees } = req.body;
    let condition = {};
    const condition1 = {
      phone: phone,
      userType: constants.USER_TYPES.DOCTOR,
    };
    if (phone) {
      const findUser = await common.findObject(User.model, condition1);
      condition = {
        userId: new Types.ObjectId(findUser._id),
      };
    }
    const findDoctor = await common.getByCondition(Doctor.model, condition);
    if (!findDoctor) {
      return response.success(
        { msgCode: "USER_NOT_FOUND" },
        res,
        httpStatus.NOT_FOUND
      );
    }
    const checkDoctorCondition = {
      establishmentId: findEstablishment._id,
      doctorId: findDoctor._id,
      isDeleted: { $ne: true },
    };
    const checkDoctor = await common.getByCondition(
      EstablishmentTiming.model,
      checkDoctorCondition
    );
    if (checkDoctor) {
      return response.error(
        { msgCode: "DOCTOR_EXIST_ESTABLISHMENT" },
        res,
        httpStatus.CONFLICT
      );
    }
    const doctorDetails = {
      doctorId: findDoctor._id,
      establishmentId: findEstablishment._id, //decode.userId
      consultationFees,
      isOwner: false,
      createdBy: decode.userId,
    };
    const addDoctor = await common.create(
      EstablishmentTiming.model,
      doctorDetails
    );
    if (!addDoctor) {
      return response.error(
        { msgCode: "FAILED_TO_ADD" },
        res,
        httpStatus.BAD_REQUEST
      );
    }
    const doctorData = await common.getSendMailDoctor(findDoctor._id);
    const establishmentData = await common.getSendMailEstablishment(
      findEstablishment._id
    );
    await common.create(Notification.model, {
      userType: constants.USER_TYPES.DOCTOR,
      eventType: constants.NOTIFICATION_TYPE.DOCTOR_VISIT_ESTABLISHMENT,
      senderId: new ObjectId(decode.userId),
      receiverId: new ObjectId(doctorData.user._id),
      title: constants.MESSAGES.DOCTOR_VISIT_ESTABLISHMENT.TITLE.DOCTOR.replace(
        /\[hospitalName\]/g,
        establishmentData.name
      ),
      body: constants.MESSAGES.DOCTOR_VISIT_ESTABLISHMENT.BODY,
    });

    return response.success(
      { msgCode: "DOCTOR_ADDED_ESTABLISHMENT", data: addDoctor },
      res,
      httpStatus.CREATED
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

exports.hospitalRemoveDoctor = async (req, res) => {
  try {
    const decode = req.data;
    const hospitalCondition = {
      userId: decode.userId, //token id
    };
    const findHospital = await common.getByCondition(
      Hospital.model,
      hospitalCondition
    );
    if (!findHospital) {
      return response.success(
        { msgCode: "DATA_NOT_FOUND" },
        res,
        httpStatus.NOT_FOUND
      );
    }
    const establishmentCondition = {
      hospitalId: findHospital._id,
    };
    const findEstablishment = await common.getByCondition(
      EstablishmentMaster.model,
      establishmentCondition
    );
    if (!findEstablishment) {
      return response.success(
        { msgCode: "DATA_NOT_FOUND" },
        res,
        httpStatus.NOT_FOUND
      );
    }
    const { doctorId } = req.query;
    const condition = {
      establishmentId: findEstablishment._id,
      isVerified: constants.PROFILE_STATUS.APPROVE,
      doctorId,
    };
    const findDoctor = await common.getByCondition(
      EstablishmentTiming.model,
      condition
    );
    if (!findDoctor) {
      return response.success(
        { msgCode: "USER_NOT_FOUND" },
        res,
        httpStatus.NOT_FOUND
      );
    }
    const dataToupdate = {
      isDeleted: true,
      isVerified: constants.PROFILE_STATUS.REJECT,
    };
    const removeDoctor = await common.updateByCondition(
      EstablishmentTiming.model,
      condition,
      dataToupdate
    );
    if (!removeDoctor) {
      return response.error(
        { msgCode: "FAILED_TO_DELETE" },
        res,
        httpStatus.FORBIDDEN
      );
    }
    const decreaseDoctor = {
      totalDoctor: findHospital.totalDoctor - 1,
    };
    await common.updateByCondition(
      Hospital.model,
      hospitalCondition,
      decreaseDoctor
    );
    if (environment) {
      const findDoctor = await common.getById(Doctor.model, doctorId);
      const mailParameters = { hospitalName: findHospital.name };
      const htmlFile = constants.VIEWS.DOCTOR_REMOVAL_HOSPITAL;
      await sendEmail.sendEmailPostAPI(
        findDoctor.email,
        constants.EMAIL_TEMPLATES.DOCTOR_REMOVAL_HOSPITAL,
        htmlFile,
        mailParameters
      );
    }

    return response.success({ msgCode: "DATA_DELETED" }, res, httpStatus.OK);
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
    const decode = req.data;
    const hospitalCondition = {
      userId: new Types.ObjectId(decode.userId),
    };
    const findHospital = await common.getByCondition(
      Hospital.model,
      hospitalCondition
    );
    if (!findHospital) {
      return response.success(
        { msgCode: "DATA_NOT_FOUND" },
        res,
        httpStatus.NOT_FOUND
      );
    }
    const establishmentCondition = {
      hospitalId: findHospital._id,
    };
    const findEstablishmentMaster = await common.getByCondition(
      EstablishmentMaster.model,
      establishmentCondition
    );
    if (!findEstablishmentMaster) {
      return response.success(
        { msgCode: "DATA_NOT_FOUND" },
        res,
        httpStatus.NOT_FOUND
      );
    }
    const { search, page, size, sortBy, order, isExport } = req.query;
    const { limit, offset } = getPagination(page, size);
    const condition1 = {
      establishmentId: findEstablishmentMaster._id,
      doctorId: { $exists: true },
      isVerified: constants.PROFILE_STATUS.APPROVE, //{ $ne: constants.PROFILE_STATUS.REJECT },
      isDeleted: { $ne: true },
    };
    const doctorQuery = {
      "doctorUserDetails.isDeleted": false,
      "doctorUserDetails.status": constants.PROFILE_STATUS.ACTIVE,
      "doctorDetails.isVerified": constants.PROFILE_STATUS.APPROVE,
    };
    const sortCondition = { sortBy, order };
    const doctorlist = await hospital.doctorList(
      condition1,
      doctorQuery,
      limit,
      offset,
      search,
      sortCondition,
      isExport
    );
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
    console.log(error);
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
      userId: new Types.ObjectId(hospitalId),
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
    console.log(error);
    return response.error(
      { msgCode: "INTERNAL_SERVER_ERROR" },
      res,
      httpStatus.INTERNAL_SERVER_ERROR
    );
  }
};

exports.hospitalProfile = async (req, res) => {
  try {
    const decode = req.data;
    const condition = {
      userId: new Types.ObjectId(decode.userId),
    };
    const hospitalProfile = await hospital.hospitalProfile(condition);
    return response.success(
      { msgCode: "FETCHED", data: hospitalProfile },
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

exports.hospitalUpdateProfile = async (req, res) => {
  try {
    const decode = req.data;
    const { profilePic, name, hospitalType, about, totalBed, ambulance } =
      req.body;
    const { hospitalId } = req.query;
    const condition = {
      _id: new Types.ObjectId(decode.userId),
    };
    const hospitalDetails = await common.getByCondition(User.model, condition);
    if (!hospitalDetails) {
      return response.error(
        { msgCode: "HOSPITAL_NOT_FOUND" },
        res,
        httpStatus.NOT_FOUND
      );
    }
    const masterCondition = {
      hospitalId: new Types.ObjectId(hospitalId),
    };
    const masterData = {
      name,
      hospitalTypeId: hospitalType,
    };
    const hospitalCondition = {
      userId: new Types.ObjectId(decode.userId),
    };
    const hospitalData = {
      profilePic,
      about,
      totalBed,
      ambulance,
      hospitalType,
    };
    await Promise.all([
      common.updateByCondition(
        EstablishmentMaster.model,
        masterCondition,
        masterData,
        constants.USER_TYPES.HOSPITAL
      ),
      common.updateByCondition(Hospital.model, hospitalCondition, hospitalData),
    ]);
    return response.success(
      { msgCode: "HOSPITAL_UPDATED" },
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

exports.hospitaladdService = async (req, res) => {
  try {
    const decode = req.data;
    const { service } = req.body;
    const condition = {
      userId: new Types.ObjectId(decode.userId),
      status: { $ne: constants.PROFILE_STATUS.DELETE },
    };
    const hospitalDetails = await common.getByCondition(
      Hospital.model,
      condition
    );
    if (!hospitalDetails) {
      return response.error(
        { msgCode: "DATA_NOT_FOUND" },
        res,
        httpStatus.NOT_FOUND
      );
    }
    if (
      hospitalDetails.service.find(
        (serviceItem) =>
          serviceItem.name.toLowerCase() === service.name.toLowerCase()
      )
    ) {
      return response.error(
        { msgCode: "RECORD_EXISTS" },
        res,
        httpStatus.CONFLICT
      );
    }
    const dataToadd = {
      service,
    };
    const addservices = await common.push(Hospital.model, condition, dataToadd);
    if (!addservices) {
      return response.error(
        { msgCode: "FAILED_TO_ADD" },
        res,
        httpStatus.FORBIDDEN
      );
    }

    return response.success({ msgCode: "DATA_CREATED" }, res, httpStatus.OK);
  } catch (error) {
    console.log(error);
    return response.error(
      { msgCode: "INTERNAL_SERVER_ERROR" },
      res,
      httpStatus.INTERNAL_SERVER_ERROR
    );
  }
};

exports.hospitalGetService = async (req, res) => {
  try {
    const decode = req.data;
    const condition = {
      userId: new Types.ObjectId(decode.userId),
    };
    const hospitalservice = await hospital.hospitalserviceData(condition);
    return response.success(
      { msgCode: "FETCHED", data: hospitalservice.service },
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

exports.hospitalDeleteService = async (req, res) => {
  try {
    const decode = req.data;
    const { serviceId } = req.query;

    const condition = {
      userId: new Types.ObjectId(decode.userId),
      status: { $ne: constants.PROFILE_STATUS.DELETE },
    };
    const hospitalDetails = await common.getByCondition(
      Hospital.model,
      condition
    );
    if (!hospitalDetails) {
      return response.error(
        { msgCode: "HOSPITAL_NOT_FOUND" },
        res,
        httpStatus.NOT_FOUND
      );
    }

    const deleteCondition = {
      service: { _id: serviceId },
    };

    const deleteservice = await common.pullObject(
      Hospital.model,
      condition,
      deleteCondition
    );
    if (!deleteservice) {
      return response.error(
        { msgCode: "FAILED_TO_DELETE" },
        res,
        httpStatus.FORBIDDEN
      );
    }

    return response.success({ msgCode: "DATA_DELETED" }, res, httpStatus.OK);
  } catch (error) {
    console.log(error);
    return response.error(
      { msgCode: "INTERNAL_SERVER_ERROR" },
      res,
      httpStatus.INTERNAL_SERVER_ERROR
    );
  }
};

exports.hospitalGetTiming = async (req, res) => {
  try {
    const decode = req.data;
    const hospitalCondition = {
      userId: new Types.ObjectId(decode.userId),
    };
    const findHospital = await common.getByCondition(
      Hospital.model,
      hospitalCondition
    );
    if (!findHospital) {
      return response.success(
        { msgCode: "DATA_NOT_FOUND" },
        res,
        httpStatus.NOT_FOUND
      );
    }
    const establishmentCondition = {
      hospitalId: findHospital._id,
    };
    const findEstablishmentMaster = await common.getByCondition(
      EstablishmentMaster.model,
      establishmentCondition
    );
    if (!findEstablishmentMaster) {
      return response.success(
        { msgCode: "DATA_NOT_FOUND" },
        res,
        httpStatus.NOT_FOUND
      );
    }
    const condition = {
      establishmentId: findEstablishmentMaster._id,
    };
    const hospitalTiming = await hospital.hospitalTimingData(condition);
    return response.success(
      { msgCode: "FETCHED", data: hospitalTiming },
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

exports.hospitalAddTiming = async (req, res) => {
  try {
    const decode = req.data;
    const { mon, tue, wed, thu, fri, sat, sun } = req.body;
    const condition = {
      userId: new Types.ObjectId(decode.userId),
    };
    const hospitalDetails = await common.getByCondition(
      Hospital.model,
      condition
    );
    if (!hospitalDetails) {
      return response.error(
        { msgCode: "HOSPITAL_NOT_FOUND" },
        res,
        httpStatus.NOT_FOUND
      );
    }
    const establishmentCondition = {
      hospitalId: hospitalDetails._id,
    };
    const findEstablishmentMaster = await common.getByCondition(
      EstablishmentMaster.model,
      establishmentCondition
    );
    if (!findEstablishmentMaster) {
      return response.success(
        { msgCode: "DATA_NOT_FOUND" },
        res,
        httpStatus.NOT_FOUND
      );
    }
    const checkPreviousData = {
      establishmentId: findEstablishmentMaster._id,
    };
    const findEstablishmentTiming = await common.getByCondition(
      EstablishmentTiming.model,
      checkPreviousData
    );
    if (findEstablishmentTiming) {
      return response.error(
        { msgCode: "RECORD_EXISTS" },
        res,
        httpStatus.CONFLICT
      );
    }
    const dataToadd = {
      establishmentId: findEstablishmentMaster._id,
      mon,
      tue,
      wed,
      thu,
      fri,
      sat,
      sun,
    };

    const addTiming = await common.create(EstablishmentTiming.model, dataToadd);
    if (!addTiming) {
      return response.error(
        { msgCode: "FAILED_TO_ADD" },
        res,
        httpStatus.FORBIDDEN
      );
    }

    return response.success({ msgCode: "DATA_CREATED" }, res, httpStatus.OK);
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
    const decode = req.data;
    const hospitalCondition = {
      userId: new Types.ObjectId(decode.userId),
    };
    const findHospital = await common.getByCondition(
      Hospital.model,
      hospitalCondition
    );
    if (!findHospital) {
      return response.success(
        { msgCode: "DATA_NOT_FOUND" },
        res,
        httpStatus.NOT_FOUND
      );
    }
    const establishmentCondition = {
      hospitalId: findHospital._id,
    };
    const findEstablishmentMaster = await common.getByCondition(
      EstablishmentMaster.model,
      establishmentCondition
    );
    if (!findEstablishmentMaster) {
      return response.success(
        { msgCode: "DATA_NOT_FOUND" },
        res,
        httpStatus.NOT_FOUND
      );
    }
    const { mon, tue, wed, thu, fri, sat, sun } = req.body;
    const { establishmentTimingId } = req.query;
    const condition = { establishmentId: findEstablishmentMaster._id };
    const hospitalDetails = await common.getByCondition(
      EstablishmentTiming.model,
      condition
    );
    if (!hospitalDetails) {
      return response.error(
        { msgCode: "HOSPITAL_NOT_FOUND" },
        res,
        httpStatus.NOT_FOUND
      );
    }
    const updateCondition = {
      _id: establishmentTimingId,
      establishmentId: findEstablishmentMaster._id,
    };
    const dataToDelete = {
      mon: [],
      tue: [],
      wed: [],
      thu: [],
      fri: [],
      sat: [],
      sun: [],
    };
    await common.deleteTimeField(
      EstablishmentTiming.model,
      updateCondition,
      dataToDelete
    );
    const dataToupdate = { mon, tue, wed, thu, fri, sat, sun };
    const updateTiming = await common.updateByCondition(
      EstablishmentTiming.model,
      updateCondition,
      dataToupdate
    );
    if (!updateTiming) {
      return response.error(
        { msgCode: "UPDATE_ERROR" },
        res,
        httpStatus.FORBIDDEN
      );
    }
    return response.success({ msgCode: "DATA_UPDATE" }, res, httpStatus.OK);
  } catch (error) {
    console.log(error);
    return response.error(
      { msgCode: "INTERNAL_SERVER_ERROR" },
      res,
      httpStatus.INTERNAL_SERVER_ERROR
    );
  }
};

exports.hospitalGetAddress = async (req, res) => {
  try {
    const decode = req.data;
    const condition = {
      userId: new Types.ObjectId(decode.userId),
    };
    const hospitalAddress = await hospital.hospitalAddressData(condition);
    return response.success(
      { msgCode: "FETCHED", data: hospitalAddress },
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

exports.hospitalUpdateAddress = async (req, res) => {
  try {
    const decode = req.data;
    const condition = {
      userId: new Types.ObjectId(decode.userId),
    };
    const { address, location, isLocationShared } = req.body;
    const hospitalDetails = await common.getByCondition(
      Hospital.model,
      condition
    );
    const masterCondition = {
      hospitalId: hospitalDetails._id,
    };
    if (!hospitalDetails) {
      return response.error(
        { msgCode: "HOSPITAL_NOT_FOUND" },
        res,
        httpStatus.NOT_FOUND
      );
    }
    const dataToupdate = {
      address,
      location,
      isLocationShared,
    };
    const updateAddress = await common.updateByCondition(
      Hospital.model,
      condition,
      dataToupdate
    );
    await common.updateByCondition(
      EstablishmentMaster.model,
      masterCondition,
      dataToupdate,
      constants.USER_TYPES.HOSPITAL
    );
    if (!updateAddress) {
      return response.error(
        { msgCode: "UPDATE_ERROR" },
        res,
        httpStatus.FORBIDDEN
      );
    }

    return response.success({ msgCode: "DATA_UPDATE" }, res, httpStatus.OK);
  } catch (error) {
    console.log(error);
    return response.error(
      { msgCode: "INTERNAL_SERVER_ERROR" },
      res,
      httpStatus.INTERNAL_SERVER_ERROR
    );
  }
};

exports.hospitalGetImages = async (req, res) => {
  try {
    const decode = req.data;
    const condition = {
      userId: new Types.ObjectId(decode.userId),
    };
    const hospitalImages = await hospital.hospitalImagesData(condition);
    const resutlImages =
      hospitalImages.image?.length === 0 ? [] : hospitalImages.image.reverse();
    return response.success(
      { msgCode: "FETCHED", data: resutlImages },
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

exports.hospitalAddImages = async (req, res) => {
  try {
    const { image } = req.body;
    const decode = req.data;
    const condition = {
      userId: new Types.ObjectId(decode.userId),
    };
    const hospitalDetails = await common.getByCondition(
      Hospital.model,
      condition
    );
    if (!hospitalDetails) {
      return response.error(
        { msgCode: "HOSPITAL_NOT_FOUND" },
        res,
        httpStatus.NOT_FOUND
      );
    }
    if (
      hospitalDetails.image.find(
        (imageItem) => imageItem.url.toLowerCase() === image.url.toLowerCase()
      )
    ) {
      return response.error(
        { msgCode: "RECORD_EXISTS" },
        res,
        httpStatus.CONFLICT
      );
    }

    const dataToadd = {
      image,
    };

    const addImages = await common.push(Hospital.model, condition, dataToadd);
    if (!addImages) {
      return response.error(
        { msgCode: "FAILED_TO_ADD" },
        res,
        httpStatus.FORBIDDEN
      );
    }

    return response.success({ msgCode: "DATA_CREATED" }, res, httpStatus.OK);
  } catch (error) {
    console.log(error);
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
    const decode = req.data;
    const condition = {
      userId: new Types.ObjectId(decode.userId),
    };
    const hospitalDetails = await common.getByCondition(
      Hospital.model,
      condition
    );
    if (!hospitalDetails) {
      return response.error(
        { msgCode: "HOSPITAL_NOT_FOUND" },
        res,
        httpStatus.NOT_FOUND
      );
    }
    const deleteCondition = {
      image: { _id: imageId },
    };
    const deleteImages = await common.pullObject(
      Hospital.model,
      condition,
      deleteCondition
    );
    if (!deleteImages) {
      return response.error(
        { msgCode: "FAILED_TO_DELETE" },
        res,
        httpStatus.FORBIDDEN
      );
    }

    return response.success({ msgCode: "DATA_DELETED" }, res, httpStatus.OK);
  } catch (error) {
    console.log(error);
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
    const decode = req.data;
    const condition = {
      userId: new Types.ObjectId(decode.userId),
    };
    const hospitalDetails = await common.getByCondition(
      Hospital.model,
      condition
    );
    if (!hospitalDetails) {
      return response.error(
        { msgCode: "HOSPITAL_NOT_FOUND" },
        res,
        httpStatus.NOT_FOUND
      );
    }
    if (
      hospitalDetails.social.find(
        (socialItem) => socialItem.type == social.type
      )
    ) {
      return response.error(
        { msgCode: "RECORD_EXISTS" },
        res,
        httpStatus.CONFLICT
      );
    }
    const dataToadd = {
      social,
    };
    const addsocial = await common.push(Hospital.model, condition, dataToadd);
    if (!addsocial) {
      return response.error(
        { msgCode: "FAILED_TO_ADD" },
        res,
        httpStatus.FORBIDDEN
      );
    }
    return response.success({ msgCode: "DATA_CREATED" }, res, httpStatus.OK);
  } catch (error) {
    console.log(error);
    return response.error(
      { msgCode: "INTERNAL_SERVER_ERROR" },
      res,
      httpStatus.INTERNAL_SERVER_ERROR
    );
  }
};

exports.hospitalSocialData = async (req, res) => {
  try {
    const decode = req.data;
    const condition = {
      userId: new Types.ObjectId(decode.userId),
    };
    const socialData = await hospital.hospitalSocialData(condition);
    return response.success(
      { msgCode: "FETCHED", data: socialData },
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

exports.hospitalDeleteSocial = async (req, res) => {
  try {
    const { socialId } = req.query;
    const decode = req.data;
    const condition = {
      userId: new Types.ObjectId(decode.userId),
    };
    const hospitalDetails = await common.getByCondition(
      Hospital.model,
      condition
    );
    if (!hospitalDetails) {
      return response.error(
        { msgCode: "HOSPITAL_NOT_FOUND" },
        res,
        httpStatus.NOT_FOUND
      );
    }
    const deleteCondition = {
      social: { _id: socialId },
    };
    const deletesocial = await common.pullObject(
      Hospital.model,
      condition,
      deleteCondition
    );
    if (!deletesocial) {
      return response.error(
        { msgCode: "FAILED_TO_DELETE" },
        res,
        httpStatus.FORBIDDEN
      );
    }

    return response.success({ msgCode: "DATA_DELETED" }, res, httpStatus.OK);
  } catch (error) {
    console.log(error);
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
    const decode = req.data;
    const condition = {
      userId: new Types.ObjectId(decode.userId),
    };
    const hospitalDetails = await common.getByCondition(
      Hospital.model,
      condition
    );
    if (!hospitalDetails) {
      return response.error(
        { msgCode: "HOSPITAL_NOT_FOUND" },
        res,
        httpStatus.NOT_FOUND
      );
    }
    const dataToupdate = {
      "social.$": social,
    };
    const updateCondition = { "social._id": socialId };

    const updateSocial = await common.updateByCondition(
      Hospital.model,
      updateCondition,
      dataToupdate
    );
    if (!updateSocial) {
      return response.error(
        { msgCode: "UPDATE_ERROR" },
        res,
        httpStatus.FORBIDDEN
      );
    }

    return response.success({ msgCode: "DATA_UPDATE" }, res, httpStatus.OK);
  } catch (error) {
    console.log(error);
    return response.error(
      { msgCode: "INTERNAL_SERVER_ERROR" },
      res,
      httpStatus.INTERNAL_SERVER_ERROR
    );
  }
};

exports.hospitalDeleteAccount = async (req, res) => {
  try {
    const { userId } = req.data;
    const condition = {
      _id: new Types.ObjectId(userId),
      isDeleted: { $ne: true },
    };
    const hospitalDetails = await common.getByCondition(User.model, condition);
    if (!hospitalDetails) {
      return response.error(
        { msgCode: "HOSPITAL_NOT_FOUND" },
        res,
        httpStatus.NOT_FOUND
      );
    }
    const updateData = {
      isDeleted: true,
    };
    const updateHospital = await common.updateByCondition(
      User.model,
      condition,
      updateData,
      constants.USER_TYPES.DOCTOR
    );
    const hospitalData = await common.getByCondition(Hospital.model, {
      userId: new ObjectId(userId),
    });
    const establishmentData = await common.getByCondition(
      EstablishmentMaster.model,
      { hospitalId: new ObjectId(hospitalData._id) }
    );
    await common.updateById(Hospital.model, hospitalData._id, updateData);
    await common.updateById(
      EstablishmentMaster.model,
      establishmentData._id,
      updateData
    );
    await common.updateByCondition(
      EstablishmentTiming.model,
      { establishmentId: establishmentData._id },
      updateData
    );
    await common.updateByCondition(
      Appointment.model,
      { establishmentId: establishmentData._id },
      { isDeleted: true, status: constants.BOOKING_STATUS.CANCEL }
    );
    await common.updateByCondition(
      AppointmentFeedback.model,
      { establishmentId: establishmentData._id },
      updateData
    );
    if (!updateHospital) {
      return response.error(
        { msgCode: "UPDATE_ERROR" },
        res,
        httpStatus.FORBIDDEN
      );
    }
    const superadminArray = await adminService.superAdminList();
    await common.create(Notification.model, {
      userType: constants.USER_TYPES.ADMIN,
      eventType: constants.NOTIFICATION_TYPE.HOSPITAL_PROFILE_DELETION,
      senderId: new ObjectId(userId),
      receiverId: superadminArray,
      title:
        establishmentData?.name +
        constants.MESSAGES.HOSPITAL_PROFILE_DELETION.TITLE,
      body: constants.MESSAGES.HOSPITAL_PROFILE_DELETION.BODY,
    });
    if (environment) {
      await sendSms.sendOtp(
        hospitalDetails.phone,
        hospitalDetails.countryCode,
        { name: establishmentData?.name.substring(0, 30) },
        constants.SMS_TEMPLATES.HOSPITAL_DELETE_ACC
      );
    }
    return response.success(
      { msgCode: "ACCOUNT_DELETED", data: {} },
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

exports.hospitalAddFaq = async (req, res) => {
  try {
    const decode = req.data;
    const { question, answer } = req.body;
    const dataTocreate = {
      question,
      answer,
      userType: constants.USER_TYPES.HOSPITAL,
      userId: new Types.ObjectId(decode.userId),
    };
    const data = await common.create(FAQ.model, dataTocreate);
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

exports.hospitalUpdateFaq = async (req, res) => {
  try {
    const decode = req.data;
    const { question, answer } = req.body;
    const { faqId } = req.query;
    const condition = {
      _id: new Types.ObjectId(decode.userId),
    };
    const hospitalDetails = await common.getByCondition(User.model, condition);
    if (!hospitalDetails) {
      return response.error(
        { msgCode: "HOSPITAL_NOT_FOUND" },
        res,
        httpStatus.NOT_FOUND
      );
    }
    const faqCondition = {
      userId: new Types.ObjectId(decode.userId),
      _id: faqId,
    };
    const faqData = {
      question,
      answer,
    };
    await common.updateByCondition(FAQ.model, faqCondition, faqData);
    return response.success({ msgCode: "FAQ_UPDATED" }, res, httpStatus.OK);
  } catch (error) {
    console.log(error);
    return response.error(
      { msgCode: "INTERNAL_SERVER_ERROR" },
      res,
      httpStatus.INTERNAL_SERVER_ERROR
    );
  }
};

exports.hospitalFaqList = async (req, res) => {
  try {
    const decode = req.data;
    const condition = {
      _id: new Types.ObjectId(decode.userId),
    };
    const hospitalDetails = await common.getByCondition(User.model, condition);
    if (!hospitalDetails) {
      return response.error(
        { msgCode: "HOSPITAL_NOT_FOUND" },
        res,
        httpStatus.NOT_FOUND
      );
    }
    const faqCondition = {
      userId: new Types.ObjectId(decode.userId),
      userType: constants.USER_TYPES.HOSPITAL,
    };
    const faqList = await common.findAll(FAQ.model, faqCondition);
    return response.success(
      { msgCode: "FETCHED", data: faqList },
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

exports.hospitalDeleteFAQ = async (req, res) => {
  try {
    const decode = req.data;
    const { faqId } = req.query;
    const condition = {
      userId: new Types.ObjectId(decode.userId),
      _id: faqId,
    };
    await common.removeById(FAQ.model, condition); // Deleting the FAQ data
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

exports.hospitalAddVideos = async (req, res) => {
  try {
    const decode = req.data;
    const { title, url } = req.body;

    const condition = {
      _id: new Types.ObjectId(decode.userId),
    };
    const hospitalDetails = await common.getByCondition(User.model, condition);
    if (!hospitalDetails) {
      return response.error(
        { msgCode: "HOSPITAL_NOT_FOUND" },
        res,
        httpStatus.NOT_FOUND
      );
    }

    const dataToadd = {
      userId: new Types.ObjectId(decode.userId),
      title,
      url,
      userType: constants.USER_TYPES.HOSPITAL,
    };

    const addVideos = await common.create(Video.model, dataToadd);
    if (!addVideos) {
      return response.error(
        { msgCode: "FAILED_TO_ADD" },
        res,
        httpStatus.FORBIDDEN
      );
    }

    return response.success({ msgCode: "DATA_CREATED" }, res, httpStatus.OK);
  } catch (error) {
    console.log(error);
    return response.error(
      { msgCode: "INTERNAL_SERVER_ERROR" },
      res,
      httpStatus.INTERNAL_SERVER_ERROR
    );
  }
};

exports.hospitalDeleteVideos = async (req, res) => {
  try {
    const decode = req.data;
    const { videoId } = req.query;
    const condition = {
      _id: new Types.ObjectId(decode.userId),
    };
    const hospitalDetails = await common.getByCondition(User.model, condition);
    if (!hospitalDetails) {
      return response.error(
        { msgCode: "HOSPITAL_NOT_FOUND" },
        res,
        httpStatus.NOT_FOUND
      );
    }
    const deleteCondition = {
      userId: new Types.ObjectId(decode.userId),
      _id: videoId,
    };
    const deleteVideos = await common.deleteByField(
      Video.model,
      deleteCondition
    );
    if (!deleteVideos) {
      return response.error(
        { msgCode: "FAILED_TO_DELETE" },
        res,
        httpStatus.FORBIDDEN
      );
    }

    return response.success({ msgCode: "DATA_DELETED" }, res, httpStatus.OK);
  } catch (error) {
    console.log(error);
    return response.error(
      { msgCode: "INTERNAL_SERVER_ERROR" },
      res,
      httpStatus.INTERNAL_SERVER_ERROR
    );
  }
};

exports.hospitalUpdateVideos = async (req, res) => {
  try {
    const decode = req.data;
    const { title, url } = req.body;
    const { videoId } = req.query;

    const condition = {
      _id: new Types.ObjectId(decode.userId),
      // status: { $ne: constants.PROFILE_STATUS.DELETE },
    };
    const hospitalDetails = await common.getByCondition(User.model, condition);
    if (!hospitalDetails) {
      return response.error(
        { msgCode: "HOSPITAL_NOT_FOUND" },
        res,
        httpStatus.NOT_FOUND
      );
    }
    const updateCondition = {
      userId: new Types.ObjectId(decode.userId),
      _id: videoId,
    };
    const dataToupdate = {
      title,
      url,
    };
    const updateVideos = await common.updateByCondition(
      Video.model,
      updateCondition,
      dataToupdate
    );
    if (!updateVideos) {
      return response.error(
        { msgCode: "UPDATE_ERROR" },
        res,
        httpStatus.FORBIDDEN
      );
    }

    return response.success({ msgCode: "DATA_UPDATE" }, res, httpStatus.OK);
  } catch (error) {
    console.log(error);
    return response.error(
      { msgCode: "INTERNAL_SERVER_ERROR" },
      res,
      httpStatus.INTERNAL_SERVER_ERROR
    );
  }
};

exports.hospitalVideoList = async (req, res) => {
  try {
    const decode = req.data;
    const condition = {
      _id: new Types.ObjectId(decode.userId),
    };
    const hospitalDetails = await common.getByCondition(User.model, condition);
    if (!hospitalDetails) {
      return response.error(
        { msgCode: "HOSPITAL_NOT_FOUND" },
        res,
        httpStatus.NOT_FOUND
      );
    }
    const videoCondition = {
      userId: new Types.ObjectId(decode.userId),
      userType: constants.USER_TYPES.HOSPITAL,
    };
    const videoList = await common.findAll(Video.model, videoCondition);
    return response.success(
      { msgCode: "FETCHED", data: videoList },
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

exports.procedureSpecialityList = async (req, res) => {
  try {
    const { type, sort, sortOrder, reverse } = req.query;
    const { userId } = req.data;
    const condition = { userId: new ObjectId(userId) };
    const sortCondition = {};
    sortCondition[`${sort}`] = constants.LIST.ORDER[sortOrder];
    const procdeureSpecialityList = await hospital.getHospitalDataByID(
      Hospital.model,
      condition,
      type,
      sortCondition
    );
    const msgCode =
      procdeureSpecialityList.length === 0 ? "NO_RECORD_FETCHED" : "FECTHED";
    return response.success(
      {
        msgCode,
        data: {
          count: procdeureSpecialityList?.length || 0,
          list: reverse
            ? procdeureSpecialityList.reverse() || []
            : procdeureSpecialityList || [],
        },
      },
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

exports.addProcedureSpeciality = async (req, res) => {
  try {
    const { type, recordId } = req.body;
    const { userId } = req.data;
    const condition = { userId: new ObjectId(userId) };
    const recordKey = constants.SPECIALITY_PROCEDURE_RECORD_KEY[type];
    const findMasterData = await common.getById(
      type === constants.SPECIALITY_PROCEDURE.PROCEDURE
        ? ProcedureMaster.model
        : Specialization.model,
      recordId
    );
    if (!findMasterData || findMasterData.isDeleted)
      return response.error(
        {
          msgCode: "NOT_FOUND",
        },
        res,
        httpStatus.NOT_FOUND
      );

    const existsCondition = { userId: new ObjectId(userId) };
    existsCondition[`${recordKey}`] = { $in: [new ObjectId(recordId)] };
    const procedureSpecialityExists = await common.getByCondition(
      Hospital.model,
      existsCondition
    );
    if (procedureSpecialityExists)
      return response.error(
        {
          msgCode:
            type === constants.SPECIALITY_PROCEDURE.PROCEDURE
              ? "PROCEDURE_EXISTS"
              : "SPECIALITY_EXISTS",
        },
        res,
        httpStatus.BAD_REQUEST
      );
    const updates = {};
    updates[`${recordKey}`] = recordId;
    const addProcedureSpecialty = await common.push(
      Hospital.model,
      condition,
      updates
    );
    if (!addProcedureSpecialty) {
      return response.error(
        { msgCode: "FAILED_TO_ADD" },
        res,
        httpStatus.BAD_REQUEST
      );
    }

    return response.success(
      { msgCode: "ADDED", data: addProcedureSpecialty },
      res,
      httpStatus.CREATED
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

exports.deleteProcedureSpeciality = async (req, res) => {
  try {
    const { type, recordId } = req.query;
    const { userId } = req.data;
    const condition = { userId: new ObjectId(userId) };
    const recordKey = constants.SPECIALITY_PROCEDURE_RECORD_KEY[type];
    const updates = {};
    updates[`${recordKey}`] = new ObjectId(recordId);
    const deleteProcedureSpecialty = await common.pullObject(
      Hospital.model,
      condition,
      updates
    );
    if (!deleteProcedureSpecialty) {
      return response.error(
        { msgCode: "FAILED_TO_DELETE" },
        res,
        httpStatus.BAD_REQUEST
      );
    }
    return response.success(
      { msgCode: "DELETED", data: {} },
      res,
      httpStatus.OK
    );
  } catch (error) {
    console.log(error);
    return response.error(
      { msgCode: "SOMETHING_WRONG" },
      res,
      httpStatus.SOMETHING_WRONG
    );
  }
};

exports.hospitalAboutUs = async (req, res) => {
  try {
    const { establishmentId, establishmentProfileSlug } = req.query;
    const condition = {};
    let _id = establishmentId;
    if (establishmentId) condition._id = new Types.ObjectId(establishmentId);
    if (establishmentProfileSlug) {
      const establishment = await common.getByCondition(
        EstablishmentMaster.model,
        {
          profileSlug: establishmentProfileSlug,
        }
      );
      _id = establishment._id;
      condition.profileSlug = establishmentProfileSlug;
    }
    const data = await hospital.hospitalAboutUs(condition);
    const doctorCount = await hospital.totalDoctorCount(_id);
    if (data?.length > 0) data[0].doctorCount = doctorCount;
    return response.success(
      {
        msgCode: !data ? "NO_RECORD_FOUND" : "HOSPITAL_ABOUT_US",
        data: data || {},
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

exports.rescheduleAppointment = async (req, res) => {
  try {
    const { userId } = req.data;
    const { appointmentId } = req.query;
    const { date, email, notes } = req.body;
    const condition = {
      _id: new ObjectId(appointmentId),
      status: { $ne: constants.BOOKING_STATUS.RESCHEDULE },
    };
    const findAppointment = await common.getByCondition(
      Appointment.model,
      condition
    );
    if (!findAppointment) {
      return response.success(
        { msgCode: "APPOINTMENT_NOT_FOUND" },
        res,
        httpStatus.NOT_FOUND
      );
    }
    const isDoctorBooked = await common.getByCondition(Appointment.model, {
      doctorId: findAppointment.doctorId,
      date,
      status: { $ne: constants.BOOKING_STATUS.RESCHEDULE },
    });
    if (isDoctorBooked) {
      return response.error(
        { msgCode: "APPOINTMENT_ALREADY_BOOKED" },
        res,
        httpStatus.NOT_FOUND
      );
    }

    await common.updateById(Appointment.model, appointmentId, {
      status: constants.BOOKING_STATUS.RESCHEDULE,
    });

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
    const createAppointment = await common.create(
      Appointment.model,
      newAppointmentData
    );

    if (!createAppointment) {
      return response.error(
        { msgCode: "FAILED_TO_ADD" },
        res,
        httpStatus.BAD_REQUEST
      );
    }
    const doctorData = await common.getSendMailDoctor(findAppointment.doctorId);
    const establishmentData = await common.getSendMailEstablishment(
      findAppointment.establishmentId
    );
    const [ISTDate, ISTTime, timeZone] = momentTZ
      .utc(newAppointmentData.date)
      .tz("Asia/Kolkata")
      .format("YYYY-MM-DD HH:mm:ss A")
      .split(" ");

    const titleHospital =
      constants.MESSAGES.APPOINTMENT_RESCHEDULE.TITLE.HOSPITAL.replace(
        /\[doctorName\]/g,
        doctorData.user.fullName
      )
        .replace(/\[date\]/g, ISTDate)
        .replace(/\[slotTime\]/g, ISTTime)
        .replace(/\[timeZone\]/g, timeZone);

    const titleDoctor =
      constants.MESSAGES.APPOINTMENT_RESCHEDULE.TITLE.DOCTOR.replace(
        /\[date\]/g,
        ISTDate
      )
        .replace(/\[slotTime\]/g, ISTTime)
        .replace(/\[timeZone\]/g, timeZone);

    await common.create(Notification.model, {
      userType: constants.USER_TYPES.HOSPITAL,
      eventType: constants.NOTIFICATION_TYPE.APPOINTMENT_RESCHEDULE,
      senderId: new ObjectId(userId),
      receiverId: new ObjectId(establishmentData.hospital.userId),
      title: titleHospital,
      body: constants.MESSAGES.APPOINTMENT_RESCHEDULE.BODY.HOSPITAL,
    });
    await common.create(Notification.model, {
      userType: constants.USER_TYPES.DOCTOR,
      eventType: constants.NOTIFICATION_TYPE.APPOINTMENT_RESCHEDULE,
      senderId: new ObjectId(userId),
      receiverId: new ObjectId(doctorData.user._id),
      title: titleDoctor,
      body: constants.MESSAGES.APPOINTMENT_RESCHEDULE.BODY.DOCTOR,
    });
    const hospitalProfilePic =
      establishmentData.hospital.profilePic ||
      constants.MAIL_IMAGES.NECTAR_LOGO;
    const doctorProfilePic =
      doctorData.profilePic || constants.MAIL_IMAGES.NECTAR_LOGO;
    if (environment) {
      const findPatient = await doctor.getPatientDetails(
        findAppointment.patientId
      );
      const loginLink = constants.SCREEN.PATIENT_LOGIN;
      const dateTime = new Date(
        new Date(newAppointmentData.date)
      ).toLocaleString("en-IN");
      await sendSms.sendOtp(
        findPatient.user.phone,
        findPatient.user.countryCode,
        {
          loginLink,
          date: dateTime,
        },
        constants.SMS_TEMPLATES.PATIENT_RESCHEDULE
      );
      if (findPatient.email) {
        const mailParameters = {
          doctorName: doctorData.user.fullName,
          hospitalName: establishmentData.name,
          date: dateTime.split(",")[0],
          time: dateTime.split(",")[1],
          dateTime,
          patientName: findPatient.user.fullName,
          specializationName: doctorData?.specializationMaster[0]?.name,
          address:
            establishmentData?.address?.landmark +
            ", " +
            establishmentData?.address?.locality +
            ", " +
            establishmentData?.address?.city +
            ", " +
            establishmentData?.stateMaster[0].name +
            ", " +
            establishmentData?.address?.country,
          doctorProfilePic:
            doctorData.profilePic || constants.MAIL_IMAGES.DOCTOR_LOGO,
          hospitalProfilePic:
            establishmentData.hospital.profilePic ||
            constants.MAIL_IMAGES.HOSPITAL_LOGO,
          latitude: establishmentData.location.coordinates[1],
          longitude: establishmentData.location.coordinates[0],
          routeUrl:
            constants.EMAIL_ROUTE_URL.BASE +
            createAppointment._id +
            constants.EMAIL_ROUTE_URL.PARAMETERS,
        };
        const htmlFile = constants.VIEWS.APPOINTMENT_RESCHEDULE;
        await sendEmail.sendEmailPostAPI(
          findPatient.email,
          constants.EMAIL_TEMPLATES.APPOINTMENT_RESCHEDULE,
          htmlFile,
          mailParameters
        );
      }
    }
    return response.success(
      { msgCode: "APPOINTMENT_RESCHEDULE", data: createAppointment },
      res,
      httpStatus.CREATED
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

const appointmentCancellationPatient = async (
  findAppointment,
  environment,
  doctorData,
  establishmentData,
  hospitalProfilePic,
  doctorProfilePic
) => {
  if (environment) {
    const findPatient = await doctor.getPatientDetails(
      findAppointment.patientId
    );
    const date = new Date(new Date(findAppointment.date)).toLocaleString(
      "en-IN"
    );
    await sendSms.sendOtp(
      findPatient.user.phone,
      findPatient.user.countryCode,
      {
        name: doctorData.user.fullName.substring(0, 30),
        date,
      },
      constants.SMS_TEMPLATES.PATIENT_APPT_CANCEL
    );
    if (findPatient.email) {
      const mailParameters = {
        doctorName: doctorData.user.fullName,
        hospitalName: establishmentData.name,
        dateTime: date,
        patientName: findPatient.user.fullName,
        specialization: doctorData?.specializationMaster[0]?.name,
        address:
          establishmentData?.address?.landmark +
          ", " +
          establishmentData?.address?.locality +
          ", " +
          establishmentData?.address?.city +
          ", " +
          establishmentData?.stateMaster[0].name +
          ", " +
          establishmentData?.address?.country,
        doctorProfilePic,
        hospitalProfilePic,
        latitude: establishmentData.location.coordinates[1],
        longitude: establishmentData.location.coordinates[0],
      };
      const htmlFile = constants.VIEWS.APPOINTMENT_CANCELLATION;
      await sendEmail.sendEmailPostAPI(
        findPatient.email,
        constants.EMAIL_TEMPLATES.APPOINTMENT_CANCELLATION,
        htmlFile,
        mailParameters
      );
    }
  }
};

exports.changeAppointmentStatus = async (req, res) => {
  try {
    const { userId } = req.data;
    const { appointmentId } = req.query;
    const { status, reason, isDeleted } = req.body;
    const condition = {
      _id: new ObjectId(appointmentId),
      status: { $ne: constants.BOOKING_STATUS.RESCHEDULE },
    };
    const findAppointment = await common.getByCondition(
      Appointment.model,
      condition
    );
    if (!findAppointment) {
      return response.success(
        { msgCode: "APPOINTMENT_NOT_FOUND", data: {} },
        res,
        httpStatus.NOT_FOUND
      );
    }
    let updateAppointment;
    if (isDeleted) await common.removeById(Appointment.model, appointmentId);
    else
      updateAppointment = await common.updateById(
        Appointment.model,
        appointmentId,
        { status, reason }
      );

    if (!isDeleted) {
      if (!updateAppointment) {
        return response.error(
          { msgCode: "FAILED_TO_UPDATE" },
          res,
          httpStatus.BAD_REQUEST
        );
      }
    }
    if (status === constants.BOOKING_STATUS.CANCEL) {
      const doctorData = await common.getSendMailDoctor(
        findAppointment.doctorId
      );
      const establishmentData = await common.getSendMailEstablishment(
        findAppointment.establishmentId
      );
      const [ISTDate, ISTTime, timeZone] = momentTZ
        .utc(findAppointment.date)
        .tz("Asia/Kolkata")
        .format("YYYY-MM-DD HH:mm:ss A")
        .split(" ");

      const titleHospital =
        constants.MESSAGES.APPOINTMENT_CANCELLATION.TITLE.HOSPITAL.replace(
          /\[doctorName\]/g,
          doctorData.user.fullName
        )
          .replace(/\[date\]/g, ISTDate)
          .replace(/\[slotTime\]/g, ISTTime)
          .replace(/\[timeZone\]/g, timeZone);

      const titleDoctor =
        constants.MESSAGES.APPOINTMENT_CANCELLATION.TITLE.DOCTOR.replace(
          /\[date\]/g,
          ISTDate
        )
          .replace(/\[slotTime\]/g, ISTTime)
          .replace(/\[timeZone\]/g, timeZone);

      await common.create(Notification.model, {
        userType: constants.USER_TYPES.HOSPITAL,
        eventType: constants.NOTIFICATION_TYPE.APPOINTMENT_CANCELLATION,
        senderId: new ObjectId(userId),
        receiverId: new ObjectId(establishmentData.hospital.userId),
        title: titleHospital,
        body: constants.MESSAGES.APPOINTMENT_CANCELLATION.BODY.HOSPITAL,
      });
      await common.create(Notification.model, {
        userType: constants.USER_TYPES.DOCTOR,
        eventType: constants.NOTIFICATION_TYPE.APPOINTMENT_CANCELLATION,
        senderId: new ObjectId(userId),
        receiverId: new ObjectId(doctorData.user._id),
        title: titleDoctor,
        body: constants.MESSAGES.APPOINTMENT_CANCELLATION.BODY.DOCTOR,
      });
      const hospitalProfilePic =
        establishmentData.hospital.profilePic ||
        constants.MAIL_IMAGES.NECTAR_LOGO;
      const doctorProfilePic =
        doctorData.profilePic || constants.MAIL_IMAGES.NECTAR_LOGO;
      await appointmentCancellationPatient(
        findAppointment,
        environment,
        doctorData,
        establishmentData,
        hospitalProfilePic,
        doctorProfilePic
      );
      if (config.ENVIRONMENT === constants.SERVER.PROD) {
        const findPatient = await doctor.getPatientDetails(
          findAppointment.patientId
        );
        const date = new Date(new Date(findAppointment.date)).toLocaleString(
          "en-IN"
        );
        await sendSms.sendOtp(
          findPatient.user.phone,
          findPatient.user.countryCode,
          {
            name: doctorData.user.fullName.substring(0, 30),
            date,
          },
          constants.SMS_TEMPLATES.PATIENT_APPT_CANCEL
        );
        if (findPatient.email) {
          const mailParameters = {
            doctorName: doctorData.user.fullName,
            hospitalName: establishmentData.name,
            dateTime: date,
            patientName: findPatient.user.fullName,
            specialization: doctorData?.specializationMaster[0]?.name,
            address:
              establishmentData?.address?.landmark +
              ", " +
              establishmentData?.address?.locality +
              ", " +
              establishmentData?.address?.city +
              ", " +
              establishmentData?.stateMaster[0].name +
              ", " +
              establishmentData?.address?.country,
            doctorProfilePic:
              doctorData.profilePic || constants.MAIL_IMAGES.DOCTOR_LOGO,
            hospitalProfilePic:
              establishmentData.hospital.profilePic ||
              constants.MAIL_IMAGES.HOSPITAL_LOGO,
            latitude: establishmentData.location.coordinates[1],
            longitude: establishmentData.location.coordinates[0],
          };
          const htmlFile = constants.VIEWS.APPOINTMENT_CANCELLATION;
          const parsedHTML = sendEmail.renderHTMLByEJS(
            htmlFile,
            mailParameters
          );
          if (parsedHTML) {
            await sendEmail.sendEmailPostAPI(
              findPatient.email,
              constants.EMAIL_TEMPLATES.APPOINTMENT_CANCELLATION,
              parsedHTML
            );
          }
        }
      }
    } else {
      if (environment) {
        const findPatient = await doctor.getPatientDetails(
          findAppointment.patientId
        );
        const loginLink = constants.SCREEN.PATIENT_LOGIN;
        await sendSms.sendOtp(
          findPatient.user.phone,
          findPatient.user.countryCode,
          {
            loginLink,
          },
          constants.SMS_TEMPLATES.PATIENT_REVIEW
        );
      }
    }
    return response.success(
      { msgCode: "UPDATED", data: updateAppointment || {} },
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

exports.appointmentListByDate = async (req, res) => {
  try {
    const { toDate, fromDate, page, size, sort, sortOrder, doctorId } =
      req.query;
    const { userId } = req.data;
    const sortCondition = {};
    let sortKey = sort;
    if (constants.NAME_CONSTANT.includes(sort)) sortKey = "lowerName";
    sortCondition[`${sortKey}`] = constants.LIST.ORDER[sortOrder];
    const { offset, limit } = getPagination(page, size);
    const condition = {
      date: { $gte: fromDate, $lte: toDate },
      status: { $ne: constants.BOOKING_STATUS.RESCHEDULE },
    };
    if (doctorId) condition.doctorId = new ObjectId(doctorId);
    const appointmentList = await hospital.appointmentList(
      condition,
      userId,
      sortCondition,
      offset,
      limit
    );
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

exports.calendarList = async (req, res) => {
  try {
    const { doctorId, fromDate, toDate, page, size } = req.query;
    const { userId } = req.data;
    const { offset, limit } = getPagination(page, size);
    const condition = {
      date: { $gte: fromDate, $lte: toDate },
      status: { $ne: constants.BOOKING_STATUS.RESCHEDULE },
    };
    if (doctorId) condition.doctorId = new ObjectId(doctorId);
    const appointmentList = await hospital.calendarList(
      condition,
      { "hospital.userId": new ObjectId(userId) },
      offset,
      limit
    );
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

exports.patientHospitalDetailList = async (req, res) => {
  try {
    const {
      search,
      sort,
      page,
      size,
      sortOrder,
      establishmentId,
      type,
      establishmentProfileSlug,
    } = req.query;
    let _id = establishmentId;
    if (establishmentProfileSlug) {
      const establishment = await common.getByCondition(
        EstablishmentMaster.model,
        { profileSlug: establishmentProfileSlug }
      );
      _id = establishment._id;
    }
    const condition = {
      establishmentId: new ObjectId(_id),
      doctorId: { $exists: true },
      // isDeleted: false,
      // isVerified: constants.PROFILE_STATUS.APPROVE,
    };

    const searchQuery = {
      "doctor.service.name": { $regex: new RegExp(search, "i") },
    };

    const sortCondition = {};
    let sortKey;
    if (constants.NAME_CONSTANT.includes(sort)) sortKey = "lowerName";
    else sortKey = "serviceId";
    sortCondition[`${sortKey}`] = constants.LIST.ORDER[sortOrder];
    const { offset, limit } = getPagination(page, size);
    const doctorServiceList = await hospital.detailsList(
      condition,
      sortCondition,
      offset,
      limit,
      searchQuery
    );
    const hospitalServiceList = await hospital.establishmentServiceData({
      _id: new ObjectId(_id),
    });
    const data =
      type === constants.HOSPITAL_SERVICE_TYPES.DOCTOR
        ? doctorServiceList
        : hospitalServiceList;
    const msgCode = data.count === 0 ? "NO_RECORD_FETCHED" : "HOSPITAL_LIST";
    return response.success({ msgCode, data: data }, res, httpStatus.OK);
  } catch (error) {
    console.log(error);
    return response.error(
      { msgCode: "SOMETHING_WENT_WRONG" },
      res,
      httpStatus.SOMETHING_WENT_WRONG
    );
  }
};

exports.hospitalReviewList = async (req, res) => {
  try {
    const { search, sort, page, size, establishmentId, establishmentProfileSlug } = req.query;
    const searchQuery = search || "";
    let id = establishmentId;
    if (establishmentProfileSlug) {
      const establishment = await common.getByCondition(
        EstablishmentMaster.model,
        { profileSlug: establishmentProfileSlug }
      );
      id = establishment._id;
    }
    const condition = {
      establishmentId: new ObjectId(id),
      treatment: { $regex: new RegExp(searchQuery, "i") },
      status: constants.PROFILE_STATUS.APPROVE,
    };
    const sortCondition = {};
    sortCondition["createdAt"] = sort === 1 ? 1 : -1;

    const { offset, limit } = getPagination(page, size);

    const reviewList = await hospital.reviewList(
      condition,
      sortCondition,
      offset,
      limit
    );
    let waitTimePoints = reviewList.data[0]?.waitTime || 0;
    let waitTime;
    if (waitTimePoints > 0.75) waitTime = 5;
    else if (waitTimePoints > 0.5) waitTime = 4;
    else if (waitTimePoints > 0.25) waitTime = 3;
    else waitTime = 2;
    const msgCode =
      reviewList.count === 0 ? "NO_RECORD_FETCHED" : "REVIEW_LIST";
    return response.success(
      {
        msgCode,
        data: {
          averageWaitTime: reviewList.count > 0 ? waitTime : 0,
          averagePoints: reviewList.data[0]?.rating || 0,
          valueForMoney: reviewList.data[0]?.rating || 0,
          reviewList,
        },
      },
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

exports.findDoctorList = async (req, res) => {
  try {
    const { establishmentId, page, size } = req.query;
    const { offset, limit } = getPagination(page, size);
    const condition = {
      establishmentId: new ObjectId(establishmentId),
      doctorId: { $exists: true },
      isVerified: 2,
      isDeleted: false,
    };
    const doctorList = await hospital.findDoctorList(
      condition,
      offset,
      limit,
      req.body
    );
    const msgCode = doctorList.count === 0 ? "NO_RECORD_FETCHED" : "FETCHED";
    return response.success({ msgCode, data: doctorList }, res, httpStatus.OK);
  } catch (error) {
    console.log(error);
    return response.error(
      { msgCode: "SOMETHING_WENT_WRONG" },
      res,
      httpStatus.SOMETHING_WENT_WRONG
    );
  }
};

exports.findHospitalList = async (req, res) => {
  try {
    const { page, size } = req.query;
    const { offset, limit } = getPagination(page, size);
    const condition = {
      userType: constants.USER_TYPES.HOSPITAL,
      isDeleted: false,
      status: { $ne: constants.PROFILE_STATUS.DEACTIVATE },
    };
    const hospitalQuery = {
      "hospital.isVerified": constants.PROFILE_STATUS.APPROVE,
      "hospital.steps": constants.PROFILE_STEPS.COMPLETED,
    };
    const hospitalList = await hospital.findHospitalList(
      condition,
      offset,
      limit,
      hospitalQuery,
      req.body
    );
    const responseData = {
      count: hospitalList.count,
      data:
        hospitalList.count === 0
          ? []
          : hospitalList.data.map((data) => {
              return data.data[0];
            }),
    };
    const msgCode = responseData.count === 0 ? "NO_RECORD_FETCHED" : "FETCHED";
    return response.success(
      { msgCode, data: responseData },
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

exports.dashboardCount = async (req, res) => {
  try {
    const { userId } = req.data;
    const condition = {
      userId: new Types.ObjectId(userId),
      isVerified: constants.PROFILE_STATUS.APPROVE,
      isDeleted: false,
    };
    const hospitalProfile = await common.getByCondition(
      Hospital.model,
      condition
    );
    const establishmentMasterData = await common.getByCondition(
      EstablishmentMaster.model,
      { hospitalId: new Types.ObjectId(hospitalProfile._id) }
    );
    if (!hospitalProfile || !establishmentMasterData)
      return response.error(
        { msgCode: "NOT_FOUND", data: {} },
        res,
        httpStatus.NOT_FOUND
      );
    const currentDate = new Date();
    const startDate = moment().startOf("day").toISOString();
    const endDate = moment().endOf("day").toISOString();
    const startDateMonth = moment().startOf("month").toISOString();
    const endDateMonth = moment().endOf("month").toISOString();
    const pendingAppointment =
      await await hospital.hospitalDashboardAppointmentCount({
        establishmentId: new Types.ObjectId(establishmentMasterData._id),
        date: { $gte: new Date(currentDate), $lte: new Date(endDateMonth) },
        status: constants.BOOKING_STATUS.BOOKED,
        isDeleted: false,
      });
    const totalAppointment =
      await await hospital.hospitalDashboardAppointmentCount({
        establishmentId: new Types.ObjectId(establishmentMasterData._id),
        isDeleted: false,
        date: { $gte: new Date(startDateMonth), $lte: new Date(endDateMonth) },
        status: { $ne: constants.BOOKING_STATUS.RESCHEDULE },
      });
    const todayAppointment =
      await await hospital.hospitalDashboardAppointmentCount({
        establishmentId: new Types.ObjectId(establishmentMasterData._id),
        date: { $gte: new Date(startDate), $lte: new Date(endDate) },
        status: { $ne: constants.BOOKING_STATUS.RESCHEDULE },
        isDeleted: false,
      });
    const doctorCount = await hospital.totalDoctorCount(
      establishmentMasterData._id
    );
    return response.success(
      {
        msgCode: "FETCHED",
        data: {
          totalDoctors: doctorCount || 0,
          totalBeds: hospitalProfile.totalBed || 0,
          totalAmbulance: hospitalProfile.ambulance || 0,
          pendingAppointment,
          totalAppointment,
          todayAppointment,
        },
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

exports.hospitalSpecialityGraph = async (req, res) => {
  try {
    const { userId } = req.data;
    const { specialization, toDate, fromDate } = req.body;
    const condition = {
      userId: new Types.ObjectId(userId),
      isVerified: constants.PROFILE_STATUS.APPROVE,
      isDeleted: false,
    };
    const hospitalProfile = await common.getByCondition(
      Hospital.model,
      condition
    );
    const specializationMaster = await hospital.specializationMaster(
      specialization
    );
    const establishmentMasterData = await common.getByCondition(
      EstablishmentMaster.model,
      { hospitalId: new Types.ObjectId(hospitalProfile._id) }
    );
    if (!hospitalProfile || !establishmentMasterData)
      return response.error(
        { msgCode: "NOT_FOUND", data: {} },
        res,
        httpStatus.NOT_FOUND
      );
    const graphList = await hospital.graphList(
      {
        establishmentId: new ObjectId(establishmentMasterData._id),
        isDeleted: false,
        status: { $ne: constants.BOOKING_STATUS.RESCHEDULE },
      },
      toDate,
      fromDate,
      specializationMaster
    );
    return response.success(
      {
        msgCode: "FETCHED",
        data: { count: graphList?.length || 0, list: graphList || [] },
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

exports.hospitalSpecialityList = async (req, res) => {
  try {
    const { userId } = req.data;
    const condition = {
      userId: new Types.ObjectId(userId),
      isVerified: constants.PROFILE_STATUS.APPROVE,
      isDeleted: false,
    };
    const hospitalProfile = await common.getByCondition(
      Hospital.model,
      condition
    );
    const establishmentMasterData = await common.getByCondition(
      EstablishmentMaster.model,
      { hospitalId: new Types.ObjectId(hospitalProfile._id) }
    );
    if (!hospitalProfile || !establishmentMasterData)
      return response.error(
        { msgCode: "NOT_FOUND", data: {} },
        res,
        httpStatus.NOT_FOUND
      );
    const specialityList = await hospital.specialityList({
      establishmentId: new ObjectId(establishmentMasterData._id),
      isDeleted: false,
      isVerified: constants.PROFILE_STATUS.APPROVE,
    });
    return response.success(
      {
        msgCode: "FETCHED",
        data: {
          count: specialityList?.length || 0,
          list: specialityList || [],
        },
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

exports.hospitalDoctorGraph = async (req, res) => {
  try {
    const { userId } = req.data;
    const { doctors, toDate, fromDate, groupByWeek } = req.body;
    const condition = {
      userId: new Types.ObjectId(userId),
      isVerified: constants.PROFILE_STATUS.APPROVE,
      isDeleted: false,
    };
    const hospitalProfile = await common.getByCondition(
      Hospital.model,
      condition
    );
    const establishmentMasterData = await common.getByCondition(
      EstablishmentMaster.model,
      { hospitalId: new Types.ObjectId(hospitalProfile._id) }
    );
    if (!hospitalProfile || !establishmentMasterData)
      return response.error(
        { msgCode: "NOT_FOUND", data: {} },
        res,
        httpStatus.NOT_FOUND
      );
    const appointmentCondition = {
      establishmentId: new ObjectId(establishmentMasterData._id),
      isDeleted: false,
      status: { $ne: constants.BOOKING_STATUS.RESCHEDULE },
    };
    const doctorFilter = [];
    if (doctors?.length > 0) {
      doctors.map((doctorData) => {
        doctorFilter.push(new Types.ObjectId(doctorData));
      });
    }
    const graphList = await hospital.graphListDoctors(
      appointmentCondition,
      toDate,
      fromDate,
      doctorFilter,
      groupByWeek
    );
    return response.success(
      {
        msgCode: "FETCHED",
        data: { count: graphList?.length || 0, list: graphList || [] },
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
