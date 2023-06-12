const { Appointment, AppointmentFeedback } = require("../models/index");
const { constants } = require("../utils/constant");
const { Types } = require("mongoose");

const appointmentList = async (
  condition,
  sortCondition,
  offset,
  limit,
  searchQuery,
  dateObject,
  isExport
  ) => {
  try {
    if (dateObject?.fromDate) condition.date = { $gte: dateObject?.fromDate, $lte: dateObject?.toDate };
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
        $match: {
          $or: [
            {
              'patientUser.fullName': { $regex: new RegExp(searchQuery, "i") },
            },
            {
              'patientUser.phone': { $regex: new RegExp(searchQuery, "i") },
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
          patientProfilePic: { $ifNull: [`$patient.profilePic`, constants.NA] },
          patientGender: { $ifNull: [`$patient.gender`, constants.NA] },
          patientName:  { $ifNull: [`$patientUser.fullName`, constants.NA] },
          patientPhone:  { $ifNull: [`$patientUser.phone`, constants.NA] },
          lowerPatientName: { $toLower: `$patientUser.fullName` },
          lowerDoctorName: { $toLower: `$doctorUser.fullName` }
        },
      },
      {
        $facet: facetObject
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
  } catch (err) {
    console.log(err, "fcgvbhjnkmll,");
    return false;
  }
};

const allAppointments = async (id) => {
  try {
    const data = await Appointment.model.aggregate([
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
    console.log(data);
    return data;
  } catch (err) {
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
  } catch (err) {
    return false;
  }
};

const doctorReviews = async (condition, limit, offset,  order = 1, searchQuery ) => {
  let filter = { doctorId: new Types.ObjectId(condition) };

  try {
    const data = await AppointmentFeedback.model.aggregate([
      {
        $lookup: {
          from: 'patients',
          localField: 'patientId',
          foreignField: '_id',
          as: 'patient',
        },
      },
      {
        $unwind: {
          path: '$patient',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'patient.userId',
          foreignField: '_id',
          as: 'user',
        },
      },
      {
        $unwind: {
          path: '$user',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: 'doctors',
          localField: 'doctorId',
          foreignField: '_id',
          as: 'doctor',
        },
      },
      {
        $unwind: {
          path: '$doctor',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $match: filter,
      },
      {
        $project: {
          patientImage: '$patient.profilePic',
          patientName: '$user.fullName',
          address: '$patient.address',
          feedback: 1,
          appointmentId: 1,
          totalPoint: 1,
          services: '$doctor.service',
          createdAt: 1,
        },
      },
      // {
      //   $match: {
      //     $or: [
      //       { services: { $elemMatch: { name: searchQuery } } },
      //       { services: { $exists: false } },
      //     ],
      //   },
      // },
      {
        $sort: {
          createdAt: order === 1 ? 1 : -1,
        },
      },
      {
        $facet: {
          count: [{ $count: 'total' }],
          data: [
            { $skip: offset || 0 },
            { $limit: limit || 10 },
          ],
        },
      },
      {
        $addFields: {
          count: {
            $cond: {
              if: { $eq: ['$count', []] },
              then: 0,
              else: {
                $cond: {
                  if: { $eq: ['$data', []] },
                  then: 0,
                  else: { $arrayElemAt: ['$count.total', 0] },
                },
              },
            },
          },
        },
      },
    ]);

    return data[0];
  } catch (err) {
    console.log(err);
    return false;
  }
};

const findAppointment = async (id) => {
  try {
    const data = await Appointment.model.aggregate([
      {
        $match: { _id: new Types.ObjectId(id) },
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
        $project: {
          patientImage: "$patient.profilePic",
          phone: {
            $cond: [
              { $eq: ["$self", true] },
              "$user.phone",
              "$phone",
            ],
          },
          fullName: {
            $cond: [
              { $eq: ["$self", true] },
              "$user.fullName",
              "$fullName",
            ],
          },
          establishment: {
            name: "$establishment.name",
            photo: "$establishment.image",
            address: "$establishment.address",
            location: "$establishment.location",
          },
          slotTime: 1,
          consultationFees: 1,
          date: 1,
          slot: 1,
          self: 1,
          appointmentId:1
        },
      },
    ]);
    return data;
  } catch (err) {
    return false;
  }
};

module.exports = {
  appointmentList,
  allAppointments,
  appointmentFeedbackList,
  findAppointment,
  doctorReviews,
};
