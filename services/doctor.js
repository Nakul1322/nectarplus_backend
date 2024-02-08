const {
  User,
  Appointment,
  Specialization,
  EstablishmentMaster,
  EstablishmentTiming,
  Doctor,
  Patient,
} = require("../models/index");
const { Types } = require("mongoose");
const { constants } = require("../utils/constant");
const moment = require("moment");
const common = require("./common");
const slugify = require("slugify");

const alphabetStatusParser = (data, alphabetStatus) => {
  data.forEach((alphabet) => {
    const { name } = alphabet;
    const firstLetter = name[0].toUpperCase();
    const index = firstLetter.charCodeAt(0) - 65;
    if (index >= 0 && index < 26) {
      alphabetStatus[index].status = 1;
    }
  });
  return alphabetStatus;
};

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

const getSortCondition = (sortBy, location) => {
  let sortObject;
  if (location && location.length === 2) sortObject = { distance: 1 };
  else sortObject = { createdAt: -1 };
  switch (sortBy) {
    case 1:
      return { createdAt: -1 };
    case 2:
      return { rating: -1 };
    case 3:
      return { consultationFees: 1 };
    case 4:
      return { consultationFees: -1 };
    case 5:
      return { convertedexperience: -1 };
    case 6:
      return { recommended: 1 };
    default:
      return sortObject;
  }
};

const lookupEstablishmentTiming = {
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
              { $eq: ["$isDeleted", false] },
            ],
          },
        },
      },
    ],
    as: "establishmenttiming",
  },
};

const lookupStateMaster = {
  $lookup: {
    from: "statemasters",
    localField: "address.state",
    foreignField: "_id",
    as: "address.state",
  },
};

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

const findAvailableDoctors = async (establishmentTimings) => {
  const doctorIds = [];
  for (const timing of establishmentTimings) {
    const timeSlots = createTimeSlots(timing);
    const doctorId = timing.doctorId;
    let isAvailable = false;

    for (const dateStr in timeSlots) {
      const date = moment(dateStr);
      if (date.isBefore(endDate) && date.isSameOrAfter(today)) {
        const bookedAppointments = await Appointment.model.find({
          doctorId: doctorId,
          date: {
            $gte: date.toDate(),
            $lt: date.clone().add(1, "days").toDate(),
          },
        });

        // Remove booked slots from the available slots
        const availableSlots = timeSlots[dateStr].filter((slot) => {
          return !bookedAppointments.some(
            (appointment) => appointment.date === slot
          );
        });

        if (availableSlots.length > 0) {
          isAvailable = true;
          break;
        }
      }
    }
    if (isAvailable) {
      doctorIds.push(doctorId);
    }
  }
  return doctorIds;
};

