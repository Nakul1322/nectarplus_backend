const {
  Doctor,
  EstablishmentMaster,
  Hospital,
  Patient,
  User,
  Specialization,
} = require("../models");
const { ObjectId } = require("mongoose").Types;
const { sendSms, sendEmail, constants } = require("../utils/index");
const slugify = require("slugify");

const create = async (Model, profile) => {
  try {
    const data = await new Model(profile).save();
    return data;
  } catch (error) {
    return false;
  }
};

const getById = async (Model, id) => {
  try {
    const data = await Model.findById(id);
    return data;
  } catch (error) {
    return false;
  }
};

const findAll = async (Model, content, sortCondition = { createdAt: 1 }) => {
  try {
    const data = await Model.find(content).sort(sortCondition);
    return data;
  } catch (error) {
    return false;
  }
};

const findAllSurgery = async (Model, content, calculatePage, size) => {
  try {
    return await Model.find(content).skip(calculatePage).limit(size);
  } catch (error) {
    return false;
  }
};

const removeById = async (Model, id) => {
  try {
    const data = await Model.findByIdAndRemove(id);
    return data;
  } catch (error) {
    return false;
  }
};

const updateById = async (Model, id, content) => {
  try {
    const data = await Model.findByIdAndUpdate(
      id,
      { $set: content },
      { new: true }
    );
    return data;
  } catch (error) {
    return false;
  }
};

const insertManyData = async (Model, content) => {
  try {
    const data = Model.insertMany(content);
    return data;
  } catch (error) {
    return false;
  }
};

const deleteField = async (Model, condition, content) => {
  try {
    const data = await Model.updateOne(condition, { $unset: content });
    return data;
  } catch (error) {
    return false;
  }
};
const deleteTimeField = async (Model, condition, content) => {
  try {
    const data = await Model.updateOne(condition, content);
    return data[0];
  } catch (error) {
    return false;
  }
};
const deleteByField = async (Model, content) => {
  try {
    const data = await Model.findOneAndRemove(content);
    return data;
  } catch (error) {
    return false;
  }
};

const findObject = async (Model, content, sortObject = { createdAt: -1 }) => {
  try {
    const data = await Model.findOne(content).sort(sortObject);
    return data;
  } catch (error) {
    return false;
  }
};

const push = async (Model, condition, content) => {
  try {
    const data = Model.updateOne(condition, { $push: content });
    return data;
  } catch (error) {
    return false;
  }
};

const getByCondition = async (Model, condition) => {
  try {
    const data = await Model.findOne(condition).lean();
    return data;
  } catch (error) {
    return false;
  }
};

const pullObject = async (Model, condition, content) => {
  try {
    const data = Model.findOneAndUpdate(
      condition,
      { $pull: content },
      { multi: true }
    );
    return data;
  } catch (error) {
    return false;
  }
};

const updateByCondition = async (Model, condition, content, userType = 3) => {
  try {
    if (userType === constants.USER_TYPES.HOSPITAL) {
      if (content?.name || content?.address?.locality) {
        const establishmentMaster = await Model.findOne(condition);
        const slugStr =
          (content?.name || establishmentMaster?.name) +
          " " +
          (content?.address?.locality ||
            establishmentMaster?.address?.locality);
        const baseSlug = slugify(slugStr, {
          lower: true,
          remove: undefined,
          strict: true,
        });
        let slug = baseSlug;
        let slugCount = 1;

        while (true) {
          const existingEstablishment = await Model.findOne({
            profileSlug: slug,
            _id: { $ne: establishmentMaster._id },
          });
          if (!existingEstablishment) {
            content.profileSlug = slug;
            break;
          }
          slug = `${baseSlug}-${slugCount}`;
          slugCount++;
        }
      }
    }
    if (userType === constants.USER_TYPES.DOCTOR) {
      const isSpecializationValid =
        content && content.specialization && content.specialization.length > 0;
      if (content.fullName) {
        const user = await Model.findOne(condition);
        const doctor = await Doctor.model.findOne({ userId: user?._id });
        const specialization = await Specialization.model.findOne({
          _id: doctor.specialization[0],
        });
        const slugStr = content?.fullName + " " + specialization?.name;
        const baseSlug = slugify(slugStr, {
          lower: true,
          remove: undefined,
          strict: true,
        });
        let slug = baseSlug;
        let slugCount = 1;

        while (true) {
          const existingDoctor = await Model.findOne({
            profileSlug: slug,
            _id: { $ne: doctor?._id },
          });
          if (!existingDoctor) {
            await Doctor.model.findByIdAndUpdate(doctor?._id, {
              $set: { profileSlug: slug },
            });
            break;
          }
          slug = `${baseSlug}-${slugCount}`;
          slugCount++;
        }
      } else if (isSpecializationValid) {
        const doctor = await Model.findOne(condition);
        const user = await User.model.findById(doctor?.userId);
        const specializationMaster = await Specialization.model.findOne({
          _id: content.specialization[0],
        });
        const slugStr = user?.fullName + " " + specializationMaster?.name;
        const baseSlug = slugify(slugStr, {
          lower: true,
          remove: undefined,
          strict: true,
        });
        let slug = baseSlug;
        let slugCount = 1;

        while (true) {
          const existingDoctor = await Model.findOne({
            profileSlug: slug,
            _id: { $ne: doctor?._id },
          });
          if (!existingDoctor) {
            await Doctor.model.findByIdAndUpdate(doctor?._id, {
              $set: { profileSlug: slug },
            });
            break;
          }
          slug = `${baseSlug}-${slugCount}`;
          slugCount++;
        }
      }
    }
    const data = await Model.updateOne(
      condition,
      { $set: content },
      { new: true }
    );
    return data;
  } catch (error) {
    console.log(error);
    return false;
  }
};

