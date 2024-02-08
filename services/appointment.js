const {
  Appointment,
  AppointmentFeedback,
  EstablishmentTiming,
} = require("../models/index");
const { constants } = require("../utils/constant");
const { Types } = require("mongoose");

const appointmentList = async (
  conditionQuery,
  sortCondition,
  offset,
  limit,
  searchQuery,
  dateObject,
  isExport
) => {
  try {
    const { condition, filterCondition } = conditionQuery;
    if (dateObject?.fromDate)
      condition.date = { $gte: dateObject?.fromDate, $lte: dateObject?.toDate };
    else condition.date = { $lte: dateObject?.toDate };
    const facetObject = {
      count: [{ $count: "total" }],
      data: [{ $sort: sortCondition }],
    };
    if (!isExport) {
      facetObject.data.push({ $skip: offset });
      facetObject.data.push({ $limit: limit });
    }
    const data = await Appointment.model.aggregate([
      { $match: condition },
      {
        $lookup: {
          from: "establishmentmasters",
          localField: "establishmentId",
          foreignField: "_id",
          as: "establishment",
        },
      },
      {
        $unwind: {
          path: "$establishment",
          preserveNullAndEmptyArrays: true,
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
        $unwind: {
          path: "$patient",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "patient.userId",
          foreignField: "_id",
          as: "patientUser",
        },
      },
      {
        $unwind: {
          path: "$patientUser",
          preserveNullAndEmptyArrays: true,
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
          from: "users",
          localField: "doctor.userId",
          foreignField: "_id",
          as: "doctorUser",
        },
      },
      {
        $unwind: {
          path: "$doctorUser",
          preserveNullAndEmptyArrays: true,
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
        $unwind: {
          path: "$doctor",
          preserveNullAndEmptyArrays: true,
        },
      },
      { $match: filterCondition },
      {
        $match: {
          $or: [
            {
              "patientUser.fullName": { $regex: new RegExp(searchQuery, "i") },
            },
            {
              "patientUser.phone": { $regex: new RegExp(searchQuery, "i") },
            },
            {
              "doctorUser.fullName": { $regex: new RegExp(searchQuery, "i") },
            },
            {
              "doctorUser.phone": { $regex: new RegExp(searchQuery, "i") },
            },
          ],
        },
      },
      {
        $project: {
          _id: 1,
          createdAt: 1,
          slot: { $ifNull: [`$date`, constants.NA] },
          status: { $ifNull: [`$status`, constants.NA] },
          doctorPhone: { $ifNull: [`$doctorUser.phone`, constants.NA] },
          doctorName: { $ifNull: [`$doctorUser.fullName`, constants.NA] },
          doctorProfileSlug: { $ifNull: [`$doctor.profileSlug`, constants.NA] },
          patientProfilePic: { $ifNull: [`$patient.profilePic`, constants.NA] },
          patientGender: { $ifNull: [`$patient.gender`, constants.NA] },
          patientName: { $ifNull: [`$patientUser.fullName`, constants.NA] },
          patientPhone: { $ifNull: [`$patientUser.phone`, constants.NA] },
          lowerPatientName: { $toLower: `$patientUser.fullName` },
          lowerDoctorName: { $toLower: `$doctorUser.fullName` },
          establishmentName: { $ifNull: [`$establishment.name`, constants.NA] },
          establishmentProfileSlug: { $ifNull: [`$establishment.profileSlug`, constants.NA] },
          establishmentCity: {
            $ifNull: [`$establishment.address.city`, constants.NA],
          },
          establishmentLocality: {
            $ifNull: [`$establishment.address.locality`, constants.NA],
          },
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

const allAppointments = async (id) => {
  try {
    return Appointment.model.aggregate([
      {
        $match: {
          status: {
            $in: [0, 1, 2],
          },
          userId: new Types.ObjectId(id),
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      {
        $unwind: {
          path: "$user",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "users",
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
        $group: {
          _id: "$status", // Group by status field
          appointments: { $push: "$$ROOT" }, // Store all matching documents in an array
          count: { $sum: 1 },
        },
      },
    ]);
  } catch (error) {
    return false;
  }
};

const appointmentFeedbackList = async (queryData) => {
  const filter = {};
  if (queryData.filter) {
    if (queryData.filter == 1) {
      filter["status"] = constants.STATUS.PENDING;
    }
    if (queryData.filter == 2) {
      filter["status"] = constants.STATUS.APPROVE;
    }
    if (queryData.filter == 3) {
      filter["status"] = constants.STATUS.REJECT;
    }
  }
  if (queryData.id) {
    filter["doctorId"] = new Types.ObjectId(queryData.id);
  }
  try {
    const data = await AppointmentFeedback.model.aggregate([
      {
        $match: filter,
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
        $unwind: {
          path: "$patient",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "patient.userId",
          foreignField: "_id",
          as: "user",
        },
      },
      {
        $unwind: {
          path: "$user",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          patientImage: "$patient.profilePic",
          patientName: "$user.fullName",
          address: "$patient.address",
          feedback: 1,
          appointmentId: 1,
        },
      },
    ]);
    return data;
  } catch (error) {
    return false;
  }
};

const doctorReviews = async (condition, limit, offset, sort, searchQuery) => {
  let filter = {
    doctorId: new Types.ObjectId(condition),
    status: constants.PROFILE_STATUS.APPROVE,
  };
  let order = parseInt(sort) === 1 ? 1 : -1;
  try {
    const data = await AppointmentFeedback.model.aggregate([
      {
        $lookup: {
          from: "patients",
          localField: "patientId",
          foreignField: "_id",
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
        $lookup: {
          from: "users",
          localField: "patient.userId",
          foreignField: "_id",
          as: "user",
        },
      },
      {
        $unwind: {
          path: "$user",
          preserveNullAndEmptyArrays: true,
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
        $unwind: {
          path: "$doctor",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $match: filter,
      },
      {
        $project: {
          patientImage: "$patient.profilePic",
          patientName: {
            $cond: {
              if: { $eq: ["$anonymous", true] },
              then: null,
              else: "$user.fullName",
            },
          },
          address: "$patient.address",
          feedback: 1,
          appointmentId: 1,
          totalPoint: 1,
          services: "$doctor.service",
          createdAt: 1,
          treatment: 1,
          rating: "$doctor.rating",
          waitTime: "$doctor.waitTime",
        },
      },
      {
        $match: {
          treatment: { $regex: searchQuery, $options: "i" },
        },
      },
      {
        $sort: {
          createdAt: order,
        },
      },
      {
        $facet: {
          count: [{ $count: "total" }],
          data: [{ $skip: offset || 0 }, { $limit: limit || 10 }],
        },
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

const findAppointment = async (condtion) => {
  try {
    const data = await Appointment.model.aggregate([
      {
        $match: condtion,
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
        $unwind: {
          path: "$patient",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "patient.userId",
          foreignField: "_id",
          as: "user",
        },
      },
      {
        $unwind: {
          path: "$user",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "establishmentmasters",
          localField: "establishmentId",
          foreignField: "_id",
          as: "establishment",
        },
      },
      {
        $unwind: {
          path: "$establishment",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "hospitals",
          localField: "establishment.hospitalId",
          foreignField: "_id",
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
        $lookup: {
          from: "appointmentfeedbacks",
          localField: "_id",
          foreignField: "appointmentId",
          as: "feedbackResponse",
        },
      },
      {
        $project: {
          patientImage: "$patient.profilePic",
          phone: {
            $cond: [{ $eq: ["$self", true] }, "$user.phone", "$phone"],
          },
          fullName: {
            $cond: [{ $eq: ["$self", true] }, "$user.fullName", "$fullName"],
          },
          establishment: {
            name: "$establishment.name",
            pic: "$hospital.profilePic",
            address: "$establishment.address",
            location: "$establishment.location",
            isLocationShared: "$establishment.isLocationShared",
            profileSlug: "$establishment.profileSlug"
          },
          slotTime: 1,
          consultationFees: 1,
          date: 1,
          slot: 1,
          self: 1,
          patientId: 1,
          appointmentId: 1,
          specialization: 1,
          establishmentId: 1,
          doctorId: 1,
          doctorProfileSlug: `$doctor.profileSlug`,
          feedBackGiven: {
            $cond: {
              if: { $eq: ["$feedbackResponse", []] },
              then: false,
              else: {
                $cond: {
                  if: {
                    $eq: [
                      { $arrayElemAt: ["$feedbackResponse.isDeleted", 0] },
                      true,
                    ],
                  },
                  then: constants.NA,
                  else: true,
                },
              },
            },
          },
        },
      },
    ]);
    return data;
  } catch (error) {
    return false;
  }
};

const appointmentFeedbackAdminList = async (
  condition,
  sortCondition,
  offset,
  limit,
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
    const data = await AppointmentFeedback.model.aggregate([
      { $match: condition },
      {
        $lookup: {
          from: "patients",
          localField: "patientId",
          foreignField: "_id",
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
        $lookup: {
          from: "users",
          localField: "patient.userId",
          foreignField: "_id",
          as: "patientUser",
        },
      },
      {
        $unwind: {
          path: "$patientUser",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          _id: 1,
          createdAt: 1,
          status: { $ifNull: [`$status`, constants.NA] },
          patientProfilePic: { $ifNull: [`$patient.profilePic`, constants.NA] },
          patientName: { $ifNull: [`$patientUser.fullName`, constants.NA] },
          totalPoint: { $ifNull: [`$totalPoint`, constants.NA] },
          feedback: { $ifNull: [`$feedback`, constants.NA] },
          isDeleted: { $ifNull: [`$isDeleted`, constants.NA] },
          lowerPatientName: { $toLower: `$patientUser.fullName` },
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

const getDoctorFeedbackRating = async (doctorId) => {
  try {
    const data = await AppointmentFeedback.model.aggregate([
      {
        $match: {
          doctorId: new Types.ObjectId(doctorId),
          status: constants.PROFILE_STATUS.APPROVE,
        },
      },
      {
        $project: {
          totalPoint: 1,
          doctorRecommend: { $arrayElemAt: ["$experience", 2] },
          doctorWaitTime: { $arrayElemAt: ["$experience.point", 1] },
        },
      },
      {
        $group: {
          _id: "$doctorId",
          doctorReviewCount: { $sum: 1 },
          doctorRating: { $avg: "$totalPoint" },
          doctorRecommended: { $avg: "$doctorRecommend.point" },
          waitTime: { $avg: "$doctorWaitTime" },
        },
      },
    ]);
    return data[0];
  } catch (error) {
    console.log(error);
    return false;
  }
};

const getEstablishmentFeedbackRating = async (establishmentId) => {
  try {
    const data = await AppointmentFeedback.model.aggregate([
      {
        $match: {
          establishmentId: new Types.ObjectId(establishmentId),
          status: constants.PROFILE_STATUS.APPROVE,
        },
      },
      {
        $project: {
          totalPoint: 1,
          establishmentRecommend: { $arrayElemAt: ["$experience", 2] },
        },
      },
      {
        $group: {
          _id: "$establishmentId",
          establishmentReviewCount: { $sum: 1 },
          establishmentRating: { $avg: "$totalPoint" },
          establishmentRecommended: { $avg: "$establishmentRecommend.point" },
        },
      },
    ]);
    return data[0];
  } catch (error) {
    console.log(error);
    return false;
  }
};

const getFeedbackById = async (condition) => {
  try {
    return await AppointmentFeedback.model.aggregate([
      { $match: condition },
      {
        $lookup: {
          from: "patients",
          localField: "patientId",
          foreignField: "_id",
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
        $lookup: {
          from: "users",
          localField: "patient.userId",
          foreignField: "_id",
          as: "patientUser",
        },
      },
      {
        $unwind: {
          path: "$patientUser",
          preserveNullAndEmptyArrays: true,
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
        $unwind: {
          path: "$doctor",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "doctor.userId",
          foreignField: "_id",
          as: "doctorUser",
        },
      },
      {
        $unwind: {
          path: "$doctorUser",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "establishmentmasters",
          localField: "establishmentId",
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
        $addFields: {
          doctorRecommended: { $arrayElemAt: [`$experience`, 2] },
        },
      },
      {
        $unwind: {
          path: "$doctorRecommended.option",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          _id: 1,
          createdAt: 1,
          status: { $ifNull: [`$status`, constants.NA] },
          patientProfilePic: { $ifNull: [`$patient.profilePic`, constants.NA] },
          patientName: { $ifNull: [`$patientUser.fullName`, constants.NA] },
          rejectReason: { $ifNull: [`$reason`, constants.NA] },
          totalPoint: { $ifNull: [`$totalPoint`, constants.NA] },
          feedback: { $ifNull: [`$feedback`, constants.NA] },
          treatment: { $ifNull: [`$treatment`, constants.NA] },
          doctorName: { $ifNull: [`$doctorUser.fullName`, constants.NA] },
          hospitalName: {
            $ifNull: [`$establishmentMaster.name`, constants.NA],
          },
          waitTime: {
            $ifNull: [
              { $arrayElemAt: [`$experience.option`, 1] },
              constants.NA,
            ],
          },
          doctorRecommended: 1,
          doctorRecommend: {
            $ifNull: [
              {
                $cond: {
                  if: {
                    $eq: [{ $toLower: [`$doctorRecommended.option`] }, "yes"],
                  },
                  then: true,
                  else: false,
                },
              },
              constants.NA,
            ],
          },
          doctorHappiness: {
            $ifNull: [
              { $arrayElemAt: [`$experience.option`, 3] },
              constants.NA,
            ],
          },
        },
      },
    ]);
  } catch (error) {
    console.log(error);
    return false;
  }
};

const bookedSlotsCount = async (condition) => {
  try {
    const data = await EstablishmentTiming.model.aggregate([
      {
        $match: condition,
      },
      {
        $lookup: {
          from: "establishmentmasters",
          localField: "establishmentId",
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
          from: "hospitals",
          localField: "establishmentMaster.hospitalId",
          foreignField: "_id",
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
          from: "users",
          localField: "hospital.userId",
          foreignField: "_id",
          as: "hospitalUser",
        },
      },
      {
        $unwind: {
          path: "$hospitalUser",
          preserveNullAndEmptyArrays: true,
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
        $unwind: {
          path: "$doctor",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "doctor.userId",
          foreignField: "_id",
          as: "doctorUser",
        },
      },
      {
        $unwind: {
          path: "$doctorUser",
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
        $match: {
          "doctorUser.isDeleted": false,
          "doctorUser.status": constants.PROFILE_STATUS.ACTIVE,
          "doctor.steps": constants.PROFILE_STEPS.COMPLETED,
          "doctor.isVerified": constants.PROFILE_STATUS.APPROVE,
          "hospitalUser.isDeleted": false,
          "hospitalUser.status": constants.PROFILE_STATUS.ACTIVE,
          "hospital.steps": constants.PROFILE_STEPS.COMPLETED,
          "hospital.isVerified": constants.PROFILE_STATUS.APPROVE,
        },
      },
      {
        $project: {
          patientImage: "$patient.profilePic",
          phone: {
            $cond: [{ $eq: ["$self", true] }, "$user.phone", "$phone"],
          },
          fullName: {
            $cond: [{ $eq: ["$self", true] }, "$user.fullName", "$fullName"],
          },
          establishment: {
            name: "$establishment.name",
            pic: "$hospital.profilePic",
            address: "$establishment.address",
            location: "$establishment.location",
            isLocationShared: "$establishment.isLocationShared",
            profileSlug: "$establishment.profileSlug",
          },
          slotTime: 1,
          consultationFees: 1,
          date: 1,
          slot: 1,
          self: 1,
          appointmentId: 1,
          specialization: 1,
          establishmentId: 1,
          doctorId: 1,
          feedBackGiven: {
            $cond: {
              if: { $eq: ["$feedbackResponse", []] },
              then: false,
              else: {
                $cond: {
                  if: {
                    $eq: [
                      { $arrayElemAt: ["$feedbackResponse.isDeleted", 0] },
                      true,
                    ],
                  },
                  then: constants.NA,
                  else: true,
                },
              },
            },
          },
        },
      },
    ]);
    return data;
  } catch (error) {
    return false;
  }
};

const doctorAppointmentList = async (condition) => {
  try {
    const data = await Appointment.model.aggregate([
      { $match: condition },
      {
        $lookup: {
          from: "patients",
          localField: "patientId",
          foreignField: "_id",
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
        $lookup: {
          from: "users",
          localField: "patient.userId",
          foreignField: "_id",
          as: "patientUser",
        },
      },
      {
        $unwind: {
          path: "$patientUser",
          preserveNullAndEmptyArrays: true,
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
        $unwind: {
          path: "$doctor",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "doctor.userId",
          foreignField: "_id",
          as: "doctorUser",
        },
      },
      {
        $unwind: {
          path: "$doctorUser",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          _id: 1,
          createdAt: 1,
          slot: { $ifNull: [`$date`, constants.NA] },
          doctorName: { $ifNull: [`$doctorUser.fullName`, constants.NA] },
          patientName: { $ifNull: [`$patientUser.fullName`, constants.NA] },
          patientPhone: { $ifNull: [`$patientUser.phone`, constants.NA] },
          countryCode: { $ifNull: [`$patientUser.countryCode`, constants.NA] },
        },
      },
    ]);
    return data;
  } catch (error) {
    console.log(error);
    return false;
  }
};

module.exports = {
  appointmentList,
  allAppointments,
  appointmentFeedbackList,
  findAppointment,
  doctorReviews,
  appointmentFeedbackAdminList,
  getFeedbackById,
  getDoctorFeedbackRating,
  getEstablishmentFeedbackRating,
  bookedSlotsCount,
  doctorAppointmentList,
};
