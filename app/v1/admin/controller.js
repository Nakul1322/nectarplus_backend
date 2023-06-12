const httpStatus = require("http-status");
const {
  sendEmail,
  generateOtp,
  helperPassword,
  response,
  sendOTP,
} = require("../../../utils/index");
const { users, common } = require("../../../services/index");
const { User, Doctor, Session, Appointment } = require("../../../models/index");
const { generateAuthJwt } = require("../../../middlewares/index");
const config = require("../../../config/index");
const { constants } = require("../../../utils/constant");
const moment = require("moment");

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
    });
    req.loginData = {
      deviceDetails: { deviceId, deviceToken, deviceType },
      authDetails: resultData,
    };
    return next();
  } catch (error) {
    console.log("catch error", error.message);
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
    const condition = { deviceId };
    const checkSession = await common.getByCondition(Session.model, condition);
    if (checkSession) {
      const destroySession = await common.removeById(
        Session.model,
        checkSession._id
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
    };
    console.log(sessionData);
    const createSession = await common.create(Session.model, sessionData);
    console.log(createSession);
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
    console.log("data", checkAdmin);
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
    console.log(error.message);
    return response.error(
      { msgCode: "INTERNAL_SERVER_ERROR" },
      res,
      httpStatus.INTERNAL_SERVER_ERROR
    );
  }
};

const updateAdminProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const data = await common.updateById(id, updates);
    return response.success(
      { msgCode: "ADMIN_PROFILE_UPDATED", data },
      res,
      httpStatus.OK
    );
  } catch (error) {
    console.log(error.message);
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
            $multiply: [{ $divide: ["$cities.count", "$total"] }, 100],
          },
        },
      },
      {
        $sort: {
          count: -1,
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
    ]);
    const appointmentCountByOS = await Session.model.aggregate([
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
    ]);

    const appointmentCountByBrowser = await Session.model.aggregate([
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
    ]);

    const appointmentCountByDevice = await Session.model.aggregate([
      {
        $group: {
          _id: {
            $cond: [
              { $eq: ["$deviceType", constants.DEVICE_TYPE.MOBILE] },
              "MOBILE",
              {
                $cond: [
                  { $eq: ["$deviceType", constants.DEVICE_TYPE.TABLET] },
                  "TABLET",
                  "DESKTOP",
                ],
              },
            ],
          },
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
                  then: "MALE",
                },
                {
                  case: { $eq: ["$_id", constants.GENDER.FEMALE] },
                  then: "FEMALE",
                },
                {
                  case: { $eq: ["$_id", constants.GENDER.OTHER] },
                  then: "OTHER",
                },
              ],
              default: "UNKNOWN",
            },
          },
          count: 1,
          _id: 0,
        },
      },
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
    console.log(error.message);
    return response.error(
      { msgCode: "INTERNAL_SERVER_ERROR" },
      res,
      httpStatus.INTERNAL_SERVER_ERROR
    );
  }
};

async function getFilteredAppointments(dateRange) {
  const { type, startDate, endDate } = dateRange;

  // Convert startDate and endDate to MongoDB date format
  const startDateMongo = moment(startDate, "DD-MM-YYYY").toDate();
  const endDateMongo = moment(endDate, "DD-MM-YYYY").toDate();

  const pipeline = [
    {
      $match: {
        $or: [
          { type: { $eq: type } },
          { date: { $gte: startDateMongo } },
          { date: { $lte: endDateMongo } },
        ],
      },
    },
    {
      $lookup: {
        from: "doctors",
        localField: "doctorId",
        foreignField: "_id",
        as: "doctor",
      },
    },
    {
      $lookup: {
        from: "patients",
        localField: "patientId",
        foreignField: "_id",
        as: "patient",
      },
    },
    {
      $lookup: {
        from: "hospitals",
        localField: "hospitalId",
        foreignField: "_id",
        as: "hospital",
      },
    },
    {
      $lookup: {
        from: "surgeryEnquiries",
        localField: "surgeryEnquiryId",
        foreignField: "_id",
        as: "surgeryEnquiry",
      },
    },
    {
      $unwind: {
        path: "$doctor",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $unwind: {
        path: "$patient",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $unwind: {
        path: "$hospital",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $unwind: {
        path: "$surgeryEnquiry",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $group: {
        _id: null,
        doctorCount: {
          $sum: {
            $cond: {
              if: { $eq: ["$doctorId", "$doctor._id"] },
              then: 1,
              else: 0,
            },
          },
        },
        patientCount: {
          $sum: {
            $cond: {
              if: { $eq: ["$patientId", "$patient._id"] },
              then: 1,
              else: 0,
            },
          },
        },
        hospitalCount: {
          $sum: {
            $cond: {
              if: { $eq: ["$hospitalId", "$hospital._id"] },
              then: 1,
              else: 0,
            },
          },
        },
        surgeryEnquiryCount: {
          $sum: {
            $cond: {
              if: { $eq: ["$surgeryEnquiryId", "$surgeryEnquiry._id"] },
              then: 1,
              else: 0,
            },
          },
        },
      },
    },
    {
      $project: {
        _id: 0,
        doctorCount: 1,
        patientCount: 1,
        hospitalCount: 1,
        surgeryEnquiryCount: 1,
      },
    },
  ];
  const result = await Appointment.model.aggregate(pipeline);

  console.log(result);
  return result;
}

function convertDateFormat(dateString) {
  const [day, month, year] = dateString.split("-");
  return `${year}-${month}-${day}`;
}

const adminDashboardCount = async (req, res) => {
  try {
    const { startDate, endDate } = req.query; // Get the filter value from the request query

    // Convert the date format
    const startDateFormatted = convertDateFormat(startDate);
    const endDateFormatted = convertDateFormat(endDate);

    const todayRange = {
      type: "today",
      startDate: new Date(`${startDateFormatted}T00:00:00.000Z`),
      endDate: new Date(`${endDateFormatted}T23:59:59.999Z`),
    };
    console.log(todayRange);

    const result = await getFilteredAppointments(todayRange);

    return response.success(
      {
        msgCode: "ADMIN_PROFILE_UPDATED",
        data: result,
      },
      res,
      httpStatus.OK
    );
  } catch (error) {
    console.log(error.message);
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
};
