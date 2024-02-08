const httpStatus = require("http-status");
const { helperPassword, response } = require("../../../utils/index");
const { getPagination, objectIdFormatter } = require("../../../utils/helper");
const {
  users,
  common,
  appointmentService,
  adminService,
} = require("../../../services/index");
const {
  User,
  Doctor,
  Session,
  Appointment,
  AppointmentFeedback,
  Admin,
  EstablishmentMaster,
  SurgeryEnquiry,
  AdminSocial,
  Hospital,
  Notification,
} = require("../../../models/index");
const { generateAuthJwt } = require("../../../middlewares/index");
const config = require("../../../config/index");
const { constants } = require("../../../utils/constant");
const { ObjectId } = require("mongoose").Types;
const { Types } = require("mongoose");

const adminLogin = async (req, res, next) => {
  try {
    const { email, deviceId, deviceToken, deviceType } = req.body;
    const checkAdmin = await users.findAdmin(email);
    if (!checkAdmin) {
      return response.success(
        { msgCode: "USER_NOT_FOUND" },
        res,
        httpStatus.NOT_FOUND
      );
    }
    const isLogin = await helperPassword.comparePassword(
      req.body.password,
      checkAdmin.password
    );
    if (!isLogin) {
      return response.error(
        { msgCode: "INVALID_CREDENTIALS" },
        res,
        httpStatus.UNAUTHORIZED
      );
    }
    const { password, ...resultData } = checkAdmin;
    resultData.token = generateAuthJwt({
      userId: checkAdmin._id,
      userType: checkAdmin.userType,
      expiresIn: config.expireIn,
      email,
      deviceId,
      deviceToken,
      deviceType,
      tokenType: constants.TOKEN_TYPE.LOGIN,
      fullName: checkAdmin?.fullName
    });
    req.loginData = {
      deviceDetails: { deviceId, deviceToken, deviceType },
      authDetails: resultData,
      userId: checkAdmin._id,
    };
    return next();
  } catch (error) {
    console.log(error);
    return response.error(
      { msgCode: "INTERNAL_SERVER_ERROR" },
      res,
      httpStatus.INTERNAL_SERVER_ERROR
    );
  }
};

