const {
  User,
  Appointment,
  SurgeryEnquiry,
  EstablishmentTiming,
  Admin,
  Specialization,
} = require("../models/index");
const { constants } = require("../utils/constant");

const registrationCountByDate = async (condition) => {
  try {
    const listForCountByDate = await User.model.aggregate([
      { $match: condition },
      {
        $unwind: {
          path: "$userType",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $addFields: {
          adjustedDate: {
            $add: ["$createdAt", 5.5 * 60 * 60 * 1000],
          },
        },
      },
      {
        $addFields: {
          formattedDate: {
            $dateToString: {
              format: "%Y-%d-%m",
              date: "$adjustedDate",
            },
          },
          week: { $week: "$adjustedDate" },
        },
      },
      {
        $group: {
          _id: {
            createdAt: "$formattedDate",
            userType: "$userType",
            week: "$week",
          },
          count: { $sum: 1 },
        },
      },
      {
        $group: {
          _id: "$_id.createdAt",
          countByUserType: {
            $push: {
              userType: "$_id.userType",
              count: "$count",
            },
          },
          totalCount: { $sum: "$count" },
          week: { $first: "$_id.week" },
        },
      },
      { $sort: { week: 1 } },
    ]);
    const totalCountUserType = await User.model.aggregate([
      { $match: condition },
      {
        $unwind: {
          path: "$userType",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $group: {
          _id: "$userType",
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);
    return { listForCountByDate, totalCountUserType };
  } catch (error) {
    console.log(error);
    return false;
  }
};

const specializationMaster = async (condition) => {
  try {
    const specializationMasterList = await Specialization.model.aggregate([
      { $match: { name: { $in: condition }, isDeleted: false } },
    ]);
    const specializationMasterArray = [];
    specializationMasterList.map((specialization) =>
      specializationMasterArray.push(specialization._id)
    );
    return { specializationMasterArray, specializationMasterList };
  } catch (error) {
    console.log(error);
    return false;
  }
};

const appointmentSurgeryLeadList = async (condition, typeOfList) => {
  try {
    const { specializationMasterArray } = await specializationMaster(
      constants.arrayForSpecialization
    );
    const model =
      typeOfList === constants.ADMIN_DASHBOARD_TYPE_LIST.APPOINTMENT
        ? Appointment.model
        : SurgeryEnquiry.model;
    const appointmentPipeline = [
      {
        $lookup: {
          from: "doctors",
          localField: "doctorId",
          foreignField: "_id",
          as: "doctor",
        },
      },
      {
        $unwind: {
          path: "$doctor",
          preserveNullAndEmptyArrays: false,
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
        $unwind: { path: "$specialization", preserveNullAndEmptyArrays: false },
      },
      { $match: { "specialization._id": { $in: specializationMasterArray } } },
      { $match: condition },
      {
        $addFields: {
          adjustedDate: {
            $add: ["$date", 5.5 * 60 * 60 * 1000],
          },
        },
      },
      {
        $addFields: {
          formattedDate: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$adjustedDate",
            },
          },
          week: { $week: "$adjustedDate" },
        },
      },
      {
        $group: {
          _id: {
            createdAt: "$formattedDate",
            specialization: "$specialization.name",
            specializationId: "$specialization._id",
            week: "$week",
          },
          count: { $sum: 1 },
        },
      },
      {
        $group: {
          _id: "$_id.createdAt",
          appointmentBySpecialization: {
            $push: {
              name: "$_id.specialization",
              _id: "$_id.specializationId",
              count: "$count",
            },
          },
          week: { $first: "$_id.week" },
          totalCount: { $sum: "$count" },
        },
      },
      { $sort: { _id: 1 } },
    ];
    const surgeryEnquiryPipeline = [
      { $match: condition },
      {
        $lookup: {
          from: "surgerymasters",
          localField: "treatmentType",
          foreignField: "_id",
          as: "surgeryMaster",
        },
      },
      {
        $unwind: {
          path: "$surgeryMaster",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $addFields: {
          adjustedDate: {
            $add: ["$createdAt", 5.5 * 60 * 60 * 1000],
          },
        },
      },
      {
        $addFields: {
          formattedDate: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$adjustedDate",
            },
          },
        },
      },
      {
        $group: {
          _id: "$formattedDate",
          totalCount: { $sum: 1 },
        },
      },
      {
        $addFields: {
          count: { $sum: "_id.totalCount" },
        },
      },
      { $sort: { _id: 1 } },
    ];
    const pipeline =
      typeOfList === constants.ADMIN_DASHBOARD_TYPE_LIST.APPOINTMENT
        ? appointmentPipeline
        : surgeryEnquiryPipeline;
    return await model.aggregate(pipeline);
  } catch (error) {
    console.log(error);
    return false;
  }
};

const registrationCountByUserType = async (condition) => {
  try {
    return await User.model.aggregate([
      { $match: condition },
      {
        $unwind: {
          path: "$userType",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $addFields: {
          adjustedDate: {
            $add: ["$createdAt", 5.5 * 60 * 60 * 1000],
          },
        },
      },
      {
        $addFields: {
          formattedDate: {
            $dateToString: {
              format: "%Y-%d-%m",
              date: "$adjustedDate",
            },
          },
        },
      },
      {
        $group: {
          _id: "$userType",
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]);
  } catch (error) {
    console.log(error);
    return false;
  }
};

const appointmentListByDateRangeAndSpecialization = async (condition) => {
  try {
    return await Appointment.model.aggregate([
      {
        $lookup: {
          from: "doctors",
          localField: "doctorId",
          foreignField: "_id",
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
        $unwind: { path: "$specialization", preserveNullAndEmptyArrays: false },
      },
      { $match: condition },
      {
        $group: {
          _id: "$specialization.name",
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 1,
          count: 1,
        },
      },
      { $sort: { count: -1 } },
    ]);
  } catch (error) {
    console.log(error);
    return false;
  }
};

const adminDoctorList = async (condition) => {
  try {
    return await EstablishmentTiming.model.aggregate([
      {
        $match: condition,
      },
      {
        $lookup: {
          from: "establishmentmasters",
          localField: "establishmentId",
          foreignField: "_id",
          as: "establishmentData",
        },
      },
      {
        $unwind: {
          path: "$establishmentData",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "hospitals",
          localField: "establishmentData.hospitalId",
          foreignField: "_id",
          as: "hospitalData",
        },
      },
      {
        $unwind: { path: "$hospitalData", preserveNullAndEmptyArrays: true },
      },
      {
        $lookup: {
          from: "users",
          localField: "hospitalData.userId",
          foreignField: "_id",
          as: "userData",
        },
      },
      {
        $unwind: {
          path: "$userData",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $match: {
          "userData.isDeleted": false,
          "userData.status": constants.PROFILE_STATUS.ACTIVE,
          "hospitalData.steps": constants.PROFILE_STEPS.COMPLETED,
          "hospitalData.isVerified": constants.PROFILE_STATUS.APPROVE,
        },
      },
      {
        $lookup: {
          from: "doctors",
          localField: "doctorId",
          foreignField: "_id",
          as: "doctorData",
        },
      },
      {
        $unwind: { path: "$doctorData", preserveNullAndEmptyArrays: true },
      },
      {
        $lookup: {
          from: "users",
          localField: "doctorData.userId",
          foreignField: "_id",
          as: "doctorUserData",
        },
      },
      {
        $unwind: {
          path: "$doctorUserData",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $match: {
          "doctorUserData.isDeleted": false,
          "doctorUserData.status": constants.PROFILE_STATUS.ACTIVE,
          "doctorData.steps": constants.PROFILE_STEPS.COMPLETED,
          "doctorData.isVerified": constants.PROFILE_STATUS.APPROVE,
        },
      },
      {
        $group: {
          _id: {
            doctorId: "$doctorId",
            name: "$doctorUserData.fullName",
          },
        },
      },
      {
        $project: {
          name: `$_id.name`,
          doctorId: `$_id.doctorId`,
          _id: 0,
        },
      },
      {
        $addFields: {
          lowerName: { $toLower: `$name` },
        },
      },
      { $sort: { lowerName: 1 } },
    ]);
  } catch (error) {
    console.log(error);
    return false;
  }
};

const superAdminList = async (condition) => {
  try {
    const data = await Admin.model.aggregate([
      { $match: { userType: 4 } },
      { $project: { _id: 1 } },
    ]);
    return data.map((admin) => {
      return admin._id;
    });
  } catch (error) {
    console.log(error);
    return false;
  }
};

module.exports = {
  registrationCountByDate,
  appointmentSurgeryLeadList,
  registrationCountByUserType,
  appointmentListByDateRangeAndSpecialization,
  adminDoctorList,
  superAdminList,
  specializationMaster
};