// cognitive complexity
const filterDoctor = async (
  filters,
  queryParams,
  sortCondition,
  offset,
  limit
) => {
  const {
    timeOfDay, // [Morning, Afternoon, Evening]
    availability, // single 1, 2, 3
    sortBy, // single 1,2,3,4,5,6
    specialty, //array
    consultationFee,
    coordinates,
  } = filters;
  const { filter, city, locality } = queryParams;
  let query = {};
  const locationFilter = {
    $or: [],
  };
  const searchFilter = {
    $or: [],
  };

  let slotQuery = {
    "establishmenttiming.establishmentId": { $exists: true },
    totalSlotCount: { $gt: 0 },
    "establishmenttiming.doctorId": { $exists: true },
  };
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
    query["specialization"] = {
      $elemMatch: { _id: { $in: specialtyObjectIds } },
    };
  }
  if (timeOfDay) {
    const daysOfWeek = Array.from({ length: 7 }, (_, i) => getDayOfWeek(i));
    const slotTime = [];
    timeOfDay.map((slot) => {
      slotTime.push(slot.toLowerCase());
    });
    const slotCondition = daysOfWeek.flatMap((day) => {
      const condition = {};
      condition[`establishmenttiming.${day}.slot`] = { $in: slotTime };
      return condition;
    });
    slotQuery["$or"] = slotCondition;
  }
  if (locality) {
    const localityParameter = locality.replace(/%20/g, " ");
    locationFilter["$or"].push({
      locality: { $regex: localityParameter, $options: "i" },
    });
  }
  if (city) {
    const cityParameter = city.replace(/%20/g, " ");
    locationFilter["$or"].push({
      city: { $regex: cityParameter, $options: "i" },
    });
  }
  if (filter) {
    const filterString = filter.replace(/%20/g, " ").replace(/[()]/g, "\\$&");
    const search = {
      $or: [
        {
          fullName: {
            $regex: filterString,
            $options: "i",
          },
        },
        {
          establishmentName: {
            $regex: filterString,
            $options: "i",
          },
        },
        {
          "specialization.name": {
            $regex: filterString,
            $options: "i",
          },
        },
        {
          "service.name": {
            $regex: filterString,
            $options: "i",
          },
        },
      ],
    };
    searchFilter["$or"].push(...search["$or"]);
  }
  if (searchFilter["$or"].length > 0 && locationFilter["$or"].length > 0) {
    query.$and = [];
    query["$and"].push(searchFilter);
    query["$and"].push(locationFilter);
  } else {
    if (searchFilter["$or"].length > 0) {
      query.$or = [];
      query["$or"].push(...searchFilter["$or"]);
    }
    if (locationFilter["$or"].length > 0) {
      query.$or = [];
      query["$or"].push(...locationFilter["$or"]);
    }
  }
  const newSortCondition = getSortCondition(sortBy, coordinates || false);
  try {
    let basicPipeline = [
      {
        $lookup: {
          from: "hospitaltypes",
          localField: "hospitalTypeId",
          foreignField: "_id",
          as: "hospitalTypeMaster",
        },
      },
      {
        $lookup: {
          from: "hospitals",
          localField: "hospitalId",
          foreignField: "_id",
          as: "hospital",
        },
      },
      {
        $unwind: { path: "$hospital", preserveNullAndEmptyArrays: true },
      },
      {
        $lookup: {
          from: "users",
          localField: "hospital.userId",
          foreignField: "_id",
          as: "userData",
        },
      },
      {
        $unwind: { path: "$userData", preserveNullAndEmptyArrays: false },
      },
      {
        $match: {
          "hospital.isVerified": constants.PROFILE_STATUS.APPROVE,
          "hospital.steps": constants.PROFILE_STEPS.COMPLETED,
          "userData.isDeleted": false,
          "userData.status": constants.PROFILE_STATUS.ACTIVE,
        },
      },
      lookupEstablishmentTiming,
      {
        $unwind: {
          path: "$establishmenttiming",
          preserveNullAndEmptyArrays: false,
        },
      },
      { $sort: { "establishmenttiming.isActive": -1 } },
      {
        $addFields: {
          totalSlotCount: {
            $add: [
              { $size: "$establishmenttiming.mon" },
              { $size: "$establishmenttiming.tue" },
              { $size: "$establishmenttiming.wed" },
              { $size: "$establishmenttiming.thu" },
              { $size: "$establishmenttiming.fri" },
              { $size: "$establishmenttiming.sat" },
              { $size: "$establishmenttiming.sun" },
            ],
          },
        },
      },
      {
        $match: slotQuery,
      },
      {
        $lookup: {
          from: "doctors",
          localField: "establishmenttiming.doctorId",
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
          "doctor.isVerified": constants.PROFILE_STATUS.APPROVE,
          "doctor.steps": constants.PROFILE_STEPS.COMPLETED,
          "user.status": { $ne: constants.PROFILE_STATUS.DEACTIVATE },
          "user.isDeleted": false,
          "user.userType": 2,
        },
      },
      lookupStateMaster,
      {
        $lookup: {
          from: "specializations",
          let: { specIds: "$doctor.specialization" },
          pipeline: [
            {
              $match: {
                $expr: { $in: ["$_id", "$$specIds"] },
              },
            },
            {
              $project: {
                _id: 1,
                name: 1,
              },
            },
          ],
          as: "specialization",
        },
      },
      {
        $project: {
          _id: `$doctor._id`,
          doctorProfileSlug: { $ifNull: [`$doctor.profileSlug`, null] },
          doctorId: `$doctor._id`,
          fullName: "$user.fullName",
          profilePic: "$doctor.profilePic",
          experience: "$doctor.experience",
          doctorCity: "$doctor.city",
          convertedexperience: { $toInt: "$doctor.experience" },
          userId: { $ifNull: [`$user._id`, null] },
          establishmenttiming: 1,
          consultationFees: "$establishmenttiming.consultationFees",
          establishmentId: "$establishmenttiming.establishmentId",
          recommended: "$doctor.recommended",
          totalReview: { $ifNull: [`$doctor.totalreviews`, 0] },
          specialization: "$specialization",
          address: "$address",
          establishmentProfileSlug: { $ifNull: [`$profileSlug`, constants.NA] },
          pinLocation: "$location",
          isLocationShared: "$isLocationShared",
          establishmentName: "$name",
          city: "$address.city",
          locality: "$address.locality",
          state: "$address.state.name",
          pincode: "$address.pincode",
          userType: "$user.userType",
          rating: "$doctor.rating",
          mon: "$establishmenttiming.mon",
          tue: "$establishmenttiming.tue",
          wed: "$establishmenttiming.wed",
          thu: "$establishmenttiming.thu",
          fri: "$establishmenttiming.fri",
          sat: "$establishmenttiming.sat",
          sun: "$establishmenttiming.sun",
          createdAt: "$doctor.createdAt",
          updatedAt: "$doctor.updatedAt",
          service: "$doctor.service",
          distance: 1,
          hospitalTypeMaster: 1,
          isActive: "$establishmenttiming.isActive",
        },
      },
      {
        $match: query,
      },
      {
        $group: {
          _id: "$_id", // Group the documents by the _id
          docs: { $push: "$$ROOT" },
        },
      },
      {
        $project: {
          _id: 0,
          doctorDetails: { $first: "$docs" },
          distance: { $first: "$distance" },
          docs: 1,
        },
      },
      {
        $addFields: {
          "doctorDetails.establishmentMaster": `$docs`,
        },
      },
      {
        $replaceRoot: { newRoot: "$doctorDetails" }, // Set the original documents by new root
      },
      {
        $facet: {
          count: [{ $count: "total" }],
          data: [
            { $sort: newSortCondition },
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
    ];
    let locationQuery;
    if (coordinates?.length === 2)
      locationQuery = {
        $geoNear: {
          near: { type: "Point", coordinates: coordinates },
          spherical: true,
          distanceField: "distance",
        },
      };

    let locationBasedPipeline = [
      locationQuery,
      { $sort: { distance: 1 } },
      ...basicPipeline,
    ];
    const searchPipeline =
      !coordinates || coordinates?.length !== 2
        ? basicPipeline
        : locationBasedPipeline;
    const data = await EstablishmentMaster.model.aggregate(searchPipeline);
    const slotTime = 15;
    const doctorsWithAvailableSlotsPromises = data[0].data.map((doctor) =>
      calculateAvailableSlotsForDoctor(doctor, slotTime)
    );
    const doctorsWithAvailableSlots = await Promise.all(
      doctorsWithAvailableSlotsPromises
    );
    const doctorsWithSlots = data[0].data.map((doctor, index) => {
      return { ...doctor, appointmentCounts: doctorsWithAvailableSlots[index] };
    });
    return { count: data[0].count, data: doctorsWithSlots };
  } catch (error) {
    console.log(error);
    return false;
  }
};

function generateNextTwoWeeks() {
  const today = moment().utcOffset(330); // Set the timezone to IST
  const nextTwoWeeks = [];
  for (let i = 0; i < 14; i++) {
    const date = moment(today).add(i, "days").toDate();
    nextTwoWeeks.push(date);
  }
  return nextTwoWeeks;
}

function countPassedSlotsForToday(
  fromSlot,
  toSlot,
  currentTime,
  slotsInTimeRange,
  slotTime
) {
  let passedSlotCount = 0;
  if (fromSlot < currentTime && toSlot < currentTime)
    passedSlotCount = slotsInTimeRange;
  else if (fromSlot < currentTime && currentTime < toSlot) {
    passedSlotCount = Math.ceil(
      moment(currentTime, "hh:mm A").diff(
        moment(fromSlot, "hh:mm A"),
        "minutes"
      ) / slotTime
    );
  }
  return passedSlotCount;
}

const getBookedAppointmentCount = async (doctorId, date) => {
  const startOfDay = moment(date).utcOffset(330).startOf("day").toDate(); // Set the timezone to IST
  const endOfDay = moment(date).utcOffset(330).endOf("day").toDate(); // Set the timezone to IST
  return await common.count(Appointment.model, {
    doctorId: doctorId,
    date: { $gte: startOfDay, $lte: endOfDay },
    status: {
      $nin: [
        constants.BOOKING_STATUS.CANCEL,
        constants.BOOKING_STATUS.RESCHEDULE,
      ],
      isDeleted: false,
    }, // Exclude cancelled (-1) and rescheduled (-2) appointments
  });
};

async function calculateAvailableSlotsForDoctor(doctor, slotTime) {
  let schedule = {};
  if (!doctor.isActive)
    schedule = {
      1: [],
      2: [],
      3: [],
      4: [],
      5: [],
      6: [],
      7: [],
    };
  else
    schedule = {
      1: doctor.mon,
      2: doctor.tue,
      3: doctor.wed,
      4: doctor.thu,
      5: doctor.fri,
      6: doctor.sat,
      7: doctor.sun,
    };

  const nextTwoWeeks = generateNextTwoWeeks();
  const availableSlots = [];
  const dateOfToday = nextTwoWeeks[0];
  for (const date of nextTwoWeeks) {
    const day = moment.utc(date).day() === 0 ? 7 : moment.utc(date).day();
    const daySchedule = schedule[day] || [];
    const totalSlots = daySchedule.reduce((slots, timeRange) => {
      const from = moment(timeRange.from, "hh:mm A");
      const to = moment(timeRange.to, "hh:mm A");
      const diffInMinutes = to.diff(from, "minutes");
      const slotsInTimeRange = Math.floor(diffInMinutes / slotTime);
      const slotsPassedForToday =
        dateOfToday === date
          ? countPassedSlotsForToday(
              from,
              to,
              moment(dateOfToday, "hh:mm A"),
              slotsInTimeRange,
              slotTime
            )
          : 0;
      return slots + slotsInTimeRange - slotsPassedForToday;
    }, 0);
    const bookedCount = await getBookedAppointmentCount(doctor._id, date);
    const remainingSlots = Math.max(totalSlots - bookedCount, 0);

    availableSlots.push({
      date: moment.utc(date).toISOString().split("T")[0],
      count: bookedCount,
      remainingSlots: remainingSlots,
    });
  }
  return availableSlots;
}

const filterTopRatedDoctor = async (filters) => {
  let dentalPipeline,
    orthoPipeline = [];
  dentalPipeline = [
    {
      $match: {
        specialization: {
          $in: [new Types.ObjectId("645ca7af311a098a4cf33e1b")],
        },
      },
    },
    {
      $lookup: {
        from: "specializations",
        localField: "specialization",
        foreignField: "_id",
        as: "specialization",
      },
    },
    {
      $match: {
        "specialization.name": "Dentist",
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
      $unwind: { path: "$user", preserveNullAndEmptyArrays: true },
    },
    {
      $match: {
        "user.isDeleted": false,
        "user.userType": constants.USER_TYPES.DOCTOR,
        "user.status": constants.PROFILE_STATUS.ACTIVE,
        isVerified: constants.PROFILE_STATUS.APPROVE,
      },
    },
    {
      $lookup: {
        from: "establishmenttimings",
        let: { doctorId: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$doctorId", "$$doctorId"] },
                  { $eq: ["$isVerified", 2] },
                  { $eq: ["$isDeleted", false] },
                  { $eq: ["$isActive", true] },
                ],
              },
            },
          },
        ],
        as: "establishmenttiming",
      },
    },
    {
      $match: {
        $expr: {
          $gt: [{ $size: "$establishmenttiming" }, 0],
        },
      },
    },
    { $sort: { "establishmenttiming.consultationFees": 1 } },
    {
      $addFields: {
        establishmentTiming: { $arrayElemAt: ["$establishmenttiming", 0] },
      },
    },
    {
      $lookup: {
        from: "establishmentmasters",
        localField: "establishmentTiming.establishmentId",
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
        from: "statemasters",
        localField: "establishmentMaster.address.state",
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
        _id: 1,
        userId: { $ifNull: [`$userId`, constants.NA] },
        createdAt: { $ifNull: [`$createdAt`, constants.NA] },
        establishmentId: {
          $ifNull: [`$establishmentTiming.establishmentId`, constants.NA],
        },
        doctorId: "$_id",
        doctorName: { $ifNull: [`$user.fullName`, constants.NA] },
        doctorProfilePicture: { $ifNull: [`$profilePic`, constants.NA] },
        rating: { $ifNull: [`$rating`, 0] },
        recommended: { $ifNull: [`$recommended`, 0] },
        specialization: { $ifNull: [`$specialization.name`, constants.NA] },
        totalReview: { $ifNull: [`$totalreviews`, 0] },
        consultationFees: {
          $ifNull: [`$establishmentTiming.consultationFees`, constants.NA],
        },
        doctorProfileSlug: "$profileSlug",
        establishmentProfileSlug: {
          $ifNull: [`$establishmentMaster.profileSlug`, constants.NA],
        },
        address: {
          landmark: {
            $ifNull: [`$establishmentMaster.address.landmark`, constants.NA],
          },
          locality: {
            $ifNull: [`$establishmentMaster.address.locality`, constants.NA],
          },
          city: {
            $ifNull: [`$establishmentMaster.address.city`, constants.NA],
          },
          state: "$addressState.name",
          stateId: {
            $ifNull: [`$establishmentMaster.address.state`, constants.NA],
          },
          pincode: {
            $ifNull: [`$establishmentMaster.address.pincode`, constants.NA],
          },
          country: {
            $ifNull: [`$establishmentMaster.address.country`, constants.NA],
          },
        },
      },
    },
    { $sort: { rating: -1 } },
  ];
  orthoPipeline = [
    {
      $lookup: {
        from: "doctors",
        localField: "_id",
        foreignField: "userId",
        as: "doctor",
      },
    },
    {
      $unwind: { path: "$doctor", preserveNullAndEmptyArrays: true },
    },
    {
      $match: {
        isDeleted: false,
        userType: constants.USER_TYPES.DOCTOR,
        status: constants.PROFILE_STATUS.ACTIVE,
        "doctor.isVerified": constants.PROFILE_STATUS.APPROVE,
        "doctor.specialization": {
          $in: [new Types.ObjectId("6448c62d19b52d5fe2e72aaa")],
        },
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
        let: { doctorId: "$doctor._id" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$doctorId", "$$doctorId"] },
                  { $eq: ["$isVerified", 2] },
                  { $eq: ["$isDeleted", false] },
                  { $eq: ["$isActive", true] },
                ],
              },
            },
          },
        ],
        as: "establishmenttiming",
      },
    },
    {
      $match: {
        $expr: {
          $gt: [{ $size: "$establishmenttiming" }, 0],
        },
      },
    },
    { $sort: { "establishmenttiming.consultationFees": 1 } },
    {
      $addFields: {
        establishmentTiming: { $arrayElemAt: ["$establishmenttiming", 0] },
      },
    },
    {
      $lookup: {
        from: "establishmentmasters",
        localField: "establishmentTiming.establishmentId",
        foreignField: "_id",
        as: "establishmentDetails",
      },
    },
    {
      $unwind: {
        path: "$establishmentDetails",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: "statemasters",
        localField: "establishmentDetails.address.state",
        foreignField: "_id",
        as: "address.state",
      },
    },
    {
      $unwind: { path: "$address.state", preserveNullAndEmptyArrays: true },
    },
    {
      $project: {
        _id: "$doctor._id",
        doctorId: "$doctor._id",
        doctorProfileSlug: { $ifNull: [`$doctor.profileSlug`, constants.NA] },
        establishmentProfileSlug: {
          $ifNull: [`$establishmentDetails.profileSlug`, constants.NA],
        },
        establishmentId: "$establishmentDetails._id",
        doctorName: "$fullName",
        doctorProfilePicture: "$doctor.profilePic",
        consultationFees: {
          $ifNull: [`$establishmentTiming.consultationFees`, constants.NA],
        },
        rating: "$doctor.rating",
        timeTaken: {
          $cond: {
            if: {
              $gte: ["$doctor.waitTime", 0.75],
            },
            then: "15 mins wait time",
            else: {
              $cond: {
                if: {
                  $gte: ["$doctor.waitTime", 0.5],
                },
                then: "30 mins wait time",
                else: {
                  $cond: {
                    if: {
                      $gte: ["$doctor.waitTime", 0.25],
                    },
                    then: "45 mins wait time",
                    else: {
                      $cond: {
                        if: {
                          $gt: ["$doctor.waitTime", 0],
                        },
                        then: "60 mins wait time",
                        else: null,
                      },
                    },
                  },
                },
              },
            },
          },
        },
        specialization: "$specialization.name",
        totalReview: "$doctor.totalreviews",
        address: {
          landmark: "$establishmentDetails.address.landmark",
          country: "$establishmentDetails.address.country",
          city: "$establishmentDetails.address.city",
          state: "$address.state.name",
          pincode: "$establishmentDetails.address.pincode",
          stateId: "$establishmentDetails.address.state",
        },
        waitTime: "$doctor.waitTime",
      },
    },
    { $sort: { waitTime: -1 } },
  ];
  try {
    const topDentalDoc = await Doctor.model.aggregate(dentalPipeline);
    const shortestTimecardiologist = await User.model.aggregate(orthoPipeline);
    const data = { topDentalDoc, shortestTimecardiologist };
    return data;
  } catch (error) {
    console.log(error);
    return {};
  }
};

