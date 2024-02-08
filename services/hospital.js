const {
  User,
  Doctor,
  EstablishmentTiming,
  Hospital,
  EstablishmentMaster,
  Appointment,
  AppointmentFeedback,
  Specialization,
} = require("../models/index");
const { constants } = require("../utils/constant");
const { Types } = require("mongoose");
const { ObjectId } = require("mongoose").Types;
const moment = require("moment");
const slugify = require("slugify");

const hospitalList = async (
  condition,
  sortCondition,
  offset,
  limit,
  filterQuery,
  isExport,
  additionalMatchQuery
) => {
  try {
    const facetObject = {
      count: [{ $count: "total" }],
      data: [{ $sort: sortCondition }],
    };
    const { hospitalCondition, searchQuery } = additionalMatchQuery;
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
      { $match: hospitalCondition },
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
          let: { hospitalBaseId: "$hospital._id" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$hospitalId", "$$hospitalBaseId"] },
                doctorId: { $exists: false },
              },
            },
          ],
          as: "establishmentMaster",
        },
      },
      {
        $unwind: {
          path: "$establishmentMaster",
          preserveNullAndEmptyArrays: false,
        },
      },
      { $match: searchQuery },
      { $match: filterQuery },
      {
        $project: {
          _id: { $ifNull: [`$_id`, constants.NA] },
          hospitalId: { $ifNull: [`$hospital._id`, constants.NA] },
          createdAt: 1,
          locality: {
            $ifNull: ["$hospital.address.locality", constants.NA],
          },
          profileSlug: {
            $ifNull: ["$establishmentMaster.profileSlug", constants.NA],
          },
          hospitalType: { $ifNull: [`$hospitalType.name`, constants.NA] },
          hospitalTypeiD: { $ifNull: [`$hospitalType._id`, constants.NA] },
          hospitalName: {
            $ifNull: [`$establishmentMaster.name`, `$fullName`, constants.NA],
          },
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
          status: { $ifNull: [`$status`, constants.NA] },
          approvalStatus: { $ifNull: [`$hospital.isVerified`, constants.NA] },
          lowerName: {
            $toLower: {
              $ifNull: [`$establishmentMaster.name`, constants.NA],
            },
          },
          establishmentId: "$establishmentMaster._id",
        },
      },
      { $match: { lowerName: { $ne: "" } } },
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

