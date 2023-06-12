const {
  User,
  Doctor,
  EstablishmentTiming,
  Hospital,
  EstablishmentMaster,
  Appointment,
  AppointmentFeedback
} = require("../models/index");
const { constants } = require("../utils/constant");
const { Types } = require("mongoose");
const { ObjectId } = require('mongoose').Types;

const hospitalList = async (
  condition,
  sortCondition,
  offset,
  limit,
  filterQuery,
  isExport,
  hospitalCondition
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
      // { $match: hospitalCondition },
      {
        $lookup: {
          from: "hospitaltypes",
          localField: "hospital.hospitalType",
          foreignField: "_id",
          as: "hospitalType",
        },
      },
      {
        $unwind: {
          path: "$hospitalType",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "citymasters",
          localField: "hospital.address.city",
          foreignField: "_id",
          as: "addressCity",
        },
      },
      {
        $unwind: {
          path: "$addressCity",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "statemasters",
          localField: "hospital.address.state",
          foreignField: "_id",
          as: "addressState",
        },
      },
      {
        $unwind: {
          path: "$addressState",
          preserveNullAndEmptyArrays: true,
        },
      },
      { $match: filterQuery },
      {
        $project: {
          _id: { $ifNull: [`$_id`, constants.NA] },
          hospitalId: { $ifNull: [`$hospital._id`, constants.NA] },
          createdAt: 1,
          locality: {
            $ifNull: [`$hospital.city`, "$hospital.address.city", constants.NA],
          },
          hospitalType: { $ifNull: [`$hospitalType.name`, constants.NA] },
          hospitalTypeiD: { $ifNull: [`$hospitalType._id`, constants.NA] },
          hospitalName: { $ifNull: [`$fullName`, constants.NA] },
          address: {
            $ifNull: [
              {
                address: {
                  $ifNull: ["$hospital.address.landmark", constants.NA],
                },
                locality: {
                  $ifNull: ["$hospital.address.locality", constants.NA],
                },
                city: { $ifNull: ["$hospital.address.city", constants.NA] },
                cityName: { $ifNull: ["$hospital.address.city", constants.NA] },
                state: { $ifNull: ["$addressState.name", constants.NA] },
                pincode: {
                  $ifNull: ["$hospital.address.pincode", constants.NA],
                },
                country: {
                  $ifNull: ["$hospital.address.country", constants.NA],
                },
              },
              constants.NA,
            ],
          },
          profilePic: { $ifNull: [`$hospital.profilePic`, constants.NA] },
          totalDoctors: { $ifNull: [`$hospital.totalDoctor`, 0, constants.NA] },
          joiningDate: { $ifNull: [`$hospital.createdAt`, constants.NA] },
          phone: { $ifNull: [`$phone`, constants.NA] },
          status: { $ifNull: [`$hospital.isVerified`, constants.NA] },
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
  } catch (err) {
    return false;
  }
};

const hospitalDetails = async (condition, type) => {
  try {
    const adminProject = {
      _id: { $ifNull: [`$_id`, constants.NA] },
      hospitalId: { $ifNull: [`$hospital._id`, constants.NA] },
      createdAt: 1,
      hospitalType: { $ifNull: [`$hospitalType.name`, constants.NA] },
      hospitalName: { $ifNull: [`$fullName`, constants.NA] },
      hospitalTypeId: { $ifNull: [`$hospitalType._id`, constants.NA] },
      address: {
        $ifNull: [
          {
            landmark: "$hospital.address.landmark",
            locality: "$hospital.address.locality",
            city: "$hospital.address.city",
            stateId: "$addressState._id",
            stateName: "$addressState.name",
            pincode: "$hospital.address.pincode",
            country: { $ifNull: [`$hospital.address.country`, "India"] },
          },
          constants.NA,
        ],
      },
      phone: { $ifNull: [`$phone`, constants.NA] },
      status: 1,
    };

    const hospitalProject = {
      sectionA: {
        hospitalType: `$hospital.hospitalType`,
        fullName: `$hospitalMaster.name`,
        city: `$hospital.city`,
      },
      sectionB: {
        isOwner: {
          $cond: [
            { $eq: ["$hospitalMaster.propertyStatus", 1] },
            true,
            false,
          ],
        },
        establishmentProof: `$hospital.establishmentProof`,
      },
      sectionC: {
        address: {
          $ifNull: [
            {
              landmark: {
                $ifNull: ["$hospital.address.landmark", constants.NA],
              },
              locality: {
                $ifNull: ["$hospital.address.locality", constants.NA],
              },
              city: { $ifNull: ["$hospital.address.city", constants.NA] },
              stateId: { $ifNull: ["$addressState._id", constants.NA] },
              stateName: { $ifNull: ["$addressState.name", constants.NA] },
              pincode: { $ifNull: ["$hospital.address.pincode", constants.NA] },
              country: { $ifNull: [`$hospital.address.country`, "India"] },
            },
            constants.NA,
          ],
        },
        hospitalTiming: { $ifNull: [`$hospitalTiming`, constants.NA] },
      },
      _id: `$_id`,
      hospitalId: `$hospital._id`,
      createdAt: 1,
      phone: `$phone`,
      steps: `$hospital.steps`,
      approvalStatus: `$hospital.isVerified`,
      hospitalTimingId: `$hospitalTiming._id`,
      profileScreen: `$hospital.profileScreen`,
      hospitalMasterId: `$hospitalMaster._id`,
    };

    const projection =
      type === constants.HOSPITAL_DETAIL_TYPE.ADMIN
        ? adminProject
        : hospitalProject;
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
        $unwind: {
          path: "$hospitalType",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "statemasters",
          localField: "hospital.address.state",
          foreignField: "_id",
          as: "addressState",
        },
      },
      {
        $unwind: {
          path: "$addressState",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "establishmentmasters",
          localField: "hospital._id",
          foreignField: "hospitalId",
          as: "hospitalMaster",
        },
      },
      {
        $unwind: {
          path: "$hospitalMaster",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "establishmenttimings",
          localField: "hospitalMaster._id",
          foreignField: "establishmentId",
          as: "hospitalTiming",
        },
      },
      {
        $unwind: {
          path: "$hospitalTiming",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: projection,
      },
    ]);
    return data[0];
  } catch (err) {
    console.log(err);
    return false;
  }
};