const calenderList = async (matchCondition, condition1, hospitalQuery) => {
  try {
    const data = await Appointment.model.aggregate([
      { $match: matchCondition },
      { $match: condition1 },
      {
        $lookup: {
          from: "doctors",
          localField: "doctorId",
          foreignField: "_id",
          as: "doctorTableDetails",
        },
      },
      {
        $unwind: {
          path: "$doctorTableDetails",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "doctorTableDetails.userId",
          foreignField: "_id",
          as: "doctorDetails",
        },
      },
      { $unwind: { path: "$doctorDetails", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "patients",
          localField: "patientId",
          foreignField: "_id",
          as: "patientData",
        },
      },
      { $unwind: { path: "$patientData", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "users",
          localField: "patientData.userId",
          foreignField: "_id",
          as: "patientDetails",
        },
      },
      {
        $unwind: { path: "$patientDetails", preserveNullAndEmptyArrays: true },
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
                    { $eq: ["$isDeleted", false] },
                    { $eq: ["$isVerified", constants.PROFILE_STATUS.APPROVE] },
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
      {
        $lookup: {
          from: "establishmentmasters",
          let: { establishmentId: "$establishmentId" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [{ $eq: ["$_id", "$$establishmentId"] }],
                },
              },
            },
          ],
          as: "establishmentMasterData",
        },
      },
      { $match: { "establishmentMasterData.doctorId": { $exists: false } } },
      {
        $unwind: {
          path: "$establishmentMasterData",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "hospitals",
          localField: "establishmentMasterData.hospitalId",
          foreignField: "_id",
          as: "hospitalData",
        },
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
        $unwind: { path: "$userData", preserveNullAndEmptyArrays: true },
      },
      // {$match:hospitalQuery},
      {
        $project: {
          hospitalName: "$establishmentMasterData.name", //"$userData.fullName",
          establishmentId: 1,
          date: 1,
          self: 1,
          patientId: 1,
          reason: { $ifNull: [`$reason`, constants.NA] },
          status: { $ifNull: [`$status`, constants.NA] },
          fullName: { $ifNull: [`$fullName`, constants.NA] },
          phone: { $ifNull: [`$phone`, constants.NA] },
          email: { $ifNull: [`$email`, constants.NA] },
          doctorDetails: {
            fullName: "$doctorDetails.fullName",
            phone: "$doctorDetails.phone",
          },
          patientDetails: {
            fullName: "$patientDetails.fullName",
            phone: "$patientDetails.phone",
            countryCode: "$patientDetails.countryCode",
            isVerified: "$patientData.isVerified",
            profilePic: "$patientData.profilePic",
          },
          dayOfWeek: { $dayOfWeek: "$date" },
          establishmentTiming: 1,
          createdAt: 1,
        },
      },
      {
        $project: {
          establishmentTiming: 1,
          establishmentId: 1,
          hospitalName: 1,
          date: 1,
          self: 1,
          patientId: 1,
          reason: 1,
          status: 1,
          fullName: 1,
          phone: 1,
          email: 1,
          doctorDetails: 1,
          patientDetails: 1,
          createdAt: 1,
        },
      },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: { $dateToString: { date: "$date" } },
          totalCount: { $sum: 1 },
          data: { $push: "$$ROOT" },
        },
      },
      { $sort: { _id: 1 } },
    ]);
    return data;
  } catch (error) {
    console.log(error);
    return false;
  }
};

