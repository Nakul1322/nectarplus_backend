const { appointment, common } = require("../../../services/index");
const {
  Appointment,
  User,
  EstablishmentTiming,
  EstablishmentMaster,
  Session,
  Doctor,
  Patient,
} = require("../../../models/index");
const { response, constants } = require("../../../utils/index");
const httpStatus = require("http-status");
const {
  getPagination,
  convertToUTCTimestamp,
} = require("../../../utils/helper");
const { Types } = require("mongoose");
const moment = require("moment");
const dayjs = require("dayjs");
const customParseFormat = require("dayjs/plugin/customParseFormat");
dayjs.extend(customParseFormat);

const appointmentList = async (req, res) => {
  try {
    const { search, sort, page, size, sortOrder, status, toDate, fromDate, isExport } = req.query;
    const sortCondition = {};

    if (sort === constants.LIST.DEFAULT_SORT) sortCondition["slot"] = constants.LIST.ORDER[sortOrder];
    else {
      let sortKey = sort;
      if (constants.NAME_CONSTANT.includes(sort)) sortKey = constants.APPOINTMENT_LIST[sort];
      sortCondition[`${sortKey}`] = constants.LIST.ORDER[sortOrder];  
    }

    const { limit, offset } = getPagination(page, size);
    const searchQuery = search || "";
    const condition = {};

    if (status || (status === constants.BOOKING_STATUS.BOOKED)) condition.status = status;

    const appointmentList = await appointment.appointmentList(
      condition,
      sortCondition,
      offset,
      limit,
      searchQuery,
      { 
        fromDate,
        toDate
      },
      isExport
    );

    const msgCode = !appointmentList?.count
      ? "NO_RECORD_FETCHED"
      : "APPOINTMENT_LIST_FETCHED";
    return response.success(
      { msgCode, data: appointmentList },
      res,
      httpStatus.OK
    );
  } catch (err) {
    console.log(err);
    return response.error(
      { msgCode: "SOMETHING_WENT_WRONG" },
      res,
      httpStatus.SOMETHING_WENT_WRONG
    );
  }
};