const hospitalDetails = async (condition, type) => {
  try {
    const adminProject = {
      _id: { $ifNull: [`$_id`, constants.NA] },
      phone: { $ifNull: [`$phone`, constants.NA] },
      hospitalId: { $ifNull: [`$hospital._id`, constants.NA] },
      createdAt: 1,
      hospitalType: { $ifNull: [`$hospitalType.name`, constants.NA] },
      hospitalName: { $ifNull: [`$hospitalMaster.name`, constants.NA] },
      hospitalTypeId: { $ifNull: [`$hospitalType._id`, constants.NA] },
      hospitalMasterId: { $ifNull: [`$hospitalMaster._id`, constants.NA] },
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
      location: {
        $ifNull: ["$hospitalMaster.location", constants.NA],
      },
      isLocationShared: {
        $ifNull: ["$hospitalMaster.isLocationShared", constants.NA],
      },
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
          $cond: [{ $eq: ["$hospitalMaster.propertyStatus", 1] }, true, false],
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
        location: {
          $ifNull: ["$hospitalMaster.location", constants.NA],
        },
        isLocationShared: {
          $ifNull: ["$hospitalMaster.isLocationShared", constants.NA],
        },
      },
      _id: `$_id`,
      hospitalId: `$hospital._id`,
      createdAt: 1,
      phone: `$phone`,
      countryCode: `$countryCode`,
      steps: `$hospital.steps`,
      approvalStatus: `$hospital.isVerified`,
      hospitalTimingId: `$hospitalTiming._id`,
      profileScreen: `$hospital.profileScreen`,
      hospitalMasterId: `$hospitalMaster._id`,
      email: `$hospital.email`,
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
      { $match: { "hospitalTiming.doctorId": { $exists: false } } },
      {
        $project: projection,
      },
    ]);
    return data[0];
  } catch (error) {
    console.log(error);
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
        $lookup: {
          from: "establishmenttimings",
          localField: "_id",
          foreignField: "doctorId",
          as: "timingDetails",
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
          medicalProof: { $ifNull: [`$medicalProof`, constants.NA] },
          establishmentProof: {
            $cond: {
              if: {
                $eq: [{ $arrayElemAt: ["$timingDetails.isOwner", 0] }, true],
              },
              then: [],
              else: {
                $ifNull: [`$timingDetails.establishmentProof`, constants.NA],
              },
            },
          },
          isVerified: 1,
          claimProfile: {
            $cond: {
              if: { $ne: ["$steps", 4] },
              then: false,
              else: true,
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
//our Doctor for Hospital
const doctorList = async (
  condition,
  doctorQuery,
  limit,
  skip,
  search,
  sortCondition,
  isExport
) => {
  try {
    const { sortBy, order } = sortCondition;
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
    const facetObject = {
      count: [{ $count: "count" }],
      data: [],
    };
    if (!isExport) {
      facetObject.data.push({ $skip: Number(skip) });
      facetObject.data.push({ $limit: Number(limit) });
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
      { $match: doctorQuery },
      {
        $lookup: {
          from: "specializations",
          localField: "doctorDetails.specialization",
          foreignField: "_id",
          as: "specility",
        },
      },
      // {
      //   $addFields: {
      //     specilityData: { $arrayElemAt: ["$specilityData"] },
      //   },
      // },
      {
        $lookup: {
          from: "proceduremasters",
          localField: "procedure",
          foreignField: "_id",
          as: "procedure",
        },
      },
      // {
      //   $addFields: {
      //     procedureDetails: { $arrayElemAt: ["$procedureDetails"] },
      //   },
      // },
      {
        $project: {
          _id: 1,
          doctorId: 1,
          isVerified: 1,
          doctorDetails: {
            doctorName: "$doctorUserDetails.fullName",
            phone: "$doctorUserDetails.phone",
            profilePic: "$doctorDetails.profilePic",
            email: "$doctorDetails.email",
            userId: "$doctorDetails.userId",
          },
          specility: { $ifNull: [`$specility`, constants.NA] },
          procedure: { $ifNull: [`$procedure`, constants.NA] },
          consultationFees: 1,
          mon: 1,
          tue: 1,
          wed: 1,
          thu: 1,
          fri: 1,
          sat: 1,
          sun: 1,
        },
      },
      {
        $facet: facetObject,
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

const hospitalProfile = async (condition) => {
  try {
    const data = await Hospital.model.aggregate([
      { $match: condition },

      {
        $lookup: {
          from: "establishmentmasters",
          localField: "_id",
          foreignField: "hospitalId",
          as: "masterTableDetails",
        },
      },
      {
        $unwind: {
          path: "$masterTableDetails",
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
          profilePic: { $ifNull: [`$profilePic`, constants.NA] },
          totalBed: { $ifNull: [`$totalBed`, constants.NA] },
          ambulance: { $ifNull: [`$ambulance`, constants.NA] },
          about: { $ifNull: [`$about`, constants.NA] },
          email: { $ifNull: [`$email`, constants.NA] },
          name: "$masterTableDetails.name",
          hospitalId: "$masterTableDetails.hospitalId",
          hospitalType: 1,
          hospitalTypeDetails: 1,
        },
      },
    ]);
    return data[0];
  } catch (error) {
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
    return data[0];
  } catch (error) {
    return false;
  }
};

const hospitalAddressData = async (condition) => {
  try {
    const data = await Hospital.model.aggregate([
      { $match: condition },
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
          address: {
            landmark: 1,
            locality: 1,
            city: 1,
            state: 1,
            pincode: 1,
            country: 1,
            stateName: "$addressState.name",
          },
          location: 1,
          isLocationShared: 1,
        },
      },
    ]);
    return data[0];
  } catch (error) {
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
    return data[0];
  } catch (error) {
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
          _id: 0,
        },
      },
    ]);
    return data[0];
  } catch (error) {
    return false;
  }
};

const hospitalSocialData = async (condition) => {
  try {
    const data = await Hospital.model.aggregate([
      { $match: condition },
      { $unwind: "$social" },
      {
        $lookup: {
          from: "socialmedias",
          localField: "social.type",
          foreignField: "_id",
          as: "social.socialMedia",
        },
      },
      {
        $unwind: "$social.socialMedia",
      },
      {
        $group: {
          _id: "$_id",
          social: { $push: "$social" },
        },
      },
      {
        $addFields: {
          social: {
            $map: {
              input: "$social",
              as: "soc",
              in: {
                _id: "$$soc._id",
                type: "$$soc.type",
                url: "$$soc.url",
                socialMediaName: "$$soc.socialMedia.name",
                socialMediaLogo: "$$soc.socialMedia.logo",
              }, //._id
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          social: 1,
        },
      },
    ]);
    return data[0];
  } catch (error) {
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
  } catch (error) {
    return false;
  }
};

const hospitalApprovalList = async (
  condition,
  hospitalQuery,
  limit,
  skip,
  sortBy,
  order,
  search
) => {
  try {
    const matchSearch = {};
    const sortObject = {};
    sortObject[sortBy] = constants.LIST.ORDER[order];
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
      // { $match: hospitalQuery },
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
          profilePic: 1,
          userTableDetails: 1,
          hospitalName: "$hospitalName.name",
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
          data: [{ $skip: Number(skip) }, { $limit: Number(limit) }],
        },
      },

      // {
      //   $addFields: {
      //     count: { $arrayElemAt: ["$count.count", 0] },
      //   },
      // },
    ]);
    return data;
  } catch (error) {
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
          hospitalName: "$hospitalName.name",
          hospitalTypeDetails: 1,
          establishmentProof: 1,
        },
      },
    ]);
    return data;
  } catch (error) {
    return false;
  }
};

