const jwt = require("jsonwebtoken");
const { env } = process;
const secretKey = env.SECRET;
const API_KEY = env.API_KEY;
const response = require("../utils/response");
const httpStatus = require("http-status-codes");
const { common } = require("../services/index");
const { User, Admin, Session } = require("../models/index");
const { constants } = require("../utils/constant");

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
      return response.error(
        { msgCode: "TOKEN_REQUIRED" },
        res,
        httpStatus.StatusCodes.UNAUTHORIZED
      );
    }
    token = token.replace(/^Bearer\s+/, "");
    jwt.verify(token, secretKey, async (error, decoded) => {
      if (error) {
        console.log(error);
        return response.error(
          { msgCode: "INVALID_TOKEN" },
          res,
          httpStatus.StatusCodes.UNAUTHORIZED
        );
      }
      if (decoded?.tokenType === constants.TOKEN_TYPE.LOGIN) {
        const sessionData = await common.findObject(Session.model, {
          jwt: token,
        });
        if (!sessionData)
          return response.error(
            { msgCode: "INVALID_TOKEN" },
            res,
            httpStatus.StatusCodes.UNAUTHORIZED
          );
      }
      req.data = decoded;
      return next();
    });
  } catch (error) {
    console.log(error);
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
        { msgCode: "UNAUTHORISED_ACCESS" },
        res,
        httpStatus.StatusCodes.UNAUTHORIZED
      );
    }
    const findUser = await common.getById(Admin.model, req.data.userId);
    if (findUser?.status !== constants.PROFILE_STATUS.ACTIVE) {
      return response.error(
        { msgCode: "SESSION_EXPIRE" },
        res,
        httpStatus.StatusCodes.FORBIDDEN
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
    console.log(error);
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
    console.log(error);
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
        { msgCode: "UNAUTHORISED_ACCESS" },
        res,
        httpStatus.StatusCodes.UNAUTHORIZED
      );
    }
    const findUser = await common.getById(User.model, req.data.userId);
    if (findUser?.status !== constants.PROFILE_STATUS.ACTIVE) {
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
        { msgCode: "UNAUTHORISED_ACCESS" },
        res,
        httpStatus.StatusCodes.UNAUTHORIZED
      );
    }
    const findUser = await common.getById(User.model, req.data.userId);
    if (findUser?.status !== constants.PROFILE_STATUS.ACTIVE) {
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
        { msgCode: "UNAUTHORISED_ACCESS" },
        res,
        httpStatus.StatusCodes.UNAUTHORIZED
      );
    }
    const findUser = await common.getById(User.model, req.data.userId);
    if (findUser?.status !== constants.PROFILE_STATUS.ACTIVE) {
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

const verifyApiKey = (req, res, next) => {
  try {
    const apiKey = req?.headers["x-api-key"];
    if (!apiKey) {
      return response.error(
        { msgCode: "MISSING_API_KEY" },
        res,
        httpStatus.StatusCodes.FORBIDDEN
      );
    }

    if (apiKey !== API_KEY) {
      return response.error(
        { msgCode: "INVALID_API_KEY" },
        res,
        httpStatus.StatusCodes.FORBIDDEN
      );
    }
    return next();
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
  isDoctorHospitalAdmin,
  verifyApiKey,
};