const bookedSlots = async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { dateString } = req.query;
    const morningSlots = [];
    const afternoonSlots = [];
    const eveningSlots = [];

    const doctors = await Doctor.model.aggregate([
      {
        $match: { _id: new Types.ObjectId(req.params.doctorId) },
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
          from: "establishmenttimings",
          localField: "_id",
          foreignField: "doctorId",
          as: "establishmenttiming",
        },
      },
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
          from: "citymasters",
          let: { cityId: "$establishmentmaster.address.city" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$_id", "$$cityId"] },
              },
            },
            {
              $project: {
                _id: 0,
                name: 1,
              },
            },
          ],
          as: "city",
        },
      },
      {
        $lookup: {
          from: "statemasters",
          let: { stateId: "$establishmentmaster.address.state" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$_id", "$$stateId"] },
              },
            },
            {
              $project: {
                _id: 0,
                name: 1,
              },
            },
          ],
          as: "state",
        },
      },
      {
        $lookup: {
          from: "appointmentfeedbacks",
          localField: "_id",
          foreignField: "doctorId",
          as: "feedbacks",
        },
      },
      {
        $lookup: {
          from: "appointments",
          localField: "_id",
          foreignField: "doctorId",
          as: "appointments",
        },
      },
      { $unwind: { path: "$feedbacks", preserveNullAndEmptyArrays: true } },
      { $unwind: { path: "$appointments", preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: "$_id",
          establishmentmaster: { $first: "$establishmentmaster" },
          city: { $first: "$city" },
          state: { $first: "$state" },
          establishmenttiming: { $first: "$establishmenttiming" },
          avgRating: { $avg: "$feedbacks.totalPoint" },
        },
      },
      {
        $addFields: {
          establishmentDetails: {
            $map: {
              input: "$establishmentmaster",
              as: "establishment",
              in: {
                city: { $arrayElemAt: ["$city.name", 0] },
                state: { $arrayElemAt: ["$state.name", 0] },
                consultationFees: {
                  $arrayElemAt: [
                    {
                      $map: {
                        input: {
                          $filter: {
                            input: "$establishmenttiming",
                            as: "timing",
                            cond: {
                              $eq: [
                                "$$establishment._id",
                                "$$timing.establishmentId",
                              ],
                            },
                          },
                        },
                        as: "filteredTiming",
                        in: "$$filteredTiming.consultationFees",
                      },
                    },
                    0,
                  ],
                },
                establishmentPic: "$$establishment.establishmentPic",
                _id: "$$establishment._id",
                establishmentName: "$$establishment.name",
                address: "$$establishment.address",
                location: "$$establishment.location",
                rating: { $round: ["$avgRating", 1] },
              },
            },
          },
        },
      },
      {
        $project: {
          name: "$user.fullName",
          experience: 1,
          profilePic: 1,
          establishmentDetails: 1,
          rating: 1,
          recommended: 1,
        },
      },
    ]);
    const date = dayjs(dateString, "ddd, D MMM");
    const dayOfWeek = date.format("ddd").toLowerCase();
    // Find the establishment timing for the given doctor
    const timing = await EstablishmentTiming.model.findOne({
      doctorId: new Types.ObjectId(doctorId),
    });
    // Find the working hours for the given day
    const workingHours = timing[dayOfWeek];
    // Generate time slots based on working hours and slotTime
    const slots = [];
    const currentDate = moment().startOf("day"); // Get the current date without time
    const currentTime = moment(); // Get the current time
    if (Array.isArray(workingHours)) {
      for (const hours of workingHours) {
        const startTime = moment(hours.from, "h A");
        const endTime = moment(hours.to, "h A");
        while (startTime.isBefore(endTime)) {
          const slotTime = startTime.format("h:mm A");
          const slotDateTime = moment(
            `${date.format("YYYY-MM-DD")} ${slotTime}`,
            "YYYY-MM-DD h:mm A"
          ); // Combine date and time
          const status =
            slotDateTime.isBefore(currentTime) && currentDate.isSame(date)
              ? 0
              : 1; // Set status
          // Add the generated slot to the respective array
          slots.push({ time: slotTime, status });
          startTime.add(timing.slotTime, "minutes");
        }
      }
    } else {
      console.error("workingHours is undefined:", workingHours);
    }
    for (const slot of slots) {
      const time = moment(slot.time, "h:mm A");
      if (
        time.isBetween(
          moment("12:01 AM", "h:mm A"),
          moment("11:59 AM", "h:mm A"),
          undefined,
          "[]"
        )
      ) {
        morningSlots.push(slot);
      } else if (
        time.isBetween(
          moment("12:01 PM", "h:mm A"),
          moment("4:59 PM", "h:mm A"),
          undefined,
          "[]"
        )
      ) {
        afternoonSlots.push(slot);
      } else if (
        time.isBetween(
          moment("5:01 PM", "h:mm A"),
          moment("11:59 PM", "h:mm A"),
          undefined,
          "[]"
        )
      ) {
        eveningSlots.push(slot);
      }
    }
    const timeSlot = { morningSlots, afternoonSlots, eveningSlots };
    // Find booked appointments for the given doctor and date
    const appointments = await Appointment.model.find({
      doctorId: new Types.ObjectId(doctorId),
      date: {
        $gte: date.startOf("day").toDate(),
        $lt: date.endOf("day").toDate(),
      },
    });    
    // Update the status of the slots based on the booked appointments
    for (const appointment of appointments) {
      const bookedTime = moment(appointment.date).format("h:mm A");
      const slot = slots.find((s) => s.time === bookedTime);
      if (slot) {
        if (appointment.status === -1 || appointment.status === -2) {
          slot.status = 1; // Set status to 1 for cancelled and rescheduled
          if (appointment.status === -2) {
            const rescheduledTime = moment(appointment.rescheduledDate).format(
              "h:mm A"
            );
            slot.rescheduledTime = rescheduledTime; // Store the rescheduled time
          }
        } else {
          // Set status to 0 for other appointments
          slot.status = 0;
        }
      }
    }    
    const availableSlot =
      morningSlots.filter((slot) => slot.status === 1).length +
      afternoonSlots.filter((slot) => slot.status === 1).length +
      eveningSlots.filter((slot) => slot.status === 1).length;
    return response.success(
      { msgCode: "DOCTOR_LIST", data: { doctors, timeSlot, availableSlot } },
      res,
      httpStatus.OK
    );
  } catch (error) {
    console.log("🚀 ~ file: controller.js ~ line 301 ~ login ~ error", error);
    return response.error(
      { msgCode: "INTERNAL_SERVER_ERROR" },
      res,
      httpStatus.INTERNAL_SERVER_ERROR
    );
  }
};

