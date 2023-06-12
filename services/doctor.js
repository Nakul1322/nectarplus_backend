const establishmentMaster = require("../models/establishmentMaster");
const {
  User,
  Appointment,
  Speciality,
  Specialization,
  Procedure,
  EstablishmentMaster,
  EstablishmentTiming,
  Doctor,
  CityMaster,
  Feedback,
} = require("../models/index");
// const { getPagination,getSort } = require("../utils/index");
// const common = require("../services/common")
// const config = require("../config/index");
const { Types } = require("mongoose");
const { constants } = require("../utils/constant");
const moment = require("moment");
const { ObjectId } = require("mongoose").Types;

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

const getSortCondition = (sortBy) => {
  switch (sortBy) {
    case 1:
      return {};
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
      return { createdAt: -1 };
  }
};

const lookupEstablishmentMaster = {
  $lookup: {
    from: "establishmentmasters",
    localField: "_id",
    foreignField: "doctorId",
    as: "establishmentmaster",
  },
};

const lookupUser = {
  $lookup: {
    from: "users",
    localField: "userId",
    foreignField: "_id",
    as: "user",
  },
};

const lookupEstablishmentTiming = {
  $lookup: {
    from: "establishmenttimings",
    localField: "_id",
    foreignField: "doctorId",
    as: "establishmenttiming",
  },
};

const lookupStateMaster = {
  $lookup: {
    from: "statemasters",
    localField: "establishmentmaster.address.state",
    foreignField: "_id",
    as: "address.state",
  },
};

const lookupAppointment = {
  $lookup: {
    from: "appointments",
    localField: "_id",
    foreignField: "doctorId",
    as: "appointments",
  },
};

const lookupAppointmentFeedback = {
  $lookup: {
    from: "appointmentfeedbacks",
    localField: "_id",
    foreignField: "doctorId",
    as: "reviews",
  },
};

const unwind = (path) => ({
  $unwind: { path, preserveNullAndEmptyArrays: true },
});

function createTimeSlots(data) {
  const slotDuration = data.slotTime;
  const startDate = moment();
  const endDate = moment().add(2, "weeks");
  const result = {};

  for (let day = startDate; day.isSameOrBefore(endDate); day.add(1, "days")) {
    const dayOfWeek = day.format("ddd").toLowerCase();
    const slots = data[dayOfWeek] || [];

    result[day.format("YYYY-MM-DD")] = slots.reduce((timeSlots, slot) => {
      const from = day.clone().set({
        hour: moment(slot.from, "hh:mm A").hour(),
        minute: moment(slot.from, "hh:mm A").minute(),
      });
      const to = day.clone().set({
        hour: moment(slot.to, "hh:mm A").hour(),
        minute: moment(slot.to, "hh:mm A").minute(),
      });

      while (from.isBefore(to)) {
        if (from.isBefore(moment())) {
          from.add(slotDuration, "minutes");
          continue;
        }
        timeSlots.push(from.format("hh:mm A"));
        from.add(slotDuration, "minutes");
      }
      return timeSlots;
    }, []);
  }
  return result;
}