const doctorRequestList = async (
  condition,
  doctorQuery,
  limit,
  skip,
  sortBy,
  order
) => {
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
        $unwind: { path: "$doctorData", preserveNullAndEmptyArrays: true },
      },
      {
        $lookup: {
          from: "users",
          localField: "doctorData.userId",
          foreignField: "_id",
          as: "doctorUser",
        },
      },
      { $match: doctorQuery },
      {
        $unwind: { path: "$doctorUser", preserveNullAndEmptyArrays: true },
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
            userId: "$doctorData.userId",
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
  } catch (error) {
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
          email: {
            $ifNull: [`$establishmentMaster.establishmentEmail`, constants.NA],
          },
          hospitalType: { $ifNull: [`$hospitalType.name`, constants.NA] },
          hospitalTypeiD: { $ifNull: [`$hospitalType._id`, constants.NA] },
          hospitalName: {
            $ifNull: [`$establishmentMaster.name`, constants.NA],
          },
          address: {
            $ifNull: [
              {
                landmark: "$establishmentMaster.address.landmark",
                locality: "$establishmentMaster.address.locality",
                cityName: "$establishmentMaster.address.city",
                state: "$addressState.name",
                stateId: "$establishmentMaster.address.state",
                pincode: "$establishmentMaster.address.pincode",
                country: "$establishmentMaster.address.country",
              },
              constants.NA,
            ],
          },
          location: `$establishmentMaster.location`,
          profilePic: { $ifNull: [`$hospital.profilePic`, constants.NA] },
          totalDoctors: { $ifNull: [`$hospital.totalDoctor`, 0, constants.NA] },
          joiningDate: { $ifNull: [`$hospital.createdAt`, constants.NA] },
          phone: { $ifNull: [`$phone`, constants.NA] },
          status: { $ifNull: [`$hospital.isVerified`, constants.NA] },
          lowerName: { $toLower: "$fullName" },
          establishmentId: `$establishmentMaster._id`,
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

const getHospitalDataByID = async (Model, condition, type, sortCondition) => {
  try {
    const recordKey = constants.SPECIALITY_PROCEDURE_RECORD_KEY[type];
    const specialityLookup = {
      lookup: {
        from: "specializations",
        localField: "speciality",
        foreignField: "_id",
        as: "specialityName",
      },
      unwind: {
        path: "$specialityName",
        preserveNullAndEmptyArrays: false,
      },
      projectionKey: {
        _id: 0,
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
        preserveNullAndEmptyArrays: false,
      },
      projectionKey: {
        _id: 0,
        procedureId: { $ifNull: [`$procedureName._id`, constants.NA] },
        procedureName: { $ifNull: [`$procedureName.name`, constants.NA] },
      },
    };

    const { lookup, unwind, projectionKey } =
      type === constants.SPECIALITY_PROCEDURE.SPECIALITY
        ? specialityLookup
        : procedureLookup;

    return await Model.aggregate([
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
      { $sort: sortCondition },
    ]);
  } catch (error) {
    console.log(error);
    return false;
  }
};

const hospitalAboutUs = async (condition) => {
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
      { $unwind: { path: "$hospital", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "users",
          localField: "hospital.userId",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
      { $match: { "user.isDeleted": false } },
      {
        $lookup: {
          from: "socialmedias",
          localField: "hospital.social.type",
          foreignField: "_id",
          as: "socialMediaMaster",
        },
      },
      {
        $lookup: {
          from: "statemasters",
          localField: "address.state",
          foreignField: "_id",
          as: "stateName",
        },
      },
      {
        $unwind: {
          path: "$stateName",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "specializations",
          localField: "hospital.speciality",
          foreignField: "_id",
          as: "specialization",
        },
      },
      {
        $addFields: {
          social: {
            $map: {
              input: "$hospital.social",
              as: "socialMedia",
              in: {
                $mergeObjects: [
                  "$$socialMedia",
                  {
                    socialmedias: {
                      $arrayElemAt: [
                        "$socialMediaMaster",
                        {
                          $indexOfArray: [
                            "$socialMediaMaster._id",
                            "$$socialMedia.type",
                          ],
                        },
                      ],
                    },
                  },
                ],
              },
            },
          },
        },
      },
      {
        $lookup: {
          from: "establishmenttimings",
          let: { establishmentId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$establishmentId", "$$establishmentId"] },
                    { $eq: ["$isVerified", 2] },
                  ],
                },
              },
            },
          ],
          as: "establishmentTiming",
        },
      },
      {
        $unwind: {
          path: "$establishmentTiming",
          preserveNullAndEmptyArrays: true,
        },
      },
      { $match: { "establishmentTiming.doctorId": { $exists: false } } },
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
        $project: {
          name: 1,
          hospitalType: "$hospitalType.name",
          hospitalTypeDetails: "$hospitalType",
          rating: 1,
          reviews: { $ifNull: [`$totalreviews`, constants.NA] },
          bedCount: "$hospital.totalBed",
          ambulanceCount: "$hospital.ambulance",
          address: 1,
          location: 1,
          social: 1,
          images: { $ifNull: [`$hospital.image`, constants.NA] },
          about: "$hospital.about",
          profilePic: "$hospital.profilePic",
          establishmentTiming: "$establishmentTiming",
          specialization: 1,
          stateName: 1,
          claimProfile: {
            $cond: {
              if: {
                $and: [
                  { $eq: ["$hospital.steps", 4] },
                  { $eq: ["$hospital.profileScreen", 5] },
                ],
              },
              then: true,
              else: false,
            },
          },
        },
      },
    ]);
    return data.length === 0 ? false : data;
  } catch (error) {
    console.log(error);
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
      $cond: [{ $eq: ["$patientUser.steps", 4] }, true, false],
    },
  },
  doctor: {
    doctorName: { $ifNull: [`$doctor.fullName`, constants.NA] },
    doctorId: { $ifNull: [`$doctorId`, constants.NA] },
  },
  establishmentTiming: { $ifNull: [`$establishmentTiming`, constants.NA] },
};

const appointmentList = async (
  condition,
  userId,
  sortCondition,
  offset,
  limit,
  isExport = false
) => {
  try {
    const facetObject = {
      count: [{ $count: "total" }],
      data: [],
    };
    if (!isExport) {
      facetObject.data.push({ $skip: offset });
      facetObject.data.push({ $limit: limit });
    }

    const data = await Appointment.model.aggregate([
      { $match: condition },
      { $sort: { date: 1 } },
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
                    { $eq: ["$isVerified", 2] },
                  ],
                },
              },
            },
          ],
          as: "establishmentTiming",
        },
      },
      {
        $unwind: {
          path: "$establishmentTiming",
          preserveNullAndEmptyArrays: true,
        },
      },
      { $match: { "establishmentTiming.isDeleted": false } },
      {
        $project: calendarProject,
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
  } catch (error) {
    console.log(error);
    return false;
  }
};