const appointmentReschedule = async (req, res) => {
  try {
    const { id } = req.params;
    const { date, time } = req.body;
    console.log(id);
    const oldData = await common.updateById(Appointment.model, id, {
      status: -2,
    }); // Updating the status of appointment

    const updatedAppointmentData = {
      doctorId: oldData.doctorId,
      establishmentId: oldData.establishmentId,
      slotTime: oldData.slotTime,
      consultationFees: oldData.consultationFees,
      startTime: oldData.startTime,
      date: convertToUTCTimestamp(date, time),
      patientId: oldData.patientId,
      self: oldData.self,
      fullName: oldData.fullName,
      phone: oldData.phone,
      email: oldData.email,
      city: oldData.city,
      reason: oldData.reason,
      status: 0,
    };

    const appointment = await common.create(
      Appointment.model,
      updatedAppointmentData
    );

    if (!appointment) {
      return response.error(
        { msgCode: "FAILED_TO_ADD" },
        res,
        httpStatus.BAD_REQUEST
      );
    }
    return response.success(
      { msgCode: "APPOINTMENT_RESCHEDULE", data: appointment },
      res,
      httpStatus.CREATED
    );
  } catch (error) {
    console.log("🚀 ~ file: controller.js ~ line 301 ~ login ~ error", error);
    return response.error(
      { msgCode: "INTERNAL_SERVER_ERROR" },
      res,
      httpStatus.INTERNAL_SERVER_ERROR
    );
  }
};

// // Add this function to check if a slot is already booked
// function isSlotBooked(bookedAppointments, currentDate, slotTime) {
//   return bookedAppointments.some((appointment) => {
//     const appointmentStartTime = moment(appointment.date).startOf("minutes");
//     const appointmentEndTime = appointmentStartTime.clone().add(appointment.duration, "minutes");
//     return currentDate.isBetween(appointmentStartTime, appointmentEndTime, "minutes", '[)');
//   });
// }

// async function generateTimeSlots(appointment, currentDate) {
//   const appointmentDate = moment(appointment.date);
//   const dayOfWeek = appointmentDate.format("ddd").toLowerCase();

//   const establishmentTiming = await common.findObject(EstablishmentTiming.model, {
//     establishmentId: appointment.establishmentId,
//     doctorId: appointment.doctorId,
//   });
//   const slots = establishmentTiming[dayOfWeek];

//   if (!Array.isArray(slots) || slots.length === 0) {
//     return []; // Return an empty array if no slots are defined for the day
//   }

//   // Fetch the booked appointments for the given doctor and establishment within the date range
//   const bookedAppointments = await Appointment.model.find({
//     doctorId: appointment.doctorId,
//     establishmentId: appointment.establishmentId,
//     date: {
//       $gte: currentDate.clone().startOf("day").toDate(),
//       $lt: currentDate.clone().endOf("day").toDate(),
//     },
//   });

//   const formattedAppointmentDate = moment(currentDate).format("YYYY-MM-DD");
//   const timeSlots = [];
//   for (const slot of slots) {
//     const startTime = moment(`${formattedAppointmentDate} ${slot.from}`, "YYYY-MM-DD hh A");
//     const endTime = moment(`${formattedAppointmentDate} ${slot.to}`, "YYYY-MM-DD hh A");

//     if (currentDate.isSame(moment(), "day")) {
//       const currentTime = moment();
//       if (startTime < currentTime) {
//         continue;
//       }
//     }

//     let currentTime = startTime.clone();
//     while (currentTime < endTime) {
//       // Check if the current time slot is already booked
//       if (!isSlotBooked(bookedAppointments, currentTime, establishmentTiming.slotTime)) {
//         timeSlots.push(currentTime.format("hh:mm A"));
//       }
//       currentTime.add(establishmentTiming.slotTime, "minutes");
//     }
//   }
//   return timeSlots;
// }

// // Add this function to generate an array of weeks between two dates
// function getDates(weeks) {
//   let dates = [];

//   for (const week of weeks) {
//     const startDate = moment(week.start);
//     const endDate = moment(week.end);

