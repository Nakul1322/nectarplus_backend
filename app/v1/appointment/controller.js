const {
  common,
  appointmentService,
  doctor,
} = require("../../../services/index");
const {
  Appointment,
  User,
  EstablishmentTiming,
  EstablishmentMaster,
  Session,
  Doctor,
  Patient,
  Notification,
} = require("../../../models/index");
const {
  response,
  constants,
  sendSms,
  sendEmail,
} = require("../../../utils/index");
const httpStatus = require("http-status");
const {
  getPagination,
  convertToUTCTimestamp,
  objectIdFormatter,
} = require("../../../utils/helper");
const { Types } = require("mongoose");
const moment = require("moment");
const dayjs = require("dayjs");
const customParseFormat = require("dayjs/plugin/customParseFormat");
dayjs.extend(customParseFormat);
const momentTZ = require("moment-timezone");
const { ObjectId } = require("mongoose").Types;
const config = require("../../../config/index");
const environment = config.ENVIRONMENT === constants.SERVER.PROD;

const buildSortCondition = (sort, sortOrder) => {
  if (sort === constants.LIST.DEFAULT_SORT) {
    return { slot: constants.LIST.ORDER[sortOrder] };
  }

  const sortKey = constants.NAME_CONSTANT.includes(sort)
    ? constants.APPOINTMENT_LIST[sort]
    : sort;
  return { [sortKey]: constants.LIST.ORDER[sortOrder] };
};

const buildFilterCondition = (
  specialization,
  doctors,
  hospitals,
  forDashboard
) => {
  if (
    forDashboard &&
    isExport &&
    (specialization.length || doctors.length || hospitals.length)
  ) {
    const filterCondition = { $and: [] };

    if (specialization.length) {
      filterCondition.$and.push({
        "specialization._id": { $in: objectIdFormatter(specialization) },
      });
    }
    if (doctors.length) {
      filterCondition.$and.push({
        doctorId: { $in: objectIdFormatter(doctors) },
      });
    }
    if (hospitals.length) {
      filterCondition.$and.push({
        "establishment.hospitalId": { $in: objectIdFormatter(hospitals) },
      });
    }

    return filterCondition;
  }
  return {};
};