const calendarList = async (
  condition,
  hospitalQuery,
  offset,
  limit,
  isExport = true
) => {
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
                    { $eq: ["$isVerified", 2] },
                    { $eq: ["$isDeleted", false] },
                    { $eq: ["$isActive", true] },
                  ],
                },
              },
            },
          ],
          as: "establishmentTiming",
        },
      },
      {
        $unwind: {
          path: "$establishmentTiming",
          preserveNullAndEmptyArrays: true,
        },
      },
      { $match: { "establishmentTiming.isDeleted": false } },
      {
        $project: calendarProject,
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
  } catch (error) {
    console.log(error);
    return false;
  }
};

const detailsList = async (
  condition,
  sortCondition,
  offset,
  limit,
  searchQuery,
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
    const data = await EstablishmentTiming.model.aggregate([
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
          "hospitalUser.isDeleted": false,
          "hospitalUser.status": constants.PROFILE_STATUS.ACTIVE,
          "hospital.steps": constants.PROFILE_STEPS.COMPLETED,
          "hospital.isVerified": constants.PROFILE_STATUS.APPROVE,
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
          "doctorUser.isDeleted": false,
          "doctorUser.status": constants.PROFILE_STATUS.ACTIVE,
          "doctor.steps": constants.PROFILE_STEPS.COMPLETED,
          "doctor.isVerified": constants.PROFILE_STATUS.APPROVE,
        },
      },
      {
        $unwind: {
          path: "$doctor.service",
          preserveNullAndEmptyArrays: true,
        },
      },
      { $match: searchQuery },
      {
        $project: {
          _id: { $ifNull: [`$_id`, constants.NA] },
          hospitalId: { $ifNull: [`$establishmentId`, constants.NA] },
          doctorId: { $ifNull: [`$doctorId`, constants.NA] },
          serviceId: { $ifNull: [`$doctor.service._id`, constants.NA] },
          name: { $ifNull: [`$doctor.service.name`, constants.NA] },
          lowerName: { $toLower: `$doctor.service.name` },
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
        $lookup: {
          from: "establishmentmasters",
          localField: "establishmentId",
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
        $project: {
          _id: { $ifNull: [`$_id`, constants.NA] },
          appointmentId: { $ifNull: [`$appointmentId`, constants.NA] },
          createdAt: { $ifNull: [`$createdAt`, constants.NA] },
          patientName: {
            $cond: {
              if: { $eq: ["$anonymous", true] },
              then: null,
              else: "$patientUser.fullName",
            },
          },
          anonymous: 1,
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
          treatment: 1,
          rating: "$hospital.rating",
          waitTime: "$hospital.waitTime",
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

const getSortCondition = (sortBy) => {
  switch (sortBy) {
    case 1:
      return { reviews: -1 };
    case 2:
      return { rating: -1 };
    case 3:
      return { consultationFees: 1 };
    case 4:
      return { consultationFees: -1 };
    case 5:
      return { experience: -1 };
    case 6:
      return { doctorRecommended: -1 };
    default:
      return { createdAt: -1 };
  }
};

// Function to calculate time slots for a given establishment timing
function createTimeSlots(establishmentTiming) {
  const slotDuration = establishmentTiming.slotTime;
  const result = {};

  for (const day in establishmentTiming) {
    if (day === "_id" || day === "doctorId" || day === "establishmentId")
      continue;
    const slots = establishmentTiming[day] || [];
    const timeSlots = [];

    for (const slot of slots) {
      const from = moment(slot.from, "hh:mm A");
      const to = moment(slot.to, "hh:mm A");

      while (from.isBefore(to)) {
        timeSlots.push(from.format("hh:mm A"));
        from.add(slotDuration, "minutes");
      }
    }

    result[day] = timeSlots;
  }

  return result;
}

const parseRange = (range) => {
  if (range === "Free") {
    return [0, 0];
  } else if (range.endsWith("+")) {
    const value = Number(range.slice(0, -1));
    return [value, Infinity];
  } else {
    const [min, max] = range.split(" - ").map(Number);
    return [min, max];
  }
};

function getDayOfWeek(day) {
  const daysOfWeek = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  return daysOfWeek[day];
}

const findDoctorList = async (
  condition,
  offset,
  limit,
  filters,
  isExport = true
) => {
  try {
    const query = {};
    let slotQuery = {
      establishmentId: { $exists: true },
      totalSlotCount: { $gt: 0 },
    };
    const {
      timeOfDay, //
      availability, //single 1, 2, 3
      sortBy, //
      specialty, //arr
      consultationFee,
    } = filters;
    if (availability) {
      const today = moment().startOf("day");
      const currentTime = moment().format("h:mm A");
      let dayForAvailibility;
      switch (availability) {
        case 1:
          dayForAvailibility = today.format("ddd").toLowerCase();
          query[`${dayForAvailibility}`] = { $ne: [] };
          query[`${dayForAvailibility}` + ".to"] = {
            $gt: "0" + currentTime.substring(0, 7),
          };
          break;
        case 2:
          dayForAvailibility = today.add(1, "days").format("ddd").toLowerCase();
          query[`${dayForAvailibility}`] = { $ne: [] };
          break;
      }
    }

    if (consultationFee) {
      query["$expr"] = {
        $or: consultationFee.map((range) => {
          const [min, max] = parseRange(range);
          if (max === Infinity) {
            return { $gte: ["$consultationFees", min] };
          } else {
            return {
              $and: [
                { $gte: ["$consultationFees", min] },
                { $lte: ["$consultationFees", max] },
              ],
            };
          }
        }),
      };
    }
    if (specialty) {
      const specialtyObjectIds = specialty.map((id) => new Types.ObjectId(id));
      query["specialization._id"] = { $in: specialtyObjectIds };
    }
    if (timeOfDay) {
      const daysOfWeek = Array.from({ length: 7 }, (_, i) => getDayOfWeek(i));
      // // Use the slot names directly from the timeOfDay array in the payload
      const slotTime = [];
      timeOfDay.map((slot) => {
        slotTime.push(slot.toLowerCase());
      });
      const slotCondition = daysOfWeek.flatMap((day) => {
        const queryCondition = {};
        queryCondition[`${day}.slot`] = { $in: slotTime };
        return queryCondition;
      });
      slotQuery["$or"] = slotCondition;
    }
    const newSortCondition = getSortCondition(sortBy);

    const facetObject = {
      count: [{ $count: "total" }],
      data: [{ $sort: newSortCondition }],
    };
    if (!isExport) {
      facetObject.data.push({ $skip: offset });
      facetObject.data.push({ $limit: limit });
    }

    const data = await EstablishmentTiming.model.aggregate([
      { $match: condition },
      {
        $lookup: {
          from: "establishmentmasters",
          localField: "establishmentId",
          foreignField: "_id",
          as: "master",
        },
      },
      {
        $unwind: {
          path: "$master",
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
          "doctorUser.status": { $ne: constants.PROFILE_STATUS.DEACTIVATE },
          "doctorUser.isDeleted": false,
          "doctor.isVerified": constants.PROFILE_STATUS.APPROVE,
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
        $project: {
          _id: { $ifNull: [`$doctorId`, constants.NA] },
          establishmentId: { $ifNull: [`$establishmentId`, constants.NA] },
          establishmentProfileSlug: {
            $ifNull: [`$master.profileSlug`, constants.NA],
          },
          specialization: 1,
          doctorProfileSlug: { $ifNull: [`$doctor.profileSlug`, constants.NA] },
          experience: {
            $ifNull: [`$doctor.experience`, 0],
          },
          doctorProfilePic: { $ifNull: [`$doctor.profilePic`, constants.NA] },
          rating: { $ifNull: [`$doctor.rating`, 0] },
          reviews: { $ifNull: [`$doctor.totalreviews`, 0] },
          doctorRecommended: { $ifNull: [`$doctor.recommended`, 0] },
          doctorName: {
            $ifNull: [`$doctorUser.fullName`, constants.NA],
          },
          consultationFees: { $ifNull: [`$consultationFees`, 0] },
          createdAt: { $ifNull: [`$createdAt`, constants.NA] },
          mon: 1,
          tue: 1,
          wed: 1,
          thu: 1,
          fri: 1,
          sat: 1,
          sun: 1,
          isActive: 1,
          address: { $ifNull: [`$master.address`, constants.NA] },
        },
      },
      {
        $addFields: {
          totalSlotCount: {
            $add: [
              { $size: "$mon" },
              { $size: "$tue" },
              { $size: "$wed" },
              { $size: "$thu" },
              { $size: "$fri" },
              { $size: "$sat" },
              { $size: "$sun" },
            ],
          },
        },
      },
      {
        $match: slotQuery,
      },
      { $match: query },
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

const findHospitalList = async (
  condition,
  offset,
  limit,
  hospitalQuery,
  filters,
  isExport = false
) => {
  try {
    const query = {};
    let slotQuery = {
      establishmentId: { $exists: true },
      totalSlotCount: { $gt: 0 },
    };
    const {
      timeOfDay, //
      availability, //single 1, 2, 3
      sortBy, //
      specialty, //arr
      consultationFee,
    } = filters;
    if (availability) {
      const today = moment().startOf("day");
      const currentTime = moment().format("h:mm A");
      let dayForAvailibility;
      switch (availability) {
        case 1:
          dayForAvailibility = today.format("ddd").toLowerCase();
          query[`${dayForAvailibility}`] = { $ne: [] };
          query[`${dayForAvailibility}` + ".to"] = {
            $gt: "0" + currentTime.substring(0, 7),
          };
          break;
        case 2:
          dayForAvailibility = today.add(1, "days").format("ddd").toLowerCase();
          query[`${dayForAvailibility}`] = { $ne: [] };
          break;
      }
    }

    if (consultationFee) {
      query["$expr"] = {
        $or: consultationFee.map((range) => {
          const [min, max] = parseRange(range);
          if (max === Infinity) {
            return { $gte: ["$consultationFees", min] };
          } else {
            return {
              $and: [
                { $gte: ["$consultationFees", min] },
                { $lte: ["$consultationFees", max] },
              ],
            };
          }
        }),
      };
    }
    if (specialty) {
      const specialtyObjectIds = specialty.map((id) => new Types.ObjectId(id));
      query["specialization._id"] = { $in: specialtyObjectIds };
    }
    if (timeOfDay) {
      const daysOfWeek = Array.from({ length: 7 }, (_, i) => getDayOfWeek(i));
      // // Use the slot names directly from the timeOfDay array in the payload
      const slotTime = [];
      timeOfDay.map((slot) => {
        slotTime.push(slot.toLowerCase());
      });
      const slotCondition = daysOfWeek.flatMap((day) => {
        const queryCondition = {};
        queryCondition[`${day}.slot`] = { $in: slotTime };
        return queryCondition;
      });
      slotQuery["$or"] = slotCondition;
    }
    const newSortCondition = getSortCondition(sortBy);

    const facetObject = {
      count: [{ $count: "total" }],
      data: [],
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
        $lookup: {
          from: "hospitaltypes",
          localField: "hospital.hospitalType",
          foreignField: "_id",
          as: "hospitalType",
        },
      },
      {
        $lookup: {
          from: "establishmenttimings",
          let: { establishmentMasterId: "$establishmentMaster._id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$establishmentId", "$$establishmentMasterId"] },
                    { $eq: ["$isVerified", 2] },
                  ],
                },
              },
            },
          ],
          as: "establishmentTiming",
        },
      },
      {
        $addFields: {
          totalDoctor: { $subtract: [{ $size: "$establishmentTiming" }, 1] },
        },
      },
      {
        $match: {
          totalDoctor: { $gt: 0 },
        },
      },
      {
        $unwind: {
          path: "$establishmentTiming",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $match: {
          "establishmentTiming.doctorId": { $exists: true },
        },
      },
      {
        $lookup: {
          from: "doctors",
          localField: "establishmentTiming.doctorId",
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
          "doctorUser.status": { $ne: constants.PROFILE_STATUS.DEACTIVATE },
          "doctorUser.isDeleted": false,
          "doctor.isVerified": constants.PROFILE_STATUS.APPROVE,
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
        $project: {
          _id: { $ifNull: [`$establishmentMaster._id`, constants.NA] },
          establishmentProfileSlug: {
            $ifNull: [`$establishmentMaster.profileSlug`, constants.NA],
          },
          name: { $ifNull: [`$establishmentMaster.name`, constants.NA] },
          profilePic: { $ifNull: [`$hospital.profilePic`, constants.NA] },
          reviews: { $ifNull: [`$establishmentMaster.totalreviews`, 0] },
          rating: { $ifNull: [`$establishmentMaster.rating`, 0] },
          address: { $ifNull: [`$establishmentMaster.address`, constants.NA] },
          hospitalType: 1,
          totalBed: { $ifNull: [`$hospital.ambulance`, 0] },
          ambulance: { $ifNull: [`$hospital.totalBed`, 0] },
          totalDoctor: 1,
          establishmentTimingId: {
            $ifNull: [`$establishmentTiming._id`, constants.NA],
          },
          doctorId: {
            $ifNull: [`$establishmentTiming.doctorId`, constants.NA],
          },
          establishmentId: {
            $ifNull: [`$establishmentTiming.establishmentId`, constants.NA],
          },
          createdAt: 1,
          specialization: 1,
          experience: {
            $ifNull: [`$doctor.experience`, 0],
          },
          doctorProfilePic: { $ifNull: [`$doctor.profilePic`, constants.NA] },
          doctorRecommended: { $ifNull: [`$doctor.recommended`, 0] },
          doctorName: {
            $ifNull: [`$doctorUser.fullName`, constants.NA],
          },
          consultationFees: {
            $ifNull: [`$establishmentTiming.consultationFees`, constants.NA],
          },
          mon: "$establishmentTiming.mon",
          tue: "$establishmentTiming.tue",
          wed: "$establishmentTiming.wed",
          thu: "$establishmentTiming.thu",
          fri: "$establishmentTiming.fri",
          sat: "$establishmentTiming.sat",
          sun: "$establishmentTiming.sun",
          doctorProfileSlug: {
            $ifNull: [`$doctor.profileSlug`, 0],
          },
        },
      },
      {
        $addFields: {
          totalSlotCount: {
            $add: [
              { $size: "$mon" },
              { $size: "$tue" },
              { $size: "$wed" },
              { $size: "$thu" },
              { $size: "$fri" },
              { $size: "$sat" },
              { $size: "$sun" },
            ],
          },
        },
      },
      {
        $match: slotQuery,
      },
      { $match: query },
      { $sort: newSortCondition },
      {
        $group: {
          _id: "$_id", // Group by status field
          data: { $push: "$$ROOT" },
          createdAt: { $first: "$createdAt" },
        },
      },
      { $sort: { createdAt: -1 } },
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

const graphList = async (condition, toDate, fromDate, specialization) => {
  try {
    if (fromDate) condition.date = { $gte: fromDate, $lte: toDate };
    else condition.date = { $lte: toDate };
    return await Appointment.model.aggregate([
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
      {
        $lookup: {
          from: "users",
          localField: "hospital.userId",
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
        $match: {
          "user.userType": constants.USER_TYPES.HOSPITAL,
          "user.status": { $ne: constants.PROFILE_STATUS.DEACTIVATE },
          "user.isDeleted": false,
          "hospital.isVerified": constants.PROFILE_STATUS.APPROVE,
          "hospital.steps": constants.PROFILE_STEPS.COMPLETED,
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
                    { $eq: ["$isVerified", 2] },
                  ],
                },
              },
            },
          ],
          as: "establishmentTiming",
        },
      },
      {
        $unwind: {
          path: "$establishmentTiming",
          preserveNullAndEmptyArrays: false,
        },
      },
      {
        $lookup: {
          from: "doctors",
          localField: "establishmentTiming.doctorId",
          foreignField: "_id",
          as: "doctorDetails",
        },
      },
      {
        $unwind: {
          path: "$doctorDetails",
          preserveNullAndEmptyArrays: false,
        },
      },
      {
        $unwind: {
          path: "$doctorDetails.specialization",
          preserveNullAndEmptyArrays: false,
        },
      },
      {
        $lookup: {
          from: "specializations",
          localField: "doctorDetails.specialization",
          foreignField: "_id",
          as: "specialization",
        },
      },
      {
        $unwind: {
          path: "$specialization",
          preserveNullAndEmptyArrays: true,
        },
      },
      { $match: { "specialization._id": { $in: specialization } } },
      {
        $group: {
          _id: "$specialization._id",
          count: { $sum: 1 },
          name: { $first: "$specialization.name" },
        },
      },
    ]);
  } catch (error) {
    console.log(error);
    return false;
  }
};

const specializationMaster = async (specialization) => {
  try {
    const data = await Specialization.model.aggregate([
      { $match: { name: { $exists: true }, isDeleted: false } },
      { $project: { _id: 1 } },
    ]);
    const responseData = [];
    if (!specialization || specialization?.length === 0)
      data.forEach((specializations) => {
        responseData.push(specializations._id);
      });
    else
      specialization.forEach((speciality) => {
        responseData.push(new Types.ObjectId(speciality));
      });
    return responseData;
  } catch (error) {
    return [];
  }
};

const specialityList = async (condition) => {
  try {
    return await EstablishmentTiming.model.aggregate([
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
        $unwind: {
          path: "$doctorDetails",
          preserveNullAndEmptyArrays: false,
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "doctorDetails.userId",
          foreignField: "_id",
          as: "userDetails",
        },
      },
      {
        $unwind: {
          path: "$userDetails",
          preserveNullAndEmptyArrays: false,
        },
      },
      {
        $match: {
          "doctorDetails.isVerified": constants.PROFILE_STATUS.APPROVE,
          "doctorDetails.steps": constants.PROFILE_STEPS.COMPLETED,
          "userDetails.isDeleted": false,
          "userDetails.status": constants.PROFILE_STATUS.ACTIVE,
        },
      },
      {
        $unwind: {
          path: "$doctorDetails.specialization",
          preserveNullAndEmptyArrays: false,
        },
      },
      {
        $lookup: {
          from: "specializations",
          localField: "doctorDetails.specialization",
          foreignField: "_id",
          as: "specialization",
        },
      },
      {
        $unwind: {
          path: "$specialization",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $group: {
          _id: "$specialization._id",
          specialityId: { $first: "$specialization._id" },
          specialityName: { $first: "$specialization.name" },
        },
      },
    ]);
  } catch (error) {
    console.log(error);
    return false;
  }
};

const graphListDoctors = async (
  condition,
  toDate,
  fromDate,
  doctorFilter,
  groupByWeek
) => {
  try {
    if (fromDate) condition.date = { $gte: fromDate, $lte: toDate };
    else condition.date = { $lte: toDate };
    if (doctorFilter.length !== 0) condition.doctorId = { $in: doctorFilter };
    const groupByPipeline = groupByWeek
      ? [
          {
            $unwind: "$weekCount",
          },
          {
            $group: {
              _id: {
                _id: "$weekCount._id",
                week: "$weekCount.week",
              },
              count: { $sum: 1 },
              doctorName: { $first: "$doctorName" },
            },
          },
          {
            $group: {
              _id: "$_id._id",
              weeklyCount: {
                $push: {
                  week: "$_id.week",
                  count: "$count",
                },
              },
              doctorName: { $first: "$doctorName" },
            },
          },
          { $sort: { "weeklyCount.week": 1 } },
        ]
      : [
          {
            $unwind: "$monthCount",
          },
          {
            $group: {
              _id: {
                _id: "$monthCount._id",
                month: "$monthCount.month",
              },
              count: { $sum: 1 },
              doctorName: { $first: "$doctorName" },
            },
          },
          {
            $group: {
              _id: "$_id._id",
              monthlyCount: {
                $push: {
                  month: "$_id.month",
                  count: "$count",
                },
              },
              doctorName: { $first: "$doctorName" },
            },
          },
          { $sort: { "monthlyCount.month": 1 } },
        ];
    return await Appointment.model.aggregate([
      { $match: condition },
      { $sort: { date: 1 } },
      {
        $addFields: {
          month: { $month: "$date" },
          week: { $week: "$date" },
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
        $match: {
          "user.userType": constants.USER_TYPES.HOSPITAL,
          "user.status": constants.PROFILE_STATUS.ACTIVE,
          "user.isDeleted": false,
          "hospital.isVerified": constants.PROFILE_STATUS.APPROVE,
          "hospital.steps": constants.PROFILE_STEPS.COMPLETED,
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
                    { $eq: ["$isVerified", 2] },
                  ],
                },
              },
            },
          ],
          as: "establishmentTiming",
        },
      },
      {
        $unwind: {
          path: "$establishmentTiming",
          preserveNullAndEmptyArrays: false,
        },
      },
      {
        $lookup: {
          from: "doctors",
          localField: "establishmentTiming.doctorId",
          foreignField: "_id",
          as: "doctorDetails",
        },
      },
      {
        $unwind: {
          path: "$doctorDetails",
          preserveNullAndEmptyArrays: false,
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "doctorDetails.userId",
          foreignField: "_id",
          as: "doctorUser",
        },
      },
      {
        $unwind: {
          path: "$doctorUser",
          preserveNullAndEmptyArrays: false,
        },
      },
      {
        $match: {
          "doctorUser.status": constants.PROFILE_STATUS.ACTIVE,
          "doctorUser.isDeleted": false,
          "doctorDetails.isVerified": constants.PROFILE_STATUS.APPROVE,
          "doctorDetails.steps": constants.PROFILE_STEPS.COMPLETED,
        },
      },
      {
        $project: {
          doctorId: 1,
          date: 1,
          week: 1,
          month: 1,
          doctorName: { $ifNull: [`$doctorUser.fullName`, constants.NA] },
        },
      },
      {
        $group: {
          _id: `$doctorId`,
          data: { $push: "$$ROOT" },
          doctorName: { $first: "$doctorName" },
        },
      },
      {
        $project: {
          _id: 1,
          count: 1,
          doctorName: 1,
          weekCount: {
            $map: {
              input: "$data",
              as: "item",
              in: {
                _id: "$_id",
                week: "$$item.week",
                count: {
                  $reduce: {
                    input: {
                      $filter: {
                        input: "$data",
                        as: "inner",
                        cond: { $eq: ["$$inner.week", "$$item.week"] },
                      },
                    },
                    initialValue: 0,
                    in: { $add: ["$$value", 1] },
                  },
                },
              },
            },
          },
          monthCount: {
            $map: {
              input: "$data",
              as: "item",
              in: {
                _id: "$_id",
                month: "$$item.month",
                count: {
                  $reduce: {
                    input: {
                      $filter: {
                        input: "$data",
                        as: "inner",
                        cond: { $eq: ["$$inner.month", "$$item.month"] },
                      },
                    },
                    initialValue: 0,
                    in: { $add: ["$$value", 1] },
                  },
                },
              },
            },
          },
        },
      },
      ...groupByPipeline,
    ]);
  } catch (error) {
    console.log(error);
    return false;
  }
};