const doctorProfile = async (condition) => {
  try {
    const data = await Doctor.model.aggregate([
      { $match: condition },

      {
        $lookup: {
          from: "specializations",
          let: { specialization: "$specialization" },
          pipeline: [
            { $match: { $expr: { $in: ["$_id", "$$specialization"] } } },
            { $project: { id: "$_id", _id: 0, name: 1 } },
          ],
          as: "specializationDetails",
        },
      },
      {
        $lookup: {
          from: "users",
          let: { userId: "$userId" },
          pipeline: [
            { $match: { $expr: { $eq: ["$_id", "$$userId"] } } },
            { $project: { id: "$_id", _id: 0, fullName: 1, phone: 1 } },
          ],
          as: "doctorDetails",
        },
      },
      {
        $unwind: {
          path: "$doctorDetails",
          preserveNullAndEmptyArrays: true,
        },
      },

      {
        $project: {
          specializationDetails: 1,
          doctorDetails: 1,
          profilePic: 1,
          medicalRegistration: 1,
          education: 1,
          award: 1,
          membership: 1,
          city: 1,
          identityProof: { $ifNull: [`$identityProof`, constants.NA] },
          medicalProof: { $ifNull: [`$identityProof`, constants.NA] }
        }
      },
    ]);
    return data;
  } catch (err) {
    return false;
  }
};

