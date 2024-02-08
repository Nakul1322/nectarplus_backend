const { User, Story, Admin } = require("../models/index");
const { constants } = require("../utils/constant");
const { getPagination, getSort, helperPassword } = require("../utils/index");
const common = require("../services/common");
const config = require("../config/index");
const { isValidObjectId } = require("mongoose");
const { Types } = require("mongoose");

const findUser = async (phone, countryCode, userType) => {
  try {
    let query = { phone, countryCode, isDeleted: false };
    if (userType) {
      query.userType = { $in: userType };
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

    let creator = {};
    if (id) {
      creator = { _id: Types.ObjectId(id) };
    }
    //sorting
    const sorting = getSort(sort, order);

    //grouping
    const group = {
      _id: "$_id",
      creator_id: { $first: "$_id" },
      creator_name: { $first: "$name" },
      email: { $first: "$email" },
      status: { $first: "$status" },
      created_at: { $first: "$createdAt" },
    };

    const data = await User.model.aggregate([
      { $match: { user_type: value } },
      { $match: { status: { $ne: 0 } } },
      { $match: creator },
      { $group: group },
      { $unset: ["_id"] },
      {
        $facet: {
          count: [{ $count: "count" }],
          data: [
            { $sort: sorting },
            { $skip: skip || 0 },
            { $limit: limit || 10 },
          ],
        },
      },
      {
        $addFields: {
          count: { $arrayElemAt: ["$count.count", 0] },
        },
      },
    ]);

    return data[0];
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
    const findUser = await User.model.findUser(mobile_number && !otp);
    if (findUser) {
      return response.error(
        { msgCode: "ALREADY_REGISTERED" },
        res,
        httpStatus.FORBIDDEN
      );
    }
    //sending OTP to mobile number via selected mode and desired message[call or sms]
    // const message = `OTP sent to ${mobile_number}: `;
    const otp = sendOTP(mobile_number, mode, message);
    const content = {
      name: data.name,
      mobile_number: data.mobile_number.replace(/[-\s]/g, ""),
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
    const findUser = await Doctor.model.findUser(
      data.profile.mobile_number && !data.profile.otp
    );
    if (findUser) {
      return response.error(
        { msgCode: "ALREADY_REGISTERED" },
        res,
        httpStatus.FORBIDDEN
      );
    }
    //sending OTP to mobile number via selected mode and desired message[call or sms]
    // const message = `OTP sent to ${mobile_number}: `;
    const otp = sendOTP(mobile_number, mode, message);
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

const doctorList = async (
  condition,
  sortCondition,
  offset,
  limit,
  searchQuery,
  conditionDoctor,
  isExport = false
) => {
  try {
    const facetObject = {
      count: [{ $count: "total" }],
      data: [{ $sort: sortCondition }],
    };
    if (!isExport) {
      facetObject.data.push({ $skip: offset });
      facetObject.data.push({ $limit: limit });
    }
    const matchQuery = {
      userType: constants.USER_TYPES.DOCTOR,
      ...condition,
      ...conditionDoctor,
      $or: [
        {
          fullName: { $regex: new RegExp(searchQuery, "i") },
        },
        {
          phone: { $regex: new RegExp(searchQuery, "i") },
        },
        {
          "doctor.email": { $regex: new RegExp(searchQuery, "i") },
        },
      ],
    };
    const data = await User.model.aggregate([
      {
        $lookup: {
          from: "doctors",
          localField: "_id",
          foreignField: "userId",
          as: "doctor",
        },
      },
      {
        $unwind: {
          path: "$doctor",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "establishmenttimings",
          localField: "doctor._id",
          foreignField: "doctorId",
          as: "establishmentTiming",
        },
      },
      {
        $addFields: {
          establishmentTimingData: {
            $arrayElemAt: ["$establishmentTiming", 0],
          },
        },
      },
      {
        $lookup: {
          from: "establishmentmasters",
          localField: "establishmentTimingData.establishmentId",
          foreignField: "_id",
          as: "establishmentMaster",
        },
      },
      {
        $unwind: {
          path: "$establishmentMaster",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "specializations",
          localField: "doctor.specialization",
          foreignField: "_id",
          as: "specialization",
        },
      },
      {
        $match: matchQuery,
      },
      {
        $project: {
          _id: 1,
          createdAt: 1,
          status: { $ifNull: [`$status`, constants.NA] },
          doctorPhone: { $ifNull: [`$phone`, constants.NA] },
          doctorName: { $ifNull: [`$fullName`, constants.NA] },
          doctorProfilePic: { $ifNull: [`$doctor.profilePic`, constants.NA] },
          doctorSpecialization: { $ifNull: [`$specialization`, constants.NA] },
          doctorAddress: {
            landmark: { $ifNull: ["$establishmentMaster.address.landmark", constants.NA] },
            country: { $ifNull: ["$establishmentMaster.address.country", constants.NA] },
            city: { $ifNull: ["$establishmentMaster.address.city", constants.NA] },
            state: { $ifNull: ["$establishmentMaster.address.state", constants.NA] },
            pincode: { $ifNull: ["$establishmentMaster.address.pincode", constants.NA] }, 
            locality: { $ifNull: [ "$establishmentMaster.address.locality", constants.NA] },
          },
          identityProof: { $ifNull: [`$doctor.identityProof`, constants.NA] },
          medicalProof: { $ifNull: [`$doctor.medicalProof`, constants.NA] },
          degree: { $ifNull: [`$doctor.education`, constants.NA] },
          lowerDoctorName: { $toLower: `$fullName` },
          statusUser: { $ifNull: [`$status`, constants.NA] },
          isVerifed: { $ifNull: [`$doctor.isVerified`, constants.NA] },
          isDeleted: { $ifNull: [`$isDeleted`, constants.NA] },
        },
      },
      {
        $facet: facetObject,
      },
      {
        $addFields: {
          count: {
            $cond: {
              if: { $eq: ["$count", []] },
              then: 0,
              else: {
                $cond: {
                  if: { $eq: ["$data", []] },
                  then: 0,
                  else: { $arrayElemAt: ["$count.total", 0] },
                },
              },
            },
          },
        },
      },
    ]);
    return data[0];
  } catch (error) {
    return false;
  }
};

const patientList = async (
  condition,
  sortCondition,
  offset,
  limit,
  searchQuery,
  isExport = false
) => {
  try {
    const facetObject = {
      count: [{ $count: "total" }],
      data: [{ $sort: sortCondition }],
    };
    if (!isExport) {
      facetObject.data.push({ $skip: offset });
      facetObject.data.push({ $limit: limit });
    }
    const data = await User.model.aggregate([
      { $match: condition },
      {
        $lookup: {
          from: "patients",
          localField: "_id",
          foreignField: "userId",
          as: "patient",
        },
      },
      {
        $unwind: {
          path: "$patient",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $addFields: {
          age: {
            $floor: {
              $divide: [
                {
                  $subtract: [new Date(), "$patient.dob"],
                },
                1000 * 60 * 60 * 24 * 365,
              ],
            },
          },
        },
      },
      {
        $match: {
          userType: constants.USER_TYPES.PATIENT,
          $or: [
            {
              fullName: { $regex: new RegExp(searchQuery, "i") },
            },
            {
              "patient.email": { $regex: new RegExp(searchQuery, "i") },
            },
            {
              phone: { $regex: new RegExp(searchQuery, "i") },
            },
          ],
        },
      },
      {
        $project: {
          _id: 1,
          createdAt: 1,
          status: { $ifNull: [`$patient.isVerified`, constants.NA] },
          patientProfilePic: { $ifNull: [`$patient.profilePic`, constants.NA] },
          patientGender: { $ifNull: [`$patient.gender`, constants.NA] },
          patientName: { $ifNull: [`$fullName`, constants.NA] },
          patientPhone: { $ifNull: [`$phone`, constants.NA] },
          patientAddress: { $ifNull: [`$patient.address`, constants.NA] },
          isDeleted: { $ifNull: [`$isDeleted`, constants.NA] },
          statusUser: { $ifNull: [`$status`, constants.NA] },
          lowerPatientName: { $toLower: `$fullName` },
        },
      },
      {
        $facet: facetObject,
      },
      {
        $addFields: {
          count: {
            $cond: {
              if: { $eq: ["$count", []] },
              then: 0,
              else: {
                $cond: {
                  if: { $eq: ["$data", []] },
                  then: 0,
                  else: { $arrayElemAt: ["$count.total", 0] },
                },
              },
            },
          },
        },
      },
    ]);
    return data[0];
  } catch (error) {
    console.log(error);
    return false;
  }
};

const hospitalList = async (
  condition,
  sortCondition,
  offset,
  limit,
  searchQuery,
  conditionHospital,
  isExport = false
) => {
  try {
    const matchQuery = {
      userType: constants.USER_TYPES.HOSPITAL,
      ...condition,
      ...conditionHospital,
      $or: [
        {
          "establishmentMaster.name": {
            $regex: new RegExp(searchQuery, "i"),
          },
        },
        {
          phone: { $regex: new RegExp(searchQuery, "i") },
        },
      ],
    };
    const facetObject = {
      count: [{ $count: "total" }],
      data: [{ $sort: sortCondition }],
    };
    if (!isExport) {
      facetObject.data.push({ $skip: offset });
      facetObject.data.push({ $limit: limit });
    }
    const data = await User.model.aggregate([
      {
        $lookup: {
          from: "hospitals",
          localField: "_id",
          foreignField: "userId",
          as: "hospital",
        },
      },
      {
        $unwind: {
          path: "$hospital",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "hospitaltypes",
          localField: "hospital.hospitalType",
          foreignField: "_id",
          as: "hospitalType",
        },
      },
      {
        $lookup: {
          from: "establishmentmasters",
          localField: "hospital._id",
          foreignField: "hospitalId",
          as: "establishmentMaster",
        },
      },
      {
        $unwind: {
          path: "$establishmentMaster",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $match: matchQuery,
      },
      {
        $project: {
          _id: 1,
          createdAt: 1,
          statusUser: { $ifNull: [`$status`, constants.NA] },
          isDeleted: { $ifNull: [`$isDeleted`, constants.NA] },
          status: { $ifNull: [`$hospital.isVerified`, constants.NA] },
          phone: { $ifNull: [`$phone`, constants.NA] },
          establishmentName: {
            $ifNull: [`$establishmentMaster.name`, constants.NA],
          },
          hospitalProfilePic: {
            $ifNull: [`$hospital.profilePic`, constants.NA],
          },
          address: { $ifNull: [`$establishmentMaster.address`, constants.NA] },
          hospitalType: { $ifNull: [`$hospitalType`, constants.NA] },
          totalDoctors: { $ifNull: [`$hospital.totalDoctor`, 0, constants.NA] },
          lowerEstablishmentName: { $toLower: `$establishmentMaster.name` },
        },
      },
      {
        $facet: facetObject,
      },
      {
        $addFields: {
          count: {
            $cond: {
              if: { $eq: ["$count", []] },
              then: 0,
              else: {
                $cond: {
                  if: { $eq: ["$data", []] },
                  then: 0,
                  else: { $arrayElemAt: ["$count.total", 0] },
                },
              },
            },
          },
        },
      },
    ]);
    return data[0];
  } catch (error) {
    return false;
  }
};

const userWithDoctor = async (condition) => {
  try {
    const data = await User.model.aggregate([
      { $match: condition },
      {
        $lookup: {
          from: "doctors",
          let: { userId: "$_id" },
          pipeline: [
            { $match: { $expr: { $eq: ["$userId", "$$userId"] } } },
            {
              $project: {
                email: 1,
                specialization: 1,
              },
            },
          ],
          as: "doctorData",
        },
      },
      {
        $addFields: { doctorData: { $arrayElemAt: ["$doctorData", 0] } },
      },
      // {
      //   $lookup: {
      //     from: "specializations",
      //     localField: "doctorData.specialization",
      //     foreignField: "_id",
      //     as: "specialization",
      //   },
      // },
      // {
      //   $unwind: {
      //     path: "$specialization",
      //     preserveNullAndEmptyArrays: true,
      //   },
      // },
      {
        $project: {
          phone: 1,
          fullName: 1,
          email: "$doctorData.email",
          specility: "$doctorData.specialization",
        },
      },
    ]);
    return data[0];
  } catch (error) {
    console.log(error);
    return false;
  }
};

const doctorDetailReject = async (condition, statusCondition) => {
  try {
    const data = await User.model.aggregate([
      { $match: condition },
      {
        $lookup: {
          from: "doctors",
          localField: "_id",
          foreignField: "userId",
          as: "doctor",
        },
      },
      {
        $unwind: {
          path: "$doctor",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "specializations",
          localField: "doctor.specialization",
          foreignField: "_id",
          as: "specialization",
        },
      },
      {
        $lookup: {
          from: "establishmenttimings",
          localField: "doctor._id",
          foreignField: "doctorId",
          as: "establishmentTiming",
        },
      },
      {
        $unwind: {
          path: "$establishmentTiming",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $match: { "doctor.isVerified": constants.PROFILE_STATUS.REJECT },
      },
      {
        $project: {
          _id: 1,
          createdAt: 1,
          status: { $ifNull: [`$doctor.isVerified`, constants.NA] },
          doctorName: { $ifNull: [`$fullName`, constants.NA] },
          doctorProfilePic: { $ifNull: [`$doctor.profilePic`, constants.NA] },
          doctorSpecialization: { $ifNull: [`$specialization`, constants.NA] },
          doctorMedicalRegistration: {
            $ifNull: [`$doctor.medicalRegistration`, constants.NA],
          },
          identityProof: { $ifNull: [`$doctor.identityProof`, constants.NA] },
          medicalProof: { $ifNull: [`$doctor.medicalProof`, constants.NA] },
          establishmentProof: {
            $ifNull: [`$establishmentTiming.establishmentProof`, constants.NA],
          },
          education: { $ifNull: [`$doctor.education`, constants.NA] },
          rejectReason: { $ifNull: [`$doctor.rejectReason`, constants.NA] },
        },
      },
    ]);
    return data[0];
  } catch (error) {
    console.log(error);
    return false;
  }
};

const hospitalDetailReject = async (condition, statusCondition) => {
  try {
    const data = await User.model.aggregate([
      { $match: condition },
      {
        $lookup: {
          from: "hospitals",
          localField: "_id",
          foreignField: "userId",
          as: "hospital",
        },
      },
      {
        $unwind: {
          path: "$hospital",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "hospitaltypes",
          localField: "hospital.hospitalType",
          foreignField: "_id",
          as: "hospitalType",
        },
      },
      {
        $lookup: {
          from: "establishmentmasters",
          localField: "hospital._id",
          foreignField: "hospitalId",
          as: "establishmentMaster",
        },
      },
      {
        $unwind: {
          path: "$establishmentMaster",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $match: { "hospital.isVerified": constants.PROFILE_STATUS.REJECT },
      },
      {
        $project: {
          _id: 1,
          createdAt: 1,
          status: { $ifNull: [`$hospital.isVerified`, constants.NA] },
          establishmentName: {
            $ifNull: [`$establishmentMaster.name`, constants.NA],
          },
          hospitalProfilePic: {
            $ifNull: [`$hospital.profilePic`, constants.NA],
          },
          hospitalType: { $ifNull: [`$hospitalType`, constants.NA] },
          rejectReason: { $ifNull: [`$hospital.rejectReason`, constants.NA] },
          establishmentProof: {
            $ifNull: [
              `$establishmentMaster.establishmentProof`,
              `$hospital.establishmentProof`,
              constants.NA,
            ],
          },
        },
      },
    ]);
    return data[0];
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
  getDoctorSettingsByID,
  doctorList,
  patientList,
  hospitalList,
  userWithDoctor,
  hospitalDetailReject,
  doctorDetailReject,
};