const establishmentServiceData = async (condition) => {
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
      {
        $unwind: {
          path: "$hospital.service",
          preserveNullAndEmptyArrays: false,
        },
      },
      {
        $project: {
          _id: 1,
          serviceId: { $ifNull: [`$hospital.service._id`, constants.NA] },
          name: { $ifNull: [`$hospital.service.name`, constants.NA] },
        },
      },
    ]);
    return { count: data.length, data };
  } catch (error) {
    return false;
  }
};

const totalDoctorCount = async (establishmentId) => {
  try {
    const data = await EstablishmentTiming.model.aggregate([
      {
        $match: {
          establishmentId: new Types.ObjectId(establishmentId),
          isVerified: constants.PROFILE_STATUS.APPROVE,
          isDeleted: false,
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
      { $unwind: { path: "$doctor", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "users",
          localField: "doctor.userId",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
      {
        $match: {
          "user.isDeleted": false,
          "user.status": constants.PROFILE_STATUS.APPROVE,
          "doctor.isVerified": constants.PROFILE_STATUS.APPROVE,
        },
      },
      { $count: "total" },
    ]);
    return data[0]?.total;
  } catch (error) {
    console.log(error);
    return false;
  }
};

const hospitalDashboardAppointmentCount = async (condition) => {
  try {
    const data = await Appointment.model.aggregate([
      {
        $match: condition,
      },
      {
        $lookup: {
          from: "establishmenttimings",
          let: { establishmentId: "$establishmentId", doctorId: "$doctorId" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$establishmentId", "$$establishmentId"] },
                    { $eq: ["$doctorId", "$$doctorId"] },
                    { $eq: ["$isVerified", 2] },
                    { $eq: ["$isDeleted", false] },
                    { $eq: ["$isActive", true] },
                  ],
                },
              },
            },
          ],
          as: "establishmentTiming",
        },
      },
      {
        $lookup: {
          from: "doctors",
          localField: "establishmentTiming.doctorId",
          foreignField: "_id",
          as: "doctor",
        },
      },
      { $unwind: { path: "$doctor", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "users",
          localField: "doctor.userId",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
      {
        $match: {
          "user.isDeleted": false,
          "user.status": constants.PROFILE_STATUS.APPROVE,
          "doctor.isVerified": constants.PROFILE_STATUS.APPROVE,
        },
      },
      { $count: "total" },
    ]);
    return data[0]?.total || 0;
  } catch (error) {
    console.log(error);
    return false;
  }
};

const slugForId = async (condition, city) => {
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
      {
        $lookup: {
          from: "users",
          localField: "hospital.userId",
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
        $match: {
          "user.isDeleted": false,
          "user.status": constants.PROFILE_STATUS.ACTIVE,
          "hospital.steps": constants.PROFILE_STEPS.COMPLETED,
          "hospital.isVerified": constants.PROFILE_STATUS.APPROVE,
          "address.city": { $regex: new RegExp(`^${city}$`, 'i') },
        },
      },
      {
        $project: {
          establishmentId: { $ifNull: [`$_id`, constants.NA] },
          hospitalId: { $ifNull: [`$hospital._id`, constants.NA] },
          userId: { $ifNull: [`$user._id`, constants.NA] },
          address: { $ifNull: [`$address`, constants.NA] },
        },
      },
    ]);
    return data.length > 0 ? data[0] : false;
  } catch (error) {
    return false;
  }
};