const doctorList = async (condition, limit, skip, search, sortBy, order) => {
  try {
    const matchSearch = {};
    if (search) {
      matchSearch.$or = [
        {
          "doctorUserDetails.fullName": { $regex: `${search}`, $options: "i" },
        },
        { "doctorUserDetails.phone": { $regex: `${search}`, $options: "i" } },
      ];
    }
    const sortObject = { sortBy: constants.LIST.ORDER[order] };
    if (sortBy === "fullName") {
      sortObject["doctorUserDetails.fullName"] = constants.LIST.ORDER[order];
    }
    const data = await EstablishmentTiming.model.aggregate([
      { $match: condition },
      {
        $lookup: {
          from: "doctors",
          localField: "doctorId",
          foreignField: "_id",
          as: "doctorDetails",
        },
      },
      {
        $addFields: {
          doctorDetails: { $arrayElemAt: ["$doctorDetails", 0] },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "doctorDetails.userId",
          foreignField: "_id",
          as: "doctorUserDetails",
        },
      },
      {
        $addFields: {
          doctorUserDetails: { $arrayElemAt: ["$doctorUserDetails", 0] },
        },
      },
      { $sort: sortObject },
      { $match: matchSearch },
      {
        $lookup: {
          from: "specializations",
          localField: "specility",
          foreignField: "_id",
          as: "specilityData",
        },
      },
      {
        $addFields: {
          specilityData: { $arrayElemAt: ["$specilityData.name", 0] },
        },
      },
      {
        $lookup: {
          from: "proceduremasters",
          localField: "procedure",
          foreignField: "_id",
          as: "procedureDetails",
        },
      },
      {
        $addFields: {
          procedureDetails: { $arrayElemAt: ["$procedureDetails.name", 0] },
        },
      },
      {
        $project: {
          _id: 1,
          doctorId: 1,
          doctorDetails: {
            doctorName: "$doctorUserDetails.fullName",
            phone: "$doctorUserDetails.phone",
            profilePic: "$doctorDetails.profilePic",
            email: "$doctorDetails.email",
            userId: "$doctorDetails.userId",
          },
          specilityData: { $ifNull: [`$specilityData`, constants.NA] },
          procedureDetails: { $ifNull: [`$procedureDetails`, constants.NA] },
        },
      },
      {
        $facet: {
          count: [{ $count: "count" }],
          data: [{ $skip: Number(skip) }, { $limit: Number(limit) }],
        },
      },
      {
        $addFields: {
          count: { $arrayElemAt: ["$count.count", 0] },
        },
      },
    ]);

    return data[0];
  } catch (err) {
    return false;
  }
};

const hospitalProfile = async (condition) => {
  try {
    const data = await Hospital.model.aggregate([
      { $match: condition },

      {
        $lookup: {
          from: "users",
          let: { userId: "$userId" },
          pipeline: [
            { $match: { $expr: { $eq: ["$_id", "$$userId"] } } },
            { $project: { _id: 0, id: "$_id", fullName: 1, phone: 1 } },
          ],
          as: "userTableDetails",
        },
      },
      {
        $unwind: {
          path: "$userTableDetails",
          preserveNullAndEmptyArrays: true,
        },
      },

      {
        $lookup: {
          from: "hospitaltypes",
          let: { hospitalType: "$hospitalType" },
          pipeline: [
            { $match: { $expr: { $eq: ["$_id", "$$hospitalType"] } } },
            { $project: { _id: 0, id: "$_id", name: 1 } },
          ],
          as: "hospitalTypeDetails",
        },
      },
      {
        $unwind: {
          path: "$hospitalTypeDetails",
          preserveNullAndEmptyArrays: true,
        },
      },

      {
        $project: {
          profilePic: 1,
          totalBed: 1,
          ambulance: 1,
          about: 1,
          email: 1,
          userTableDetails: 1,
          hospitalTypeDetails: 1,
        },
      },
    ]);
    return data;
  } catch (err) {
    return false;
  }
};

const hospitalTimingData = async (condition) => {
  try {
    const data = await EstablishmentTiming.model.aggregate([
      { $match: condition },
      {
        $project: {
          mon: 1,
          tue: 1,
          wed: 1,
          thu: 1,
          fri: 1,
          sat: 1,
          sun: 1,
        },
      },
    ]);
    return data;
  } catch (err) {
    return false;
  }
};

