const { User, Story,Admin } = require("../models/index");
const { getPagination, getSort, helperPassword } = require("../utils/index");
const common = require("../services/common")
const config = require("../config/index");
const { isValidObjectId } = require('mongoose');
const { Types } = require('mongoose');

const findUser = async (phone, userType) => {
  try {
    let query = { phone };
    if (userType) {
      query.userType = userType;
    }
    const data = await User.model.findOne(query);
    return data;
  } catch (error) {
    return false;
  }
};

const findAdmin = async (email) => {
  try {
    const data = await Admin.model.findOne({ email }).lean();
    return data;
  } catch (error) {
    return false;
  }
};


const adminCreatorLogin = async (data) => {
  try {
    //find user
    const isUserExist = await findUser(data.email);
    if (!isUserExist) {
      return 0;
    }
    //verify password
    const isMatch = await helperPassword.comparePassword(
      data.password,
      isUserExist.password
    );
    if (!isMatch) {
      return 1;
    }
    //data for token generation
    const content = {
      user_id: isUserExist._id,
      user_type: isUserExist.user_type,
      device_id: data.device_id,
      device_token: data.device_token,
      device_type: data.device_type,
      expires_in: config.expireIn,
    };
    return content;
  } catch (error) {
    return false;
  }
};

const userLogin = async (data) => {
  try {
    //check the ObjectId coming is valid or not
    if (!isValidObjectId(data.story_id)) {
      return 0;
    }
    //find Story
    const findStory = await common.getById(Story.model, data.story_id);
    if (!findStory) {
      return 1;
    }
    //find User
    const isUserExist = await findDeviceId(data.device_id);
    if (!isUserExist) {
      //if not then create
      const content = await createUser(data);
      return content;
    }
    //data to be used to generate token
    const content = {
      story_id: data.story_id,
      user_id: isUserExist._id,
      user_type: isUserExist.user_type,
      device_id: data.device_id,
      device_type: data.device_type,
      device_token: data.device_token,
      expires_in: config.expireIn,
    };
    return content;
  } catch (error) {
    return false;
  }
};

const createUser = async (data) => {
  try {
    const profile = {
      device_id: data.device_id,
      device_type: data.device_type,
      device_token: data.device_token,
    };
    //create user
    const user = await common.create(User.model, {
      user_type: 1,
      device_info: profile,
    });

    //data to generate token
    const content = {
      story_id: data.story_id,
      user_id: user._id,
      user_type: user.user_type,
      device_id: data.device_id,
      device_type: data.device_type,
      device_token: data.device_token,
      expires_in: config.expireIn,
    };
    return content;
  } catch (error) {
    return false;
  }
};

const updateOne = async (phone, content) => {
  try {
    const data = await User.model.findOneAndUpdate(
      { phone },
      { $set: content },
      { new: true }
    );
    return data;
  } catch (error) {
    return false;
  }
};
const updatePassword = async (condition, content) => {
  try {
    const data = await Admin.model.findOneAndUpdate(
      condition,
      { $set: content },
      { new: true }
    );
    return data;
  } catch (error) {
    return false;
  }
};
const findByUserType = async (id, content, page, size, sort, order, search) => {
  try {
    const value = parseInt(content);

    //pagination
    const limitOffset = getPagination(page, size);
    const skip = Number(limitOffset.offset);
    const limit = Number(limitOffset.limit);

    let creator = {}
    if (id) {
      creator = { _id: Types.ObjectId(id) }
    }
    //sorting
    const sorting = getSort(sort, order);

    //grouping
    const group = {
      _id: '$_id',
      creator_id: { '$first': '$_id' },
      creator_name: { '$first': '$name' },
      email: { $first: '$email' },
      status: { $first: '$status' },
      created_at: { $first: '$createdAt' }
    }

    const data = await User.model
      .aggregate([
        { $match: { user_type: value } },
        { $match: { status: { $ne: 0 } } },
        { $match: creator },
        { $group: group },
        { $unset: ['_id'] },
        {
          $facet: {
            count: [{ $count: 'count' }],
            data: [{ $sort: sorting }, { $skip: skip || 0 }, { $limit: limit || 10 }],
          },
        },
        {
          $addFields: {
            count: { $arrayElemAt: ['$count.count', 0] },
          },
        },
      ])

    return data;
  } catch (error) {
    return false;
  }
};

const findToken = async (token) => {
  try {
    const data = await User.model.findOne({ "device_info.jwt": token });
    return data;
  } catch (error) {
    return false;
  }
};

const findDeviceIdAndUpdate = async (id, update) => {
  try {
    const data = await User.model.findOneAndUpdate(
      { "device_info.device_id": id },
      { $set: { "device_info.$": update } },
      { new: true }
    );
    return data;
  } catch (error) {
    return false;
  }
};

const findDeviceId = async (id) => {
  try {
    const data = await User.model.findOne({ "device_info.device_id": id });
    return data;
  } catch (error) {
    return false;
  }
};

const findDeviceIdAndEmail = async (email, id) => {
  try {
    const data = await User.model.findOne({
      $or: [{ email: email }, { "device_info.device_id": id }],
    });

    return data;
  } catch (error) {
    return false;
  }
};

const patientSignup = async (data) => {
  try {
    //find user
    const findUser = await User.model.findUser(mobile_number && !otp)
    if (findUser) {
      return response.error(
        { msgCode: "ALREADY_REGISTERED" },
        res,
        httpStatus.FORBIDDEN
      );
    }
    //sending OTP to mobile number via selected mode and desired message[call or sms]
    const message = `OTP sent to ${mobile_number}: `
    const otp = sendOTP(mobile_number, mode, message)
    const content = {
      name: data.name,
      mobile_number: data.mobile_number.replace(/[-\s]/g, ''),
      otp,
      user_type: 1,
    };
    return content;
  } catch (error) {
    return false;
  }
};

const doctorSignup = async (data) => {
  try {
    //find user
    const findUser = await Doctor.model.findUser(data.profile.mobile_number && !data.profile.otp)
    if (findUser) {
      return response.error(
        { msgCode: "ALREADY_REGISTERED" },
        res,
        httpStatus.FORBIDDEN
      );
    }
    //sending OTP to mobile number via selected mode and desired message[call or sms]
    const message = `OTP sent to ${mobile_number}: `
    const otp = sendOTP(mobile_number, mode, message)
    const content = {
      profile: data.profile,
      verification: data.verification,
      otp,
      profileDetails: data.profileDetails,
    };
    return content;
  } catch (error) {
    return false;
  }
};

const getDoctorSettingsByID = async (Model, condition, recordKey) => {
  try {
    const projectionKey = { _id: 1 };
    if (condition[`${recordKey}._id`]) projectionKey[`${recordKey}.$`] = 1;
    const data = await Model.findOne(condition, projectionKey).lean();
    return data;
  } catch (error) {
    return false;
  }
};

module.exports = {
  findUser,
  findAdmin,
  updateOne,
  updatePassword,
  findByUserType,
  findToken,
  findDeviceIdAndUpdate,
  findDeviceId,
  findDeviceIdAndEmail,
  adminCreatorLogin,
  userLogin,
  getDoctorSettingsByID
};
