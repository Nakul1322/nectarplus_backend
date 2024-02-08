const {
  User,
  Appointment,
  Patient,
  MedicalReport,
  EstablishmentMaster,
  ProcedureMaster,
  Specialization,
} = require("../models/index");
const { constants } = require("../utils/constant");

const patientList = async (
  condition,
  sortCondition,
  offset,
  limit,
  searchQuery,
  isExport
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
      { $match: condition },
      { $match: searchQuery },
      {
        $project: {
          _id: 1,
          fullName: { $ifNull: [`$fullName`, constants.NA] },
          age: { $ifNull: [`$age`, constants.NA] },
          profilePic: { $ifNull: [`$patient.profilePic`, constants.NA] },
          gender: { $ifNull: [`$patient.gender`, constants.NA] },
          bloodGroup: { $ifNull: [`$patient.bloodGroup`, constants.NA] },
          phone: { $ifNull: [`$phone`, constants.NA] },
          address: { $ifNull: [`$patient.address`, constants.NA] },
          email: { $ifNull: [`$patient.email`, constants.NA] },
          dob: { $ifNull: [`$patient.dob`, constants.NA] },
          createdAt: { $ifNull: [`$createdAt`, constants.NA] },
          lowerName: { $toLower: "$fullName" },
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

const getPatientList = async (
  condition,
  sortCondition,
  offset,
  limit,
  searchQuery
) => {
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
          preserveNullAndEmptyArrays: false,
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
          preserveNullAndEmptyArrays: false,
        },
      },
      {
        $match: {
          $or: [
            {
              "user.fullName": { $regex: new RegExp(searchQuery, "i") },
            },
            {
              "user.phone": { $regex: new RegExp(searchQuery, "i") },
            },
          ],
        },
      },
      {
        $addFields: {
          firstLetter: {
            $substr: [
              { $substrCP: [{ $toUpper: "$user.fullName" }, 0, 1] },
              0,
              1,
            ],
          },
        },
      },
      {
        $project: {
          _id: { $ifNull: [`$patient._id`, constants.NA] },
          patientName: { $ifNull: [`$user.fullName`, constants.NA] },
          firstLetter: 1,
          profilePic: { $ifNull: [`$patient.profilePic`, constants.NA] },
        },
      },
      {
        $group: {
          _id: "$firstLetter", // group by first letter
          documents: {
            $addToSet: {
              _id: "$_id",
              firstLetter: "$firstLetter",
              patientName: "$patientName",
              profilePic: "$profilePic",
            },
          },
        },
      },
      {
        $facet: {
          count: [{ $count: "total" }],
          data: [
            {
              $sort: {
                "documents.firstLetter": 1,
                "documents.patientName": -1,
              },
            },
            { $skip: offset },
            { $limit: limit },
          ],
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

const appointmentList = async (condition) => {
  try {
    const data = await Appointment.model.aggregate([
      { $match: condition },
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
          doctorName: {
            $ifNull: [`$doctorUser.fullName`, constants.NA],
          },
          date: 1,
          slotTime: 1,
          createdAt: 1,
        },
      },
      {
        $facet: {
          count: [{ $count: "total" }],
          data: [{ $sort: { date: 1 } }, { $limit: 10 }],
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
    return false;
  }
};

const getPatientData = async (condition) => {
  try {
    const data = await Patient.model.aggregate([
      { $match: condition },
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
          from: "statemasters",
          localField: "address.state",
          foreignField: "_id",
          as: "state",
        },
      },
      {
        $unwind: {
          path: "$state",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          _id: 1,
          patientName: { $ifNull: [`$user.fullName`, constants.NA] },
          phone: { $ifNull: [`$user.phone`, constants.NA] },
          dob: { $ifNull: [`$dob`, constants.NA] },
          address: { $ifNull: [`$address`, constants.NA] },
          bloodGroup: { $ifNull: [`$bloodGroup`, constants.NA] },
          gender: { $ifNull: [`$gender`, constants.NA] },
          profilePic: { $ifNull: [`$profilePic`, constants.NA] },
          email: { $ifNull: [`$email`, constants.NA] },
          languagePreference: {
            $ifNull: [`$languagePreference`, constants.NA],
          },
          stateName: { $ifNull: [`$state.name`, constants.NA] },
        },
      },
    ]);
    return data[0];
  } catch (error) {
    console.log(error);
    return false;
  }
};

const hospitalPatientList = async (
  condition,
  sortCondition,
  offset,
  limit,
  searchQuery,
  isExport
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
      { $match: searchQuery },
      {
        $project: {
          _id: { $ifNull: [`$patient._id`, constants.NA] },
          fullName: { $ifNull: [`$patientUser.fullName`, constants.NA] },
          age: { $ifNull: [`$age`, constants.NA] },
          profilePic: { $ifNull: [`$patient.profilePic`, constants.NA] },
          gender: { $ifNull: [`$patient.gender`, constants.NA] },
          bloodGroup: { $ifNull: [`$patient.bloodGroup`, constants.NA] },
          phone: { $ifNull: [`$patientUser.phone`, constants.NA] },
          email: { $ifNull: [`$patient.email`, constants.NA] },
          createdAt: { $ifNull: [`$patient.createdAt`, constants.NA] },
          lowerName: { $toLower: "$patientUser.fullName" },
        },
      },
      { $group: { _id: "$_id", data: { $push: "$$ROOT" } } },
      { $replaceRoot: { newRoot: { $mergeObjects: "$data" } } },
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

const getEstablishmentId = async (Model, condition) => {
  try {
    const data = await Model.aggregate([
      { $match: condition },
      {
        $lookup: {
          from: "establishmentmasters",
          let: { hospitalId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ["$hospitalId", "$$hospitalId"],
                },
              },
            },
          ],
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
        $project: {
          _id: 1,
          establishmentMasterId: `$establishmentMaster._id`,
        },
      },
    ]);
    return data[0];
  } catch (error) {
    console.log(error);
    return false;
  }
};

const patientHospitalRecord = async (
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
      data: [{ $sort: { date: -1 } }],
    };
    if (!isExport) {
      facetObject.data.push({ $skip: offset });
      facetObject.data.push({ $limit: limit });
    }
    const data = await Appointment.model.aggregate([
      { $match: condition },
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
      { $match: searchQuery },
      {
        $project: {
          _id: { $ifNull: [`$_id`, constants.NA] },
          patientId: { $ifNull: [`$patientId`, constants.NA] },
          doctorId: { $ifNull: [`$doctor._id`, constants.NA] },
          doctorName: { $ifNull: [`$doctorUser.fullName`, constants.NA] },
          slotTime: { $ifNull: [`$slotTime`, constants.NA] },
          date: { $ifNull: [`$date`, constants.NA] },
          createdAt: { $ifNull: [`$createdAt`, constants.NA] },
          status: { $ifNull: [`$status`, constants.NA] },
          yearOfAppointment: { $year: `$date` },
          lowerName: { $toLower: "$doctorUser.fullName" },
        },
      },
      {
        $facet: {
          count: [{ $count: "total" }],
          data: [
            { $sort: sortCondition },
            { $skip: offset },
            { $limit: limit },
            {
              $group: {
                _id: "$yearOfAppointment",
                data: { $push: "$$ROOT" },
              },
            },
          ],
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

const medicalReportList = async (
  condition,
  offset,
  limit,
  isExport = false
) => {
  try {
    const facetObject = {
      count: [{ $count: "total" }],
      data: [{ $sort: { date: -1 } }],
    };
    if (!isExport) {
      facetObject.data.push({ $skip: offset });
      facetObject.data.push({ $limit: limit });
    }
    const data = await MedicalReport.model.aggregate([
      { $match: condition },
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
          _id: { $ifNull: [`$_id`, constants.NA] },
          url: { $ifNull: [`$url`, constants.NA] },
          userId: { $ifNull: [`$userId`, constants.NA] },
          doctorId: { $ifNull: [`$doctor._id`, constants.NA] },
          doctorName: { $ifNull: [`$doctorUser.fullName`, constants.NA] },
          title: { $ifNull: [`$title`, constants.NA] },
          patientName: { $ifNull: [`$patientName`, constants.NA] },
          status: { $ifNull: [`$status`, constants.NA] },
          type: { $ifNull: [`$type`, constants.NA] },
          date: { $ifNull: [`$date`, constants.NA] },
          createdAt: { $ifNull: [`$createdAt`, constants.NA] },
          yearOfAppointment: { $year: `$date` },
        },
      },
      {
        $facet: {
          count: [{ $count: "total" }],
          data: [
            { $skip: offset },
            { $limit: limit },
            {
              $group: {
                _id: "$yearOfAppointment",
                data: { $push: "$$ROOT" },
              },
            },
          ],
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

const patientProfile = async (condition) => {
  try {
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
    ]);
    return data[0];
  } catch (error) {
    console.log(error);
    return false;
  }
};

const establishmentDetails = async (condition) => {
  try {
    const data = await EstablishmentMaster.model.aggregate([
      { $match: condition },
      {
        $lookup: {
          from: "hospitals",
          localField: "hospitalId",
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
    ]);
    return data[0];
  } catch (error) {
    console.log(error);
    return false;
  }
};

const suggestionList = async (
  condition,
  sortCondition,
  offset,
  limit,
  query
) => {
  try {
    const { searchQuery, masterQuery, hospitalSearchQuery, serviceQuery } =
      query;
    const facetObject = {
      count: [{ $count: "total" }],
      data: [{ $sort: sortCondition }, { $skip: offset }, { $limit: limit }],
    };
    const hospitalPipeline = [
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
        $match: {
          "hospital.steps": constants.PROFILE_STEPS.COMPLETED,
          "hospital.isVerified": constants.PROFILE_STATUS.APPROVE,
        },
      },
      {
        $lookup: {
          from: "establishmentmasters",
          let: { hospitalId: "$hospital._id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ["$hospitalId", "$$hospitalId"],
                },
              },
            },
          ],
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
          from: "hospitaltypes",
          localField: "hospital.hospitalType",
          foreignField: "_id",
          as: "hospitalTypeMaster",
        },
      },
      {
        $unwind: {
          path: "$hospitalTypeMaster",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "statemasters",
          localField: "hospital.address.state",
          foreignField: "_id",
          as: "stateMaster",
        },
      },
      {
        $unwind: {
          path: "$stateMaster",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "establishmenttimings",
          let: { establishmentId: "$establishmentMaster._id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$establishmentId", "$$establishmentId"] },
                    { $eq: ["$isVerified", 2] },
                    { $eq: ["$isDeleted", false] },
                  ],
                },
              },
            },
          ],
          as: "establishmenttiming",
        },
      },
      {
        $addFields: {
          establishmentTiming: {
            $cond: {
              if: { $eq: ["$establishmenttiming", []] },
              then: false,
              else: true,
            },
          },
        },
      },
      { $match: { establishmentTiming: true } },
      {
        $match: {
          $expr: {
            $gt: [{ $size: "$establishmenttiming" }, 1],
          },
        },
      },
      {
        $lookup: {
          from: "doctors",
          localField: "establishmenttiming.doctorId",
          foreignField: "_id",
          as: "doctor",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "doctor.userId",
          foreignField: "_id",
          as: "user",
        },
      },
      {
        $match: {
          "user.isDeleted": false,
          "user.status": constants.PROFILE_STATUS.ACTIVE,
          "doctor.isVerified": constants.PROFILE_STATUS.APPROVE,
          "doctor.steps": constants.PROFILE_STEPS.COMPLETED,
        },
      },
      { $match: hospitalSearchQuery },
      {
        $project: {
          _id: { $ifNull: [`$establishmentMaster._id`, constants.NA] },
          establishmentProfileSlug: {
            $ifNull: [`$establishmentMaster.profileSlug`, constants.NA],
          },
          hospitalId: { $ifNull: [`$hospital._id`, constants.NA] },
          address: { $ifNull: [`$hospital.address`, constants.NA] },
          location: { $ifNull: [`$hospital.location`, constants.NA] },
          isLocationShared: {
            $ifNull: [`$hospital.isLocationShared`, constants.NA],
          },
          profilePic: { $ifNull: [`$hospital.profilePic`, constants.NA] },
          establishmentId: {
            $ifNull: [`$establishmentMaster._id`, constants.NA],
          },
          name: { $ifNull: [`$establishmentMaster.name`, constants.NA] },
          hospitalType: { $ifNull: [`$hospitalTypeMaster.name`, constants.NA] },
          createdAt: 1,
          isMaster: { $ifNull: [`$master`, false] },
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
    ];
    const doctorData = await User.model.aggregate([
      { $match: condition },
      { $match: { userType: constants.USER_TYPES.DOCTOR } },
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
        $match: {
          "doctor.steps": { $eq: constants.PROFILE_STEPS.COMPLETED },
          "doctor.isVerified": { $eq: constants.PROFILE_STATUS.APPROVE },
        },
      },
      {
        $lookup: {
          from: "establishmenttimings",
          let: { doctorId: "$doctor._id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$doctorId", "$$doctorId"] },
                    { $eq: ["$isVerified", 2] },
                    { $eq: ["$isDeleted", false] },
                  ],
                },
              },
            },
          ],
          as: "establishmenttiming",
        },
      },
      {
        $unwind: {
          path: "$establishmenttiming",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "establishmentmasters",
          localField: "establishmenttiming.establishmentId",
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
        $match: {
          "hospital.steps": constants.PROFILE_STEPS.COMPLETED,
          "hospital.isVerified": constants.PROFILE_STATUS.APPROVE,
          "hospitalUser.isDeleted": false,
          "hospitalUser.status": { $ne: constants.PROFILE_STATUS.DEACTIVATE },
        },
      },
      { $match: searchQuery },
      { $sort: { consultationFees: 1 } },
      {
        $project: {
          _id: { $ifNull: [`$doctor._id`, constants.NA] },
          doctorId: { $ifNull: [`$doctor._id`, constants.NA] },
          doctorProfileSlug: { $ifNull: [`$doctor.profileSlug`, constants.NA] },
          profilePic: { $ifNull: [`$doctor.profilePic`, constants.NA] },
          name: { $ifNull: [`$fullName`, constants.NA] },
          specialization: { $ifNull: [`$specialization.name`, constants.NA] },
          createdAt: 1,
          establishmentId: {
            $ifNull: [`$establishmentMaster._id`, constants.NA],
          },
          establishmentProfileSlug: {
            $ifNull: [`$establishmentMaster.profileSlug`, constants.NA],
          },
          address: { $ifNull: [`$establishmentMaster.address`, constants.NA] },
          service: { $ifNull: [`$doctor.service.name`, constants.NA] },
          isMaster: { $ifNull: [`$master`, false] },
        },
      },
      {
        $group: {
          _id: "$_id",
          docs: { $push: "$$ROOT" },
        },
      },
      { $project: { _id: 0, docs: { $first: `$docs` } } },
      {
        $replaceRoot: { newRoot: "$docs" }, // Set the original documents by new root
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
    const procedureData = await User.model.aggregate([
      { $match: condition },
      { $match: { userType: constants.USER_TYPES.DOCTOR } },
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
        $match: {
          "doctor.steps": { $eq: constants.PROFILE_STEPS.COMPLETED },
          "doctor.isVerified": { $eq: constants.PROFILE_STATUS.APPROVE },
        },
      },
      {
        $lookup: {
          from: "establishmenttimings",
          let: { doctorId: "$doctor._id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$doctorId", "$$doctorId"] },
                    { $eq: ["$isVerified", 2] },
                    { $eq: ["$isDeleted", false] },
                  ],
                },
              },
            },
          ],
          as: "establishmenttiming",
        },
      },
      {
        $unwind: {
          path: "$establishmenttiming",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "establishmentmasters",
          localField: "establishmenttiming.establishmentId",
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
        $match: {
          "hospital.steps": constants.PROFILE_STEPS.COMPLETED,
          "hospital.isVerified": constants.PROFILE_STATUS.APPROVE,
          "hospitalUser.isDeleted": false,
          "hospitalUser.status": { $ne: constants.PROFILE_STATUS.DEACTIVATE },
        },
      },
      {
        $unwind: {
          path: "$doctor.service",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          name: { $toLower: `$doctor.service.name` },
          serviceName: `$doctor.service.name`,
          isMaster: { $ifNull: [`$master`, true] },
        },
      },
      { $match: serviceQuery },
      {
        $group: {
          _id: "$name",
          count: { $sum: 1 },
          name: { $first: "$serviceName" },
          isMaster: { $first: "$isMaster" },
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
    const specializationData = await Specialization.model.aggregate([
      { $match: masterQuery },
      {
        $project: {
          _id: 1,
          name: { $ifNull: [`$name`, constants.NA] },
          doctorId: { $ifNull: [`$doctor._id`, constants.NA] },
          createdAt: 1,
          isMaster: { $ifNull: [`$master`, true] },
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
    const hospitalData = await User.model.aggregate([
      { $match: { userType: [constants.USER_TYPES.HOSPITAL] } },
      ...hospitalPipeline,
    ]);
    const clinicData = await User.model.aggregate([
      {
        $match: {
          userType: [
            constants.USER_TYPES.DOCTOR,
            constants.USER_TYPES.HOSPITAL,
          ],
        },
      },
      ...hospitalPipeline,
    ]);
    const data = [
      {
        count:
          doctorData[0].count +
          specializationData[0].count +
          procedureData[0].count +
          hospitalData[0].count +
          clinicData[0].count,
        data: {
          specializationData: specializationData[0],
          procedureData: procedureData[0],
          doctorData: doctorData[0],
          hospitalData: hospitalData[0],
          clinicData: clinicData[0],
        },
      },
    ];
    return data[0];
  } catch (error) {
    console.log(error);
    return false;
  }
};

const patientFeedbackHistory = async (
  condition,
  sortCondition,
  offset,
  limit,
  dateObject,
  isExport = false
) => {
  try {
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
          from: "appointmentfeedbacks",
          localField: "_id",
          foreignField: "appointmentId",
          as: "feedback",
        },
      },
      {
        $unwind: {
          path: "$feedback",
          preserveNullAndEmptyArrays: false,
        },
      },
      { $match: { "feedback.isDeleted": false } },
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
        $addFields: {
          doctorRecommended: {
            $arrayElemAt: [`$feedback.experience.option`, 2],
          },
        },
      },
      {
        $project: {
          _id: { $ifNull: [`$feedback._id`, constants.NA] },
          createdAt: 1,
          patientId: { $ifNull: [`$patientId`, constants.NA] },
          doctorId: { $ifNull: [`$doctorId`, constants.NA] },
          doctorName: { $ifNull: [`$doctorUser.fullName`, constants.NA] },
          date: { $ifNull: [`$date`, constants.NA] },
          status: { $ifNull: [`$feedback.status`, constants.NA] },
          feedback: { $ifNull: [`$feedback.feedback`, constants.NA] },
          totalPoint: { $ifNull: [`$feedback.totalPoint`, constants.NA] },
          doctorRecommend: {
            $ifNull: [
              {
                $cond: {
                  if: {
                    $eq: [
                      {
                        $toLower: [
                          {
                            $cond: {
                              if: {
                                $eq: [{ $type: `$doctorRecommended` }, "array"],
                              },
                              then: {
                                $arrayElemAt: [`$doctorRecommended`, 0],
                              },
                              else: `$doctorRecommended`,
                            },
                          },
                        ],
                      },
                      "yes",
                    ],
                  },
                  then: true,
                  else: false,
                },
              },
              constants.NA,
            ],
          },
          yearOfAppointment: { $year: `$date` },
        },
      },
      {
        $facet: {
          count: [{ $count: "total" }],
          data: [
            { $sort: sortCondition },
            { $skip: offset },
            { $limit: limit },
            {
              $group: {
                _id: "$yearOfAppointment",
                data: { $push: "$$ROOT" },
              },
            },
          ],
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

const hospitalAppointmentList = async (
  condition,
  sortCondition,
  offset,
  limit,
  searchQuery,
  isExport
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
        $lookup: {
          from: "specializations",
          localField: "doctor.specialization",
          foreignField: "_id",
          as: "specialization",
        },
      },
      { $match: searchQuery },
      {
        $project: {
          _id: 1,
          patientId: 1,
          doctorId: 1,
          patientName: { $ifNull: [`$patientUser.fullName`, constants.NA] },
          date: 1,
          consultationFees: 1,
          specialization: 1,
          doctorName: { $ifNull: [`$doctorUser.fullName`, constants.NA] },
          status: 1,
          createdAt: 1,
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

module.exports = {
  patientList,
  getPatientList,
  appointmentList,
  getPatientData,
  hospitalPatientList,
  getEstablishmentId,
  patientHospitalRecord,
  medicalReportList,
  patientProfile,
  establishmentDetails,
  suggestionList,
  patientFeedbackHistory,
  hospitalAppointmentList,
};