const hospitalAddressData = async (condition) => {
  try {
    const data = await Hospital.model.aggregate([
      { $match: condition },
      {
        $project: {
          address: 1,
          location: 1,
        },
      },
    ]);
    return data;
  } catch (err) {
    return false;
  }
};

const hospitalImagesData = async (condition) => {
  try {
    const data = await Hospital.model.aggregate([
      { $match: condition },
      {
        $project: {
          image: 1,
        },
      },
    ]);
    return data;
  } catch (err) {
    return false;
  }
};

const hospitalserviceData = async (condition) => {
  try {
    const data = await Hospital.model.aggregate([
      { $match: condition },
      {
        $project: {
          service: 1,
        },
      },
    ]);
    return data;
  } catch (err) {
    return false;
  }
};

const hospitalSocialData = async (condition) => {
  try {
    const data = await Hospital.model.aggregate([
      { $match: condition },
      {
        $project: {
          social: 1,
        },
      },
    ]);
    return data;
  } catch (err) {
    return false;
  }
};

const hospitalcompleteProfile = async (condition) => {
  try {
    const data = await Hospital.model.aggregate([
      { $match: condition },
      {
        $lookup: {
          from: "users",
          let: { userId: "$userId" },
          pipeline: [
            { $match: { $expr: { $eq: ["$_id", "$$userId"] } } },
            { $project: { _id: 0, id: "$_id", fullName: 1, phone: 1 } },
          ],
          as: "userTableDetails",
        },
      },
      {
        $lookup: {
          from: "EstablishmentTiming",
          let: { timing: "$timing" },
          pipeline: [
            { $match: { $expr: { $eq: ["$establishmentId", "$$timing"] } } },
            {
              $project: {
                _id: 0,
                id: "$establishmentId",
                mon: 1,
                tue: 1,
                wed: 1,
                thu: 1,
                fri: 1,
                sat: 1,
                sun: 1,
              },
            },
          ],
          as: "establishmentTimingDetails",
        },
      },

      {
        $lookup: {
          from: "Video",
          let: { userId: "$userId" },
          pipeline: [
            { $match: { $expr: { $in: ["$userId", "$$userId"] } } },
            { $project: { _id: 0, id: "$userId", title: 1, url: 1 } },
          ],
          as: "videoTableDetails",
        },
      },
      {
        $lookup: {
          from: "faqs",
          localField: "_id",
          foreignField: "userId",
          as: "faq",
        },
      },
      {
        $lookup: {
          from: "social",
          localField: "social",
          foreignField: "_id",
          as: "socialMedia",
        },
      },
      // {
      //     $project: {
      //         profilePic: 1,
      //         fullName: 1,
      //         phone: 1,
      //         email: 1,

      //     }
      // },
    ]);
    return data;
  } catch (err) {
    return false;
  }
};

