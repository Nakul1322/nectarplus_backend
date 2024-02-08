const {
  SurgeryEnquiry,
  DepartmentMaster,
  SurgeryMaster,
} = require("../models/index");
const { constants } = require("../utils/constant");

const enquiryList = async (
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
    const data = await SurgeryEnquiry.model.aggregate([
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
        $match: {
          $or: [
            {
              city: { $regex: new RegExp(searchQuery, "i") },
            },
            {
              name: { $regex: new RegExp(searchQuery, "i") },
            },
            {
              "surgeryMaster.title": { $regex: new RegExp(searchQuery, "i") },
            },
            {
              phone: { $regex: new RegExp(searchQuery, "i") },
            },
          ],
        },
      },
      {
        $project: {
          _id: { $ifNull: [`$_id`, constants.NA] },
          leadId: { $ifNull: [`$leadId`, constants.NA] },
          isMobileVerify: { $ifNull: [`$isMobileVerify`, constants.NA] },
          source: { $ifNull: [`$source`, constants.NA] },
          surgeryMasterName: {
            $ifNull: [`$surgeryMaster.title`, constants.NA],
          },
          name: { $ifNull: [`$name`, constants.NA] },
          phone: { $ifNull: [`$phone`, constants.NA] },
          city: { $ifNull: [`$city`, constants.NA] },
          claimByUserType: { $ifNull: [`$claimByUserType`, constants.NA] },
          status: { $ifNull: [`$status`, constants.NA] },
          comments: { $ifNull: [`$comments`, constants.NA] },
          claimedDate: { $ifNull: [`$claimedDate`, constants.NA] },
          followUpIn: { $ifNull: [`$followUpIn`, constants.NA] },
          followUpDate: { $ifNull: [`$followUpDate`, constants.NA] },
          createdAt: { $ifNull: [`$createdAt`, constants.NA] },
          lowerName: { $toLower: "$name" },
          countryCode: 1,
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

const departmentList = async (condition) => {
  try {
    return await DepartmentMaster.model.aggregate([
      { $match: condition },
      {
        $lookup: {
          from: "surgerymasters",
          let: { departmentId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$departmentId", "$$departmentId"] },
                    { $eq: ["$isDeleted", false] },
                  ],
                },
              },
            },
          ],
          as: "surgeryMaster",
        },
      },
      {
        $addFields: {
          countOfSurgery: { $size: `$surgeryMaster` },
        },
      },
      {
        $project: {
          _id: 1,
          name: 1,
          image: 1,
          isDeleted: 1,
          countOfSurgery: 1,
        },
      },
    ]);
  } catch (error) {
    console.log(error);
    return false;
  }
};

const departmentSurgeryList = async (condition) => {
  try {
    return await SurgeryMaster.model.aggregate([
      { $match: condition },
      {
        $project: {
          _id: { $ifNull: [`$_id`, constants.NA] },
          title: { $ifNull: [`$title`, constants.NA] },
          imageUrl: { $ifNull: [`$imageUrl`, constants.NA] },
          createdAt: { $ifNull: [`$createdAt`, constants.NA] },
          slug: { $ifNull: [`$slug`, constants.NA] },
        },
      },
      { $sort: { createdAt: -1 } },
    ]);
  } catch (error) {
    console.log(error);
    return false;
  }
};

module.exports = {
  enquiryList,
  departmentList,
  departmentSurgeryList,
};