const appointmentList = async (condition, limit, skip, search, isExport) => {
  try {
    const matchSearch = {};
    if (search) {
      matchSearch.$or = [
        { "patientDetails.fullName": { $regex: `${search}`, $options: "i" } },
        { "patientDetails.phone": { $regex: `${search}`, $options: "i" } },
      ];
    }
    const facetObject = {
      count: [{ $count: "count" }],
      data: [],
    };
    if (!isExport) {
      facetObject.data.push({ $skip: Number(skip) });
      facetObject.data.push({ $limit: Number(limit) });
    }
    const data = await Appointment.model.aggregate([
      { $match: condition },
      {
        $lookup: {
          from: "doctors",
          let: { doctorId: "$doctorId" },
          pipeline: [
            { $match: { $expr: { $eq: ["$_id", "$$doctorId"] } } },
            {
              $project: { id: "$_id", _id: 0, userId: 1 },
            },
          ],
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
          let: { userId: "$doctorDetails.userId" },
          pipeline: [
            { $match: { $expr: { $eq: ["$_id", "$$userId"] } } },
            { $project: { id: "$_id", _id: 0, fullName: 1, phone: 1 } },
          ],
          as: "doctorDetailsFromUser",
        },
      },
      {
        $addFields: {
          doctorDetailsFromUser: {
            $arrayElemAt: ["$doctorDetailsFromUser", 0],
          },
        },
      },

      {
        $lookup: {
          from: "patients",
          localField: "patientId",
          foreignField: "_id",
          as: "patientData",
        },
      },
      { $unwind: { path: "$patientData", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "users",
          localField: "patientData.userId",
          foreignField: "_id",
          as: "patientDetails",
        },
      },
      { $match: matchSearch },
      {
        $unwind: { path: "$patientDetails", preserveNullAndEmptyArrays: true },
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
          as: "hospitalDetailsFromHospital",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "hospitalDetailsFromHospital.userId",
          foreignField: "_id",
          as: "hospitalDetailsFromUser",
        },
      },
      {
        $unwind: {
          path: "$hospitalDetailsFromUser",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          date: 1,
          self: 1,
          status: 1,
          fullName: 1,
          phone: 1,
          email: 1,
          consultationFees: 1,
          doctorDetailsFromUser: 1,
          patientDetailsFromUser: 1,
          hospitalName: "$establishmentData.name", //"$hospitalDetailsFromUser.fullName"
          patientDetails: {
            fullName: "$patientDetails.fullName",
            phone: "$patientDetails.phone",
          },
        },
      },
      { $sort: { date: 1 } },
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

const completeDoctorProfile = async (condition) => {
  try {
    const data = await User.model.aggregate([
      { $match: condition },
      {
        $lookup: {
          from: "specializations",
          localField: "specialization",
          foreignField: "_id",
          as: "specialization",
        },
      },
    ]);
    return data;
  } catch (error) {
    return false;
  }
};

const getDoctorProfile = async (condition) => {
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
      { $unwind: { path: "$doctor", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "hospitals",
          localField: "_id",
          foreignField: "userId",
          as: "hospital",
        },
      },
      { $unwind: { path: "$hospital", preserveNullAndEmptyArrays: true } },
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
      { $sort: { "establishmentTiming.createdAt": 1 } },
      { $limit: 1 },
      {
        $lookup: {
          from: "establishmentmasters",
          localField: "establishmentTiming.establishmentId",
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
          as: "hospitalData",
        },
      },
      {
        $unwind: {
          path: "$hospitalData",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "statemasters",
          localField: "establishmentMaster.address.state",
          foreignField: "_id",
          as: "state",
        },
      },
      { $unwind: { path: "$state", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "hospitaltypes",
          localField: "establishmentMaster.hospitalTypeId",
          foreignField: "_id",
          as: "hospitalType",
        },
      },
      { $unwind: { path: "$hospitalType", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          sectionA: {
            basicDetails: {
              fullName: "$fullName",
              specialization: `$doctor.specialization`,
              gender: `$doctor.gender`,
              email: `$doctor.email`,
              city: `$doctor.city`,
            },
            medicalRegistration: `$doctor.medicalRegistration`,
            education: {
              education: `$doctor.education`,
              experience: `$doctor.experience`,
            },
            establishmentDetails: {
              name: `$establishmentMaster.name`,
              isOwner: `$doctor.isOwnEstablishment`,
              locality: `$establishmentMaster.address.locality`,
              city: `$establishmentMaster.address.city`,
              establishmentType: `$hospitalType.name`,
              hospitalTypeId: `$hospitalType._id`,
              hospitalId: `$establishmentMaster.hospitalId`,
            },
          },
          sectionB: {
            doctor: {
              identityProof: `$doctor.identityProof`,
              medicalProof: `$doctor.medicalProof`,
            },
            establishmentDetail: {
              establishmentProof: {
                $cond: {
                  if: { $eq: ["$doctor.isOwnEstablishment", true] },
                  then: `$establishmentMaster.establishmentProof`,
                  else: `$establishmentTiming.establishmentProof`,
                },
              },
              propertyStatus: `$establishmentMaster.propertyStatus`,
            },
          },
          sectionC: {
            establishmentTiming: `$establishmentTiming`,
            address: `$establishmentMaster.address`,
            location: `$establishmentMaster.location`,
            isLocationShared: "$establishmentMaster.isLocationShared",
            editAddress: {
              $cond: {
                if: {
                  $eq: [
                    "$hospitalData.isVerified",
                    constants.PROFILE_STATUS.APPROVE,
                  ],
                },
                then: false,
                else: {
                  $cond: {
                    if: {
                      $eq: ["$doctor.isOwnEstablishment", false],
                    },
                    then: false,
                    else: true,
                  },
                },
              },
            },
          },
          _id: 1,
          doctorId: `$doctor._id`,
          hospitalId: `$establishmentMaster.hospitalId`,
          establishmentMasterId: `$establishmentMaster._id`,
          establishmentMasterTimingId: `$establishmentTiming._id`,
          steps: `$doctor.steps`,
          approvalStatus: `$doctor.isVerified`,
          phoneNumber: `$phone`,
          profileScreen: `$doctor.profileScreen`,
          isOwnEstablishment: `$doctor.isOwnEstablishment`,
          email: `$doctor.email`,
          fullName: 1,
        },
      },
    ]);
    return data.length === 0 ? false : data;
  } catch (error) {
    return false;
  }
};

const getDoctorProfileAdmin = async (condition) => {
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
      { $unwind: { path: "$doctor", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "specializations",
          localField: "doctor.specialization",
          foreignField: "_id",
          as: "specialization",
        },
      },
      {
        $unwind: { path: "$specialization", preserveNullAndEmptyArrays: true },
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
      { $sort: { "establishmentTiming.createdAt": 1 } },
      { $limit: 1 },
      {
        $lookup: {
          from: "establishmentmasters",
          localField: "establishmentTiming.establishmentId",
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
          from: "statemasters",
          localField: "establishmentMaster.address.state",
          foreignField: "_id",
          as: "state",
        },
      },
      { $unwind: { path: "$state", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "hospitaltypes",
          localField: "establishmentMaster.hospitalTypeId",
          foreignField: "_id",
          as: "hospitalType",
        },
      },
      { $unwind: { path: "$hospitalType", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          sectionA: {
            basicDetails: {
              phone: { $ifNull: [`$phone`, null] },
              fullName: { $ifNull: [`$fullName`, null] },
              specialization: { $ifNull: [`$doctor.specialization`, null] },
              gender: { $ifNull: [`$doctor.gender`, null] },
              email: { $ifNull: [`$doctor.email`, null] },
              city: { $ifNull: [`$doctor.city`, null] },
            },
            medicalRegistration: {
              $ifNull: [`$doctor.medicalRegistration`, null],
            },
            education: {
              education: { $ifNull: [`$doctor.education`, null] },
              experience: { $ifNull: [`$doctor.experience`, null] },
            },
            establishmentDetail: {
              name: { $ifNull: [`$establishmentMaster.name`, null] },
              hospitalId: {
                $ifNull: [`$establishmentMaster.hospitalId`, null],
              },
              isOwner: { $ifNull: [`$doctor.isOwnEstablishment`, null] },
              locality: {
                $ifNull: [`$establishmentMaster.address.locality`, null],
              },
              city: { $ifNull: [`$establishmentMaster.address.city`, null] },
              phone: { $ifNull: [`$phone`, null] },
              establishmentType: { $ifNull: [`$hospitalType.name`, null] },
              establishmentTypeId: { $ifNull: [`$hospitalType._id`, null] },
            },
          },
          sectionB: {
            doctor: {
              identityProof: { $ifNull: [`$doctor.identityProof`, null] },
              medicalProof: { $ifNull: [`$doctor.medicalProof`, null] },
            },
            establishmentDetail: {
              establishmentProof: {
                $cond: {
                  if: { $eq: ["$doctor.isOwnEstablishment", true] },
                  then: `$establishmentMaster.establishmentProof`,
                  else: `$establishmentTiming.establishmentProof`,
                },
              },
              propertyStatus: {
                $ifNull: [`$establishmentMaster.propertyStatus`, null],
              },
            },
          },
          sectionC: {
            establishmentTiming: { $ifNull: [`$establishmentTiming`, null] },
            location: {
              $ifNull: [`$establishmentMaster.location`, null],
            },
            isLocationShared: "$establishmentMaster.isLocationShared",
            address: {
              street: {
                $ifNull: [`$establishmentMaster.address.landmark`, null],
              },
              locality: {
                $ifNull: [`$establishmentMaster.address.locality`, null],
              },
              city: { $ifNull: [`$establishmentMaster.address.city`, null] },
              pincode: {
                $ifNull: [`$establishmentMaster.address.pincode`, null],
              },
              country: {
                $ifNull: [`$establishmentMaster.address.country`, "India"],
              },
              state: { $ifNull: [`$state.name`, null] },
              stateId: { $ifNull: [`$state._id`, null] },
            },
          },
          _id: { $ifNull: [`$_id`, null] },
          doctorId: { $ifNull: [`$doctor._id`, null] },
          establishmentMasterId: {
            $ifNull: [`$establishmentMaster._id`, null],
          },
          establishmentMasterTimingId: {
            $ifNull: [`$establishmentTiming._id`, null],
          },
          steps: { $ifNull: [`$doctor.steps`, null] },
          isApproved: { $ifNull: [`$doctor.isVerified`, null] },
        },
      },
    ]);
    return data.length === 0 ? false : data;
  } catch (error) {
    return false;
  }
};