const hospitalApprovalList = async (
  condition,
  limit,
  skip,
  sortBy,
  order,
  search
) => {
  try {
    const matchSearch = {};
    const sortObject = { sortBy: constants.LIST.ORDER[order] };
    if (sortBy === "fullName") {
      sortObject["hospitalName.name"] = constants.LIST.ORDER[order];
    }
    if (search) {
      matchSearch.$or = [
        { "hospitalName.name": { $regex: `${search}`, $options: "i" } },
        { "userTableDetails.phone": { $regex: `${search}`, $options: "i" } },
      ];
    }
    const data = await Hospital.model.aggregate([
      { $match: condition },
      // { $sort: sortObject },
      {
        $lookup: {
          from: "users",
          let: { userId: "$userId" },
          pipeline: [
            { $match: { $expr: { $eq: ["$_id", "$$userId"] } } },
            {
              $project: {
                _id: 0,
                id: "$_id",
                phone: { $ifNull: [`$phone`, constants.NA] },
              },
            },
          ],
          as: "userTableDetails",
        },
      },
      {
        $unwind: {
          path: "$userTableDetails",
          preserveNullAndEmptyArrays: true,
        },
      },

      {
        $lookup: {
          from: "establishmentmasters",
          localField: "_id",
          foreignField: "hospitalId",
          as: "hospitalName",
        },
      },
      {
        $unwind: {
          path: "$hospitalName",
          preserveNullAndEmptyArrays: true,
        },
      },
     

      { $match: matchSearch },
      { $sort: sortObject },
      {
        $lookup: {
          from: "hospitaltypes",
          let: { hospitalType: "$hospitalType" },
          pipeline: [
            { $match: { $expr: { $eq: ["$_id", "$$hospitalType"] } } },
            { $project: { _id: 0, id: "$_id", name: 1 } },
          ],
          as: "hospitalTypeDetails",
        },
      },
      {
        $lookup: {
          from: "statemasters",
          localField: "address.state",
          foreignField: "_id",
          as: "addressState",
        },
      },
      {
        $unwind: {
          path: "$addressState",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          userId: 1,
          createdAt: 1,
          userTableDetails: 1,
          hospitalName:"$hospitalName.name",
          hospitalTypeDetails: 1,
          address: { $ifNull: [`$address`, constants.NA] },
          state: "$addressState.name",
          isVerified: 1,
          rejectReason: 1,
        },
      },
      {
        $facet: {
          totalCount: [{ $count: "count" }],
          data: [
            { $skip: Number(skip) },
            { $limit: Number(limit) },
          ],
        },
      },
      // {
      //   $addFields: {
      //     count: { $arrayElemAt: ["$count.count", 0] },
      //   },
      // },
    ]);
    return data;
  } catch (err) {
    return false;
  }
};

const adminViewHospital = async (condition) => {
  try {
    const data = await Hospital.model.aggregate([
      { $match: condition },
      {
        $lookup: {
          from: "establishmentmasters",
          localField: "_id",
          foreignField: "hospitalId",
          as: "hospitalName",
        },
      },
      {
        $unwind: {
          path: "$hospitalName",
          preserveNullAndEmptyArrays: true,
        },
      },
     
      {
        $lookup: {
          from: "hospitaltypes",
          let: { hospitalType: "$hospitalType" },
          pipeline: [
            { $match: { $expr: { $eq: ["$_id", "$$hospitalType"] } } },
            { $project: { _id: 0, id: "$_id", name: 1 } },
          ],
          as: "hospitalTypeDetails",
        },
      },
      {
        $project: {
          profilePic: 1,
          createdAt: 1,
          hospitalName:"$hospitalName.name",
          hospitalTypeDetails: 1,
          establishmentProof: 1,
        },
      },
    ]);
    return data;
  } catch (err) {
    return false;
  }
};

const doctorRequestList = async (condition, limit, skip, sortBy, order) => {
  try {
    const sortObject = { sortBy: constants.LIST.ORDER[order] };
    if (sortBy === "fullName") {
      sortObject["doctorUser.fullName"] = constants.LIST.ORDER[order];
    }

    const data = await EstablishmentTiming.model.aggregate([
      { $match: condition },
      {
        $lookup: {
          from: "doctors",
          localField: "doctorId",
          foreignField: "_id",
          as: "doctorData",
        },
      },
      {
        $unwind: { path: "$doctorData", preserveNullAndEmptyArrays: true }
      },
      {
        $lookup: {
          from: "users",
          localField: "doctorData.userId",
          foreignField: "_id",
          as: "doctorUser",
        },
      },
      {
        $unwind: { path: "$doctorUser", preserveNullAndEmptyArrays: true }
      },
      { $sort: sortObject },
      {
        $lookup: {
          from: "specializations",
          localField: "doctorData.specialization",
          foreignField: "_id",
          as: "specilityData",
        },
      },
      // {
      //   $addFields: {
      //     hospitalName: {$arrayElemAt: ['$hospitalName.fullName', 0]}
      //   }
      // },
      {
        $project: {
          doctorDetails: {
            fullName: "$doctorUser.fullName",
            phone: "$doctorUser.phone",
            profilePic: "$doctorData.profilePic",
            email: "$doctorData.email",
          },
          isVerified: 1,
          specilityData: 1,
          establishmentId: 1,
          doctorId: 1,
        },
      },
      {
        $facet: {
          count: [{ $count: "count" }],
          data: [{ $skip: Number(skip) }, { $limit: Number(limit) }],
        },
      },
      {
        $addFields: {
          count: { $arrayElemAt: ["$count.count", 0] },
        },
      },
    ]);
    return data[0];
  } catch (err) {
    return false;
  }
};