//     dates.push({
//       begin: startDate.format("YYYY-MM-DD"),
//       end: endDate.format("YYYY-MM-DD"),
//     });
//   }

//   return dates;
// }

// Helper function to get the week number of a given date, with the week starting from today
function getWeekNumberFromDate(date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysDifference = Math.floor((date - today) / (1000 * 60 * 60 * 24));
  return Math.floor(daysDifference / 7) + 1;
}

// Function that returns the date range string for a given week
function getDateRangeForWeek(weekNumber) {
  const today = new Date();
  if (weekNumber === 1) {
    const endOfWeek = new Date(today.getTime() + 6 * 24 * 60 * 60 * 1000);
    return `today / ${endOfWeek.toISOString().split("T")[0]}`;
  } else {
    const startOfWeek = new Date(
      today.getTime() + (weekNumber - 1) * 7 * 24 * 60 * 60 * 1000
    );
    const endOfWeek = new Date(startOfWeek.getTime() + 6 * 24 * 60 * 60 * 1000);
    return `${startOfWeek.toISOString().split("T")[0]} / ${
      endOfWeek.toISOString().split("T")[0]
    }`;
  }
}

function createTimeSlots(data, bookedAppointment) {
  const slotDuration = data.slotTime;
  const startDate = moment();
  const endDate = moment().add(2, "weeks");
  const result = {};
  const bookedSlotTime = moment(bookedAppointment.date).format("hh:mm A");

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
        if (
          (from.isBefore(moment()) ||
            from.format("hh:mm A") === bookedSlotTime) &&
          bookedAppointment.status !== -1 &&
          bookedAppointment.status !== -2
        ) {
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

const appointmentRescheduleStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const appointment = await common.getById(Appointment.model, id);
    const establishmentData = await EstablishmentTiming.model.findOne({
      establishmentId: new Types.ObjectId(appointment.establishmentId),
    });
    const timeSlots = createTimeSlots(establishmentData, appointment);

    const week1TimeSlots = [];
    const week2TimeSlots = [];

    // Iterate through the timeSlots object keys (dates)
    for (const dateStr in timeSlots) {
      const date = new Date(dateStr);
      const weekNumber = getWeekNumberFromDate(date);

      const dateSlots = {
        date: dateStr,
        slots: timeSlots[dateStr],
      };

      if (weekNumber === 1) {
        week1TimeSlots.push(dateSlots);
      } else if (weekNumber === 2) {
        week2TimeSlots.push(dateSlots);
      }
    }

    // Create an object with keys as date ranges and values as the corresponding time slots
    const timeSlotsByWeek = [
      {
        date: getDateRangeForWeek(1),
        slots: week1TimeSlots,
      },
      {
        date: getDateRangeForWeek(2),
        slots: week2TimeSlots,
      },
    ];

    return response.success(
      {
        msgCode: "APPOINTMENT_RESCHEDULE",
        data: {
          appointment,
          timeSlots: timeSlotsByWeek,
        },
      },
      res,
      httpStatus.CREATED
    );
  } catch (error) {
    console.log("🚀 ~ file: controller.js ~ line 301 ~ login ~ error", error);
    return response.error(
      { msgCode: "INTERNAL_SERVER_ERROR" },
      res,
      httpStatus.INTERNAL_SERVER_ERROR
    );
  }
};

const appointmentCancellation = async (req, res) => {
  try {
    const { id } = req.params;
    const updateStatusOfAppointment = await common.updateById(
      Appointment.model,
      id,
      { status: -1 }
    );
    if (!updateStatusOfAppointment) {
      return response.success(
        { msgCode: "DATA_NOT_FOUND" },
        res,
        httpStatus.NOT_FOUND
      );
    }
    return response.success(
      { msgCode: "APPOINTMENT_CANCELLATION", data: updateStatusOfAppointment },
      res,
      httpStatus.CREATED
    );
  } catch (error) {
    console.log("🚀 ~ file: controller.js ~ line 301 ~ login ~ error", error);
    return response.error(
      { msgCode: "INTERNAL_SERVER_ERROR" },
      res,
      httpStatus.INTERNAL_SERVER_ERROR
    );
  }
};