const filterDoctor = async (
  filters,
  queryPararms,
  sortCondition,
  offset,
  limit
) => {
  const {
    timeOfDay, //
    availability, //single 1, 2, 3
    sortBy, //
    specialty, //arr
    consultationFee,
  } = filters;
  const { filter, location } = queryPararms;
  let query = {
    userType: 2,
  };
  const today = new Date();
  // const maxAppointmentsPerDay = 36; // Adjust this according to your requirements

  if (availability) {
    const today = moment().startOf("day");
    const endDate = moment(today);

    switch (availability) {
      case 1:
        endDate.add(1, "days");
        break;
      case 2:
        today.add(1, "days");
        endDate.add(2, "days");
        break;
      case 3:
        endDate.add(7, "days");
        break;
      default:
        throw new Error("Invalid filter type");
    }
    const establishmentTimings = await EstablishmentTiming.model.find(); // Add any necessary filters or projections here
    const availableDoctorIds = [];

    for (const timing of establishmentTimings) {
      const timeSlots = createTimeSlots(timing);
      const doctorId = timing.doctorId;
      let isAvailable = false;

      for (const dateStr in timeSlots) {
        const date = moment(dateStr);
        if (date.isSameOrBefore(endDate) && date.isSameOrAfter(today)) {
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
        availableDoctorIds.push(doctorId);
      }
    }
    query = { _id: { $in: availableDoctorIds } };
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
  // if (availability) {
  //   const dayOfWeek = today.getDay();
  //   query = availability.reduce((acc, day) => {
  //     const dayName = getDayOfWeek((dayOfWeek + day - 1) % 7);
  //     acc[dayName] = {
  //       $exists: true,
  //       $not: { $size: 0 },
  //     };
  //     return acc;
  //   }, query);
  // }
  if (timeOfDay) {
    const daysOfWeek = Array.from({ length: 7 }, (_, i) => getDayOfWeek(i));
    // Use the slot names directly from the timeOfDay array in the payload
    const slots = timeOfDay;

    const slotCondition = slots.flatMap((slot) => {
      return daysOfWeek.map((day) => {
        const condition = {};
        condition[day] = {
          $elemMatch: {
            slot: slot.toLowerCase(),
          },
        };
        return condition;
      });
    });
    query["$or"] = slotCondition;
  }
  if (location) {
    const locationFilter = {
      $or: [
        { city: { $regex: location, $options: "i" } },
        { state: { $regex: location, $options: "i" } },
        { pincode: { $regex: location, $options: "i" } },
      ],
    };
    query = { ...query, ...locationFilter };
  }

  if (filter) {
    const searchFilter = {
      $or: [
        { fullName: { $regex: filter, $options: "i" } },
        { establishmentName: { $regex: filter, $options: "i" } },
        {
          specialization: {
            $elemMatch: { name: { $regex: filter, $options: "i" } },
          },
        },
      ],
    };
    query = { ...query, ...searchFilter };
  }
  const newSortCondition = getSortCondition(sortBy);
  console.log(newSortCondition);
  console.log(JSON.stringify(query));
  try {
    const data = await Doctor.model.aggregate([
      lookupEstablishmentMaster,
      unwind("$establishmentmaster"),
      lookupUser,
      unwind("$user"),
      lookupStateMaster,
      unwind("$address.state"),
      {
        $lookup: {
          from: "specializations",
          let: { specIds: "$specialization" },
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
      lookupAppointmentFeedback,
      lookupEstablishmentTiming,
      unwind("$establishmenttiming"),
      lookupAppointment,
      {
        $project: {
          fullName: "$user.fullName",
          profilePic: 1,
          experience: 1,
          convertedexperience: { $toInt: "$experience" },
          userId: { $ifNull: [`$user._id`, null] },
          consultationFees: "$establishmenttiming.consultationFees",
          recommended: 1,
          totalReview: { $size: "$reviews" },
          specialization: "$specialization",
          address: "$establishmentmaster.address",
          pinLocation: "$establishmentmaster.location",
          establishmentName: "$establishmentmaster.name",
          city: "$establishmentmaster.city",
          state: "$address.state.name",
          pincode: "$establishmentmaster.address.pincode",
          userType: "$user.userType",
          rating: 1,
          mon: "$establishmenttiming.mon",
          tue: "$establishmenttiming.tue",
          wed: "$establishmenttiming.wed",
          thu: "$establishmenttiming.thu",
          fri: "$establishmenttiming.fri",
          sat: "$establishmenttiming.sat",
          sun: "$establishmenttiming.sun",
          createdAt: 1,
          updatedAt: 1,
        },
      },
      {
        $match: query,
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
    ]);
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
    throw new Error("Failed to fetch users");
  }
};

function generateNextTwoWeeks() {
  const today = moment.utc();
  const nextTwoWeeks = [];
  for (let i = 0; i < 14; i++) {
    const date = moment.utc(today).add(i, "days").toDate();
    nextTwoWeeks.push(date);
  }
  return nextTwoWeeks;
}

async function getBookedAppointmentCount(doctorId, date) {
  const startOfDay = moment.utc(date).startOf("day").toDate();
  const endOfDay = moment.utc(date).endOf("day").toDate();
  const count = await Appointment.model.countDocuments({
    doctorId: doctorId,
    date: { $gte: startOfDay, $lte: endOfDay },
    status: { $nin: [-1, -2] }, // Exclude cancelled (-1) and rescheduled (-2) appointments
  });
  return count;
}

async function calculateAvailableSlotsForDoctor(doctor, slotTime) {
  const schedule = {
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

  for (const date of nextTwoWeeks) {
    const day = moment.utc(date).day() === 0 ? 7 : moment.utc(date).day();
    const daySchedule = schedule[day] || [];

    const totalSlots = daySchedule.reduce((slots, timeRange) => {
      const from = moment.utc(date).set({
        hour: parseInt(timeRange.from.split(":")[0]),
        minute: parseInt(timeRange.from.split(":")[1]),
      });

      const to = moment.utc(date).set({
        hour: parseInt(timeRange.to.split(":")[0]),
        minute: parseInt(timeRange.to.split(":")[1]),
      });

      const diffInMinutes = to.diff(from, "minutes");
      const slotsInTimeRange = Math.floor(diffInMinutes / slotTime);
      return slots + slotsInTimeRange;
    }, 0);

    const bookedCount = await getBookedAppointmentCount(doctor._id, date);
    const remainingSlots = totalSlots - bookedCount;

    availableSlots.push({
      date: moment.utc(date).toISOString().split("T")[0],
      count: bookedCount,
      remainingSlots: remainingSlots,
    });
  }

  return availableSlots;
}

const filterTopRatedDoctor = async (filters) => {
  let pipeline1,
    pipeline2 = [];
  pipeline1 = [
    {
      $match: {
        specialization: {
          $in: [new Types.ObjectId("6449025319b52d5fe2e72ae4")],
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
      $unwind: { path: "$specialization", preserveNullAndEmptyArrays: true },
    },
    {
      $match: {
        "specialization.name": "Dental",
      },
    },
    {
      $lookup: {
        from: "establishmentmasters",
        localField: "_id",
        foreignField: "doctorId",
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
        from: "citymasters",
        localField: "establishmentDetails.address.city",
        foreignField: "_id",
        as: "address.city",
      },
    },
    {
      $unwind: { path: "$address.city", preserveNullAndEmptyArrays: true },
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
      $lookup: {
        from: "appointmentfeedbacks",
        let: { doctorId: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ["$doctorId", "$$doctorId"] },
            },
          },
        ],
        as: "reviews",
      },
    },
    {
      $lookup: {
        from: "establishmenttimings",
        localField: "userId",
        foreignField: "userId",
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
      $project: {
        _id: 1,
        userId: 1,
        doctorName: "$user.fullName",
        doctorProfilePicture: "$profilePic",
        rating: 1,
        recommended: 1,
        specialization: "$specialization.name",
        totalReview: { $size: "$reviews" },
        consultationFees: "$establishmenttiming.consultationFees",
        address: {
          address: "$establishmentDetails.address.address",
          landmark: "$establishmentDetails.address.landmark",
          country: "$establishmentDetails.address.country",
          street: "$establishmentDetails.address.street",
          city: "$address.city.name",
          state: "$address.state.name",
          pincode: "$establishmentDetails.address.pincode",
          _id: "$establishmentDetails.address._id",
          cityId: "$establishmentDetails.address.city",
          stateId: "$establishmentDetails.address.state",
        },
      },
    },
  ];
  pipeline2 = [
    {
      $match: {
        $expr: {
          $eq: [
            { $arrayElemAt: ["$feedback.selectedOptionId", 0] },
            new Types.ObjectId("645c9b00311a098a4cf33e13"),
          ],
        },
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
        from: "establishmentmasters",
        localField: "doctorId",
        foreignField: "doctorId",
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
        from: "citymasters",
        localField: "establishmentDetails.address.city",
        foreignField: "_id",
        as: "address.city",
      },
    },
    {
      $unwind: { path: "$address.city", preserveNullAndEmptyArrays: true },
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
      $lookup: {
        from: "appointmentfeedbacks",
        let: { doctorId: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ["$doctorId", "$$doctorId"] },
            },
          },
        ],
        as: "reviews",
      },
    },
    {
      $lookup: {
        from: "establishmenttimings",
        localField: "userId",
        foreignField: "userId",
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
      $project: {
        _id: 1,
        userId: 1,
        doctorName: "$user.fullName",
        doctorProfilePicture: "$doctor.profilePic",
        rating: 1,
        timeTaken: {
          $cond: {
            if: {
              $eq: [
                { $arrayElemAt: ["$feedback.selectedOptionId", 0] },
                new Types.ObjectId("645c9b00311a098a4cf33e13"),
              ],
            },
            then: "15 mins wait time",
            else: "Wait time is more than 15 mins",
          },
        },
        specialization: "$specialization.name",
        totalReview: { $size: "$reviews" },
        address: {
          address: "$establishmentDetails.address.address",
          landmark: "$establishmentDetails.address.landmark",
          country: "$establishmentDetails.address.country",
          street: "$establishmentDetails.address.street",
          city: "$address.city.name",
          state: "$address.state.name",
          pincode: "$establishmentDetails.address.pincode",
          _id: "$establishmentDetails.address._id",
          cityId: "$establishmentDetails.address.city",
          stateId: "$establishmentDetails.address.state",
        },
      },
    },
  ];
  try {
    const topDentalDoc = await Doctor.model.aggregate(pipeline1);
    const shortestTimecardiologist = await Feedback.model.aggregate(pipeline2);
    const data = { topDentalDoc, shortestTimecardiologist };
    return data;
  } catch (error) {
    console.log(error);
    throw new Error("Failed to fetch feedbacks data");
  }
};

const calenderList = async (matchCondition, condition1) => {
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
          localField: "establishmentId",
          foreignField: "establishmentId",
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
          localField: "establishmentId",
          foreignField: "_id",
          as: "establishmentMasterData",
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

      {
        $project: {
          hospitalName: "$userData.fullName",
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
            isVerified: "$patientData.isVerified",
            profilePic: "$patientData.profilePic",
          },
          dayOfWeek: { $dayOfWeek: "$date" },
          establishmentTiming: 1,
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
          establishmentTimingOfDay: {
            $switch: {
              branches: [
                {
                  case: { $eq: ["$dayOfWeek", 1] },
                  then: "$establishmentTiming.sun",
                },
                {
                  case: { $eq: ["$dayOfWeek", 2] },
                  then: "$establishmentTiming.mon",
                },
                {
                  case: { $eq: ["$dayOfWeek", 3] },
                  then: "$establishmentTiming.tue",
                },
                {
                  case: { $eq: ["$dayOfWeek", 4] },
                  then: "$establishmentTiming.wed",
                },
                {
                  case: { $eq: ["$dayOfWeek", 5] },
                  then: "$establishmentTiming.thu",
                },
                {
                  case: { $eq: ["$dayOfWeek", 6] },
                  then: "$establishmentTiming.fri",
                },
                {
                  case: { $eq: ["$dayOfWeek", 7] },
                  then: "$establishmentTiming.sat",
                },
              ],
              default: "Not found",
            },
          }, // Get the establishment timing for the corresponding day
          establishmentTimingOfWeek: {
            sun: {
              $cond: [
                { $gt: [{ $size: "$establishmentTiming.sun" }, 0] },
                true,
                false,
              ],
            },
            mon: {
              $cond: [
                { $gt: [{ $size: "$establishmentTiming.mon" }, 0] },
                true,
                false,
              ],
            },
            tue: {
              $cond: [
                { $gt: [{ $size: "$establishmentTiming.tue" }, 0] },
                true,
                false,
              ],
            },
            wed: {
              $cond: [
                { $gt: [{ $size: "$establishmentTiming.wed" }, 0] },
                true,
                false,
              ],
            },
            thu: {
              $cond: [
                { $gt: [{ $size: "$establishmentTiming.thu" }, 0] },
                true,
                false,
              ],
            },
            fri: {
              $cond: [
                { $gt: [{ $size: "$establishmentTiming.fri" }, 0] },
                true,
                false,
              ],
            },
            sat: {
              $cond: [
                { $gt: [{ $size: "$establishmentTiming.sat" }, 0] },
                true,
                false,
              ],
            },
          },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
          totalCount: { $sum: 1 },
          data: { $push: "$$ROOT" },
        },
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          _id: 0,
          date: "$_id",
          count: "$totalCount",
          data: "$data",
        },
      },
    ]);
    return data;
  } catch (err) {
    console.log("🚀 ~ file: doctor.js:823 ~ calenderList ~ err:", err);
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
      facetObject.data.push({ $skip: Number(skip) }),
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
          // establishmentData: {
          //   name: "$establishmentData.name",
          // },
          hospitalName: "$hospitalDetailsFromUser.fullName",
          patientDetails: {
            fullName: "$patientDetails.fullName",
            phone: "$patientDetails.phone",
          },
        },
      },
      // {
      //   $facet: {
      //     count: [{ $count: "count" }],
      //     data: [{ $skip: Number(skip) }, { $limit: Number(limit) }],
      //   },
      // },
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
  } catch (err) {
    return false;
  }
};

