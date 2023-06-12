const httpStatus = require("http-status");
const {
  sendEmail,
  generateOtp,
  helperPassword,
  response,
  sendOTP,
} = require("../../../utils/index");
const { users, common } = require("../../../services/index");
const {
  User,
  Doctor,
  OTP,
  Patient,
  Hospital,
  EstablishmentMaster
} = require("../../../models/index");
const { generateAuthJwt } = require("../../../middlewares/index");
const config = require("../../../config/index");
const { constants } = require("../../../utils/constant");
const { Types } = require("mongoose");
const { ObjectId } = require("mongoose").Types;

const login = async (req, res) => {
  try {
    const { phone, mode, userType } = req.body;
    // find user by mobile number
    const user = await users.findUser(phone.replace(/[-\s]/g, ""), userType);
    if (!user || user.isDeleted === true) {
      return response.success(
        { msgCode: "USER_NOT_FOUND" },
        res,
        httpStatus.NOT_FOUND
      );
    }
    const findPreviousOTP = await common.findObject(OTP.model, {
      phone: phone.replace(/[-\s]/g, ""),
      userType: userType,
    });
    if (findPreviousOTP) {
      //remove previous otp
      common.removeById(OTP.model, findPreviousOTP._id);
    }
    // send OTP to user via SMS/call and update user's OTP field
    const message = `Your login OTP is sent to ${phone}: `;
    const otp = "123456"; //generateOtp(6).toString();
    // await sendOTP(user.phone, mode, message, otp);
    const savedOtp = await common.create(OTP.model, {
      otp,
      phone: phone.replace(/[-\s]/g, ""),
    });
    if (!savedOtp) {
      return response.error(
        { msgCode: "FAILED_TO_CREATE_OTP" },
        res,
        httpStatus.FORBIDDEN
      );
    }
    const token = generateAuthJwt({
      userId: user._id,
      expiresIn: config.expireIn,
      userType,
    });
    return response.success(
      { msgCode: "OTP_SENT", data: { token, otp } },
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

const signUp = async (req, res) => {
  try {
    const { fullName, phone, mode, userType } = req.body;
    const findUser = await users.findUser(
      phone.replace(/[-\s]/g, ""),
      userType
    );
    console.log(findUser);
    if (findUser) {
      return response.error(
        { msgCode: "ALREADY_REGISTERED" },
        res,
        httpStatus.FORBIDDEN
      );
    }
    //sending OTP to mobile number via selected mode and desired message[call or sms]
    const message = `OTP sent to ${phone}: `;
    const otp = "123456"; //generateOtp(6).toString(); // Generating OTP method
    //await sendOTP(phone, mode, message, otp)
    let data;
    await common.create(OTP.model, {
      otp,
      phone: phone.replace(/[-\s]/g, ""),
    }); //OTP Data creation
    if (userType === constants.USER_TYPES.PATIENT) {
      const profile = {
        fullName,
        phone: phone.replace(/[-\s]/g, ""),
        userType,
      };
      data = await common.create(User.model, profile);
      await common.create(Patient.model, {
        userId: new Types.ObjectId(data._id),
      }); // Creating patient data
    } else if (userType === constants.USER_TYPES.DOCTOR) {
      const profile = {
        fullName,
        phone: phone.replace(/[-\s]/g, ""),
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
        phone: phone.replace(/[-\s]/g, ""),
        userType,
        ...req.body,
      };
      data = await common.create(User.model, profile);
      const hospitalData = await common.create(Hospital.model, {
        userId: new Types.ObjectId(data._id),
      }); // Creating hospital data
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
    });
    return response.success(
      { msgCode: "SIGNUP_SUCCESSFUL", data: { token, otp } },
      res,
      httpStatus.CREATED
    );
  } catch (error) {
    console.log("🚀 ~ file: controller.js ~ line 301 ~ signup ~ error", error);
    return response.error(
      { msgCode: "INTERNAL_SERVER_ERROR" },
      res,
      httpStatus.INTERNAL_SERVER_ERROR
    );
  }
};

const verifyOtp = async (req, res) => {
  try {
    const { phone, otp, userType } = req.body;
    //find user
    const findUser = await users.findUser(
      phone.replace(/[-\s]/g, ""),
      userType
    );
    const findUserOTP = await common.findObject(OTP.model, {
      phone: phone.replace(/[-\s]/g, ""),
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
    //verify otp
    if (findUserOTP?.otp !== otp) {
      return response.error(
        { msgCode: "INVALID_OTP" },
        res,
        httpStatus.NOT_ACCEPTABLE
      );
    }
    if (
      findUserOTP?.otp == otp &&
      new Date(findUserOTP?.expiresAt).getTime() < Date.now()
    ) {
      return response.error(
        { msgCode: "EXPIRED_OTP" },
        res,
        httpStatus.NOT_ACCEPTABLE
      );
    }
    //empty otp field by updating
    const model =
      findUser.userType.includes(constants.USER_TYPES.DOCTOR)
        ? Doctor.model
        : Hospital.model;
    const result = await common.getByCondition(model, {
      userId: new ObjectId(findUser?._id),
    });
    const { steps, isVerified, profileScreen } = result
      ? result
      : { steps: null, isVerified: null, profileScreen: null };
    // const { steps, isVerified  } = await common.getByCondition(model, { userId: new ObjectId(findUser?._id) });
    const token = generateAuthJwt({
      userId: findUser?._id,
      userType: findUser?.userType,
      expiresIn: config?.expireIn,
    });
    await common.removeById(OTP.model, findUserOTP?._id); // Removing OTP
    return response.success(
      {
        msgCode: "OTP_VERIFIED",
        data: {
          token,
          findUser,
          steps,
          profileScreen,
          approvalStatus: isVerified,
          doctorId: result?._id || null,
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

const resendOtp = async (req, res) => {
  try {
    const { phone, mode, userType } = req.body;
    const findUser = await users.findUser(
      phone.replace(/[-\s]/g, ""),
      userType
    );
    if (!findUser) {
      return response.success(
        { msgCode: "USER_NOT_FOUND" },
        res,
        httpStatus.NOT_FOUND
      );
    }
    const message = `New OTP sent to ${phone}: `;
    const otp = "123456"; //generateOtp(6).toString();
    // await sendOTP(phone, mode, message, otp);
    const update = await common.updateByCondition(
      OTP.model,
      { phone: phone.replace(/[-\s]/g, "") },
      {
        otp: otp,
        expiresAt: new Date().setMinutes(new Date().getMinutes() + 10),
      }
    ); // update OTP in user document
    console.log(update);
    return response.success(
      { msgCode: "OTP_RESENT", data: { otp } },
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

const logOut = async (req, res) => {
  try {
    //fetching data from token
    const decode = req.data;
    const data = await common.getById(User.model, decode.user_id);
    if (!data) {
      return response.success(
        { msgCode: "USER_NOT_FOUND" },
        res,
        httpStatus.NOT_FOUND
      );
    }
    //null device info
    const update = await common.updateById(User.model, data._id, {
      device_info: null,
    });
    if (!update) {
      return response.error(
        { msgCode: "UPDATE_ERROR" },
        res,
        httpStatus.FORBIDDEN
      );
    }

    return response.success(
      { msgCode: "LOGOUT_SUCCESSFUL", data: {} },
      res,
      httpStatus.ACCEPTED
    );
  } catch (error) {
    console.log("🚀 ~ file: controller.js ~ line 381 ~ logout ~ error", error);
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
    console.log("🚀 ~ file: controller.js ~ line 381 ~ logout ~ error", error);
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
      phone: phone.replace(/[-\s]/g, ""),
      userType,
    });
    //verify otp
    if (findUserOTP.otp !== otp) {
      return response.error(
        { msgCode: "INVALID_OTP" },
        res,
        httpStatus.NOT_ACCEPTABLE
      );
    }
    if (
      findUserOTP.otp == otp &&
      new Date(findUserOTP.expiresAt).getTime() < Date.now()
    ) {
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
    return response.error(
      { msgCode: "INTERNAL_SERVER_ERROR" },
      res,
      httpStatus.INTERNAL_SERVER_ERROR
    );
  }
};

const guestResendOtp = async (req, res) => {
  try {
    const { phone, mode, userType } = req.body;
    const message = `New OTP sent to ${phone}: `;
    const otp = "123456"; //generateOtp(6).toString();
    // await sendOTP(phone, mode, message, otp);
    const update = await common.updateByCondition(
      OTP.model,
      { phone: phone.replace(/[-\s]/g, "") },
      {
        otp: otp,
        expiresAt: new Date().setMinutes(new Date().getMinutes() + 10),
      }
    ); // update OTP in user document
    console.log(update);
    return response.success(
      { msgCode: "OTP_RESENT", data: { otp } },
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

module.exports = {
  login,
  signUp,
  resendOtp,
  verifyOtp,
  logOut,
  deleteAccount,
  guestVerifyOtp,
  guestResendOtp,
};