const myAppointments = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(id);
    const myAppointment = await appointment.allAppointments(id);
    return response.success(
      { msgCode: "APPOINTMENT_CANCELLATION", data: myAppointment },
      res,
      httpStatus.CREATED
    );
  } catch (error) {
    console.log("🚀 ~ file: controller.js ~ line 301 ~ login ~ error", error);
    return response.error(
      { msgCode: "INTERNAL_SERVER_ERROR" },
      res,
      httpStatus.INTERNAL_SERVER_ERROR
    );
  }
};

const getAllAppointmentFeedbacks = async (req, res) => {
  try {
    const { filter, id } = req.query;
    const queryData = {};
    if (filter) {
      queryData.filter = filter;
    }
    if (id) {
      queryData.id = id;
    }
    const myAppointment = await appointment.appointmentFeedbackList(queryData);
    return response.success(
      { msgCode: "FETCHED", data: myAppointment },
      res,
      httpStatus.CREATED
    );
  } catch (error) {
    console.log("🚀 ~ file: controller.js ~ line 301 ~ login ~ error", error);
    return response.error(
      { msgCode: "INTERNAL_SERVER_ERROR" },
      res,
      httpStatus.INTERNAL_SERVER_ERROR
    );
  }
};

const bookAppointment = async (req, res) => {
  try {
    const {
      doctorId,
      establishmentId,
      consultationFees,
      time,
      date,
      slot,
      self,
      email,
      phone,
      fullName,
    } = req.body;
    const decode = req.data;
    let appointmentData;
    console.log(decode);
    const findUser = await common.getById(User.model, decode.userId);
    if (!findUser) {
      return response.success(
        { msgCode: "USER_NOT_FOUND" },
        res,
        httpStatus.NOT_FOUND
      );
    }
    const findPatient = await common.findObject(Patient.model, {
      userId: findUser._id,
    });
    if (!findPatient) {
      return response.success(
        { msgCode: "PATIENT_NOT_FOUND" },
        res,
        httpStatus.NOT_FOUND
      );
    }
    if (self === true) {
      appointmentData = {
        doctorId,
        establishmentId,
        consultationFees,
        date: convertToUTCTimestamp(date, time),
        slot,
        patientId: findPatient._id,
        self,
        fullName: findUser.fullName,
        phone: findUser.phone,
        email: findPatient.email || null,
      };
    }
    if (self === false) {
      appointmentData = {
        consultationFees,
        date: convertToUTCTimestamp(date, time),
        doctorId,
        patientId: findPatient._id,
        email,
        establishmentId,
        phone,
        self,
        slot,
        fullName,
      };
    }
    const myAppointment = await common.create(
      Appointment.model,
      appointmentData
    );
    const authorizationHeader = req.headers.authorization || "";
    const jwtToken = authorizationHeader.replace("Bearer ", ""); // Extract JWT token by removing "Bearer " prefix

    const sessionData = {
      userId: decode.userId,
      jwt: jwtToken,
      deviceId: "abcd1234",
      deviceToken: "a1b2c3d4e5f6g7h8i9j0",
      deviceType: 1,
      browser: "Chrome",
      os: "Windows",
      osVersion: "10",
    };
    await common.create(Session.model, sessionData);
    return response.success(
      { msgCode: "APPOINTMENT_BOOKED", data: myAppointment },
      res,
      httpStatus.CREATED
    );
  } catch (error) {
    console.log("🚀 ~ file: controller.js ~ line 301 ~ login ~ error", error);
    return response.error(
      { msgCode: "INTERNAL_SERVER_ERROR" },
      res,
      httpStatus.INTERNAL_SERVER_ERROR
    );
  }
};

const findAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const myAppointment = await appointment.findAppointment(id);
    return response.success(
      { msgCode: "APPOINTMENT_STATUS", data: myAppointment },
      res,
      httpStatus.CREATED
    );
  } catch (error) {
    console.log("🚀 ~ file: controller.js ~ line 301 ~ login ~ error", error);
    return response.error(
      { msgCode: "INTERNAL_SERVER_ERROR" },
      res,
      httpStatus.INTERNAL_SERVER_ERROR
    );
  }
};

module.exports = {
  appointmentList,
  bookedSlots,
  appointmentReschedule,
  appointmentCancellation,
  myAppointments,
  getAllAppointmentFeedbacks,
  bookAppointment,
  findAppointment,
  appointmentRescheduleStatus,
};