const completeDoctorProfile = async (condition) => {
  try {
    const data = await User.model.aggregate([
      { $match: condition },
      // {
      //   $lookup: {
      //     from: "faqs",
      //     localField: "_id",
      //     foreignField: "userId",
      //     as: "faq",
      //   },
      // },
      // {
      //   $lookup: {
      //     from: "feedbacks",
      //     localField: "_id",
      //     foreignField: "doctorId",
      //     as: "feedback",
      //   },
      // },
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
  } catch (err) {
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
        $unwind: { path: "$specialization", preserveNullAndEmptyArrays: true },
      },
      {
        $lookup: {
          from: "establishmentmasters",
          localField: "doctor._id",
          foreignField: "doctorId",
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
          from: "establishmenttimings",
          localField: "establishmentMaster._id",
          foreignField: "establishmentId",
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
              isOwner: `$establishmentMaster.isOwner`,
              locality: `$establishmentMaster.locality`,
              city: `$establishmentMaster.city`,
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
              establishmentProof: `$establishmentMaster.establishmentProof`,
              propertyStatus: `$establishmentMaster.propertyStatus`,
            },
          },
          sectionC: {
            establishmentTiming: `$establishmentTiming`,
            address: `$establishmentMaster.address`,
          },
          _id: 1,
          doctorId: `$doctor._id`,
          establishmentMasterId: `$establishmentMaster._id`,
          establishmentMasterTimingId: `$establishmentTiming._id`,
          steps: `$doctor.steps`,
          isApproved: `$doctor.isVerified`,
          phoneNumber: `$phone`,
          profileScreen: `$doctor.profileScreen`,
        },
      },
    ]);
    return data.length === 0 ? false : data;
  } catch (err) {
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
          from: "establishmentmasters",
          localField: "_id",
          foreignField: "doctorId",
          as: "establishmentMaster",
        },
      },
      {
        $unwind: {
          path: "$establishmentMaster",
          preserveNullAndEmptyArrays: true,
        },
      },
      { $limit: 1 },
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
          from: "establishmenttimings",
          localField: "establishmentMaster._id",
          foreignField: "establishmentId",
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
              isOwner: { $ifNull: [`$establishmentMaster.isOwner`, null] },
              locality: { $ifNull: [`$establishmentMaster.locality`, null] },
              city: { $ifNull: [`$establishmentMaster.city`, null] },
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
                $ifNull: [`$establishmentMaster.establishmentProof`, null],
              },
              propertyStatus: {
                $ifNull: [`$establishmentMaster.propertyStatus`, null],
              },
            },
          },
          sectionC: {
            establishmentTiming: { $ifNull: [`$establishmentTiming`, null] },
            address: {
              street: {
                $ifNull: [`$establishmentMaster.address.street`, null],
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
  } catch (err) {
    return false;
  }
};

const findAllDoctorByCity = async (condition) => {
  try {
    const data = await CityMaster.model.aggregate([
      {
        $lookup: {
          from: "specializations",
          pipeline: [
            {
              $match: {},
            },
            {
              $project: {
                _id: 1,
                name: 1,
                image: 1,
                cityCode: "$code",
              },
            },
          ],
          as: "specializations",
        },
      },
      {
        $unwind: {
          path: "$specializations",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $group: {
          _id: "$_id",
          code: { $first: "$code" },
          name: { $first: "$name" },
          stateId: { $first: "$stateId" },
          status: { $first: "$status" },
          createdBy: { $first: "$createdBy" },
          modifiedBy: { $first: "$modifiedBy" },
          createdAt: { $first: "$createdAt" },
          updatedAt: { $first: "$updatedAt" },
          specializations: { $push: "$specializations" },
        },
      },
    ]);
    console.log(data);
    return data;
  } catch (err) {
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
        $unwind: { path: "$establishmentData", preserveNullAndEmptyArrays: true, }
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
        $unwind: { path: "$hospitalTypeData", preserveNullAndEmptyArrays: true, }
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
        $unwind: { path: "$hospitalData", preserveNullAndEmptyArrays: true, }
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
          hospitalData: {
            profilePic: "$hospitalData.profilePic",
            address: "$hospitalData.address",
            location: "$hospitalData.location",
          },
          estabMasterData: {
            name: "$establishmentData.name",
            address:"$establishmentData.address",
            location:"$establishmentData.location",
            hospitalId:"$establishmentData.hospitalId"
          },
          hospitalTypeData: '$hospitalTypeData.name'
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

const establishmentRequest = async (condition, limit, skip, sortBy, order) => {
  try {
    const sortObject = { sortBy: constants.LIST.ORDER[order] };
    if (sortBy === "fullName") {
      sortObject["hospitalName.fullName"] = constants.LIST.ORDER[order];
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
          hospitalName: "$hospitalName.fullName",
          profilePic: "$hospitalData.profilePic",
          hospitalType: 1,
          isVerified: 1,
          specilityData: 1,
          establishmentId: 1,
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
  } catch (err) {
    return false;
  }
};

const getSortObject = (sortBy, order) => {
  console.log(sortBy);
  let sortObject = {};
  if (sortBy === "0") {
    sortObject["createdAt"] = Number(order);
  }
  if (sortBy === "1") {
    sortObject["_id"] = 1;
    sortObject["specialization.name"] = Number(order);
  } else if (sortBy === "2") {
    sortObject["education.degreeName"] = Number(order); // add degreeName field
  } else if (sortBy === "3") {
    sortObject["fullName"] = Number(order); // add degreeName field
  }
  return sortObject;
};

const adminDoctorList = async (
  condition,
  limit,
  skip,
  sortBy,
  order,
  search,
  isExport
) => {
  try {
    const matchSearch = {};
    const sortObject = { sortBy: constants.LIST.ORDER[order] };
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
      facetObject.data.push({ $skip: Number(skip) }),
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
              $project: { id: "$_id", _id: 0, fullName: 1, phone: 1 },
            },
          ],
          as: "doctorDetails",
        },
      },
      { $unwind: { path: "$doctorDetails", preserveNullAndEmptyArrays: true } },
      { $match: matchSearch },
      {
        $lookup: {
          from: "specializations",
          localField: "specialization",
          foreignField: "_id",
          as: "specialization",
        },
      },
      // {
      //   $unwind: { path: "$specialization", preserveNullAndEmptyArrays: true },
      // },
      {
        $lookup: {
          from: "establishmentmasters",
          let: { userId: "$userId" },
          pipeline: [
            { $match: { $expr: { $eq: ["$doctorId", "$$userId"] } } }, //_id
            {
              $project: {
                id: "$_id",
                _id: 0,
                address: 1,
                location: 1,
                isOwner: 1,
              },
            },
          ],
          as: "localityDetails",
        },
      },
      // {
      //   $lookup:{
      //     from:"establishmentmasters",
      //     localField:"_id",
      //     foreignField:"doctorId",
      //     as:"localityDetails"
      //   }
      // },
      // {
      //   $unwind: { path: "$localityDetails", preserveNullAndEmptyArrays: true },
      // },
      {
        $lookup: {
          from: "statemasters",
          localField: "localityDetails.address.state",
          foreignField: "_id",
          as: "stateDetails",
        },
      },
      // {
      //   $unwind: { path: "$specialization", preserveNullAndEmptyArrays: true },
      // },
      { $sort: sortObject },

      // {
      //   $project:{
      //     profilePic:1,
      //     education:1,
      //     email:1,
      //     status:1,
      //     doctorDetails:1,
      //     createdAt:1,
      //     specialization:1,
      //     city:1
      //   }
      // },

      {
        $facet: facetObject,
      },
    ]);
    return data;
  } catch (err) {
    console.log("🚀 ~ file: doctor.js:1093 ~ adminDoctorList ~ err:", err);
    return false;
  }
};

