const httpStatus = require("http-status");
const {
  response,
  generateOtp,
  sendSms,
  generateHash,
  comparePassword,
  sendEmail,
} = require("../../../utils/index");
const { users, common } = require("../../../services/index");
const {
  User,
  Doctor,
  OTP,
  Patient,
  Hospital,
  EstablishmentMaster,
  EstablishmentTiming,
  Session,
} = require("../../../models/index");
const { generateAuthJwt } = require("../../../middlewares/index");
const config = require("../../../config/index");
const { constants } = require("../../../utils/constant");
const { Types } = require("mongoose");
const { ObjectId } = require("mongoose").Types;
const environment = config.ENVIRONMENT === constants.SERVER.PROD;

const login = async (req, res) => {
  try {
    const { phone, userType, countryCode } = req.body;
    const user = await users.findUser(
      phone.replace(/[-\s]/g, ""),
      countryCode,
      userType
    );
    if (
      !user ||
      user.isDeleted === true ||
      user.status === constants.PROFILE_STATUS.DEACTIVATE
    ) {
      return response.success(
        { msgCode: "USER_NOT_FOUND" },
        res,
        httpStatus.NOT_FOUND
      );
    }
    const model = {
      1: Patient.model,
      2: Doctor.model,
      3: Hospital.model,
    };
    const userData = await common.getByCondition(model[userType], {
      userId: new ObjectId(user._id),
    });
    if (
      !userData ||
      userData.isVerified === constants.PROFILE_STATUS.REJECT ||
      userData.isVerified === constants.PROFILE_STATUS.DEACTIVATE
    ) {
      return response.success(
        { msgCode: "USER_NOT_FOUND", data: {} },
        res,
        httpStatus.NOT_FOUND
      );
    }
    const findPreviousOTP = await common.findObject(OTP.model, {
      phone: phone?.replace(/[-\s]/g, ""),
      userType: userType,
    });
    if (findPreviousOTP) {
      common.removeById(OTP.model, findPreviousOTP._id);
    }
    const token = generateAuthJwt({
      userId: user._id,
      expiresIn: config.expireIn,
      userType,
      fullName: userData?.fullName,
    });
    const otp = environment
      ? generateOtp(config.DEFAULT_OTP_LENGTH)
      : config.DEFAULT_OTP;
    const hashOtp = await generateHash(otp);
    const savedOtp = await common.create(OTP.model, {
      otp: hashOtp,
      phone: phone?.replace(/[-\s]/g, ""),
      userType,
    });
    if (!savedOtp) {
      return response.error(
        { msgCode: "FAILED_TO_CREATE_OTP" },
        res,
        httpStatus.FORBIDDEN
      );
    }
    if (environment) {
      const sendOtp = await sendSms.sendOtp(
        phone,
        countryCode,
        { OTP: otp },
        constants.SMS_TEMPLATES.OTP
      );
      if (!sendOtp)
        return response.error(
          { msgCode: "OTP_NOT_SENT", data: {} },
          res,
          httpStatus.FORBIDDEN
        );
    }
    return response.success(
      { msgCode: "OTP_SENT", data: { token, user } },
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

const signUp = async (req, res) => {
  try {
    const { fullName, phone, userType, countryCode } = req.body;
    const findUser = await users.findUser(
      phone.replace(/[-\s]/g, ""),
      countryCode,
      userType
    );
    if (findUser) {
      return response.error(
        { msgCode: "ALREADY_REGISTERED" },
        res,
        httpStatus.FORBIDDEN
      );
    }
    let data;
    if (userType === constants.USER_TYPES.PATIENT) {
      const profile = {
        fullName,
        countryCode,
        phone: phone?.replace(/[-\s]/g, ""),
        userType,
      };
      data = await common.create(User.model, profile);
      await common.create(Patient.model, {
        userId: new Types.ObjectId(data._id),
      });
    } else if (userType === constants.USER_TYPES.DOCTOR) {
      const profile = {
        fullName,
        phone: phone?.replace(/[-\s]/g, ""),
        countryCode,
        userType,
        ...req.body,
      };
      data = await common.create(User.model, profile);
      await common.create(Doctor.model, {
        userId: new Types.ObjectId(data._id),
      }); // Creating doctor data
    } else if (userType === constants.USER_TYPES.HOSPITAL) {
      const profile = {
        fullName,
        phone: phone?.replace(/[-\s]/g, ""),
        countryCode,
        userType,
        ...req.body,
      };
      data = await common.create(User.model, profile);
      const hospitalData = await common.create(Hospital.model, {
        userId: new Types.ObjectId(data._id),
      });
      await common.create(EstablishmentMaster.model, {
        hospitalId: new Types.ObjectId(hospitalData._id),
      });
    } else {
      return response.error(
        { msgCode: "INVALID_USER_TYPE" },
        res,
        httpStatus.BAD_REQUEST
      );
    }
    if (!data) {
      return response.error(
        { msgCode: "FAILED_TO_ADD" },
        res,
        httpStatus.FORBIDDEN
      );
    }
    const token = generateAuthJwt({
      userId: data._id,
      expiresIn: config.expireIn,
      userType,
      fullName
    });
    const otp = environment
      ? generateOtp(config.DEFAULT_OTP_LENGTH)
      : config.DEFAULT_OTP;
    const hashOtp = await generateHash(otp);
    const savedOtp = await common.create(OTP.model, {
      otp: hashOtp,
      phone: phone?.replace(/[-\s]/g, ""),
      userType,
    });
    if (!savedOtp) {
      return response.error(
        { msgCode: "FAILED_TO_CREATE_OTP" },
        res,
        httpStatus.FORBIDDEN
      );
    }
    if (environment) {
      const sendOtp = await sendSms.sendOtp(
        phone,
        countryCode,
        { OTP: otp },
        constants.SMS_TEMPLATES.OTP
      );
      if (!sendOtp)
        return response.error(
          { msgCode: "OTP_NOT_SENT", data: {} },
          res,
          httpStatus.FORBIDDEN
        );
    }
    return response.success(
      { msgCode: "SIGNUP_SUCCESSFUL", data: { token, data } },
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

const verifyOtp = async (req, res) => {
  try {
    const {
      phone,
      otp,
      userType,
      countryCode,
      deviceId,
      deviceType,
      deviceToken,
      browser,
      os,
      osVersion,
    } = req.body;
    //find user
    const findUser = await users.findUser(
      phone.replace(/[-\s]/g, ""),
      countryCode,
      userType
    );
    const findUserOTP = await common.findObject(OTP.model, {
      phone: phone?.replace(/[-\s]/g, ""),
      userType,
    });
    if (!findUser) {
      return response.success(
        { msgCode: "USER_NOT_FOUND" },
        res,
        httpStatus.NOT_FOUND
      );
    }
    if (!findUserOTP) {
      return response.error(
        { msgCode: "INVALID_OTP" },
        res,
        httpStatus.FORBIDDEN
      );
    }
    const check = comparePassword(otp, findUserOTP?.otp);
    //verify otp
    if (!check) {
      return response.error(
        { msgCode: "INVALID_OTP" },
        res,
        httpStatus.NOT_ACCEPTABLE
      );
    }
    if (check && new Date(findUserOTP?.expiresAt).getTime() < Date.now()) {
      return response.error(
        { msgCode: "EXPIRED_OTP" },
        res,
        httpStatus.NOT_ACCEPTABLE
      );
    }
    //empty otp field by updating
    const model = {
      1: Patient.model,
      2: Doctor.model,
      3: Hospital.model,
    };
    const result = await common.getByCondition(model[userType], {
      userId: new ObjectId(findUser?._id),
    });
    const establishmentMasterData =
      (await common.getByCondition(EstablishmentMaster.model, {
        hospitalId: new ObjectId(result?._id),
      })) || null;
    const hospitalTiming =
      (await common.getByCondition(EstablishmentTiming.model, {
        establishmentId: new ObjectId(establishmentMasterData?._id),
        doctorId: { $exists: false },
      })) || null;
    const { steps, isVerified, profileScreen, profilePic } = result || {
      steps: null,
      isVerified: null,
      profileScreen: null,
      profilePic: null,
    };
    const name = establishmentMasterData?.name || null;
    findUser.name =
      userType === constants.USER_TYPES.HOSPITAL ? name : findUser?.fullName;
    const token = generateAuthJwt({
      userId: findUser?._id,
      userType,
      expiresIn: config?.expireIn,
      deviceId,
      deviceType,
      deviceToken,
      browser,
      os,
      osVersion,
      tokenType: constants.TOKEN_TYPE.LOGIN,
      fullName: findUser?.name
    });
    await common.create(Session.model, {
      jwt: token,
      userId: findUser?._id,
      deviceId,
      deviceType,
      deviceToken,
      browser,
      os,
      osVersion,
      tokenType: constants.TOKEN_TYPE.LOGIN,
    }); // Removing OTP
    await common.removeById(OTP.model, findUserOTP?._id); // Removing OTP
    findUser.profilePic = profilePic;
    return response.success(
      {
        msgCode: "OTP_VERIFIED",
        data: {
          token,
          findUser,
          steps,
          profileScreen,
          profilePic,
          approvalStatus: isVerified,
          doctorId: result?._id || null,
          establishmentName: name,
          hospitalTiming,
          userType,
        },
      },
      res,
      httpStatus.ACCEPTED
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

// cognitive complexity
const resendOtp = async (req, res) => {
  try {
    const { userId } = req.data;
    const { countryCode, phone, userType, email, isLogin } = req.body;
    const updatedPhone = phone.replace(/[-\s]/g, "");

    if (phone) {
      const findUser = await users.findUser(
        updatedPhone,
        countryCode,
        userType
      );
      if (!findUser && isLogin) {
        return response.success(
          { msgCode: "USER_NOT_FOUND" },
          res,
          httpStatus.NOT_FOUND
        );
      }
    }
    const otp = environment
      ? generateOtp(config.DEFAULT_OTP_LENGTH)
      : config.DEFAULT_OTP;
    const hashOtp = await generateHash(otp);
    const updateOTP = await common.updateByCondition(
      OTP.model,
      { phone: updatedPhone },
      {
        otp: hashOtp,
        expiresAt: new Date().setMinutes(new Date().getMinutes() + 10),
        userType,
        phone: updatedPhone,
      }
    );
    if (!updateOTP) {
      return response.error(
        { msgCode: "FAILED_TO_CREATE_OTP" },
        res,
        httpStatus.FORBIDDEN
      );
    }
    if (environment) {
      const sendOtp = await common.sendOtpPhoneOrEmail(
        phone,
        email,
        userId,
        countryCode,
        otp
      );
      if (!sendOtp)
        return response.error(
          { msgCode: "OTP_NOT_SENT", data: {} },
          res,
          httpStatus.FORBIDDEN
        );
    }
    return response.success(
      { msgCode: "OTP_RESENT", data: {} },
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

const logOut = async (req, res) => {
  try {
    const logoutMessage = {
      1: "PATIENT_LOGOUT",
      2: "DOCTOR_LOGOUT",
      3: "HOSPITAL_LOGOUT",
      4: "ADMIN_LOGOUT",
    };
    const { userId, deviceId, userType } = req.data;
    const condition = { userId: new ObjectId(userId), deviceId };
    await common.deleteByField(Session.model, condition);
    const msgCode = logoutMessage[userType];
    return response.success({ msgCode }, res, httpStatus.OK);
  } catch (error) {
    console.log(error);
    return response.error(
      { msgCode: "INTERNAL_SERVER_ERROR" },
      res,
      httpStatus.INTERNAL_SERVER_ERROR
    );
  }
};

const deleteAccount = async (req, res) => {
  try {
    //fetching data from token
    const decode = req.data;
    const data = await common.getById(User.model, decode.userId);
    if (!data) {
      return response.success(
        { msgCode: "USER_NOT_FOUND" },
        res,
        httpStatus.NOT_FOUND
      );
    }
    //null device info
    const update = await common.updateById(User.model, data._id, {
      status: constants.STATUS.DELETED,
    });
    if (!update) {
      return response.error(
        { msgCode: "UPDATE_ERROR" },
        res,
        httpStatus.FORBIDDEN
      );
    }

    return response.success(
      { msgCode: "PROFILE_DELETED_SUCCESSFUL", data: {} },
      res,
      httpStatus.ACCEPTED
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

const guestVerifyOtp = async (req, res) => {
  try {
    const { phone, otp, userType } = req.body;
    const findUserOTP = await common.findObject(OTP.model, {
      phone: phone?.replace(/[-\s]/g, ""),
      userType,
    });
    const check = comparePassword(otp, findUserOTP?.otp);
    //verify otp
    if (!check) {
      return response.error(
        { msgCode: "INVALID_OTP" },
        res,
        httpStatus.NOT_ACCEPTABLE
      );
    }
    if (check && new Date(findUserOTP.expiresAt).getTime() < Date.now()) {
      return response.error(
        { msgCode: "EXPIRED_OTP" },
        res,
        httpStatus.NOT_ACCEPTABLE
      );
    }
    //empty otp field by updating
    await common.removeById(OTP.model, findUserOTP._id); // Removing OTP
    return response.success(
      { msgCode: "OTP_VERIFIED", data: {} },
      res,
      httpStatus.ACCEPTED
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

const guestResendOtp = async (req, res) => {
  try {
    const { phone, countryCode } = req.body;
    const otp = environment
      ? generateOtp(config.DEFAULT_OTP_LENGTH)
      : config.DEFAULT_OTP;
    const hashOtp = await generateHash(otp);
    await common.updateByCondition(
      OTP.model,
      { phone: phone?.replace(/[-\s]/g, "") },
      {
        otp: hashOtp,
        expiresAt: new Date().setMinutes(new Date().getMinutes() + 10),
        phone: phone?.replace(/[-\s]/g, ""),
      }
    );
    if (environment) {
      const sendOtp = await sendSms.sendOtp(
        phone,
        countryCode,
        { OTP: otp },
        constants.SMS_TEMPLATES.OTP
      );
      if (!sendOtp)
        return response.error(
          { msgCode: "OTP_NOT_SENT", data: {} },
          res,
          httpStatus.FORBIDDEN
        );
    }
    return response.success(
      { msgCode: "OTP_RESENT", data: {} },
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
    const createSessionData = await common.create(Session.model, sessionData);
    if (!createSessionData) {
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

const checkNumber = async (req, res, next) => {
  try {
    const { phone, userType, isEdit } = req.body;
    const conditin = {
      phone: phone,
      isDeleted: false,
      status: constants.PROFILE_STATUS.ACTIVE,
      userType: userType,
    };
    if (!isEdit) {
      const findUser = await common.getByCondition(User.model, conditin);
      if (findUser) {
        return response.error(
          { msgCode: "ALREADY_REGISTERED" },
          res,
          httpStatus.FORBIDDEN
        );
      }
      return response.success({ msgCode: "OK", data: {} }, res, httpStatus.OK);
    }
    return response.success({ msgCode: "OK", data: {} }, res, httpStatus.OK);
  } catch (error) {
    console.log(error);
    return response.error(
      { msgCode: "INTERNAL_SERVER_ERROR" },
      res,
      httpStatus.INTERNAL_SERVER_ERROR
    );
  }
};

const getOTPViaCall = async (req, res) => {
  try {
    const { countryCode, phone, userType, isLogin } = req.body;
    const findUser = await users.findUser(
      phone.replace(/[-\s]/g, ""),
      countryCode,
      userType
    );
    if (isLogin && !findUser) {
      return response.error(
        { msgCode: "USER_NOT_FOUND" },
        res,
        httpStatus.NOT_FOUND
      );
    } else if (!isLogin && findUser) {
      return response.error(
        { msgCode: "PHONE_EXISTS" },
        res,
        httpStatus.NOT_FOUND
      );
    }
    const otp = environment
      ? generateOtp(config.DEFAULT_OTP_LENGTH)
      : config.DEFAULT_OTP;
    const hashOtp = await generateHash(otp);
    await common.updateByCondition(
      OTP.model,
      { phone: phone?.replace(/[-\s]/g, "") },
      {
        otp: hashOtp,
        expiresAt: new Date().setMinutes(new Date().getMinutes() + 10),
        userType,
        phone: phone?.replace(/[-\s]/g, ""),
      }
    );
    if (environment) {
      const voice = `Hello , your OTP is ${otp}. Once again , your OTP is ${otp}`;
      const sendOtp = await sendSms.getOTPViaCall(phone, countryCode, voice);
      if (!sendOtp)
        return response.error(
          { msgCode: "OTP_NOT_SENT", data: {} },
          res,
          httpStatus.FORBIDDEN
        );
    }
    return response.success(
      { msgCode: "OTP_SENT", data: {} },
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
  login,
  signUp,
  resendOtp,
  verifyOtp,
  logOut,
  deleteAccount,
  guestVerifyOtp,
  guestResendOtp,
  createSession,
  checkNumber,
  getOTPViaCall,
};