const hospitalListSitemap = async () => {
  try {
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
          from: "establishmentmasters",
          let: { hospitalBaseId: "$hospital._id" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$hospitalId", "$$hospitalBaseId"] },
              },
            },
          ],
          as: "establishmentMaster",
        },
      },
      {
        $unwind: {
          path: "$establishmentMaster",
          preserveNullAndEmptyArrays: false,
        },
      },
      {
        $match: {
          isDeleted: false,
          status: constants.PROFILE_STATUS.ACTIVE,
          "hospital.steps": constants.PROFILE_STEPS.COMPLETED,
          "hospital.isVerified": { $ne: constants.PROFILE_STATUS.REJECT },
        },
      },
      {
        $project: {
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
          establishmentId: "$establishmentMaster._id",
          establishmentProfileSlug: "$establishmentMaster.profileSlug",
          updatedAt: "$establishmentMaster.updatedAt",
        },
      },
    ]);
    data.map((hospital, index) => {
      const slugStr = hospital?.address?.city;
      const citySlug = slugify(slugStr, {
        lower: true,
        remove: undefined,
        strict: true,
      });
      data[index].address.city = citySlug;
    });
    return data;
  } catch (error) {
    console.log(error);
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
  reviewList,
  findDoctorList,
  findHospitalList,
  graphList,
  specializationMaster,
  specialityList,
  graphListDoctors,
  establishmentServiceData,
  totalDoctorCount,
  hospitalDashboardAppointmentCount,
  slugForId,
  hospitalListSitemap,
  hospitalListSitemap,
};