const createSession = async (req, res) => {
  try {
    const { deviceId, deviceToken, deviceType } = req.loginData.deviceDetails;
    const { userId } = req.loginData;
    const condition = { userId };
    const checkSession = await common.getByCondition(Session.model, condition);
    if (checkSession) {
      const destroySession = await common.removeAllSessionByCondition(
        Session.model,
        condition
      );
      if (!destroySession) {
        return response.error(
          { msgCode: "FAILED_TO_DELETE" },
          res,
          httpStatus.FORBIDDEN
        );
      }
    }
    const sessionData = {
      userId: req.loginData.authDetails._id,
      deviceId,
      deviceToken,
      deviceType,
      jwt: req.loginData.authDetails.token,
      tokenType: constants.TOKEN_TYPE.LOGIN,
    };
    const createSession = await common.create(Session.model, sessionData);
    if (!createSession) {
      return response.error(
        { msgCode: "FAILED_TO_ADD" },
        res,
        httpStatus.FORBIDDEN
      );
    }
    const { ...data } = req.loginData.authDetails;
    return response.success(
      { msgCode: "LOGIN_SUCCESSFUL", data },
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

const forgotPassword = async (req, res) => {
  try {
    const { email, newPassword, confirmPassword } = req.body;
    const checkAdmin = await users.findAdmin(email);
    if (!checkAdmin) {
      return response.success(
        { msgCode: "USER_NOT_FOUND" },
        res,
        httpStatus.NOT_FOUND
      );
    }
    const hashPassword = await helperPassword.generateHash(newPassword);
    const condition = { email };
    if (newPassword === confirmPassword) {
      const update = await users.updatePassword(condition, {
        password: hashPassword,
      });
      if (update) {
        return response.success(
          { msgCode: "PASSWORD_UPDATED", data: update },
          res,
          httpStatus.OK
        );
      }
    } else {
      return response.error(
        { msgCode: "PASSWORD_MISMATCH" },
        res,
        httpStatus.NOT_ACCEPTABLE
      );
    }
  } catch (error) {
    console.log(error);
    return response.error(
      { msgCode: "INTERNAL_SERVER_ERROR" },
      res,
      httpStatus.INTERNAL_SERVER_ERROR
    );
  }
};

const updateAdminPassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    const decode = req.data;
    const condition = {
      _id: new Types.ObjectId(decode.userId),
    };
    const findAdmin = await common.getByCondition(Admin.model, condition);
    if (!findAdmin) {
      return response.success(
        { msgCode: "DATA_NOT_FOUND" },
        res,
        httpStatus.NOT_FOUND
      );
    }
    const checkPassword = await helperPassword.comparePassword(
      currentPassword,
      findAdmin.password
    );
    if (!checkPassword) {
      return response.error(
        { msgCode: "WRONG_PASSWORD" },
        res,
        httpStatus.UNAUTHORIZED
      );
    }
    const hashPassword = await helperPassword.generateHash(newPassword);
    const data = {
      password: hashPassword,
    };
    if (newPassword == confirmPassword) {
      const updatePassword = await common.updateByCondition(
        Admin.model,
        condition,
        data
      );
      if (!updatePassword) {
        return response.error(
          { msgCode: "FAILED_TO_ADD" },
          res,
          httpStatus.FORBIDDEN
        );
      }
      return response.success(
        { msgCode: "PASSWORD_UPDATED", data: updatePassword },
        res,
        httpStatus.OK
      );
    } else {
      return response.error(
        { msgCode: "PASSWORD_MISMATCH" },
        res,
        httpStatus.NOT_ACCEPTABLE
      );
    }
  } catch (error) {
    console.log(error);
    return response.error(
      { msgCode: "INTERNAL_SERVER_ERROR" },
      res,
      httpStatus.INTERNAL_SERVER_ERROR
    );
  }
};

const updateAdminProfile = async (req, res) => {
  try {
    const { userId } = req.data;
    const updates = req.body;
    const data = await common.updateById(Admin.model, userId, updates);
    return response.success(
      { msgCode: "ADMIN_PROFILE_UPDATED", data },
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

const getAdminProfile = async (req, res) => {
  try {
    const { userId } = req.data;
    const data = await common.getById(Admin.model, userId);
    return response.success({ msgCode: "FETCHED", data }, res, httpStatus.OK);
  } catch (error) {
    console.log(error);
    return response.error(
      { msgCode: "INTERNAL_SERVER_ERROR" },
      res,
      httpStatus.INTERNAL_SERVER_ERROR
    );
  }
};

const adminDashboard = async (req, res) => {
  try {
    const appointmentCountByCity = await Appointment.model.aggregate([
      {
        $group: {
          _id: "$city",
          count: { $sum: 1 },
        },
      },
      {
        $match: {
          _id: { $ne: null },
        },
      },
      {
        $project: {
          city: "$_id",
          count: 1,
          _id: 0,
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$count" },
          cities: { $push: "$$ROOT" },
        },
      },
      {
        $unwind: "$cities",
      },
      {
        $addFields: {
          percentage: {
            $round: [
              { $multiply: [{ $divide: ["$cities.count", "$total"] }, 100] },
              1,
            ],
          },
        },
      },
      {
        $project: {
          _id: 0, // Exclude the _id field
          total: 1,
          cities: 1,
          percentage: 1,
        },
      },
      { $sort: { percentage: -1 } },
    ]);
    const appointmentCountByOS = await Session.model.aggregate([
      { $match: { tokenType: constants.TOKEN_TYPE.APPOINTMENT } },
      {
        $group: {
          _id: "$os",
          count: { $sum: 1 },
        },
      },
      {
        $match: {
          _id: { $ne: null },
        },
      },
      {
        $project: {
          os: "$_id",
          count: 1,
          _id: 0,
        },
      },
      { $sort: { count: -1 } },
    ]);

    const appointmentCountByBrowser = await Session.model.aggregate([
      { $match: { tokenType: constants.TOKEN_TYPE.APPOINTMENT } },
      {
        $group: {
          _id: "$browser",
          count: { $sum: 1 },
        },
      },
      {
        $match: {
          _id: { $ne: null },
        },
      },
      {
        $project: {
          browser: "$_id",
          count: 1,
          _id: 0,
        },
      },
      { $sort: { count: -1 } },
    ]);

    const appointmentCountByDevice = await Session.model.aggregate([
      { $match: { tokenType: constants.TOKEN_TYPE.APPOINTMENT } },
      {
        $group: {
          _id: "$deviceType",
          count: { $sum: 1 },
        },
      },
      {
        $match: {
          _id: { $ne: null },
        },
      },
      {
        $project: {
          deviceType: "$_id",
          count: 1,
          _id: 0,
        },
      },
      { $sort: { count: -1 } },
    ]);

    const appointmentCountByGender = await Appointment.model.aggregate([
      {
        $lookup: {
          from: "patients",
          localField: "patientId",
          foreignField: "_id",
          as: "patient",
        },
      },
      {
        $unwind: { path: "$patient", preserveNullAndEmptyArrays: true },
      },
      {
        $group: {
          _id: "$patient.gender",
          count: { $sum: 1 },
        },
      },
      {
        $match: {
          _id: { $ne: null },
        },
      },
      {
        $project: {
          gender: {
            $switch: {
              branches: [
                {
                  case: { $eq: ["$_id", constants.GENDER.MALE] },
                  then: "Male",
                },
                {
                  case: { $eq: ["$_id", constants.GENDER.FEMALE] },
                  then: "Female",
                },
                {
                  case: { $eq: ["$_id", constants.GENDER.OTHER] },
                  then: "Other",
                },
              ],
              default: "Unknown",
            },
          },
          count: 1,
          _id: 0,
        },
      },
      { $sort: { count: -1 } },
    ]);
    return response.success(
      {
        msgCode: "ADMIN_DASHBOARD_APPOINTMENT_COUNT",
        data: {
          appointmentCountByCity,
          appointmentCountByOS,
          appointmentCountByBrowser,
          appointmentCountByDevice,
          appointmentCountByGender,
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

async function getFilteredAppointments(dateRange) {
  const { startDateMongo, endDateMongo, previousDateMongo } = dateRange;
  const appointmentCount = await common.count(Appointment.model, {
    date: { $gte: startDateMongo, $lt: endDateMongo },
  });
  const patientCount = await common.count(User.model, {
    userType: constants.USER_TYPES.PATIENT,
    createdAt: { $gte: startDateMongo, $lt: endDateMongo },
  });
  const doctorCount = await common.count(User.model, {
    userType: constants.USER_TYPES.DOCTOR,
    createdAt: { $gte: startDateMongo, $lt: endDateMongo },
  });
  const hospitalCount = await common.count(User.model, {
    userType: constants.USER_TYPES.HOSPITAL,
    createdAt: { $gte: startDateMongo, $lt: endDateMongo },
  });
  const surgeryEnquiryCount = await common.count(SurgeryEnquiry.model, {
    createdAt: { $gte: startDateMongo, $lt: endDateMongo },
    isDeleted: false,
  });

  const previousAppointmentCount = await common.count(Appointment.model, {
    date: { $gte: previousDateMongo, $lt: startDateMongo },
  });
  const previousPatientCount = await common.count(User.model, {
    userType: constants.USER_TYPES.PATIENT,
    createdAt: { $gte: previousDateMongo, $lt: startDateMongo },
  });
  const previousDoctorCount = await common.count(User.model, {
    userType: constants.USER_TYPES.DOCTOR,
    createdAt: { $gte: previousDateMongo, $lt: startDateMongo },
  });
  const previousHospitalCount = await common.count(User.model, {
    userType: constants.USER_TYPES.HOSPITAL,
    createdAt: { $gte: previousDateMongo, $lt: startDateMongo },
  });
  const previousSurgeryEnquiryCount = await common.count(SurgeryEnquiry.model, {
    createdAt: { $gte: previousDateMongo, $lt: startDateMongo },
    isDeleted: false,
  });

  return {
    appointmentCount,
    patientCount,
    doctorCount,
    hospitalCount,
    surgeryEnquiryCount,
    appointmentPercentDiff: (
      ((appointmentCount - previousAppointmentCount) /
        (previousAppointmentCount > 0 ? previousAppointmentCount : 1)) *
      100
    ).toFixed(1),
    patientPercentDiff: (
      ((patientCount - previousPatientCount) /
        (previousPatientCount > 0 ? previousPatientCount : 1)) *
      100
    ).toFixed(1),
    doctorPercentDiff: (
      ((doctorCount - previousDoctorCount) /
        (previousDoctorCount > 0 ? previousDoctorCount : 1)) *
      100
    ).toFixed(1),
    hospitalPercentDiff: (
      ((hospitalCount - previousHospitalCount) /
        (previousHospitalCount > 0 ? previousHospitalCount : 1)) *
      100
    ).toFixed(1),
    enquiryPercentDiff: (
      ((surgeryEnquiryCount - previousSurgeryEnquiryCount) /
        (previousSurgeryEnquiryCount > 0 ? previousSurgeryEnquiryCount : 1)) *
      100
    ).toFixed(1),
    previousAppointmentCount,
    previousPatientCount,
    previousDoctorCount,
    previousHospitalCount,
    previousSurgeryEnquiryCount,
  };
}

function convertDateFormat(dateString) {
  const [day, month, year] = dateString.split("-");
  return `${year}-${month}-${day}`;
}

const adminDashboardCount = async (req, res) => {
  try {
    const { startDate, endDate } = req.query; // Get the filter value from the request query
    const milliSecsInDay = 24 * 60 * 60 * 1000;
    const previousDateMongo = (endDate - startDate) / milliSecsInDay;
    const todayRange = {
      startDateMongo: startDate,
      endDateMongo: endDate,
      previousDateMongo,
    };

    const result = await getFilteredAppointments(todayRange);

    return response.success(
      {
        msgCode: "DASHBOARD_COUNT",
        data: result,
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

const getAllUserTypeStatus = async (req, res) => {
  try {
    const { search, sort, page, size, sortOrder, status } = req.query;
    const sortCondition = {};

    let sortKey = sort;
    if (constants.NAME_CONSTANT.includes(sort))
      sortKey = constants.APPOINTMENT_LIST[sort];
    sortCondition[`${sortKey}`] = constants.LIST.ORDER[sortOrder];

    const { limit, offset } = getPagination(page, size);
    const searchQuery = search;
    let condition,
      conditionDoctor = {},
      conditionHospital = {};

    if (status === 1) {
      condition = { isDeleted: true };
    } else if (status === 2) {
      condition = {};
      conditionDoctor = { "doctor.isVerified": 3 };
      conditionHospital = { "hospital.isVerified": 3 };
    } else if (status === 3) {
      condition = { status: 5 };
    }
    const patientList = await users.patientList(
      condition,
      sortCondition,
      offset,
      limit,
      searchQuery
    );
    const doctorList = await users.doctorList(
      condition,
      sortCondition,
      offset,
      limit,
      searchQuery,
      conditionDoctor
    );
    const hospitalList = await users.hospitalList(
      condition,
      sortCondition,
      offset,
      limit,
      searchQuery,
      conditionHospital
    );

    return response.success(
      {
        msgCode: "FETCHED",
        data: {
          patient:
            status === constants.USER_STATUS_LIST.DELETE ? patientList : null,
          doctor: doctorList,
          hospital: hospitalList,
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

const getAllFeedbackList = async (req, res) => {
  try {
    const { sort, page, size, sortOrder, totalPoint, status } = req.query;
    const sortCondition = {};

    let sortKey = sort;
    if (constants.NAME_CONSTANT.includes(sort))
      sortKey = constants.APPOINTMENT_LIST[sort];
    sortCondition[`${sortKey}`] = constants.LIST.ORDER[sortOrder];

    const { limit, offset } = getPagination(page, size);

    const condition = {
      isDeleted: false,
      status,
      totalPoint: { $gte: totalPoint },
    };
    const feedbackList = await appointmentService.appointmentFeedbackAdminList(
      condition,
      sortCondition,
      offset,
      limit
    );
    condition.status = constants.PROFILE_STATUS.APPROVE;
    const approvedCount = await appointmentService.appointmentFeedbackAdminList(
      condition,
      sortCondition,
      offset,
      limit
    );
    condition.status = constants.PROFILE_STATUS.PENDING;
    const requestedCount =
      await appointmentService.appointmentFeedbackAdminList(
        condition,
        sortCondition,
        offset,
        limit
      );
    condition.status = constants.PROFILE_STATUS.REJECT;
    const rejectedCount = await appointmentService.appointmentFeedbackAdminList(
      condition,
      sortCondition,
      offset,
      limit
    );
    const msgCode =
      feedbackList.count === 0 ? "NO_RECORD_FETCHED" : "FEEDBACK_LIST";

    return response.success(
      {
        msgCode,
        data: {
          approvedCount: approvedCount.count,
          requestedCount: requestedCount.count,
          rejectedCount: rejectedCount.count,
          feedbackList,
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

const editFeedback = async (req, res) => {
  try {
    const { feedbackId } = req.query;
    const { status, isDeleted, reason } = req.body;
    const { userId } = req.data;
    const findAppointmentFeedback = await common.getById(
      AppointmentFeedback.model,
      feedbackId
    );
    if (!findAppointmentFeedback || findAppointmentFeedback.isDeleted) {
      return response.error(
        { msgCode: "NOT_FOUND" },
        res,
        httpStatus.NOT_FOUND
      );
    }
    let updateFeedback;
    let updates = {
      reason,
      status,
      modifiedBy: new ObjectId(userId),
      isDeleted: isDeleted || findAppointmentFeedback.isDeleted,
    };
    updateFeedback = await common.updateById(
      AppointmentFeedback.model,
      feedbackId,
      updates
    );

    if (status === constants.PROFILE_STATUS.APPROVE) {
      const { doctorId, establishmentId } = findAppointmentFeedback;
      const { doctorRating, doctorRecommended, doctorReviewCount, waitTime } =
        (await appointmentService.getDoctorFeedbackRating(doctorId)) || {
          doctorRating: 0,
          doctorRecommended: 0,
          doctorReviewCount: 0,
          waitTime: 0,
        };
      const {
        establishmentRating,
        establishmentRecommended,
        establishmentReviewCount,
      } = (await appointmentService.getEstablishmentFeedbackRating(
        establishmentId
      )) || {
        establishmentRating: 0,
        establishmentRecommended: 0,
        establishmentReviewCount: 0,
      };
      const updateDoctor = await common.updateById(Doctor.model, doctorId, {
        rating: doctorRating.toFixed(1),
        recommended: doctorRecommended.toFixed(2) * 100,
        totalreviews: doctorReviewCount,
        waitTime: waitTime.toFixed(2),
      });
      const updateEstablishment = await common.updateById(
        EstablishmentMaster.model,
        establishmentId,
        {
          rating: establishmentRating.toFixed(1),
          recommended: establishmentRecommended.toFixed(2) * 100,
          totalreviews: establishmentReviewCount,
        }
      );
      const hospitalData = await common.getById(
        Hospital.model,
        updateEstablishment.hospitalId
      );
      const superadminArray = await adminService.superAdminList();
      await common.create(Notification.model, {
        userType: constants.USER_TYPES.HOSPITAL,
        eventType: constants.NOTIFICATION_TYPE.FEEDBACK_APPROVED,
        senderId: superadminArray,
        receiverId: new ObjectId(hospitalData.userId),
        title: constants.MESSAGES.FEEDBACK_APPROVED.TITLE.replace(
          /{}/g,
          findAppointmentFeedback.totalPoint
        ),
        body: constants.MESSAGES.FEEDBACK_APPROVED.BODY,
      });
      await common.create(Notification.model, {
        userType: constants.USER_TYPES.DOCTOR,
        eventType: constants.NOTIFICATION_TYPE.FEEDBACK_APPROVED,
        senderId: superadminArray,
        receiverId: new ObjectId(updateDoctor.userId),
        title: constants.MESSAGES.FEEDBACK_APPROVED.TITLE.replace(
          /{}/g,
          findAppointmentFeedback.totalPoint
        ),
        body: constants.MESSAGES.FEEDBACK_APPROVED.BODY,
      });

      // shoot email using 3rd party service to hospital's email , and sms.
    }
    if (!updateFeedback) {
      return response.error(
        { msgCode: "FAILED_TO_UPDATE" },
        res,
        httpStatus.BAD_REQUEST
      );
    }

    const msgCode =
      status === constants.PROFILE_STATUS.REJECT
        ? "FEEDBACK_REJECTED"
        : "FEEDBACK_APPROVED";
    return response.success(
      {
        msgCode: isDeleted ? "FEEDBACK_DELETED" : msgCode,
        data: updateFeedback || {},
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

const getUserDocumentDetails = async (req, res) => {
  try {
    const { id } = req.query;
    const condition = { _id: new ObjectId(id) };
    const doctorDetail = await users.doctorDetailReject(condition);
    const hospitalDetail = await users.hospitalDetailReject(condition);
    return response.success(
      {
        msgCode: "FETCHED",
        data: {
          doctorDetails: doctorDetail || null,
          hospitalDetails: hospitalDetail || null,
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

const getFeedbackById = async (req, res) => {
  try {
    const { feedbackId } = req.query;
    const condition = { _id: new ObjectId(feedbackId), isDeleted: false };
    const feedbackDetails = await appointmentService.getFeedbackById(condition);
    const msgCode =
      feedbackDetails?.length === 0 ? "NO_RECORD_FETCHED" : "FEEDBACK_LIST";

    return response.success(
      {
        msgCode,
        data: feedbackDetails,
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

const addSocial = async (req, res) => {
  try {
    const { userType } = req.data;
    const content = req.body;
    const data = await common.create(AdminSocial.model, {
      userType,
      ...content,
    });
    return response.success(
      { msgCode: "SOCIAL_ADDED", data },
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

const socialList = async (req, res) => {
  try {
    const { userType } = req.data;
    const condition = { userType, isDeleted: false };
    let data;
    data = await common.adminSocialList(AdminSocial.model, condition);
    return response.success(
      { msgCode: "SOCIAL_LIST", data: { count: data?.length || 0, data } },
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

const updateSocial = async (req, res) => {
  try {
    const { userType } = req.data;
    const { id } = req.params;
    const content = req.body;
    const data = await common.updateByCondition(
      AdminSocial.model,
      { userType, _id: new ObjectId(id) },
      content
    );
    return response.success(
      { msgCode: "SOCIAL_UPDATED", data },
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

const deleteSocial = async (req, res) => {
  try {
    const { userType } = req.data;
    const { id } = req.params;
    const data = await common.getById(AdminSocial.model, id);
    if (!data || data.isDeleted)
      return response.error(
        { msgCode: "NOT_FOUND", data: {} },
        res,
        httpStatus.NOT_FOUND
      );
    const updateData = await common.updateByCondition(
      AdminSocial.model,
      { _id: new ObjectId(id), userType },
      { isDeleted: true }
    );
    return response.success(
      { msgCode: "SOCIAL_DELETED", updateData },
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

const findSocialById = async (req, res) => {
  try {
    const { id } = req.params;
    const data = await common.getById(AdminSocial.model, id);
    return response.success({ msgCode: "FETCHED", data }, res, httpStatus.OK);
  } catch (error) {
    console.log(error);
    return response.error(
      { msgCode: "INTERNAL_SERVER_ERROR" },
      res,
      httpStatus.INTERNAL_SERVER_ERROR
    );
  }
};

const registrationCount = async (req, res) => {
  try {
    const { startDate, endDate } = req.query; // Get the filter value from the request query
    const condition = {
      createdAt: { $gte: startDate, $lt: endDate },
    };

    const result = await adminService.registrationCountByDate(condition);

    return response.success(
      {
        msgCode: "DASHBOARD_COUNT",
        data: result,
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

const buildQueryCondition = (
  startDate,
  endDate,
  typeOfList,
  specialization,
  doctors,
  hospitals,
  surgeryTypes
) => {
  const condition = {};
  if (typeOfList === constants.ADMIN_DASHBOARD_TYPE_LIST.APPOINTMENT) {
    condition.date = { $gte: startDate, $lt: endDate };
    if (specialization?.length + doctors?.length + hospitals?.length) {
      condition.$and = [];
      if (specialization?.length > 0) {
        const specializationArray = objectIdFormatter(specialization);
        const specializationCondition = { $in: specializationArray };
        condition.$and.push({
          "specialization._id": specializationCondition,
        });
      }
      if (doctors?.length > 0) {
        const doctorArray = objectIdFormatter(doctors);
        const doctorCondition = { $in: doctorArray };
        condition.$and.push({ doctorId: doctorCondition });
      }
      if (hospitals?.length > 0) {
        const hospitalArray = objectIdFormatter(specialization);
        const hospitalCondition = { $in: hospitalArray };
        condition.$and.push({ establishmentId: hospitalCondition });
      }
    }
  } else {
    condition.createdAt = { $gte: startDate, $lt: endDate };
    condition.isDeleted = false;
    if (surgeryTypes?.length > 0) {
      condition.$and = [];
      const surgeryTypeArray = objectIdFormatter(surgeryTypes);
      const surgeryCondition = { $in: surgeryTypeArray };
      condition.$and.push({ treatmentType: surgeryCondition });
    }
  }
  return condition;
};

const appointmentSugeryLeadCount = async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      typeOfList,
      specialization,
      doctors,
      hospitals,
      surgeryTypes,
    } = req.body; // Get the filter value from the request query
    const query = buildQueryCondition(
      startDate,
      endDate,
      typeOfList,
      specialization,
      doctors,
      hospitals,
      surgeryTypes
    );
    const result = await adminService.appointmentSurgeryLeadList(
      query,
      typeOfList
    );

    return response.success(
      {
        msgCode: "DASHBOARD_COUNT",
        data: result,
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

const registrationCountByUserType = async (req, res) => {
  try {
    const { startDate, endDate } = req.query; // Get the filter value from the request query
    const condition = {
      createdAt: { $gte: startDate, $lt: endDate },
    };

    const result = await adminService.registrationCountByUserType(condition);

    return response.success(
      {
        msgCode: "DASHBOARD_COUNT",
        data: result,
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

const appointmentSpecializationListByDateRange = async (req, res) => {
  try {
    const { startDate, endDate, specialization, doctors, hospitals } = req.body; // Get the filter value from the request query
    const condition = {};
    condition.date = { $gte: startDate, $lt: endDate };
    if (specialization?.length > 0) {
      condition.$and = [];
      const specializationArray = objectIdFormatter(specialization);
      const specializationCondition = { $in: specializationArray };
      condition.$and.push({ "specialization._id": specializationCondition });
    }
    if (doctors?.length > 0) {
      condition.$and = [];
      const doctorArray = objectIdFormatter(doctors);
      const doctorCondition = { $in: doctorArray };
      condition.$and.push({ doctorId: doctorCondition });
    }
    if (hospitals?.length > 0) {
      condition.$and = [];
      const hospitalArray = objectIdFormatter(specialization);
      const hospitalCondition = { $in: hospitalArray };
      condition.$and.push({ establishmentId: hospitalCondition });
    }
    const result =
      await adminService.appointmentListByDateRangeAndSpecialization(condition);

    return response.success(
      {
        msgCode: "DASHBOARD_COUNT",
        data: result,
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

const doctorVerifiedList = async (req, res) => {
  try {
    const condition = {
      doctorId: { $exists: true },
      isDeleted: false,
      isVerified: constants.PROFILE_STATUS.APPROVE,
      isActive: true,
    };
    const doctorList = await adminService.adminDoctorList(condition);
    return response.success(
      { msgCode: "SOCIAL_LIST", data: doctorList },
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
  adminLogin,
  createSession,
  forgotPassword,
  updateAdminProfile,
  adminDashboard,
  adminDashboardCount,
  getAllUserTypeStatus,
  getAllFeedbackList,
  editFeedback,
  getUserDocumentDetails,
  getFeedbackById,
  updateAdminPassword,
  addSocial,
  socialList,
  findSocialById,
  deleteSocial,
  updateSocial,
  getAdminProfile,
  registrationCount,
  appointmentSugeryLeadCount,
  registrationCountByUserType,
  appointmentSpecializationListByDateRange,
  doctorVerifiedList,
};