const doctorListForApprove = async (
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
          userId:1,
          profilePic:1,
          createdAt:1,
          doctorDetails: 1,
          specializationDetails: 1,
          localityDetails: 1,
          city:1,
          isVerified:1,
          rejectReason:1

        },
      },
      // { $sort: sortObject },
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

const specializationList = async (
  condition,
  limit,
  skip,
  sort,
  order,
  search
) => {
  try {
    const matchSearch = {};
    const data = await Specialization.model.aggregate([
      {
        $lookup: {
          from: "doctors",
          localField: "_id",
          foreignField: "specialization",
          as: "doctors_specialization",
        },
      },
      {
        $project: {
          _id: 1,
          name: "$name",
          count: { $size: "$doctors_specialization" },
          image: 1,
        },
      },
    ]);
    return data;
  } catch (err) {
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
  } catch (err) {
    return false;
  }
};

const doctorAboutUs = async (doctorId) => {
  try {
    const data = await Doctor.model.aggregate([
      { $match: { _id: new Types.ObjectId(doctorId) } },
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
        $lookup: {
          from: "establishmentmasters",
          localField: "_id",
          foreignField: "doctorId",
          as: "establishmentmaster",
        },
      },
      {
        $lookup: {
          from: "establishmenttimings",
          localField: "establishmentmasters._id",
          foreignField: "establishment",
          as: "establishmenttiming",
        },
      },
      {
        $lookup: {
          from: "hospitaltypes",
          localField: "establishmentmaster.hospitalTypeId",
          foreignField: "_id",
          as: "hospitalType",
        },
      },
      { $unwind: { path: "$hospitalType", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "specializations",
          localField: "specialization",
          foreignField: "_id",
          as: "specialization",
        },
      },
      {
        $project: {
          _id: 1,
          userId: 1,
          specialization: 1,
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
          recommended: 1,
          fullName: "$user.fullName",
          phone: "$user.phone",
          rating: 1,
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
                    hospitalType: "$hospitalType.name",
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
          totalReview:'4'
        },
      },
      {
        $addFields: {
          "establishmentmaster.totalReview": 453,
          "establishmentmaster.totalRating": 4.5,
          "establishmentmaster.consultationFees": {
            $first: "$establishmentmaster.consultationFees",
          },
        },
      },
      {
        $addFields: {
          consultationFees: {
            $arrayElemAt: ["$establishmentmaster.consultationFees", 0],
          },
        },
      },
    ]);
    return data.length === 0 ? false : data;
  } catch (err) {
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
          socialMediaName: "$socialMedia.name",
          socialMediaLogo: "$socialMedia.logo",
        },
      },
    ]);
    return data.length === 0 ? false : data;
  } catch (err) {
    console.log(err);
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
  } catch (err) {
    console.log(err);
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
    return data ? true : false;
  } catch (error) {
    console.log(error);
    return false;
  }
};