const updateManyByCondition = async (Model, condition, content) => {
  try {
    const data = await Model.updateMany(condition, { $set: content });
    return data;
  } catch (error) {
    return false;
  }
};

const count = async (Model, condition) => {
  try {
    const data = await Model.countDocuments(condition).lean();
    return data || 0;
  } catch (error) {
    return false;
  }
};

const getMasterData = async (
  Model,
  condition,
  sortCondition,
  offset,
  limit,
  isExport = true
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
    const data = await Model.aggregate([
      { $match: condition },
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

const adminSocialList = async (Model, condition) => {
  try {
    return await Model.aggregate([
      { $match: condition },
      { $project: { socialMediaId: 1, url: 1, _id: 1 } },
      {
        $lookup: {
          from: "socialmedias",
          localField: "socialMediaId",
          foreignField: "_id",
          as: "master",
        },
      },
      { $unwind: { path: "$master", preserveNullAndEmptyArrays: false } },
    ]);
  } catch (error) {
    return false;
  }
};

const getSendMailDoctor = async (doctorId) => {
  try {
    const data = await Doctor.model.aggregate([
      { $match: { _id: new ObjectId(doctorId) } },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: { path: "$user", preserveNullAndEmptyArrays: false } },
      {
        $lookup: {
          from: "specializations",
          localField: "specialization",
          foreignField: "_id",
          as: "specializationMaster",
        },
      },
    ]);
    return data[0];
  } catch (error) {
    return false;
  }
};

const getSendMailEstablishment = async (establishmentId) => {
  try {
    const data = await EstablishmentMaster.model.aggregate([
      { $match: { _id: new ObjectId(establishmentId) } },
      {
        $lookup: {
          from: "hospitals",
          localField: "hospitalId",
          foreignField: "_id",
          as: "hospital",
        },
      },
      { $unwind: { path: "$hospital", preserveNullAndEmptyArrays: false } },
      {
        $lookup: {
          from: "statemasters",
          localField: "address.state",
          foreignField: "_id",
          as: "stateMaster",
        },
      },
    ]);
    return data[0];
  } catch (error) {
    return false;
  }
};

const removeAllSessionByCondition = async (Model, content) => {
  try {
    const data = await Model.deleteMany(content);
    return data;
  } catch (error) {
    return false;
  }
};

const findOTPandDeleteByID = async (
  Model,
  content,
  sortObject = { createdAt: -1 }
) => {
  try {
    const data = await Model.findOne(content).sort(sortObject);
    if (data) await common.removeById(OTP.model, data._id);
    return data;
  } catch (error) {
    return false;
  }
};

const findEmail = async (content) => {
  try {
    const checkForDoctor = await Doctor.model.countDocuments(content);
    const checkForHospital = await Hospital.model.countDocuments(content);
    const checkForPatient = await Patient.model.countDocuments(content);
    return checkForDoctor || checkForHospital || checkForPatient > 0;
  } catch (error) {
    return false;
  }
};

const sendOtpPhoneOrEmail = async (phone, email, userId, countryCode, otp) => {
  try {
    let responseStatus;
    if (phone) {
      const sendOtp = await sendSms.sendOtp(
        phone,
        countryCode,
        { OTP: otp },
        constants.SMS_TEMPLATES.OTP
      );
      responseStatus = sendOtp;
    } else {
      const { fullName } = await common.getById(User.model, userId);
      const sendMail = await sendEmail.sendEmail(
        email,
        constants.EMAIL_TEMPLATES.EMAIL_OTP,
        {
          otp,
          user: fullName,
        }
      );
      responseStatus = sendMail;
    }
    return responseStatus;
  } catch (error) {
    return false;
  }
};

module.exports = {
  create,
  getById,
  findAll,
  findAllSurgery,
  removeById,
  updateById,
  push,
  insertManyData,
  deleteByField,
  findObject,
  getByCondition,
  pullObject,
  updateByCondition,
  count,
  updateManyByCondition,
  getMasterData,
  deleteField,
  deleteTimeField,
  adminSocialList,
  getSendMailEstablishment,
  getSendMailDoctor,
  removeAllSessionByCondition,
  findOTPandDeleteByID,
  findEmail,
  sendOtpPhoneOrEmail,
};