const hospitalListForAddress = async (
  condition,
  sortCondition,
  offset,
  limit,
  hospitalQuery,
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
      { $match: hospitalQuery },
      {
        $lookup: {
          from: "hospitaltypes",
          localField: "hospital.hospitalType",
          foreignField: "_id",
          as: "hospitalType",
        },
      },
      {
        $unwind: {
          path: "$hospitalType",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "statemasters",
          localField: "hospital.address.state",
          foreignField: "_id",
          as: "addressState",
        },
      },
      {
        $unwind: {
          path: "$addressState",
          preserveNullAndEmptyArrays: true,
        },
      },
      { $match: hospitalQuery },
      {
        $project: {
          _id: { $ifNull: [`$_id`, constants.NA] },
          hospitalId: { $ifNull: [`$hospital._id`, constants.NA] },
          createdAt: 1,
          hospitalType: { $ifNull: [`$hospitalType.name`, constants.NA] },
          hospitalTypeiD: { $ifNull: [`$hospitalType._id`, constants.NA] },
          hospitalName: { $ifNull: [`$fullName`, constants.NA] },
          address: {
            $ifNull: [
              {
                address: "$hospital.address.address",
                locality: "$hospital.address.locality",
                city: "$addressCity.name",
                cityName: "$hospital.address.city",
                state: "$addressState.name",
                pincode: "$hospital.address.pincode",
                country: "$hospital.address.country",
              },
              constants.NA,
            ],
          },
          profilePic: { $ifNull: [`$hospital.profilePic`, constants.NA] },
          totalDoctors: { $ifNull: [`$hospital.totalDoctor`, 0, constants.NA] },
          joiningDate: { $ifNull: [`$hospital.createdAt`, constants.NA] },
          phone: { $ifNull: [`$phone`, constants.NA] },
          status: { $ifNull: [`$hospital.isVerified`, constants.NA] },
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
  } catch (err) {
    console.log(err);
    return false;
  }
};

const getHospitalDataByID = async (Model, condition, type) => {
  try {
    const recordKey = constants.SPECIALITY_PROCEDURE_RECORD_KEY[type];
    const specialityLookup = {
      lookup: {
        from: "specialities",
        localField: "speciality",
        foreignField: "_id",
        as: "specialityName",
      },
      unwind: {
        path: "$specialityName",
        preserveNullAndEmptyArrays: false,
      },
      projectionKey: {
        _id: 1,
        specialityId: { $ifNull: [`$specialityName._id`, constants.NA] },
        specialityName: { $ifNull: [`$specialityName.name`, constants.NA] },
      },
    };

    const procedureLookup = {
      lookup: {
        from: "proceduremasters",
        localField: "procedure",
        foreignField: "_id",
        as: "procedureName",
      },
      unwind: {
        path: "$procedureName",
        preserveNullAndEmptyArrays: true,
      },
      projectionKey: {
        _id: 1,
        procedureId: { $ifNull: [`$procedureName._id`, constants.NA] },
        procedureName: { $ifNull: [`$procedureName.name`, constants.NA] },
      },
    };

    const { lookup, unwind, projectionKey } =
      type === constants.SPECIALITY_PROCEDURE.SPECIALITY
        ? specialityLookup
        : procedureLookup;

    const data = await Model.aggregate([
      { $match: condition },
      {
        $unwind: {
          path: `$${recordKey}`,
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: lookup,
      },
      {
        $unwind: unwind,
      },
      { $project: projectionKey },
    ]);
    console.log(data);
    return data;
  } catch (error) {
    console.log(error);
    return false;
  }
};

const hospitalAboutUs = async (establishmentId) => {
  try {
    const data = await EstablishmentMaster.model.aggregate([
      { $match: { _id: new Types.ObjectId(establishmentId) } },
      {
        $lookup: {
          from: "establishmenttimings",
          localField: "_id",
          foreignField: "establishmentId",
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
          from: "hospitaltypes",
          localField: "hospitalTypeId",
          foreignField: "_id",
          as: "hospitalType",
        },
      },
      { $unwind: { path: "$hospitalType", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "hospitals",
          localField: "hospitalId",
          foreignField: "_id",
          as: "hospital",
        },
      },
      { $unwind: { path: "$hospital", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          name: 1,
          hospitalType: "$hospitalType.name",
          rating: "4.5",
          reviews: "50",
          bedCount: "$hospital.totalBed",
          ambulanceCount: "$hospital.ambulance",
          address: 1,
          location: 1,
          social: "$hospital.social",
          about: "$hospital.about",
          profilePic: 'hospital.profilePic',
          establishmentTiming: "$establishmenttiming",
          doctorCount: "2",
          claimedProfile: {
            $cond: {
              if: { $and: [{ $eq: ["$hospital.steps", 4] }, { $eq: ["$hospital.profileScreen", 5] }] },
              then: true,
              else: false
            }
          },
        },
      },
    ]);
    return data.length === 0 ? false : data;
  } catch (err) {
    return false;
  }
};

const calendarProject = {
  _id: 1,
  hospitalName: { $ifNull: [`$establishmentMaster.name`, constants.NA] },
  appointmentId: { $ifNull: [`$appointmentId`, constants.NA] },
  date: { $ifNull: [`$date`, constants.NA] },
  status: { $ifNull: [`$status`, constants.NA] },
  establishmentId: { $ifNull: [`$establishmentId`, constants.NA] },
  slot: { $ifNull: [`$slot`, constants.NA] },
  self: { $ifNull: [`$self`, constants.NA] },
  notes: { $ifNull: [`$notes`, constants.NA] },
  reason: { $ifNull: [`$reason`, constants.NA] },
  createdAt: 1,
  patient: {
    patientName: { $ifNull: [`$fullName`, `$patient.fullName`, constants.NA] },
    patientId: { $ifNull: [`$patientId`, constants.NA] },
    patientPhone: { $ifNull: [`$phone`, `$patient.phone`, constants.NA] },
    patientProfilePic: { $ifNull: [`$patientUser.profilePic`, constants.NA] },
    patientEmail: { $ifNull: [`$email`, `$patientUser.email`, constants.NA] },
    patientProfileCompleted: {
      $cond: [
        { $eq: ["$patientUser.steps", 4] },
        true,
        false,
      ],
    },
  },
  doctor: {
    doctorName: { $ifNull: [`$doctor.fullName`, constants.NA] },
    doctorId: { $ifNull: [`$doctorId`, constants.NA] },
  },
  establishmentTiming: { $ifNull: [`$establishmentTiming`, constants.NA] },
};

const appointmentList = async (condition, userId, sortCondition, offset, limit, isExport = false) => {
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
      { $match: { "hospital.userId": new ObjectId(userId) } },
      {
        $lookup: {
          from: "patients",
          localField: "patientId",
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
          from: "users",
          localField: "patientUser.userId",
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
          from: "doctors",
          localField: "doctorId",
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
          from: "users",
          localField: "doctorUser.userId",
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
          from: "establishmenttimings",
          let: { doctorId: "$doctorId", establishmentId: "$establishmentId" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$doctorId", "$$doctorId"] },
                    { $eq: ["$establishmentId", "$$establishmentId"] },
                    // { $eq: ["$isVerified", 2] }
                  ]
                }
              }
            },
          ],
          as: "establishmentTiming",
        },
      },
      { $unwind: { path: "$establishmentTiming", preserveNullAndEmptyArrays: true } },
      {
        $project: calendarProject
      },
      {
        $group: {
          _id: `$status`,
          totalCount: { $sum: 1 },
          data: { $push: "$$ROOT" },
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
  } catch (err) {
    console.log(err);
    return false;
  }
};