// cognitive complexity
const appointmentList = async (req, res) => {
  try {
    const {
      search,
      sort,
      page,
      size,
      sortOrder,
      status,
      toDate,
      fromDate,
      isExport,
    } = req.query;
    const { specialization, doctors, hospitals, forDashboard } = req.body; // Get the filter value from the request query
    const sortCondition = buildSortCondition(sort, sortOrder);
    const filterCondition = buildFilterCondition(
      specialization,
      doctors,
      hospitals,
      forDashboard
    );
    const { limit, offset } = getPagination(page, size);
    const searchQuery = search || "";
    const condition = {};

    if (status || status === constants.BOOKING_STATUS.BOOKED)
      condition.status = status;

    const appointmentList = await appointmentService.appointmentList(
      { condition, filterCondition },
      sortCondition,
      offset,
      limit,
      searchQuery,
      {
        fromDate,
        toDate,
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
  } catch (error) {
    console.log(error);
    return response.error(
      { msgCode: "SOMETHING_WENT_WRONG" },
      res,
      httpStatus.SOMETHING_WENT_WRONG
    );
  }
};

// cognitive complexity
const bookedSlots = async (req, res) => {
  try {
    const { dateString, establishmentId, docId } = req.query;
    const establishmentDetails = await Doctor.model.aggregate([
      {
        $match: {
          _id: new Types.ObjectId(docId),
          isVerified: constants.PROFILE_STATUS.APPROVE,
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
                    { $eq: ["$isActive", true] },
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
          from: "establishmentmasters",
          localField: "establishmenttiming.establishmentId",
          foreignField: "_id",
          as: "establishmentmaster",
        },
      },
      {
        $lookup: {
          from: "statemasters",
          localField: "establishmentmaster.address.state",
          foreignField: "_id",
          as: "state",
        },
      },
      {
        $group: {
          _id: "$_id",
          establishmentmaster: { $first: "$establishmentmaster" },
          state: { $first: "$state" },
          establishmenttiming: { $first: "$establishmenttiming" },
        },
      },
      {
        $addFields: {
          establishmentDetails: {
            $map: {
              input: "$establishmentmaster",
              as: "establishment",
              in: {
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
                establishmentPic: "$$establishment.hospital.profilePic",
                _id: "$$establishment._id",
                establishmentName: "$$establishment.name",
                address: "$$establishment.address",
                location: "$$establishment.location",
                isLocationShared: "$$establishment.isLocationShared",
                rating: "$$establishment.rating",
                reviews: "$$establishment.totalreviews",
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

    let doctors = await Doctor.model.aggregate([
      {
        $match: {
          _id: new Types.ObjectId(docId),
          isVerified: constants.PROFILE_STATUS.APPROVE,
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
        $match: {
          "establishmenttiming.establishmentId": new Types.ObjectId(
            establishmentId
          ),
          "establishmenttiming.isVerified": constants.PROFILE_STATUS.APPROVE,
          "establishmenttiming.isDeleted": false,
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
        $unwind: {
          path: "$establishmentmaster",
          preserveNullAndEmptyArrays: true,
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
        $unwind: { path: "$hospital", preserveNullAndEmptyArrays: true },
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
          ],
          as: "state",
        },
      },
      {
        $addFields: {
          establishmentDetail: {
            state: { $arrayElemAt: ["$state.name", 0] },
            consultationFees: "$establishmenttiming.consultationFees",
            establishmentPic: "$hospital.profilePic",
            _id: "$establishmentmaster._id",
            establishmentName: "$establishmentmaster.name",
            address: "$establishmentmaster.address",
            location: "$establishmentmaster.location",
            isLocationShared: "$establishmentmaster.isLocationShared",
            rating: "$establishmentmaster.rating",
            reviews: "$establishmentmaster.totalreviews",
            isActive: "$establishmenttiming.isActive",
          },
        },
      },
      {
        $project: {
          name: "$user.fullName",
          experience: 1,
          profilePic: 1,
          establishmentDetail: 1,
          rating: 1,
          recommended: 1,
        },
      },
    ]);
    if (doctors?.length === 0) {
      return response.error(
        {
          msgCode: "NOT_FOUND",
          data: {},
        },
        res,
        httpStatus.NOT_FOUND
      );
    }
    if (!doctors[0].establishmentDetail.isActive) {
      return response.error(
        {
          msgCode: "DOCTOR_INACTIVE",
          data: {},
        },
        res,
        httpStatus.NOT_FOUND
      );
    }

    const date = dayjs(dateString, "ddd, D MMM");
    const dayOfWeek = date?.format("ddd").toLowerCase();
    // Find the establishment timing for the given doctor
    const timing = await EstablishmentTiming.model.findOne({
      doctorId: new Types.ObjectId(docId),
      isVerified: constants.PROFILE_STATUS.APPROVE,
      establishmentId: new Types.ObjectId(establishmentId),
      isDeleted: false,
      isActive: true,
    });
    if (!timing)
      return response.error(
        { msgCode: "DOCTOR_NOT_APPROVED", data: {} },
        res,
        httpStatus.FORBIDDEN
      );

    // Find the working hours for the given day
    const workHours = timing[dayOfWeek];
    const daySlot = {
      morning: 0,
      afternoon: 1,
      evening: 2,
    };
    const workingHours = [{}, {}, {}];
    workHours.forEach((slotData) => {
      workingHours[daySlot[`${slotData.slot}`]] = slotData;
    });
    // Generate time slots based on working hours and slotTime
    const slots = [];
    const currentDate = moment().startOf("day"); // Get the current date without time
    const currentTime = moment(); // Get the current time

    if (Array.isArray(workingHours)) {
      for (const hours of workingHours) {
        const startTime = moment(hours?.from, "h:mm A");
        const endTime = moment(hours?.to, "h:mm A");

        const slotStartTime = startTime.clone(); // Clone the start time

        while (slotStartTime.isBefore(endTime)) {
          const slotTime = slotStartTime?.format("h:mm A");
          const slotDateTime = moment(
            `${date.format("YYYY-MM-DD")} ${slotTime}`,
            "YYYY-MM-DD h:mm A"
          ); // Combine date and time
          const status =
            slotDateTime.isBefore(currentTime) && currentDate.isSame(date)
              ? 0
              : 1; // Set status

          // Add the generated slot to the respective array
          if (status === 1)
            slots.push({ time: slotTime, status, timeSlot: hours.slot });
          slotStartTime.add(timing?.slotTime, "minutes");
        }
      }
    } else {
      console.error("workingHours is undefined:", workingHours);
    }
    const morningSlots = slots.filter((slot) => {
      const time = moment(slot.time, "h:mm A");
      return (
        slot.timeSlot === "morning" &&
        time.isBetween(
          moment(workingHours[0]?.from, "h:mm A"),
          moment(workingHours[0]?.to, "h:mm A"),
          undefined,
          "[]"
        )
      );
    });

    const afternoonSlots = slots.filter((slot) => {
      const time = moment(slot.time, "h:mm A");
      return (
        slot.timeSlot === "afternoon" &&
        time.isBetween(
          moment(workingHours[1]?.from, "h:mm A"),
          moment(workingHours[1]?.to, "h:mm A"),
          undefined,
          "[]"
        )
      );
    });

    const eveningSlots = slots.filter((slot) => {
      const time = moment(slot.time, "h:mm A");
      return (
        slot.timeSlot === "evening" &&
        time.isBetween(
          moment(workingHours[2]?.from, "h:mm A"),
          moment(workingHours[2]?.to, "h:mm A"),
          undefined,
          "[]"
        )
      );
    });

    const timeSlot = { morningSlots, afternoonSlots, eveningSlots };
    // Find booked appointments for the given doctor and date
    const appointments = await Appointment.model.find({
      doctorId: new Types.ObjectId(docId),
      date: {
        $gte: date.startOf("day").toDate(),
        $lt: date.endOf("day").toDate(),
      },
      status: {
        $nin: [
          constants.BOOKING_STATUS.CANCEL,
          constants.BOOKING_STATUS.RESCHEDULE,
        ],
      },
    });
    // Update the status of the slots based on the booked appointments
    for (const appointment of appointments) {
      const bookedTime = moment(appointment?.date).format("h:mm A");
      const slot = slots.find((s) => s.time === bookedTime);
      if (slot) {
        if (appointment.status === -1 || appointment.status === -2) {
          slot.status = 1; // Set status to 1 for cancelled and rescheduled
          const rescheduledTime = moment(appointment.rescheduledDate).format(
            "h:mm A"
          );
          slot.rescheduledTime = rescheduledTime; // Store the rescheduled time
        } else {
          // Set status to 0 for other appointments
          slot.status = 0;
        }
      }
    }
    const availableMorningSlots = morningSlots.filter(
      (slot) => slot.status === 1
    ).length;
    const availableAfternoonSlots = afternoonSlots.filter(
      (slot) => slot.status === 1
    ).length;
    const availableEveningSlots = eveningSlots.filter(
      (slot) => slot.status === 1
    ).length;

    const availableSlot =
      availableMorningSlots + availableAfternoonSlots + availableEveningSlots;

    if (establishmentDetails?.length !== 0)
      doctors[0].establishmentDetails =
        establishmentDetails[0].establishmentDetails;
    return response.success(
      { msgCode: "DOCTOR_LIST", data: { doctors, timeSlot, availableSlot } },
      res,
      httpStatus.OK
    );
  } catch (error) {
    console.log(error);
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
    const { userId } = req.data;
    const patientDetails = await common.getByCondition(Patient.model, {
      userId: new ObjectId(userId),
    });
    if (!patientDetails)
      return response.error(
        { msgCode: "NOT_FOUND", data: {} },
        res,
        httpStatus.NOT_FOUND
      );
    const myAppointment = await appointmentService.findAppointment({
      _id: new ObjectId(id),
      patientId: patientDetails._id,
    });
    if (!myAppointment || myAppointment?.length === 0)
      return response.error(
        { msgCode: "NOT_FOUND", data: {} },
        res,
        httpStatus.NOT_FOUND
      );
    const { date, time } = req.body;
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

    const appointmentData = await common.create(
      Appointment.model,
      updatedAppointmentData
    );

    if (!appointmentData) {
      return response.error(
        { msgCode: "FAILED_TO_ADD" },
        res,
        httpStatus.BAD_REQUEST
      );
    }
    const findPatient = await common.getById(Patient.model, oldData.patientId);
    const doctorData = await common.getSendMailDoctor(appointmentData.doctorId);
    const establishmentData = await common.getSendMailEstablishment(
      appointmentData.establishmentId
    );
    const [ISTDate, ISTTime, timeZone] = momentTZ
      .utc(appointmentData.date)
      .tz("Asia/Kolkata")
      .format("YYYY-MM-DD HH:mm:ss A")
      .split(" ");

    const titleHospital =
      constants.MESSAGES.APPOINTMENT_RESCHEDULE.TITLE.HOSPITAL.replace(
        /\[doctorName\]/g,
        doctorData.user.fullName
      )
        .replace(/\[date\]/g, ISTDate)
        .replace(/\[slotTime\]/g, ISTTime)
        .replace(/\[timeZone\]/g, timeZone);
    const titleDoctor =
      constants.MESSAGES.APPOINTMENT_RESCHEDULE.TITLE.DOCTOR.replace(
        /\[date\]/g,
        ISTDate
      )
        .replace(/\[slotTime\]/g, ISTTime)
        .replace(/\[timeZone\]/g, timeZone);

    await common.create(Notification.model, {
      userType: constants.USER_TYPES.HOSPITAL,
      eventType: constants.NOTIFICATION_TYPE.APPOINTMENT_RESCHEDULE,
      senderId: new ObjectId(findPatient.userId),
      receiverId: new ObjectId(establishmentData.hospital.userId),
      title: titleHospital,
      body: constants.MESSAGES.APPOINTMENT_RESCHEDULE.BODY.HOSPITAL,
    });
    await common.create(Notification.model, {
      userType: constants.USER_TYPES.DOCTOR,
      eventType: constants.NOTIFICATION_TYPE.APPOINTMENT_RESCHEDULE,
      senderId: new ObjectId(findPatient.userId),
      receiverId: new ObjectId(doctorData.user._id),
      title: titleDoctor,
      body: constants.MESSAGES.APPOINTMENT_RESCHEDULE.BODY.DOCTOR,
    });
    const hospitalProfilePic =
      establishmentData.hospital.profilePic ||
      constants.MAIL_IMAGES.NECTAR_LOGO;
    const doctorProfilePic =
      doctorData.profilePic || constants.MAIL_IMAGES.NECTAR_LOGO;
    if (environment) {
      const findPatient = await doctor.getPatientDetails(
        appointmentData.patientId
      );
      const loginLink = constants.SCREEN.PATIENT_LOGIN;
      const dateTime = new Date(new Date(appointmentData.date)).toLocaleString(
        "en-IN"
      );
      await sendSms.sendOtp(
        findPatient.user.phone,
        findPatient.user.countryCode,
        {
          loginLink,
          date: dateTime,
        },
        constants.SMS_TEMPLATES.PATIENT_RESCHEDULE
      );
      if (findPatient.email) {
        const mailParameters = {
          doctorName: doctorData.user.fullName,
          hospitalName: establishmentData.name,
          date: dateTime.split(",")[0],
          time: dateTime.split(",")[1],
          dateTime,
          patientName: findPatient.user.fullName,
          specialization: doctorData?.specializationMaster[0]?.name,
          address:
            establishmentData?.address?.landmark +
            ", " +
            establishmentData?.address?.locality +
            ", " +
            establishmentData?.address?.city +
            ", " +
            establishmentData?.stateMaster[0].name +
            ", " +
            establishmentData?.address?.country,
          doctorProfilePic:
            doctorData.profilePic || constants.MAIL_IMAGES.DOCTOR_LOGO,
          hospitalProfilePic:
            establishmentData.hospital.profilePic ||
            constants.MAIL_IMAGES.HOSPITAL_LOGO,
          latitude: establishmentData.location.coordinates[1],
          longitude: establishmentData.location.coordinates[0],
          routeUrl:
            constants.EMAIL_ROUTE_URL.BASE +
            appointmentData._id +
            constants.EMAIL_ROUTE_URL.PARAMETERS,
        };
        const htmlFile = constants.VIEWS.APPOINTMENT_RESCHEDULE;
        await sendEmail.sendEmailPostAPI(
          findPatient.email,
          constants.EMAIL_TEMPLATES.APPOINTMENT_RESCHEDULE,
          htmlFile,
          mailParameters
        );
      }
    }

    return response.success(
      { msgCode: "APPOINTMENT_RESCHEDULE", data: appointmentData },
      res,
      httpStatus.CREATED
    );
  } catch (error) {
    console.log(error);
    return response.error(
      { msgCode: "INTERNAL_SERVER_ERROR" },
      res,
      httpStatus.INTERNAL_SERVER_ERROR
    );
  }
};

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

function createTimeSlots(data, bookedAppointments) {
  const slotDuration = data.slotTime;
  const startDate = moment().utcOffset("+05:30"); // Convert to IST
  const endDate = moment().utcOffset("+05:30").add(2, "weeks"); // Convert to IST
  const result = {};

  for (let day = startDate; day.isBefore(endDate); day.add(1, "days")) {
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
        const slotTime = from.format("hh:mm A");
        const isBooked = bookedAppointments.some((appointment) => {
          const appointmentDateIST = moment(appointment.date).utcOffset(
            "+05:30"
          );
          const appointmentEndTime = moment(appointmentDateIST).add(
            slotDuration,
            "minutes"
          );
          const isDuringSlot = from.isBetween(
            appointmentDateIST,
            appointmentEndTime,
            null,
            "[)"
          );
          const slotBooked =
            appointment.status === constants.BOOKING_STATUS.BOOKED ||
            appointment.status === constants.BOOKING_STATUS.COMPLETE;
          return (
            slotBooked &&
            appointmentDateIST.format("YYYY-MM-DD") ===
              day.format("YYYY-MM-DD") &&
            appointmentDateIST.format("hh:mm A") === slotTime &&
            isDuringSlot
          );
        });

        if (!from.isBefore(moment().utcOffset("+05:30")) && !isBooked) {
          timeSlots.push(slotTime);
        }

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
    if (
      !appointment ||
      appointment.isDeleted ||
      appointment.status !== constants.BOOKING_STATUS.BOOKED
    )
      return response.error(
        {
          msgCode: "APPOINTMENT_NOT_FOUND",
          data: {},
        },
        res,
        httpStatus.NOT_FOUND
      );

    const allAppointments = await Appointment.model.find({
      date: {
        $gte: moment().startOf("day").toDate(),
        $lte: moment().add(2, "weeks").endOf("day").toDate(),
      },
      doctorId: new Types.ObjectId(appointment.doctorId),
      status: {
        $nin: [
          constants.BOOKING_STATUS.RESCHEDULE,
          constants.BOOKING_STATUS.CANCEL,
        ],
      },
    });
    const establishmentData = await EstablishmentTiming.model.findOne({
      establishmentId: new Types.ObjectId(appointment.establishmentId),
      doctorId: new Types.ObjectId(appointment.doctorId),
      isVerified: constants.PROFILE_STATUS.APPROVE,
      isDeleted: false,
    });
    if (!establishmentData)
      return response.error(
        {
          msgCode: "ESTABLISHMENT_DOCTOR_NOT_FOUND",
          data: {},
        },
        res,
        httpStatus.NOT_FOUND
      );

    const timeSlots = createTimeSlots(establishmentData, allAppointments);

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
        msgCode: "APPOINTMENT_RESCHEDULE_SLOTS",
        data: {
          appointment,
          timeSlots: timeSlotsByWeek,
        },
      },
      res,
      httpStatus.OK
    );
  } catch (error) {
    console.log(error);
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
    const { userId } = req.data;
    const patientDetails = await common.getByCondition(Patient.model, {
      userId: new ObjectId(userId),
    });
    if (!patientDetails)
      return response.error(
        { msgCode: "NOT_FOUND", data: {} },
        res,
        httpStatus.NOT_FOUND
      );
    const myAppointment = await appointmentService.findAppointment({
      _id: new ObjectId(id),
      patientId: patientDetails._id,
    });
    if (!myAppointment || myAppointment?.length === 0)
      return response.error(
        { msgCode: "NOT_FOUND", data: {} },
        res,
        httpStatus.NOT_FOUND
      );
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
    const doctorData = await common.getSendMailDoctor(
      updateStatusOfAppointment.doctorId
    );
    const establishmentData = await common.getSendMailEstablishment(
      updateStatusOfAppointment.establishmentId
    );
    const [ISTDate, ISTTime, timeZone] = momentTZ
      .utc(updateStatusOfAppointment.date)
      .tz("Asia/Kolkata")
      .format("YYYY-MM-DD HH:mm:ss A")
      .split(" ");

    const titleHospital =
      constants.MESSAGES.APPOINTMENT_CANCELLATION.TITLE.HOSPITAL.replace(
        /\[doctorName\]/g,
        doctorData.user.fullName
      )
        .replace(/\[date\]/g, ISTDate)
        .replace(/\[slotTime\]/g, ISTTime)
        .replace(/\[timeZone\]/g, timeZone);

    const titleDoctor =
      constants.MESSAGES.APPOINTMENT_CANCELLATION.TITLE.DOCTOR.replace(
        /\[date\]/g,
        ISTDate
      )
        .replace(/\[slotTime\]/g, ISTTime)
        .replace(/\[timeZone\]/g, timeZone);

    await common.create(Notification.model, {
      userType: constants.USER_TYPES.HOSPITAL,
      eventType: constants.NOTIFICATION_TYPE.APPOINTMENT_CANCELLATION,
      senderId: new ObjectId(userId),
      receiverId: new ObjectId(establishmentData.hospital.userId),
      title: titleHospital,
      body: constants.MESSAGES.APPOINTMENT_CANCELLATION.BODY.HOSPITAL,
    });
    await common.create(Notification.model, {
      userType: constants.USER_TYPES.DOCTOR,
      eventType: constants.NOTIFICATION_TYPE.APPOINTMENT_CANCELLATION,
      senderId: new ObjectId(userId),
      receiverId: new ObjectId(doctorData.user._id),
      title: titleDoctor,
      body: constants.MESSAGES.APPOINTMENT_CANCELLATION.BODY.DOCTOR,
    });
    if (environment) {
      const findPatient = await doctor.getPatientDetails(
        updateStatusOfAppointment.patientId
      );
      const date = new Date(
        new Date(updateStatusOfAppointment.date)
      ).toLocaleString("en-IN");
      await sendSms.sendOtp(
        findPatient.user.phone,
        findPatient.user.countryCode,
        {
          name: doctorData.user.fullName.substring(0, 30),
          date,
        },
        constants.SMS_TEMPLATES.PATIENT_APPT_CANCEL
      );
      if (findPatient.email) {
        const mailParameters = {
          doctorName: doctorData.user.fullName,
          hospitalName: establishmentData.name,
          dateTime: date,
          patientName: findPatient.user.fullName,
          specialization: doctorData?.specializationMaster[0]?.name,
          address:
            establishmentData?.address?.landmark +
            ", " +
            establishmentData?.address?.locality +
            ", " +
            establishmentData?.address?.city +
            ", " +
            establishmentData?.stateMaster[0].name +
            ", " +
            establishmentData?.address?.country,
          doctorProfilePic:
            doctorData.profilePic || constants.MAIL_IMAGES.DOCTOR_LOGO,
          hospitalProfilePic:
            establishmentData.hospital.profilePic ||
            constants.MAIL_IMAGES.HOSPITAL_LOGO,
          latitude: establishmentData.location.coordinates[1],
          longitude: establishmentData.location.coordinates[0],
          routeUrl:
            constants.EMAIL_ROUTE_URL.BASE +
            id +
            constants.EMAIL_ROUTE_URL.PARAMETERS,
        };
        const htmlFile = constants.VIEWS.APPOINTMENT_CANCELLATION;
        await sendEmail.sendEmailPostAPI(
          findPatient.email,
          constants.EMAIL_TEMPLATES.APPOINTMENT_CANCELLATION,
          htmlFile,
          mailParameters
        );
      }
    }
    return response.success(
      { msgCode: "APPOINTMENT_CANCELLATION", data: updateStatusOfAppointment },
      res,
      httpStatus.CREATED
    );
  } catch (error) {
    console.log(error);
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
    const myAppointment = await appointmentService.allAppointments(id);
    return response.success(
      { msgCode: "APPOINTMENT_CANCELLATION", data: myAppointment },
      res,
      httpStatus.CREATED
    );
  } catch (error) {
    console.log(error);
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
    const myAppointment = await appointmentService.appointmentFeedbackList(
      queryData
    );
    return response.success(
      { msgCode: "FETCHED", data: myAppointment },
      res,
      httpStatus.CREATED
    );
  } catch (error) {
    console.log(error);
    return response.error(
      { msgCode: "INTERNAL_SERVER_ERROR" },
      res,
      httpStatus.INTERNAL_SERVER_ERROR
    );
  }
};

// cognitive complexity
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
    const {
      userId,
      deviceId,
      deviceType,
      deviceToken,
      browser,
      os,
      osVersion,
    } = req.data;
    let appointmentData;
    const findUser = await common.getById(User.model, userId);
    const findEstablishment = await common.getById(
      EstablishmentMaster.model,
      establishmentId
    );
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
    const findAppointment = await common.getByCondition(Appointment.model, {
      date: convertToUTCTimestamp(date, time),
      doctorId,
      establishmentId,
      status: {
        $nin: [
          constants.BOOKING_STATUS.RESCHEDULE,
          constants.BOOKING_STATUS.CANCEL,
        ],
      },
    });
    if (findAppointment)
      return response.error(
        { msgCode: "APPOINTMENT_ALREADY_BOOKED", data: {} },
        res,
        httpStatus.BAD_REQUEST
      );

    const city = findEstablishment?.address?.city || null;
    const patientEmail = findPatient.email;
    const convertedDate = convertToUTCTimestamp(date, time);
    if (self === true) {
      appointmentData = {
        doctorId,
        establishmentId,
        consultationFees,
        date: convertedDate,
        slot,
        patientId: findPatient._id,
        self,
        fullName: findUser.fullName,
        phone: findUser.phone,
        email: patientEmail,
        city,
      };
    } else {
      appointmentData = {
        consultationFees,
        date: convertedDate,
        doctorId,
        patientId: findPatient._id,
        email,
        establishmentId,
        phone,
        self,
        slot,
        fullName,
        city,
      };
    }
    if (email) {
      await Patient.model.findByIdAndUpdate(
        findPatient._id,
        { $set: { email: email } },
        { new: true }
      );
    }
    const myAppointment = await common.create(
      Appointment.model,
      appointmentData
    );
    const jwt = req.headers["authorization"].replace("Bearer ", ""); // Extract JWT token by removing "Bearer " prefix

    const sessionData = {
      userId,
      jwt,
      deviceId,
      deviceToken,
      deviceType,
      browser,
      os,
      osVersion,
      tokenType: constants.TOKEN_TYPE.APPOINTMENT,
    };
    await common.create(Session.model, sessionData);
    const doctorData = await common.getSendMailDoctor(doctorId);
    const establishmentData = await common.getSendMailEstablishment(
      establishmentId
    );
    const [ISTDate, ISTTime, timeZone] = momentTZ
      .utc(appointmentData.date)
      .tz("Asia/Kolkata")
      .format("YYYY-MM-DD HH:mm:ss A")
      .split(" ");

    const titleHospital =
      constants.MESSAGES.APPOINTMENT_CONFIRMATION.TITLE.HOSPITAL.replace(
        /\[doctorName\]/g,
        doctorData.user.fullName
      )
        .replace(/\[patientName\]/g, findUser.fullName)
        .replace(/\[patientId\]/g, findPatient._id)
        .replace(/\[date\]/g, ISTDate)
        .replace(/\[slotTime\]/g, ISTTime)
        .replace(/\[timeZone\]/g, timeZone);

    const titleDoctor =
      constants.MESSAGES.APPOINTMENT_CONFIRMATION.TITLE.DOCTOR.replace(
        /\[patientName\]/g,
        findUser.fullName
      )
        .replace(/\[patientId\]/g, findPatient._id)
        .replace(/\[date\]/g, ISTDate)
        .replace(/\[slotTime\]/g, ISTTime)
        .replace(/\[timeZone\]/g, timeZone);

    await common.create(Notification.model, {
      userType: constants.USER_TYPES.HOSPITAL,
      eventType: constants.NOTIFICATION_TYPE.APPOINTMENT_CONFIRMATION,
      senderId: new ObjectId(userId),
      receiverId: new ObjectId(establishmentData.hospital.userId),
      title: titleHospital,
      body: constants.MESSAGES.APPOINTMENT_CONFIRMATION.BODY.HOSPITAL,
    });
    await common.create(Notification.model, {
      userType: constants.USER_TYPES.DOCTOR,
      eventType: constants.NOTIFICATION_TYPE.APPOINTMENT_CONFIRMATION,
      senderId: new ObjectId(userId),
      receiverId: new ObjectId(doctorData.user._id),
      title: titleDoctor,
      body: constants.MESSAGES.APPOINTMENT_CONFIRMATION.BODY.DOCTOR,
    });
    const hospitalProfilePic =
      establishmentData.hospital.profilePic ||
      constants.MAIL_IMAGES.NECTAR_LOGO;
    const doctorProfilePic =
      doctorData.profilePic || constants.MAIL_IMAGES.NECTAR_LOGO;
    if (environment) {
      const findPatient = await doctor.getPatientDetails(
        myAppointment.patientId
      );
      const loginLink = constants.SCREEN.PATIENT_LOGIN;
      const dateTime = new Date(new Date(myAppointment.date)).toLocaleString(
        "en-IN"
      );
      await sendSms.sendOtp(
        findPatient.user.phone,
        findPatient.user.countryCode,
        {
          date: dateTime,
          loginLink,
        },
        constants.SMS_TEMPLATES.PATIENT_APPT_CONFIRM
      );
      if (findPatient.email) {
        const mailParameters = {
          doctorName: doctorData.user.fullName,
          hospitalName: establishmentData.name,
          dateTime,
          patientName: findPatient.user.fullName,
          specialization: doctorData?.specializationMaster[0]?.name,
          address:
            establishmentData?.address?.landmark +
            ", " +
            establishmentData?.address?.locality +
            ", " +
            establishmentData?.address?.city +
            ", " +
            establishmentData?.stateMaster[0].name +
            ", " +
            establishmentData?.address?.country,
          doctorProfilePic:
            doctorData.profilePic || constants.MAIL_IMAGES.DOCTOR_LOGO,
          hospitalProfilePic:
            establishmentData.hospital.profilePic ||
            constants.MAIL_IMAGES.HOSPITAL_LOGO,
          latitude: establishmentData.location.coordinates[1],
          longitude: establishmentData.location.coordinates[0],
          routeUrl:
            constants.EMAIL_ROUTE_URL.BASE +
            myAppointment._id +
            constants.EMAIL_ROUTE_URL.PARAMETERS,
        };
        const htmlFile = constants.VIEWS.APPOINTMENT_CONFIRMATION;
        await sendEmail.sendEmailPostAPI(
          findPatient.email,
          constants.EMAIL_TEMPLATES.APPOINTMENT_CONFIRMATION,
          htmlFile,
          mailParameters
        );
      }
    }
    return response.success(
      { msgCode: "APPOINTMENT_BOOKED", data: myAppointment },
      res,
      httpStatus.CREATED
    );
  } catch (error) {
    console.log(error);
    return response.error(
      { msgCode: "INTERNAL_SERVER_ERROR" },
      res,
      httpStatus.INTERNAL_SERVER_ERROR
    );
  }
};

const findAppointment = async (req, res) => {
  try {
    const { userId } = req.data;
    const { id } = req.params;
    const patientDetails = await common.getByCondition(Patient.model, {
      userId: new ObjectId(userId),
    });
    if (!patientDetails)
      return response.error(
        { msgCode: "NOT_FOUND", data: {} },
        res,
        httpStatus.NOT_FOUND
      );
    const myAppointment = await appointmentService.findAppointment({
      _id: new ObjectId(id),
      patientId: patientDetails._id,
    });
    if (!myAppointment || myAppointment?.length === 0)
      return response.error(
        { msgCode: "NOT_FOUND", data: {} },
        res,
        httpStatus.NOT_FOUND
      );
    else
      return response.success(
        { msgCode: "APPOINTMENT_STATUS", data: myAppointment },
        res,
        httpStatus.OK
      );
  } catch (error) {
    console.log(error);
    return response.error(
      { msgCode: "INTERNAL_SERVER_ERROR" },
      res,
      httpStatus.INTERNAL_SERVER_ERROR
    );
  }
};

const appointmentHistory = async (req, res) => {
  const { page, size, from, to, status } = req.query;
  let query = {};
  try {
    if (status) {
      query["status"] = Number(status);
    }
    if (from && to)
      query["date"] = {
        $gte: from,
        $lte: to,
      };
    const { userId } = req.data;
    const findPatient = await Patient.model.findOne({
      userId: new Types.ObjectId(userId),
    });
    const { limit, offset } = getPagination(page, size);

    // Query for years
    const yearsPipeline = [
      {
        $match: {
          ...query,
          patientId: new Types.ObjectId(findPatient._id),
        },
      },
      { $match: { status: { $ne: constants.BOOKING_STATUS.RESCHEDULE } } },
      {
        $lookup: {
          from: "appointmentfeedbacks",
          localField: "_id",
          foreignField: "appointmentId",
          as: "feedbackResponse",
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
          as: "establishmentmaster",
        },
      },
      {
        $unwind: {
          path: "$establishmentmaster",
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
          appointmentId: 1,
          doctorId: 1,
          date: 1,
          createdAt: 1,
          status: "$status",
          fullName: "$user.fullName",
          specialization: "$specialization",
          establishmentName: "$establishmentmaster.name",
          establishmentAddress: "$establishmentmaster.address",
          profilePic: "$doctor.profilePic",
          doctorProfileSlug: "$doctor.profileSlug",
          establishmentProfileSlug: "$establishmentmaster.profileSlug",
          services: "$doctor.service",
          establishmentId: 1,
          consultationFees: "$establishmenttiming.consultationFees",
          docAddress: "$establishmentmaster.address",
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
      {
        $sort: { date: -1 },
      },
      {
        $facet: {
          count: [{ $count: "total" }],
          data: [
            { $skip: offset },
            { $limit: limit },
            {
              $group: {
                _id: {
                  $cond: [
                    {
                      $and: [
                        { $gte: ["$date", new Date()] },
                        { $eq: ["$status", 0] },
                      ],
                    },
                    0,
                    { $year: "$date" },
                  ],
                },
                data: { $push: "$$ROOT" },
              },
            },
            {
              $sort: {
                _id: 1,
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
    ];
    const yearsResult = await Appointment.model.aggregate(yearsPipeline);
    return response.success(
      {
        msgCode:
          yearsResult[0].count === 0
            ? "NO_RECORD_FETCHED"
            : "APPOINTMENT_LIST_FETCHED",
        data: yearsResult[0],
      },
      res,
      httpStatus.OK
    );
  } catch (error) {
    console.log(error);
    return response.error(
      { msgCode: "INTERNAL_SERVER_ERROR" },
      res,
      httpStatus.INTERNAL_SERVER_ERROR
    );
  }
};

const bookedSlotsCountPipeline = [
  {
    $lookup: {
      from: "doctors",
      let: { id: "$doctorId" },
      pipeline: [
        {
          $match: {
            $expr: {
              $and: [
                { $eq: ["$$id", "$_id"] },
                { $eq: ["$isVerified", constants.PROFILE_STATUS.APPROVE] },
                { $eq: ["$steps", constants.PROFILE_STEPS.COMPLETED] },
                { $eq: ["$isDeleted", false] },
              ],
            },
          },
        },
      ],
      as: "doctor",
    },
  },
  {
    $unwind: { path: "$doctor", preserveNullAndEmptyArrays: true },
  },
  {
    $lookup: {
      from: "users",
      let: { id: "$doctor.userId" },
      pipeline: [
        {
          $match: {
            $expr: {
              $and: [
                { $eq: ["$$id", "$_id"] },
                { $eq: ["$status", constants.PROFILE_STATUS.ACTIVE] },
                { $eq: ["$isDeleted", false] },
              ],
            },
          },
        },
      ],
      as: "doctorUser",
    },
  },
  {
    $unwind: { path: "$doctorUser", preserveNullAndEmptyArrays: true },
  },
  {
    $lookup: {
      from: "establishmentmasters",
      let: { id: "$establishmentId" },
      pipeline: [
        {
          $match: {
            $expr: {
              $and: [{ $eq: ["$$id", "$_id"] }, { $eq: ["$isDeleted", false] }],
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
      from: "hospitals",
      let: { id: "$establishmentMaster.hospitalId" },
      pipeline: [
        {
          $match: {
            $expr: {
              $and: [
                { $eq: ["$$id", "$_id"] },
                { $eq: ["$isVerified", constants.PROFILE_STATUS.APPROVE] },
                { $eq: ["$steps", constants.PROFILE_STEPS.COMPLETED] },
                { $eq: ["$isDeleted", false] },
              ],
            },
          },
        },
      ],
      as: "hospital",
    },
  },
  {
    $unwind: { path: "$hospital", preserveNullAndEmptyArrays: true },
  },
  {
    $lookup: {
      from: "users",
      let: { id: "$hospital.userId" },
      pipeline: [
        {
          $match: {
            $expr: {
              $and: [
                { $eq: ["$$id", "$_id"] },
                { $eq: ["$status", constants.PROFILE_STATUS.ACTIVE] },
                { $eq: ["$isDeleted", false] },
              ],
            },
          },
        },
      ],
      as: "hospitalUser",
    },
  },
  {
    $unwind: { path: "$hospitalUser", preserveNullAndEmptyArrays: true },
  },
  {
    $lookup: {
      from: "specializations",
      localField: "doctor.specialization",
      foreignField: "_id",
      as: "specialization",
    },
  },
];

const generateNextTwoWeeks = () => {
  const today = moment().utcOffset(330); // Set the timezone to IST
  const nextTwoWeeks = [];
  for (let i = 0; i < 14; i++) {
    const date = moment(today).add(i, "days").toDate();
    nextTwoWeeks.push(date);
  }
  return nextTwoWeeks;
};

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
    },
  });
};

const calculateAvailableSlotsForDoctor = async (doctor, slotTime) => {
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
      date,
      count: remainingSlots,
    });
  }
  return availableSlots;
};

const bookedSlotsCount = async (req, res) => {
  try {
    const { establishmentId, doctorId } = req.query;
    const establishmentTiming = await EstablishmentTiming.model.aggregate([
      {
        $match: {
          doctorId: new Types.ObjectId(doctorId),
          establishmentId: new Types.ObjectId(establishmentId),
          isVerified: constants.PROFILE_STATUS.APPROVE,
          isDeleted: false,
          isActive: true,
        },
      },
      ...bookedSlotsCountPipeline,
      {
        $project: {
          _id: `$doctorId`,
          isActive: 1,
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
    const allDoctorTiming = await EstablishmentTiming.model.aggregate([
      {
        $match: {
          doctorId: new Types.ObjectId(doctorId),
          isVerified: constants.PROFILE_STATUS.APPROVE,
          isDeleted: false,
          isActive: true,
        },
      },
      ...bookedSlotsCountPipeline,
      {
        $project: {
          doctorId: 1,
          establishmentId: 1,
          consultationFees: 1,
          doctorName: "$doctorUser.fullName",
          doctorProfilePic: "$doctor.profilePic",
          doctorExperience: "$doctor.experience",
          doctorRecommended: "$doctor.recommended",
          doctorRating: "$doctor.rating",
          establishmentName: "$establishmentMaster.name",
          establishmentProfilePic: "$hospital.profilePic",
          address: "$establishmentMaster.address",
          specialization: 1,
          isActive: 1,
        },
      },
    ]);
    if (establishmentTiming.length === 0)
      return response.error(
        {
          msgCode: "NOT_FOUND",
          data: { allDoctorTiming },
        },
        res,
        httpStatus.NOT_FOUND
      );

    const establishmentTimingData = establishmentTiming[0];
    const slotTime = 15;
    const dateRange = await calculateAvailableSlotsForDoctor(
      establishmentTimingData,
      slotTime
    );
    return response.success(
      {
        msgCode: "DOCTOR_LIST",
        data: { dateRange, allDoctorTiming },
      },
      res,
      httpStatus.OK
    );
  } catch (error) {
    console.log(error);
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
  appointmentHistory,
  bookedSlotsCount,
};