const findAllDoctorByCity = async (cityList) => {
  try {
    return await EstablishmentTiming.model.aggregate([
      {
        $match: {
          isDeleted: false,
          doctorId: { $exists: true },
          isVerified: constants.PROFILE_STATUS.APPROVE,
        },
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
      { $match: { "establishmentData.address.city": { $in: cityList } } },
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
        $unwind: {
          path: "$doctorData",
          preserveNullAndEmptyArrays: true,
        },
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
        $unwind: {
          path: "$doctorUser",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $match: {
          "doctorUser.isDeleted": false,
          "doctorUser.status": constants.PROFILE_STATUS.ACTIVE,
          "doctorData.steps": constants.PROFILE_STEPS.COMPLETED,
          "doctorData.isVerified": constants.PROFILE_STATUS.APPROVE,
        },
      },
      {
        $lookup: {
          from: "specializations",
          localField: "doctorData.specialization",
          foreignField: "_id",
          as: "specializationMaster",
        },
      },
      {
        $unwind: {
          path: "$specializationMaster",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          name: `$establishmentData.address.city`,
          specialization: `$specializationMaster`,
        },
      },
      {
        $group: {
          _id: { city: `$name`, specialization: "$specialization.name" },
          count: { $sum: 1 },
        },
      },
      {
        $group: {
          _id: "$_id.city",
          specializations: {
            $push: {
              name: "$_id.specialization",
              count: "$count",
            },
          },
          totalCount: { $sum: "$count" },
        },
      },
      { $sort: { totalCount: -1 } },
    ]);
  } catch (error) {
    return false;
  }
};

const establishmentList = async (condition, limit, skip) => {
  try {
    const data = await EstablishmentTiming.model.aggregate([
      { $match: condition },
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
          from: "hospitaltypes",
          localField: "establishmentData.hospitalTypeId",
          foreignField: "_id",
          as: "hospitalTypeData",
        },
      },
      {
        $unwind: {
          path: "$hospitalTypeData",
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
        $unwind: { path: "$userData", preserveNullAndEmptyArrays: true },
      },
      {
        $project: {
          establishmentId: 1,
          doctorId: 1,
          isOwner: 1,
          consultationFees: 1,
          mon: 1,
          tue: 1,
          wed: 1,
          thu: 1,
          fri: 1,
          sat: 1,
          sun: 1,
          isActive: 1,
          hospitalData: {
            profilePic: { $ifNull: [`$hospitalData.profilePic`, null] },
            address: "$hospitalData.address",
            location: "$hospitalData.location",
            isLocationShared: "$hospitalData.isLocationShared",
            name: "$establishmentData.name",
            hospitalId: "$establishmentData.hospitalId",
            establishmentMobile: {
              $ifNull: [`$userData.phone`, null],
            },
            establishmentEmail: {
              $ifNull: [`$establishmentData.establishmentEmail`, null],
            },
          },
          hospitalTypeId: {
            $ifNull: [`$establishmentData.hospitalTypeId`, null],
          },
          hospitalTypeData: { $ifNull: [`$hospitalTypeData.name`, null] },
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

const establishmentRequest = async (condition, limit, skip, sortBy, order) => {
  try {
    const sortObject = { sortBy: constants.LIST.ORDER[order] };
    if (sortBy === "fullName") {
      sortObject["estabMasterData.name"] = constants.LIST.ORDER[order];
    }

    const data = await EstablishmentTiming.model.aggregate([
      { $match: condition },
      {
        $lookup: {
          from: "establishmentmasters",
          localField: "establishmentId",
          foreignField: "_id",
          as: "estabMasterData",
        },
      },
      {
        $unwind: { path: "$estabMasterData", preserveNullAndEmptyArrays: true },
      },
      {
        $lookup: {
          from: "hospitals",
          localField: "estabMasterData.hospitalId",
          foreignField: "_id",
          as: "hospitalData",
        },
      },
      { $unwind: { path: "$hospitalData", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "users",
          localField: "hospitalData.userId",
          foreignField: "_id",
          as: "hospitalName",
        },
      },
      { $sort: sortObject },
      { $unwind: { path: "$hospitalName", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "specializations",
          localField: "specility",
          foreignField: "_id",
          as: "specilityData",
        },
      },
      {
        $lookup: {
          from: "hospitaltypes",
          localField: "hospitalData.hospitalType",
          foreignField: "_id",
          as: "hospitalType",
        },
      },

      // // {
      //   $addFields: {
      //     hospitalName: {$arrayElemAt: ['$hospitalName.fullName', 0]}
      //   }
      // },{$arrayElemAt: ['$hospitalName.fullName', 0]},
      {
        $project: {
          hospitalName: "$estabMasterData.name",
          profilePic: "$hospitalData.profilePic",
          hospitalType: 1,
          isVerified: 1,
          specilityData: 1,
          establishmentId: 1,
          isActive: 1,
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
    return data;
  } catch (error) {
    return false;
  }
};

const adminDoctorList = async (
  condition,
  doctorQuery,
  limit,
  skip,
  sortCondition,
  search,
  isExport
) => {
  try {
    const { sortBy, order } = sortCondition;
    const matchSearch = {};
    const sortObject = {};
    sortObject[sortBy] = constants.LIST.ORDER[order];
    if (sortBy === "fullName") {
      sortObject["doctorDetails.fullName"] = constants.LIST.ORDER[order];
    }
    if (sortBy === "specialization") {
      sortObject["specialization.name"] = constants.LIST.ORDER[order];
    }
    if (sortBy === "degree") {
      sortObject["education.degree"] = constants.LIST.ORDER[order];
    }
    if (search) {
      matchSearch.$or = [
        { "doctorDetails.fullName": { $regex: `${search}`, $options: "i" } },
        { "doctorDetails.phone": { $regex: `${search}`, $options: "i" } },
      ];
    }
    const facetObject = {
      totalCount: [{ $count: "count" }],
      data: [],
    };
    if (!isExport) {
      facetObject.data.push({ $skip: Number(skip) });
      facetObject.data.push({ $limit: Number(limit) });
    }
    const data = await Doctor.model.aggregate([
      { $match: condition },
      {
        $lookup: {
          from: "users",
          let: { userId: "$userId" },
          pipeline: [
            { $match: { $expr: { $eq: ["$_id", "$$userId"] } } },
            {
              $project: {
                id: "$_id",
                _id: 0,
                fullName: 1,
                phone: 1,
                status: 1,
                isDeleted: 1,
                profileSlug: 1
              },
            },
          ],
          as: "doctorDetails",
        },
      },
      { $unwind: { path: "$doctorDetails", preserveNullAndEmptyArrays: true } },
      { $match: matchSearch },
      { $match: doctorQuery },
      {
        $lookup: {
          from: "establishmenttimings",
          let: { doctorId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$doctorId", "$$doctorId"] },
                    { $eq: ["$isDeleted", false] },
                  ],
                },
              },
            },
            { $sort: { isVerified: -1, isActive: -1, createdAt: -1 } },
            { $limit: 1 },
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
          from: "specializations",
          localField: "specialization",
          foreignField: "_id",
          as: "specialization",
        },
      },
      {
        $lookup: {
          from: "establishmentmasters",
          let: { establishmentId: "$establishmenttiming.establishmentId" },
          pipeline: [
            { $match: { $expr: { $eq: ["$_id", "$$establishmentId"] } } },
            {
              $project: {
                _id: 1,
                name: 1,
                address: 1,
                location: 1,
                isOwner: 1,
                isLocationShared: 1,
              },
            },
          ],
          as: "localityDetails",
        },
      },
      {
        $lookup: {
          from: "statemasters",
          localField: "localityDetails.address.state",
          foreignField: "_id",
          as: "stateDetails",
        },
      },
      {
        $addFields: {
          approvalStatus: "$isVerified",
        },
      },
      { $sort: sortObject },
      {
        $facet: facetObject,
      },
    ]);
    return data;
  } catch (error) {
    console.log(error);
    return false;
  }
};

const doctorListForApprove = async (
  condition,
  doctorQuery,
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
      sortObject["doctorDetails.fullName"] = constants.LIST.ORDER[order];
    }
    if (search) {
      matchSearch.$or = [
        { "doctorDetails.fullName": { $regex: `${search}`, $options: "i" } },
        { "doctorDetails.phone": { $regex: `${search}`, $options: "i" } },
      ];
    }
    const data = await Doctor.model.aggregate([
      { $match: condition },
      // { $sort: sortObject },
      {
        $lookup: {
          from: "users",
          let: { userId: "$userId" },
          pipeline: [
            { $match: { $expr: { $eq: ["$_id", "$$userId"] } } },
            {
              $project: { id: "$_id", _id: 0, fullName: 1, phone: 1 },
            },
          ],
          as: "doctorDetails",
        },
      },
      { $match: matchSearch },
      // { $match: doctorQuery },
      {
        $lookup: {
          from: "specializations",
          let: { specialization: "$specialization" },
          pipeline: [
            { $match: { $expr: { $in: ["$_id", "$$specialization"] } } },
            {
              $project: { id: "$_id", _id: 0, name: 1 },
            },
          ],
          as: "specializationDetails",
        },
      },
      {
        $lookup: {
          from: "establishmentmasters",
          let: { userId: "$userId" },
          pipeline: [
            { $match: { $expr: { $eq: ["$doctorId", "$$userId"] } } },
            {
              $project: { id: "$_id", _id: 0, address: 1 },
            },
          ],
          as: "localityDetails",
        },
      },

      { $sort: sortObject },

      {
        $project: {
          userId: 1,
          profilePic: 1,
          createdAt: 1,
          doctorDetails: 1,
          specializationDetails: 1,
          localityDetails: 1,
          city: 1,
          isVerified: 1,
          rejectReason: 1,
        },
      },
      // { $sort: sortObject },
      {
        $facet: {
          count: [{ $count: "count" }],
          data: [{ $skip: Number(skip) }, { $limit: Number(limit) }],
        },
      },
      // {
      //   $addFields: {
      //     count: { $arrayElemAt: ["$count.count", 0] },
      //   },
      // },
    ]);
    return data[0];
  } catch (error) {
    return false;
  }
};

const specializationList = async () => {
  try {
    const data = await Specialization.model.aggregate([
      { $match: { isDeleted: false } },
      {
        $lookup: {
          from: "doctors",
          localField: "_id",
          foreignField: "specialization",
          as: "doctorSpecializations",
        },
      },
      {
        $project: {
          _id: 1,
          name: "$name",
          count: { $size: "$doctorSpecializations" },
          image: 1,
        },
      },
    ]);
    return data;
  } catch (error) {
    return false;
  }
};

const getProfile = async (condition) => {
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
      { $unwind: { path: "$doctor", preserveNullAndEmptyArrays: true } },
    ]);
    return data.length === 0 ? false : data;
  } catch (error) {
    return false;
  }
};

const doctorAboutUs = async (condition) => {
  try {
    const data = await Doctor.model.aggregate([
      { $match: condition },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
      {
        $match: {
          "user.isDeleted": false,
        },
      },
      {
        $lookup: {
          from: "establishmenttimings",
          let: { doctorId: "$_id" },
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
        $lookup: {
          from: "socialmedias",
          localField: "social.socialMediaId",
          foreignField: "_id",
          as: "socialMediaMaster",
        },
      },
      {
        $addFields: {
          social: {
            $map: {
              input: "$social",
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
                            "$$socialMedia.socialMediaId",
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
          from: "establishmentmasters",
          localField: "establishmenttiming.establishmentId",
          foreignField: "_id",
          as: "establishmentmaster",
        },
      },
      {
        $lookup: {
          from: "hospitals",
          localField: "establishmentmaster.hospitalId",
          foreignField: "_id",
          as: "hospital",
        },
      },
      {
        $lookup: {
          from: "hospitaltypes",
          localField: "establishmentmaster.hospitalTypeId",
          foreignField: "_id",
          as: "establishmentTypeMaster",
        },
      },
      {
        $lookup: {
          from: "statemasters",
          localField: "establishmentmaster.address.state",
          foreignField: "_id",
          as: "stateName",
        },
      },
      {
        $addFields: {
          hospitalType: {
            $map: {
              input: "$establishmentmaster",
              as: "hospitalTypeMaster",
              in: {
                $mergeObjects: [
                  "$$hospitalTypeMaster",
                  {
                    establishmentTypeMaster: {
                      $arrayElemAt: [
                        "$establishmentTypeMaster",
                        {
                          $indexOfArray: [
                            "$establishmentTypeMaster._id",
                            "$$hospitalTypeMaster.hospitalTypeId",
                          ],
                        },
                      ],
                    },
                  },
                ],
              },
            },
          },
          stateName: {
            $map: {
              input: "$establishmentmaster",
              as: "establishmentMaster",
              in: {
                $mergeObjects: [
                  "$$establishmentMaster",
                  {
                    stateName: {
                      $arrayElemAt: [
                        "$stateName",
                        {
                          $indexOfArray: [
                            "$stateName._id",
                            "$$establishmentMaster.address.state",
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
          from: "specializations",
          localField: "specialization",
          foreignField: "_id",
          as: "specialization",
        },
      },
      {
        $addFields: {
          consultationFees: {
            $arrayElemAt: ["$establishmenttiming.consultationFees", 0],
          },
        },
      },
      {
        $project: {
          _id: 1,
          userId: 1,
          specialization: 1,
          master: 1,
          email: 1,
          gender: 1,
          medicalRegistration: 1,
          education: 1,
          award: 1,
          membership: 1,
          social: 1,
          service: 1,
          experience: 1,
          profilePic: 1,
          about: 1,
          publicUrl: 1,
          rating: 1,
          consultationFees: 1,
          recommended: 1,
          doctorProfileSlug: `$profileSlug`,
          fullName: "$user.fullName",
          phone: "$user.phone",
          establishmentmaster: {
            $map: {
              input: "$establishmentmaster",
              as: "em",
              in: {
                $mergeObjects: [
                  "$$em",
                  {
                    establishmenttiming: {
                      $filter: {
                        input: "$establishmenttiming",
                        as: "et",
                        cond: { $eq: ["$$et.establishmentId", "$$em._id"] },
                      },
                    },
                    consultationFees: {
                      $let: {
                        vars: {
                          matchingEstablishmentTiming: {
                            $filter: {
                              input: "$establishmenttiming",
                              as: "et",
                              cond: {
                                $eq: ["$$et.establishmentId", "$$em._id"],
                              },
                            },
                          },
                        },
                        in: {
                          $ifNull: [
                            {
                              $first:
                                "$$matchingEstablishmentTiming.consultationFees",
                            },
                            null,
                          ],
                        },
                      },
                    },
                    isActive: {
                      $let: {
                        vars: {
                          matchingEstablishmentTiming: {
                            $filter: {
                              input: "$establishmenttiming",
                              as: "et",
                              cond: {
                                $eq: ["$$et.establishmentId", "$$em._id"],
                              },
                            },
                          },
                        },
                        in: {
                          $ifNull: [
                            {
                              $first: "$$matchingEstablishmentTiming.isActive",
                            },
                            null,
                          ],
                        },
                      },
                    },
                    stateName: "$stateName.stateName.name",
                    hospitalType: "$hospitalType.establishmentTypeMaster.name",
                    images: {
                      $let: {
                        vars: {
                          matchingHospital: {
                            $filter: {
                              input: "$hospital",
                              as: "hos",
                              cond: {
                                $eq: ["$$hos._id", "$$em.hospitalId"],
                              },
                            },
                          },
                        },
                        in: {
                          $ifNull: [
                            {
                              $first: "$$matchingHospital.image",
                            },
                            null,
                          ],
                        },
                      },
                    },
                    profilePic: {
                      $let: {
                        vars: {
                          matchingHospital: {
                            $filter: {
                              input: "$hospital",
                              as: "hos",
                              cond: {
                                $eq: ["$$hos._id", "$$em.hospitalId"],
                              },
                            },
                          },
                        },
                        in: {
                          $ifNull: [
                            {
                              $first: "$$matchingHospital.profilePic",
                            },
                            null,
                          ],
                        },
                      },
                    },
                  },
                ],
              },
            },
          },
          claimProfile: {
            $cond: {
              if: { $ne: ["$steps", 4] },
              then: false,
              else: true,
            },
          },
          totalReview: { $ifNull: [`$totalreviews`, 0] },
        },
      },
    ]);
    return data.length === 0 ? false : data;
  } catch (error) {
    console.log(error);
    return false;
  }
};

const getForSetting = async (model, condition) => {
  try {
    const data = await model.aggregate([
      { $match: condition },
      {
        $project: {
          _id: 0,
          social: 1,
        },
      },
      { $unwind: { path: "$social", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "socialmedias",
          localField: "social.socialMediaId",
          foreignField: "_id",
          as: "socialMedia",
        },
      },
      { $unwind: { path: "$socialMedia", preserveNullAndEmptyArrays: false } },
      {
        $project: {
          _id: "$social._id",
          socialMediaId: "$socialMedia._id",
          name: "$socialMedia.name",
          socialMediaLogo: "$socialMedia.logo",
          url: "$social.url",
        },
      },
    ]);
    return data.length === 0 ? false : data;
  } catch (error) {
    console.log(error);
    return false;
  }
};

const doctorList = async (
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
        $unwind: {
          path: "$specialization",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "establishmentmasters",
          localField: "doctor._id",
          foreignField: "doctorId",
          as: "establishmentmaster",
        },
      },
      {
        $unwind: {
          path: "$establishmentmaster",
          preserveNullAndEmptyArrays: true,
        },
      },
      { $match: condition },
      { $match: searchQuery },
      {
        $project: {
          _id: 1,
          fullName: { $ifNull: [`$fullName`, constants.NA] },
          profilePic: { $ifNull: [`$doctor.profilePic`, constants.NA] },
          bloodGroup: { $ifNull: [`$patient.bloodGroup`, constants.NA] },
          phone: { $ifNull: [`$phone`, constants.NA] },
          address: { $ifNull: [`$establishmentmaster.address`, constants.NA] },
          email: { $ifNull: [`$doctor.email`, constants.NA] },
          createdAt: { $ifNull: [`$createdAt`, constants.NA] },
          lowerName: { $toLower: "$fullName" },
          degree: { $ifNull: [`$doctor.education`, constants.NA] },
          status: { $ifNull: [`$doctor.status`, constants.NA] },
          isVerified: { $ifNull: [`$doctor.isVerified`, constants.NA] },
          specialization: { $ifNull: [`$specialization`, constants.NA] },
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

const similarRecord = async (Model, condition, records, recordKey) => {
  try {
    const conditionObject = condition;
    for (let key in records) {
      if (records.hasOwnProperty(key)) {
        conditionObject[`${recordKey}.${key}`] = {
          $regex: new RegExp(`^${records[key]}$`, "i"),
        };
      }
    }
    const data = await Model.findOne(conditionObject).lean();
    return data;
  } catch (error) {
    console.log(error);
    return false;
  }
};

const doctorListBasedOnProcedure = async (
  establishmentId,
  condition,
  procedure,
  offset,
  limit,
  search,
  speciality
) => {
  let filters = {};
  try {
    const searchQuery = search || "";
    if (condition) {
      filters = {
        "procedure.name": {
          $regex: new RegExp(`^${condition}`, "i"),
        },
      };
    }
    if (speciality) {
      filters = {
        "specialization._id": new Types.ObjectId(speciality),
      };
    }
    const data = await EstablishmentTiming.model.aggregate([
      {
        $match: {
          establishmentId: new Types.ObjectId(establishmentId),
          isVerified: 2,
          isDeleted: false,
          doctorId: { $exists: true },
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
          from: "hospitaltypes",
          localField: "hospitalTypeId",
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
          from: "users",
          localField: "doctor.userId",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
      {
        $match: {
          "doctor.isVerified": constants.PROFILE_STATUS.APPROVE,
          "doctor.steps": constants.PROFILE_STEPS.COMPLETED,
          "user.isDeleted": false,
          "user.status": constants.PROFILE_STATUS.ACTIVE,
        },
      },
      {
        $lookup: {
          from: "proceduremasters",
          localField: "doctor.procedure",
          foreignField: "_id",
          as: "procedure",
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
        $match: filters,
      },
      {
        $match: {
          $or: [
            {
              "user.fullName": { $regex: new RegExp(searchQuery, "i") },
            },
          ],
        },
      },
      {
        $project: {
          _id: 1,
          isActive: 1,
          userId: 1,
          doctorId: 1,
          establishmentId: 1,
          procedure: 1,
          experience: "$doctor.experience",
          reviews: { $ifNull: [`$doctor.totalreviews`, null] },
          doctorProfileSlug: { $ifNull: [`$doctor.profileSlug`, null] },
          consultationFees: 1,
          service: 1,
          specialization: 1,
          profilePic: "$doctor.profilePic",
          rating: "$doctor.rating",
          recommended: "$doctor.recommended",
          fullName: "$user.fullName",
          phone: "$user.phone",
          hospitalTypeMaster: 1,
          establishmentTiming: {
            mon: "$mon",
            tue: "$tue",
            wed: "$wed",
            thu: "$thu",
            fri: "$fri",
            sat: "$sat",
            sun: "$sun",
          },
          waitTime: {
            $cond: {
              if: {
                $gte: ["$doctor.waitTime", 0.75],
              },
              then: "15 mins",
              else: {
                $cond: {
                  if: {
                    $gte: ["$doctor.waitTime", 0.5],
                  },
                  then: "30 mins",
                  else: {
                    $cond: {
                      if: {
                        $gte: ["$doctor.waitTime", 0.25],
                      },
                      then: "45 mins",
                      else: {
                        $cond: {
                          if: {
                            $gt: ["$doctor.waitTime", 0],
                          },
                          then: "60 mins",
                          else: constants.NA,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          establishmentMaster: 1,
        },
      },
      {
        $facet: {
          count: [{ $count: "total" }],
          data: [{ $skip: offset }, { $limit: limit }],
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
    return data.length === 0 ? false : data;
  } catch (error) {
    console.log(error);
    return false;
  }
};

const establishmentProcedureList = async (establishmentId, condition = "") => {
  try {
    const data = await EstablishmentMaster.model.aggregate([
      {
        $match: {
          _id: new Types.ObjectId(establishmentId),
        },
      },
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
          from: "proceduremasters",
          localField: "hospital.procedure",
          foreignField: "_id",
          as: "procedure",
        },
      },
      {
        $unwind: { path: "$procedure", preserveNullAndEmptyArrays: true },
      },
      {
        $match: {
          "procedure.name": {
            $regex: new RegExp(`^${condition}`, "i"),
          },
        },
      },
      {
        $group: {
          _id: "$procedure._id",
          name: { $first: "$procedure.name" },
        },
      },
      {
        $project: {
          _id: 1,
          name: 1,
        },
      },
    ]);

    return data.length === 0 ? false : data;
  } catch (error) {
    console.log(error);
    return false;
  }
};

const establishmentProcedureListNoFilter = async (establishmentId) => {
  try {
    const data = await EstablishmentMaster.model.aggregate([
      {
        $match: {
          _id: new Types.ObjectId(establishmentId),
        },
      },
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
          from: "proceduremasters",
          localField: "hospital.procedure",
          foreignField: "_id",
          as: "procedure",
        },
      },
      {
        $unwind: { path: "$procedure", preserveNullAndEmptyArrays: true },
      },
      {
        $group: {
          _id: "$procedure._id",
          name: { $first: "$procedure.name" },
        },
      },
      { $match: { _id: { $ne: null } } },
      {
        $project: {
          _id: 1,
          name: 1,
        },
      },
      { $sort: { name: 1 } },
    ]);

    return data.length === 0 ? false : data;
  } catch (error) {
    console.log(error);
    return false;
  }
};

const specialityFirstLetterList = async (establishmentId, condition) => {
  try {
    const data = await EstablishmentMaster.model.aggregate([
      {
        $match: {
          _id: new Types.ObjectId(establishmentId),
        },
      },
      {
        $lookup: {
          from: "hospitals",
          localField: "hospitalId",
          foreignField: "_id",
          as: "hospital",
        },
      },
      {
        $unwind: { path: "$hospital", preserveNullAndEmptyArrays: true },
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
        $unwind: { path: "$user", preserveNullAndEmptyArrays: true },
      },
      {
        $lookup: {
          from: "proceduremasters",
          localField: "hospital.procedure",
          foreignField: "_id",
          as: "specialization",
        },
      },
      {
        $unwind: "$specialization",
      },
      {
        $group: {
          _id: { $substr: ["$specialization.name", 0, 1] },
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          name: "$_id",
          status: { $cond: [{ $gt: ["$count", 0] }, 1, 0] },
        },
      },
    ]);

    // Initialize an array of objects with all the alphabets and status 0
    const alphabetStatus = Array.from({ length: 26 }, (_, i) => ({
      name: String.fromCharCode(65 + i),
      status: 0,
    }));

    // Update the status of the alphabets found in the data
    return alphabetStatusParser(data, alphabetStatus);
  } catch (error) {
    return false;
  }
};

const procedureHospitalDoctorWiseList = async (establishmentId, condition) => {
  try {
    const data = await EstablishmentTiming.model.aggregate([
      {
        $match: {
          establishmentId: new Types.ObjectId(establishmentId),
          isDeleted: false,
          isVerified: constants.PROFILE_STATUS.APPROVE,
          doctorId: { $exists: true },
          isActive: true,
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
        $unwind: { path: "$doctor", preserveNullAndEmptyArrays: true },
      },
      {
        $lookup: {
          from: "proceduremasters",
          localField: "doctor.procedures",
          foreignField: "_id",
          as: "procedure",
        },
      },
      { $unwind: "$procedure" },
      {
        $group: {
          _id: { $substr: ["$procedure.name", 0, 1] },
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          name: "$_id",
          status: { $cond: [{ $gt: ["$count", 0] }, 1, 0] },
        },
      },
    ]);

    // Initialize an array of objects with all the alphabets and status 0
    const alphabetStatus = Array.from({ length: 26 }, (_, i) => ({
      name: String.fromCharCode(65 + i),
      status: 0,
    }));

    // Update the status of the alphabets found in the data
    return alphabetStatusParser(data, alphabetStatus);
  } catch (error) {
    return false;
  }
};

const establishmentspecialityListDoc = async (
  establishmentId,
  condition = null
) => {
  try {
    const data = await EstablishmentTiming.model.aggregate([
      {
        $match: {
          establishmentId: new Types.ObjectId(establishmentId),
          isVerified: 2,
          isDeleted: false,
          doctorId: { $exists: true },
          isActive: true,
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
        $unwind: { path: "$doctor", preserveNullAndEmptyArrays: true },
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
        $unwind: { path: "$user", preserveNullAndEmptyArrays: true },
      },
      {
        $match: {
          "user.isDeleted": false,
          "user.status": constants.PROFILE_STATUS.ACTIVE,
          "doctor.isVerified": constants.PROFILE_STATUS.APPROVE,
          "doctor.steps": constants.PROFILE_STEPS.COMPLETED,
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
        $unwind: "$specialization",
      },
      {
        $group: {
          _id: { name: "$specialization.name", id: "$specialization._id" },
          count: { $sum: 1 },
        },
      },
      {
        $group: {
          _id: null,
          totalCount: { $sum: "$count" },
          data: {
            $push: { name: "$_id.name", id: "$_id.id", count: "$count" },
          },
        },
      },
      {
        $project: {
          _id: 0,
          totalCount: 1,
          data: 1,
        },
      },
    ]);
    return data;
  } catch (error) {
    return false;
  }
};

const doctorDetails = async (condition) => {
  try {
    const data = await Doctor.model.aggregate([
      { $match: condition },
      {
        $lookup: {
          from: "users",
          let: { userId: "$userId" },
          pipeline: [
            { $match: { $expr: { $eq: ["$_id", "$$userId"] } } },
            {
              $project: {
                phone: 1,
                fullName: 1,
              },
            },
          ],
          as: "userData",
        },
      },
      {
        $addFields: { userData: { $arrayElemAt: ["$userData", 0] } },
      },
      // {
      //   $lookup: {
      //     from: "specializations",
      //     localField: "specialization",
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
          phone: "$userData.phone",
          fullName: "$userData.fullName",
          email: 1,
          specility: "$specialization",
        },
      },
    ]);
    return data[0];
  } catch (error) {
    return false;
  }
};
const getAllTimings = async (condition, day) => {
  try {
    const project = { _id: 0 };
    project[day] = 1;
    return await EstablishmentTiming.model.aggregate([
      { $match: condition },
      { $project: project },
      { $unwind: `$${day}` },
    ]);
  } catch (error) {
    console.log(error);
    return false;
  }
};

const getDoctorDataByID = async (Model, condition) => {
  try {
    return await Model.aggregate([
      { $match: condition },
      {
        $unwind: {
          path: `$procedure`,
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "proceduremasters",
          localField: "procedure",
          foreignField: "_id",
          as: "procedureName",
        },
      },
      {
        $unwind: {
          path: "$procedureName",
          preserveNullAndEmptyArrays: false,
        },
      },
      {
        $project: {
          _id: 0,
          procedureId: { $ifNull: [`$procedureName._id`, constants.NA] },
          name: { $ifNull: [`$procedureName.name`, constants.NA] },
        },
      },
    ]);
  } catch (error) {
    console.log(error);
    return false;
  }
};

const getPatientDetails = async (patientId) => {
  try {
    const data = await Patient.model.aggregate([
      { $match: { _id: new Types.ObjectId(patientId) } },
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
          preserveNullAndEmptyArrays: false,
        },
      },
    ]);
    return data[0];
  } catch (error) {
    return false;
  }
};

const slugForId = async (condition, city) => {
  try {
    const data = await Doctor.model.aggregate([
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
          preserveNullAndEmptyArrays: false,
        },
      },
      {
        $match: {
          isVerified: constants.PROFILE_STATUS.APPROVE,
          steps: constants.PROFILE_STEPS.COMPLETED,
          "user.status": { $ne: constants.PROFILE_STATUS.DEACTIVATE },
          "user.isDeleted": false,
        },
      },
      {
        $lookup: {
          from: "establishmenttimings",
          let: { doctorId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$doctorId", "$$doctorId"] },
                    { $eq: ["$isVerified", 2] },
                    { $eq: ["$isDeleted", false] },
                    { $eq: ["$isActive", true] },
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
          preserveNullAndEmptyArrays: false,
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
          preserveNullAndEmptyArrays: false,
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
          preserveNullAndEmptyArrays: false,
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
          preserveNullAndEmptyArrays: false,
        },
      },
      {
        $match: {
          "hospital.isVerified": constants.PROFILE_STATUS.APPROVE,
          "hospital.steps": constants.PROFILE_STEPS.COMPLETED,
          "hospitalUser.status": { $ne: constants.PROFILE_STATUS.DEACTIVATE },
          "hospitalUser.isDeleted": false,
          "establishmentMaster.address.city": {
            $regex: new RegExp(`^${city}$`, "i"),
          },
        },
      },
      {
        $project: {
          doctorId: { $ifNull: [`$_id`, constants.NA] },
          userId: { $ifNull: [`$user._id`, constants.NA] },
          establishmentId: {
            $ifNull: [`$establishmentMaster._id`, constants.NA],
          },
          address: {
            $ifNull: [`$establishmentMaster.address`, constants.NA],
          },
        },
      },
    ]);
    return data.length > 0 ? data[0] : false;
  } catch (error) {
    return false;
  }
};

const doctorTimingPipeline = [
  {
    $match: {
      isVerified: { $ne: constants.PROFILE_STATUS.REJECT },
      isDeleted: false,
      doctorId: { $exists: true },
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
  { $unwind: { path: "$hospitalUser", preserveNullAndEmptyArrays: true } },
  {
    $match: {
      "doctor.isVerified": { $ne: constants.PROFILE_STATUS.REJECT },
      "doctor.steps": constants.PROFILE_STEPS.COMPLETED,
      "user.isDeleted": false,
      "user.status": constants.PROFILE_STATUS.ACTIVE,
      "hospital.isVerified": { $ne: constants.PROFILE_STATUS.REJECT },
      "hospital.steps": constants.PROFILE_STEPS.COMPLETED,
      "hospitalUser.isDeleted": false,
      "hospitalUser.status": constants.PROFILE_STATUS.ACTIVE,
    },
  },
];

const doctorListSitemap = async () => {
  try {
    const data = await EstablishmentTiming.model.aggregate([
      ...doctorTimingPipeline,
      {
        $project: {
          address: {
            $ifNull: [
              {
                address: {
                  $ifNull: [
                    "$establishmentMaster.address.landmark",
                    constants.NA,
                  ],
                },
                locality: {
                  $ifNull: [
                    "$establishmentMaster.address.locality",
                    constants.NA,
                  ],
                },
                city: {
                  $ifNull: ["$establishmentMaster.address.city", constants.NA],
                },
                cityName: {
                  $ifNull: ["$establishmentMaster.address.city", constants.NA],
                },
                state: { $ifNull: ["$addressState.name", constants.NA] },
                pincode: {
                  $ifNull: [
                    "$establishmentMaster.address.pincode",
                    constants.NA,
                  ],
                },
                country: {
                  $ifNull: [
                    "$establishmentMaster.address.country",
                    constants.NA,
                  ],
                },
              },
              constants.NA,
            ],
          },
          doctorProfileSlug: "$doctor.profileSlug",
          updatedAt: "$doctor.updatedAt",
        },
      },
    ]);
    data.map((doctor, index) => {
      const slugStr = doctor?.address?.city;
      const citySlug = slugify(slugStr, {
        lower: true,
        remove: undefined,
        strict: true,
      });
      data[index].address.city = citySlug;
    });
    return data;
  } catch (error) {
    return false;
  }
};

const specializationListSitemap = async () => {
  try {
    const data = await EstablishmentTiming.model.aggregate([
      ...doctorTimingPipeline,
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
      {
        $project: {
          address: {
            $ifNull: [
              {
                address: {
                  $ifNull: [
                    "$establishmentMaster.address.landmark",
                    constants.NA,
                  ],
                },
                locality: {
                  $ifNull: [
                    "$establishmentMaster.address.locality",
                    constants.NA,
                  ],
                },
                city: {
                  $ifNull: ["$establishmentMaster.address.city", constants.NA],
                },
                cityName: {
                  $ifNull: ["$establishmentMaster.address.city", constants.NA],
                },
                state: { $ifNull: ["$addressState.name", constants.NA] },
                pincode: {
                  $ifNull: [
                    "$establishmentMaster.address.pincode",
                    constants.NA,
                  ],
                },
                country: {
                  $ifNull: [
                    "$establishmentMaster.address.country",
                    constants.NA,
                  ],
                },
              },
              constants.NA,
            ],
          },
          specialization: 1,
        },
      },
      { $match: { address: { $ne: null } } },
      {
        $group: {
          _id: {
            city: "$address.city",
            locality: "$address.locality",
            specialization: "$specialization.slug",
          },
          count: { $sum: 1 },
        },
      },
    ]);
    data.map((doctor, index) => {
      let slugStr = doctor?._id.city;
      const citySlug = slugify(slugStr, {
        lower: true,
        remove: undefined,
        strict: true,
      });
      slugStr = doctor?._id.locality;
      const localitySlug = slugify(slugStr, {
        lower: true,
        remove: undefined,
        strict: true,
      });
      data[index]._id.city = citySlug;
      data[index]._id.locality = localitySlug;
    });
    return data;
  } catch (error) {
    return false;
  }
};

const serviceListSitemap = async () => {
  try {
    const data = await EstablishmentTiming.model.aggregate([
      ...doctorTimingPipeline,
      {
        $unwind: { path: "$doctor.service", preserveNullAndEmptyArrays: false },
      },
      {
        $project: {
          address: {
            $ifNull: [
              {
                address: {
                  $ifNull: [
                    "$establishmentMaster.address.landmark",
                    constants.NA,
                  ],
                },
                locality: {
                  $ifNull: [
                    "$establishmentMaster.address.locality",
                    constants.NA,
                  ],
                },
                city: {
                  $ifNull: ["$establishmentMaster.address.city", constants.NA],
                },
                cityName: {
                  $ifNull: ["$establishmentMaster.address.city", constants.NA],
                },
                state: { $ifNull: ["$addressState.name", constants.NA] },
                pincode: {
                  $ifNull: [
                    "$establishmentMaster.address.pincode",
                    constants.NA,
                  ],
                },
                country: {
                  $ifNull: [
                    "$establishmentMaster.address.country",
                    constants.NA,
                  ],
                },
              },
              constants.NA,
            ],
          },
          service: `$doctor.service.name`,
        },
      },
      { $match: { address: { $ne: null } } },
      {
        $group: {
          _id: {
            city: "$address.city",
            locality: "$address.locality",
            service: "$service",
          },
          count: { $sum: 1 },
        },
      },
    ]);
    data.map((service, index) => {
      let slugStr = service?._id.city;
      const citySlug = slugify(slugStr, {
        lower: true,
        remove: undefined,
        strict: true,
      });
      slugStr = service?._id.locality;
      const localitySlug = slugify(slugStr, {
        lower: true,
        remove: undefined,
        strict: true,
      });
      slugStr = service?._id.service;
      const serviceSlug = slugify(slugStr, {
        lower: true,
        remove: undefined,
        strict: true,
      });
      data[index]._id.service = serviceSlug;
      data[index]._id.city = citySlug;
      data[index]._id.locality = localitySlug;
    });
    return data;
  } catch (error) {
    return false;
  }
};

module.exports = {
  filterDoctor,
  filterTopRatedDoctor,
  calenderList,
  appointmentList,
  completeDoctorProfile,
  establishmentList,
  adminDoctorList,
  getDoctorProfile,
  findAllDoctorByCity,
  doctorListForApprove,
  specializationList,
  getDoctorProfileAdmin,
  getProfile,
  doctorAboutUs,
  getForSetting,
  establishmentRequest,
  doctorList,
  similarRecord,
  doctorListBasedOnProcedure,
  establishmentProcedureList,
  specialityFirstLetterList,
  establishmentspecialityListDoc,
  doctorDetails,
  getAllTimings,
  procedureHospitalDoctorWiseList,
  getDoctorDataByID,
  establishmentProcedureListNoFilter,
  getPatientDetails,
  slugForId,
  doctorListSitemap,
  specializationListSitemap,
  serviceListSitemap,
};