const calendarList = async (condition, hospitalQuery, offset, limit, isExport = true) => {
  try {
    const facetObject = {
      count: [{ $count: "total" }],
      data: [{ $sort: { _id: 1 } }],
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
      { $match: hospitalQuery },
      {
        $lookup: {
          from: "patients",
          localField: "patientId",
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
          from: "users",
          localField: "patientUser.userId",
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
          from: "doctors",
          localField: "doctorId",
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
          from: "users",
          localField: "doctorUser.userId",
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
          from: "establishmenttimings",
          let: { doctorId: "$doctorId", establishmentId: "$establishmentId" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$doctorId", "$$doctorId"] },
                    { $eq: ["$establishmentId", "$$establishmentId"] },
                    // { $eq: ["$isVerified", 2] }
                  ]
                }
              }
            },
          ],
          as: "establishmentTiming",
        },
      },
      { $unwind: { path: "$establishmentTiming", preserveNullAndEmptyArrays: true } },
      {
        $project: calendarProject
      },
      {
        $group: {
          _id: { $dateToString: { date: "$date" } },
          totalCount: { $sum: 1 },
          data: { $push: "$$ROOT" },
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
  } catch (err) {
    console.log(err);
    return false;
  }
};

const detailsList = async (
  condition,
  sortCondition,
  offset,
  limit,
  searchQuery,
  isExport = true,
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
      {
        $unwind: {
          path: "$hospital.service",
          preserveNullAndEmptyArrays: true,
        },
      },
      { $match: searchQuery },
      {
        $project: {
          _id: { $ifNull: [`$_id`, constants.NA] },
          hospitalId: { $ifNull: [`$hospital._id`, constants.NA] },
          _id: { $ifNull: [`$_id`, constants.NA] },
          serviceId: { $ifNull: [`$hospital.service._id`, constants.NA] },
          name: { $ifNull: [`$hospital.service.name`, constants.NA] },
          lowerName: { $toLower: `$hospital.service.name` }
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
  } catch (err) {
    return false;
  }
};

const reviewList = async (
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
          path: "$user",
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
        $project: {
          _id: { $ifNull: [`$_id`, constants.NA] },
          appointmentId: { $ifNull: [`$appointmentId`, constants.NA] },
          createdAt: { $ifNull: [`$createdAt`, constants.NA] },
          patientName: { $ifNull: [`$patientUser.fullName`, constants.NA] },
          doctorDetails: {
            _id: { $ifNull: [`$doctorId`, constants.NA] },
            name: { $ifNull: [`$doctorUser.fullName`, constants.NA] },
            specialization: { $ifNull: [`$specialization`, constants.NA] },
          },
          reply: { $ifNull: [`$reply`, constants.NA] },
          services: { $ifNull: [`$treatment`, constants.NA] },
          feedback: { $ifNull: [`$feedback`, constants.NA] },
          totalPoint: { $ifNull: [`$totalPoint`, constants.NA] },
          experience: { $ifNull: [`$experience`, constants.NA] },
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
  } catch (err) {
    console.log(err);
    return false;
  }
};

module.exports = {
  hospitalList,
  doctorProfile,
  doctorList,
  hospitalProfile,
  hospitalDetails,
  hospitalApprovalList,
  adminViewHospital,
  hospitalTimingData,
  hospitalAddressData,
  hospitalImagesData,
  hospitalserviceData,
  hospitalSocialData,
  doctorRequestList,
  hospitalListForAddress,
  getHospitalDataByID,
  hospitalAboutUs,
  appointmentList,
  calendarList,
  detailsList,
  reviewList
};
