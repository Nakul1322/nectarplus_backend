const jwt = require("jsonwebtoken");
const { env } = process;
const secretKey = env.SECRET;
const response = require("../utils/response");
const httpStatus = require("http-status-codes");
const { common } = require("../services/index");
const { User,Admin } = require('../models/index');
const { constants } = require('../utils/constant');

const generateAuthJwt = (payload) => {
  const { expiresIn, ...params } = payload;
  const token = jwt.sign(params, secretKey, { expiresIn });
  if (!token) {
    return false;
  }
  return token;
};

const verifyAuthToken = async (req, res, next) => {
  try {
    let token = req.headers["authorization"];
    if (!token) {
      console.log("hi");
      return response.error(
        { msgCode: "TOKEN_REQUIRED" },
        res,
        httpStatus.StatusCodes.BAD_REQUEST
      );
    }
    token = token.replace(/^Bearer\s+/, "");
    jwt.verify(token, secretKey, async (error, decoded) => {
      if (error) {
        console.log(
          "🚀 ~ file: auth.js ~ line 128 ~ jwt.verify ~ error",
          error
        );
        return response.error(
          { msgCode: "INVALID_TOKEN" },
          res,
          httpStatus.StatusCodes.BAD_REQUEST
        );
      }
      req.data = decoded;
      return next();
    })
  } catch (error) {
    console.log(
      "🚀 ~ file: auth.js ~ line 38 ~ exports.verifyAuthToken=async ~ error",
      error
    );
    return response.error(
      { msgCode: "INTERNAL_SERVER_ERROR" },
      res,
      httpStatus.StatusCodes.INTERNAL_SERVER_ERROR
    );
  }
};

const isAdmin = async (req, res, next) => {
  try {
    const decode = req.data;
    if (decode.userType !== constants.USER_TYPES.ADMIN) {
      return response.error(
        { msgCode: "INVALID_TOKEN" },
        res,
        httpStatus.StatusCodes.BAD_REQUEST
      );
    }
    const findUser = await common.getById(Admin.model, req.data.userId);
    if (findUser?.status !== 1) {
      return response.error(
        { msgCode: "SESSION_EXPIRE" },
        res,
        httpStatus.StatusCodes.UNAUTHORIZED
      );
    }
    next();
  } catch (error) {
    console.log(error);
    return response.error(
      { msgCode: "INTERNAL_SERVER_ERROR" },
      res,
      httpStatus.StatusCodes.INTERNAL_SERVER_ERROR
    );
  }
};

const isAdminCreator = async (req, res, next) => {
  try {
    const decode = req.data;
    if (decode.userType !== 2 && decode.userType !== 3) {
      return response.error(
        { msgCode: "INVALID_TOKEN" },
        res,
        httpStatus.StatusCodes.BAD_REQUEST
      );
    }
    const findUser = await common.getById(User.model, decode.userId);
    if (findUser?.status !== 1) {
      return response.error(
        { msgCode: "SESSION_EXPIRE" },
        res,
        httpStatus.StatusCodes.UNAUTHORIZED
      );
    }
    next();
  } catch (error) {
    console.log("🚀 ~ file: auth.js ~ line 78 ~ isAdminCreator ~ error", error);
    return response.error(
      { msgCode: "INTERNAL_SERVER_ERROR" },
      res,
      httpStatus.StatusCodes.INTERNAL_SERVER_ERROR
    );
  }
};

const isCreator = async (req, res, next) => {
  try {
    const decode = req.data;
    if (decode.userType !== 2) {
      return response.error(
        { msgCode: "INVALID_TOKEN" },
        res,
        httpStatus.StatusCodes.BAD_REQUEST
      );
    }
    next();
  } catch (error) {
    console.log("🚀 ~ file: auth.js ~ line 99 ~ isCreator ~ error", error);
    return response.error(
      { msgCode: "INTERNAL_SERVER_ERROR" },
      res,
      httpStatus.StatusCodes.INTERNAL_SERVER_ERROR
    );
  }
};

const isDoctor = async (req, res, next) => {
  try {
    const decode = req.data;
    if (decode.userType !== constants.USER_TYPES.DOCTOR) {
      return response.error(
        { msgCode: "INVALID_TOKEN" },
        res,
        httpStatus.StatusCodes.BAD_REQUEST
      );
    }
    const findUser = await common.getById(User.model, req.data.userId);
    if (findUser?.status !== 1) {
      return response.error(
        { msgCode: "SESSION_EXPIRE" },
        res,
        httpStatus.StatusCodes.UNAUTHORIZED
      );
    }
    next();
  } catch (error) {
    return response.error(
      { msgCode: "INTERNAL_SERVER_ERROR" },
      res,
      httpStatus.StatusCodes.INTERNAL_SERVER_ERROR
    );
  }
};

const isHospital = async (req, res, next) => {
  try {
    const decode = req.data;
    if (decode.userType !== constants.USER_TYPES.HOSPITAL) {
      return response.error(
        { msgCode: "INVALID_TOKEN" },
        res,
        httpStatus.StatusCodes.BAD_REQUEST
      );
    }
    const findUser = await common.getById(User.model, req.data.userId);
    if (findUser?.status !== 1) {
      return response.error(
        { msgCode: "SESSION_EXPIRE" },
        res,
        httpStatus.StatusCodes.UNAUTHORIZED
      );
    }
    next();
  } catch (error) {
    console.log(error);
    return response.error(
      { msgCode: "INTERNAL_SERVER_ERROR" },
      res,
      httpStatus.StatusCodes.INTERNAL_SERVER_ERROR
    );
  }
};

const isPatient = async (req, res, next) => {
  try {
    const decode = req.data;
    if (decode.userType !== constants.USER_TYPES.PATIENT) {
      return response.error(
        { msgCode: "INVALID_TOKEN" },
        res,
        httpStatus.StatusCodes.BAD_REQUEST
      );
    }
    const findUser = await common.getById(User.model, req.data.userId);
    if (findUser?.status !== 1) {
      return response.error(
        { msgCode: "SESSION_EXPIRE" },
        res,
        httpStatus.StatusCodes.UNAUTHORIZED
      );
    }
    next();
  } catch (error) {
    return response.error(
      { msgCode: "INTERNAL_SERVER_ERROR" },
      res,
      httpStatus.StatusCodes.INTERNAL_SERVER_ERROR
    );
  }
};

const isDoctorHospitalAdmin = async (req, res, next) => {
  try {
    const decode = req.data;
    if (decode.userType === constants.USER_TYPES.PATIENT) {
      return response.error(
        { msgCode: "INVALID_TOKEN" },
        res,
        httpStatus.StatusCodes.BAD_REQUEST
      );
    }
    const findUser = await common.getById(User.model, req.data.userId);
    if (findUser?.status !== 1) {
      return response.error(
        { msgCode: "SESSION_EXPIRE" },
        res,
        httpStatus.StatusCodes.UNAUTHORIZED
      );
    }
    next();
  } catch (error) {
    return response.error(
      { msgCode: "INTERNAL_SERVER_ERROR" },
      res,
      httpStatus.StatusCodes.INTERNAL_SERVER_ERROR
    );
  }
};

module.exports = {
  generateAuthJwt,
  verifyAuthToken,
  isAdmin,
  isAdminCreator,
  isCreator,
  isDoctor,
  isHospital,
  isPatient,
  isDoctorHospitalAdmin
};
