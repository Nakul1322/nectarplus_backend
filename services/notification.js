const { Notification } = require("../models/index");
const common = require("../services/common");
const { constants } = require("../utils/constant");

const notificationList = async (condition, offset, limit) => {
  try {
    const data = await Notification.model.aggregate([
      {
        $lookup: {
          from: "users",
          localField: "senderId",
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
        $unwind: {
          path: "$user.userType",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "doctors",
          localField: "user._id",
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
          as: "specializationMaster",
        },
      },
      {
        $lookup: {
          from: "establishmenttimings",
          localField: "doctor._id",
          foreignField: "doctorId",
          as: "timingMaster",
        },
      },
      {
        $lookup: {
          from: "establishmentmasters",
          localField: "timingMaster.establishmentId",
          foreignField: "_id",
          as: "doctorMaster",
        },
      },
      {
        $lookup: {
          from: "hospitals",
          localField: "user._id",
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
          as: "hospitalTypeMaster",
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
      // {
      //   $unwind: {
      //     path: "$establishmentMaster",
      //     preserveNullAndEmptyArrays: true,
      //   },
      // },
      {
        $lookup: {
          from: "patients",
          localField: "user._id",
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
        $project: {
          _id: 1,
          createdAt: { $ifNull: [`$createdAt`, null] },
          receiverId: 1,
          senderId: 1,
          doctor: {
            name: {
              $cond: {
                if: { $in: ["$user.userType", [constants.USER_TYPES.DOCTOR]] },
                then: `$user.fullName`,
                else: null,
              },
            },
            profilePic: {
              $cond: {
                if: {
                  $in: ["$user.userType", [constants.USER_TYPES.DOCTOR]],
                },
                then: `$doctor.profilePic`,
                else: null,
              },
            },
            isVerified: {
              $cond: {
                if: { $in: ["$user.userType", [constants.USER_TYPES.DOCTOR]] },
                then: `$doctor.isVerified`,
                else: null,
              },
            },
            address: {
              $cond: {
                if: { $in: ["$user.userType", [constants.USER_TYPES.DOCTOR]] },
                then: { $arrayElemAt: ["$doctorMaster.address", 0] },
                else: null,
              },
            },
            specialization: "$specializationMaster",
            doctorId: {
              $cond: {
                if: { $in: ["$user.userType", [constants.USER_TYPES.DOCTOR]] },
                then: `$user._id`,
                else: null,
              },
            },
          },
          hospital: {
            name: {
              $cond: {
                if: { $in: ["$user.userType", [constants.USER_TYPES.HOSPITAL]] },
                then:  { $arrayElemAt: [`$establishmentMaster.name`, 0] },
                else: null,
              },
            },
            profilePic: {
              $cond: {
                if: {
                  $in: ["$user.userType", [constants.USER_TYPES.HOSPITAL]],
                },
                then: `$hospital.profilePic`,
                else: null,
              },
            },
            isVerified: {
              $cond: {
                if: { $in: ["$user.userType", [constants.USER_TYPES.HOSPITAL]] },
                then: `$hospital.isVerified`,
                else: null,
              },
            },
            address: {
              $cond: {
                if: { $in: ["$user.userType", [constants.USER_TYPES.HOSPITAL]] },
                then: { $arrayElemAt: [`$establishmentMaster.address`, 0] },
                else: null,
              },
            },
            hospitalId: {
              $cond: {
                if: { $in: ["$user.userType", [constants.USER_TYPES.HOSPITAL]] },
                then: `$user._id`,
                else: null,
              },
            },
            hospitalType: "$hospitalTypeMaster",
          },
          userAvatar: {
            $ifNull: [
              `$patient.profilePic`,
              `$doctor.profilePic`,
              `$hospital.profilePic`,
              null,
            ],
          },
          title: { $ifNull: [`$title`, null] },
          body: { $ifNull: [`$body`, null] },
          isRead: { $ifNull: [`$isRead`, null] },
          eventType: {
            $cond: {
              if: {
                $and: [
                  {
                    $eq: [
                      "$eventType",
                      constants.NOTIFICATION_TYPE.DOCTOR_SIGN_UP_PROOFS,
                    ],
                  },
                  { $in: ["$user.userType", [constants.USER_TYPES.HOSPITAL]] },
                ],
              },
              then: constants.NOTIFICATION_TYPE.HOSPITAL_SIGN_UP_PROOFS,
              else: "$eventType",
            },
          },
          eventId: 1,
          userType: "$user.userType",
          baseUser: { $ifNull: [`$userType`, null] },
          isDeleted: 1,
        },
      },
      { $match: condition },
      {
        $match: {
          $or: [
            { baseUser: { $ne: constants.USER_TYPES.ADMIN } },
            {
              baseUser: constants.USER_TYPES.ADMIN,
              $or: [
                {
                  "doctor.isVerified": constants.PROFILE_STATUS.PENDING,
                },
                {
                  "hospital.isVerified": constants.PROFILE_STATUS.PENDING,
                },
              ],
            },
          ],
        },
      },
      {
        $facet: {
          count: [{ $count: "total" }],
          data: [
            { $sort: { createdAt: -1 } },
            // { $skip: offset },
            // { $limit: limit },
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
    condition.isRead = false;
    data[0].unreadNotification = await common.count(
      Notification.model,
      condition
    );
    return data[0];
  } catch (error) {
    console.log(error);
    return false;
  }
};

module.exports = {
  notificationList,
};