const doctorListBasedOnEstablishmentSpecility = async (
  establishmentId,
  condition ,
  speciality ,
  offset,
  limit
) => {
  let filters = {};
  try {
    if (condition) {
      filters = {
        "specialization.name": {
          $regex: new RegExp(`^${condition}`, "i"),
        },
      };
    }
    if (speciality) {
      filters = {
        specility: {
          $elemMatch: {
            $eq: new Types.ObjectId(speciality),
          },
        },
      };
    }
    const data = await EstablishmentTiming.model.aggregate([
      { $match: { establishmentId: new Types.ObjectId(establishmentId) } },
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
          from: "specializations",
          localField: "specility",
          foreignField: "_id",
          as: "specialization",
        },
      },
      {
        $match: filters,
      },
      {
        $project: {
          _id: 1,
          userId: 1,
          specialization: 1,
          experience: "$doctor.experience",
          reviews: "200",
          consultationFees: 1,
          service: 1,
          experience: "$doctor.experience",
          profilePic: "$doctor.profilePic",
          rating: "$doctor.rating",
          recommended: "$doctor.recommended",
          fullName: "$user.fullName",
          phone: "$user.phone",
          rating: "$doctor.rating",
          establishmentTiming: {
            mon: "$mon",
            tue: "$tue",
            wed: "$wed",
            thu: "$thu",
            fri: "$fri",
            sat: "$sat",
            sun: "$sun",
          },
          waitTime: "Less than 15 minutes",
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
    console.log(data);
    return data.length === 0 ? false : data;
  } catch (err) {
    return false;
  }
};

const establishmentSpecialityList = async (establishmentId, condition = {}) => {
  try {
    const data = await EstablishmentTiming.model.aggregate([
      { $match: { establishmentId: new Types.ObjectId(establishmentId) } },
      {
        $lookup: {
          from: "specializations",
          localField: "specility",
          foreignField: "_id",
          as: "specialization",
        },
      },
      {
        $unwind: { path: "$specialization", preserveNullAndEmptyArrays: true },
      },
      {
        $match: {
          "specialization.name": {
            $regex: new RegExp(`^${condition}`, "i"),
          },
        },
      },
      {
        $group: {
          _id: "$specialization._id",
          name: { $first: "$specialization.name" },
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
  } catch (err) {
    return false;
  }
};

const specialityFirstLetterList = async (establishmentId, condition) => {
  try {
    const data = await EstablishmentTiming.model.aggregate([
      { $match: { establishmentId: new Types.ObjectId(establishmentId) } },
      {
        $lookup: {
          from: "specializations",
          localField: "specility",
          foreignField: "_id",
          as: "specialization",
        },
      },
      { $unwind: "$specialization" },
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
    data.forEach(({ name }) => {
      const firstLetter = name[0].toUpperCase();
      const index = firstLetter.charCodeAt(0) - 65;
      if (index >= 0 && index < 26) {
        alphabetStatus[index].status = 1;
      }
    });

    return alphabetStatus;
  } catch (err) {
    return false;
  }
};

const establishmentspecialityListDoc = async (establishmentId, condition) => {
  try {
    const data = await EstablishmentTiming.model.aggregate([
      { $match: { establishmentId: new Types.ObjectId(establishmentId) } },
      {
        $unwind: "$specility",
      },
      {
        $lookup: {
          from: "specializations",
          localField: "specility",
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
  } catch (err) {
    return false;
  }
};

module.exports = {
  filterDoctor,
  filterTopRatedDoctor,
  // specializationAggregation,
  // appointmentAggregation,
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
  doctorListBasedOnEstablishmentSpecility,
  establishmentSpecialityList,
  specialityFirstLetterList,
  establishmentspecialityListDoc,
};
