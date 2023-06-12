const httpStatus = require("http-status");
const {
  helperPassword,
  response,
  sendOTP,
  sendEmail,
} = require("../../../utils/index");
const {
  users,
  common,
  doctor,
  appointment,
} = require("../../../services/index");
const {
  User,
  Doctor,
  Hospital,
  Appointment,
  AppointmentFeedback,
  EstablishmentMaster,
  EstablishmentTiming,
  Specialization,
  CollegeMaster,
  DegreeMaster,
  Patient,
} = require("../../../models/index");
const config = require("../../../config/index");
const { constants } = require("../../../utils/constant");
const mongoose = require("mongoose");
const { ObjectId } = mongoose.Types;
const {
  getPagination,
  filterFormatter,
  convertToUTCTimestamp,
} = require("../../../utils/helper");
const { Types } = require("mongoose");
const { name } = require("ejs");

const getAllDoctors = async (req, res) => {
  try {
    const { sort, page, size, sortOrder, filter, location } = req.query;
    const sortCondition = {};
    sortCondition[`${sort}`] = constants.LIST.ORDER[sortOrder];
    const { offset, limit } = getPagination(page, size);
    const data = await doctor.filterDoctor(
      req.body,
      { filter, location },
      sortCondition,
      offset,
      limit
    );
    return response.success(
      { msgCode: "DOCTOR_LIST", data },
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

// ......................Super Admin portal Api's for Doctor..........

const adminAddDoctor = async (req, res) => {
  try {
    const {
      fullName,
      specialization,
      gender,
      medicalRegistration,
      education,
      isOwner,
      experiance,
      establishmentName,
      hospitalTypeId,
      address,
      location,
    } = req.body;

    const dataToCreate1 = {
      userType: 2,
      fullName,
    };
    const userData = await common.create(User.model, dataToCreate1);

    const dataToCreate2 = {
      userId: userData._id,
      // createdBy,  AdminData
      specialization,
      gender,
      medicalRegistration,
      education,
      experiance,
    };
    const doctorData = await common.create(Doctor.model, dataToCreate2);
    const dataToCreate3 = {
      doctorId: userData._id,
      isOwner,
      name: establishmentName,
      hospitalTypeId,
      address,
      location,
    };
    const estabMasterData = await common.create(
      EstablishmentMaster.model,
      dataToCreate3
    );
    return response.success(
      {
        msgCode: "DATA_CREATED",
        data: { userData, doctorData, estabMasterData },
      },
      res,
      httpStatus.CREATED
    );
  } catch (error) {
    console.log("catch error", error.message);
    return response.error(
      { msgCode: "INTERNAL_SERVER_ERROR" },
      res,
      httpStatus.INTERNAL_SERVER_ERROR
    );
  }
};

const adminEditDoctor = async (req, res) => {
  try {
    const { doctorId } = req.query;
    const {
      fullName,
      specialization,
      gender,
      medicalRegistration,
      education,
      isOwner,
      experiance,
      establishmentName,
      hospitalTypeId,
      address,
      location,
    } = req.body;

    const condition1 = { _id: doctorId };
    const findDoctor = await common.getByCondition(User.model, condition1);
    if (!findDoctor) {
      return response.success(
        { msgCode: "USER_NOT_FOUND" },
        res,
        httpStatus.NOT_FOUND
      );
    }

    const dataToupdate1 = {
      fullName,
    };
    const userData = await common.updateByCondition(
      User.model,
      condition1,
      dataToupdate1
    );

    const condition2 = { userId: doctorId };
    const dataToupdate2 = {
      specialization,
      gender,
      medicalRegistration,
      education,
      experiance,
    };
    const doctorData = await common.updateByCondition(
      Doctor.model,
      condition2,
      dataToupdate2
    );

    const condition3 = { doctorId: doctorId };
    const dataToupdate3 = {
      isOwner,
      name: establishmentName,
      hospitalTypeId,
      address,
      location,
    };
    const estabMasterData = await common.updateByCondition(
      EstablishmentMaster.model,
      condition3,
      dataToupdate3
    );
    console.log(
      "🚀 ~ file: controller.js:150 ~ adminEditDoctor ~ estabMasterData:",
      estabMasterData
    );

    return response.success(
      { msgCode: "DATA_UPDATE", data: {} },
      res,
      httpStatus.OK
    );
  } catch (error) {
    console.log("catch error", error.message);
    return response.error(
      { msgCode: "INTERNAL_SERVER_ERROR" },
      res,
      httpStatus.INTERNAL_SERVER_ERROR
    );
  }
};

const adminActiveInactiveDoctor = async (req, res) => {
  try {
    const { doctorId } = req.query;
    const { status } = req.body;
    const condition = { userId: doctorId };
    const findDoctor = await common.getByCondition(Doctor.model, condition);
    if (!findDoctor) {
      return response.success(
        { msgCode: "USER_NOT_FOUND" },
        res,
        httpStatus.NOT_FOUND
      );
    }
    const dataToUpdate = {
      status,
    };
    const statusData = await common.updateByCondition(
      Doctor.model,
      condition,
      dataToUpdate
    );
    return response.success(
      { msgCode: "DOCTOR_STATUS_UPDATED", data: {} },
      res,
      httpStatus.OK
    );
  } catch (error) {
    return response.error(
      { msgCode: "INTERNAL_SERVER_ERROR" },
      res,
      httpStatus.INTERNAL_SERVER_ERROR
    );
  }
};

const adminDoctorList = async (req, res) => {
  try {
    const {
      specialization,
      cities,
      search,
      page,
      size,
      sortBy,
      order,
      isExport,
    } = req.query;
    const { limit, offset } = getPagination(page, size);
    const condition = {
      isVerified: constants.PROFILE_STATUS.APPROVE,
      steps: constants.PROFILE_STEPS.COMPLETED
    };
    if (specialization?.length > 0) {
      const specializationIds = specialization
        .split(",")
        .map((id) => new Types.ObjectId(id));
      condition.specialization = { $in: specializationIds };
    }
    if (cities) {
      const cityFilter = filterFormatter(cities, 2, "city");
      condition["$or"] = cityFilter;
    }

    const data = await doctor.adminDoctorList(
      condition,
      limit,
      offset,
      sortBy,
      order,
      search,
      isExport
    ); //filterDoctor(req.query)
    return response.success(
      { msgCode: "DOCTOR_LIST", data },
      res,
      httpStatus.OK
    );
  } catch (error) {
    console.log("catch error", error.message);
    return response.error(
      { msgCode: "INTERNAL_SERVER_ERROR" },
      res,
      httpStatus.INTERNAL_SERVER_ERROR
    );
  }
};

const adminDoctorApprovalList = async (req, res) => {
  try {
    const { search, page, size, sortBy, order } = req.query;
    const { limit, offset } = getPagination(page, size);
    const condition = {
      isVerified: constants.PROFILE_STATUS.PENDING,
      steps: constants.PROFILE_STEPS.COMPLETED
    };
    const data = await doctor.doctorListForApprove(
      condition,
      limit,
      offset,
      sortBy,
      order,
      search
    );
    return response.success(
      { msgCode: "DOCTOR_LIST", data },
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

const adminActionDoctor = async (req, res) => {
  try {
    const { isVerified, rejectReason } = req.body;
    const { userId } = req.query;
    const condition = {
      userId,
      isVerified: constants.PROFILE_STATUS.PENDING,
    };
    const findDoctor = await common.getByCondition(Doctor.model, condition);
    if (!findDoctor) {
      return response.success(
        { msgCode: "DATA_NOT_FOUND" },
        res,
        httpStatus.NOT_FOUND
      );
    }
    const dataToupdate = {
      isVerified,
      rejectReason,
    };
    const updateData = await common.updateByCondition(
      Doctor.model,
      condition,
      dataToupdate
    );
    if (!updateData) {
      return response.error(
        { msgCode: "UPDATE_ERROR" },
        res,
        httpStatus.NOT_ACCEPTABLE
      );
    }
    return response.success(
      { msgCode: "DOCTOR_STATUS_UPDATED" },
      res,
      httpStatus.OK
    );
  } catch (error) {
    return response.error(
      { msgCode: "INTERNAL_SERVER_ERROR" },
      res,
      httpStatus.INTERNAL_SERVER_ERROR
    );
  }
};

const updatesUser = (basicDetails) => {
  const { fullName } = basicDetails;
  if (fullName) return { fullName };
  else return null;
};

const updatesDoctor = (basicDetails, medicalRegistration, education) => {
  const result = {};
  if (basicDetails) {
    const { gender, specialization, city, email } = basicDetails;
    result.gender = gender;
    result.specialization = specialization;
    result.city = city;
    result.email = email;
  }
  if (medicalRegistration) result.medicalRegistration = [medicalRegistration];
  if (education) {
    const { experience } = education;
    result.education = [education];
    result.experience = experience;
  }
  return result;
};

const updatesEstablishmentMaster = async (
  establishmentDetails,
  parentDoctor
) => {
  try {
    const result = {};
    if (!establishmentDetails) return null;
    else {
      const { name, locality, city, isOwner, hospitalTypeId, hospitalId } =
        establishmentDetails;
      if (!hospitalId) {
        const establishmentUser = await common.create(User.model, {
          userType: constants.USER_TYPES.HOSPITAL,
          fullName: name,
          phone: parentDoctor.phoneNumber,
        });
        const establishmentHospital = await common.create(User.model, {
          userId: new ObjectId(establishmentUser._id),
          hospitalType: new ObjectId(hospitalTypeId),
          city: city,
        });
        result.hospitalId = establishmentHospital._id;
        result.address = {
          locality,
          city,
        };
      } else {
        const hospitalData = await common.getByCondition(Hospital.model, {
          _id: new ObjectId(hospitalId),
        });
        if (!hospitalData) return null;
        result.address = hospitalData.address;
        result.hospitalId = hospitalId;
      }
      result.doctorId = parentDoctor.doctorId;
      result.name = name;
      result.city = city;
      result.locality = locality;
      result.hospitalTypeId = hospitalTypeId;
      result.isOwner = isOwner;
      return result;
    }
  } catch (err) {
    console.log(err);
    return false;
  }
};

//  ..................Doctor Signup process Api..............

const doctorUpdateProfile = async (req, res) => {
  try {
    const { steps, isEdit, records, isSaveAndExit } = req.body;
    let { profileScreen } = req.body;
    const { userId } = req.data;
    const condition = {
      _id: new ObjectId(userId),
      userType: constants.USER_TYPES.DOCTOR,
    };
    const findDoctor = await doctor.getDoctorProfile(condition);
    if (!findDoctor || !findDoctor[0]._id) {
      return response.success(
        { msgCode: "USER_NOT_FOUND" },
        res,
        httpStatus.NOT_FOUND
      );
    }
    if (steps > findDoctor[0].steps) {
      return response.error(
        { msgCode: "INCOMPLETE_PROFILE" },
        res,
        httpStatus.FORBIDDEN
      );
    }

    switch (steps) {
      case constants.PROFILE_STEPS.SECTION_A:
        const {
          basicDetails,
          medicalRegistration,
          education,
          establishmentDetails,
        } = records;
        if (
          !isEdit &&
          !basicDetails &&
          !medicalRegistration &&
          !education &&
          !establishmentDetails
        )
          return response.error(
            { msgCode: "BAD_REQUEST" },
            res,
            httpStatus.BAD_REQUEST
          );
        const updates = {};
        updates.user = updatesUser(basicDetails);
        updates.doctor = updatesDoctor(
          basicDetails,
          medicalRegistration,
          education
        );
        updates.establishmentMaster = await updatesEstablishmentMaster(
          establishmentDetails,
          findDoctor[0]
        );

        if (!isEdit) {
          if (!isSaveAndExit)
            updates.doctor.steps = constants.PROFILE_STEPS.SECTION_B;
        }
        if (!findDoctor[0].establishmentMasterId)
          await common.create(
            EstablishmentMaster.model,
            updates.establishmentMaster
          );
        if (updates.user)
          await common.updateByCondition(User.model, condition, updates.user);
        if (updates.doctor)
          await common.updateByCondition(
            Doctor.model,
            { userId: new ObjectId(userId) },
            updates.doctor
          );
        if (updates.establishmentMaster)
          await common.updateByCondition(
            EstablishmentMaster.model,
            { _id: new ObjectId(findDoctor[0].establishmentMasterId) },
            updates.establishmentMaster
          );

        break;

      case constants.PROFILE_STEPS.SECTION_B:
        const { doctor, establishmentDetail } = records;

        if (!isEdit && !doctor && !establishmentDetail)
          return response.error(
            { msgCode: "BAD_REQUEST" },
            res,
            httpStatus.BAD_REQUEST
          );

        if (!isEdit) {
          if (!isSaveAndExit) doctor.steps = constants.PROFILE_STEPS.SECTION_C;
        }
        if (doctor)
          await common.updateByCondition(
            Doctor.model,
            { userId: new ObjectId(userId) },
            doctor
          );
        if (establishmentDetail)
          await common.updateByCondition(
            EstablishmentMaster.model,
            { _id: new ObjectId(findDoctor[0].establishmentMasterId) },
            establishmentDetail
          );
        break;

      case constants.PROFILE_STEPS.SECTION_C:
        const { address, establishmentTiming, consultationFees } = records;
        if (!isEdit && !address && !establishmentTiming && !consultationFees)
          return response.error(
            { msgCode: "BAD_REQUEST" },
            res,
            httpStatus.BAD_REQUEST
          );
        const { location } = address;
        let establishmentTimingData = {};
        if (establishmentTiming && establishmentTiming?.length !== 0)
          establishmentTiming.map((data) => {
            establishmentTimingData[`${constants.DAYS_OF_WEEK[data?.id]}`] =
              data.timing;
          });

        if (!isEdit) {
          if (!isSaveAndExit)
            await common.updateByCondition(
              Doctor.model,
              { _id: new ObjectId(findDoctor[0]?.doctorId) },
              {
                steps: constants.PROFILE_STEPS.COMPLETED,
                isVerified: constants.PROFILE_STATUS.APPROVE,
              }
            );
        }
        if (location) {
          await common.updateByCondition(
            EstablishmentMaster.model,
            { _id: new ObjectId(findDoctor[0].establishmentMasterId) },
            { location }
          );
          delete address?.location;
        }

        if (address)
          await common.updateByCondition(
            EstablishmentMaster.model,
            { _id: new ObjectId(findDoctor[0].establishmentMasterId) },
            { address }
          );

        if (findDoctor[0].establishmentMasterTimingId)
          await common.updateByCondition(
            EstablishmentTiming.model,
            { _id: new ObjectId(findDoctor[0].establishmentMasterTimingId) },
            { ...establishmentTimingData, consultationFees }
          );
        else
          await common.create(EstablishmentTiming.model, {
            establishmentId: new ObjectId(findDoctor[0].establishmentMasterId),
            isOwner:
              findDoctor[0].sectionA?.establishmentDetail?.isOwner || false,
            createdBy: new ObjectId(userId),
            doctorId: new ObjectId(findDoctor[0].doctorId),
            consultationFees,
            ...establishmentTimingData,
          });
        break;
    }
    if (!profileScreen) {
      switch (steps) {
        case constants.PROFILE_STEPS.SECTION_A:
          profileScreen = constants.DOCTOR_SCREENS.DOCTOR_IDENTITY_PROOF;
          break;
        case constants.PROFILE_STEPS.SECTION_B:
          profileScreen = constants.DOCTOR_SCREENS.ESTABLISHMENT_LOCATION;
          break;
        case constants.PROFILE_STEPS.SECTION_C:
          profileScreen = constants.DOCTOR_SCREENS.COMPLETED;
          break;
      }
    }
    if (!isEdit && profileScreen)
      await common.updateByCondition(
        Doctor.model,
        { userId: new ObjectId(userId) },
        { profileScreen }
      );

    return response.success({ msgCode: "DOCTOR_UPDATED" }, res, httpStatus.OK);
  } catch (error) {
    console.log(error);
    return response.error(
      { msgCode: "INTERNAL_SERVER_ERROR" },
      res,
      httpStatus.INTERNAL_SERVER_ERROR
    );
  }
};

const getDoctorProfile = async (req, res) => {
  try {
    const { userId } = req.data;
    const { type, doctorId } = req.query;
    if (type === constants.PROFILE_DETAILS.ADMIN && !doctorId)
      return response.error(
        { msgCode: "DOCTOR_ID_MISSING" },
        res,
        httpStatus.BAD_REQUEST
      );
    const recordId =
      type === constants.PROFILE_DETAILS.ADMIN ? doctorId : userId;
    const condition = {
      _id: new Types.ObjectId(recordId),
      userType: constants.USER_TYPES.DOCTOR,
      // isDeleted: false
    };
    let findDoctor;
    switch (parseInt(type)) {
      case constants.PROFILE_DETAILS.ADMIN:
        findDoctor = await doctor.getDoctorProfileAdmin(condition);
        break;
      case constants.PROFILE_DETAILS.OTHERS:
        findDoctor = await doctor.completeDoctorProfile(condition);
        break;
      case constants.PROFILE_DETAILS.SIGN_UP:
        findDoctor = await doctor.getDoctorProfile(condition);
        break;
    }
    if (!findDoctor[0]?._id) {
      return response.success(
        { msgCode: "USER_NOT_FOUND" },
        res,
        httpStatus.NOT_FOUND
      );
    }
    return response.success(
      { msgCode: "FETCHED", data: findDoctor[0] },
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

// .......................Doctor Dashboard...............

const doctorCancelAppointment = async (req, res) => {
  try {
    const { appointmentId, reason, mode } = req.body;
    const condition = {
      _id: appointmentId,
      status: { $ne: constants.BOOKING_STATUS.COMPLETE },
    };
    const findAppointment = await common.getByCondition(
      Appointment.model,
      condition
    );
    if (!findAppointment) {
      return response.success(
        { msgCode: "APPOINTMENT_NOT_FOUND" },
        res,
        httpStatus.NOT_FOUND
      );
    }
    const dataToupdate = {
      status: constants.BOOKING_STATUS.CANCEL,
      cancelBy: constants.CANCEL_BY.DOCTOR,
      reason,
    };
    const update = await common.updateById(
      Appointment.model,
      condition,
      dataToupdate
    );
    let phone, email;
    if (findAppointment.self == true) {
      // .............Data of patient from patient table..........
      const patient = { _id: findAppointment.patientId };
      const findPatient = await common.getById(Patient.model, patient);
      email = findPatient.email;
      console.log("patientTable", findPatient);

      // ..........Data of patient from user table...........
      const patientuser = { _id: findPatient.userId };
      const findPatientuser = await common.getById(User.model, patientuser);
      phone = findPatientuser.phone;
      console.log("patientuserTable", findPatientuser);
    }
    if (findAppointment.self == false) {
      phone = findAppointment.phone;
      email = findAppointment.email;
    }
    if (mode == 1) {
      const message = `Dear Patient, your appointment has been cancelled due to ${reason} : `;
      // sendOTP(phone, 0, message);
    }
    if (mode == 2) {
      const file = "appointmentCancel.ejs"; //emailTemplate
      //link generation
      const url = config.SERVER_URL;
      // const link =
      //   `${url}/signup?accesstoken=` + token;
      //nodemailer to send email
      // sendEmail(file,email, "Appointment cancellation",);
    }
    return response.success(
      { msgCode: "APPOINTMENT_CANCELLATION", data: update },
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

const doctorCompleteAppointment = async (req, res) => {
  try {
    const { appointmentId } = req.body;
    const condition = {
      _id: new Types.ObjectId(appointmentId),
      status: { $ne: constants.BOOKING_STATUS.COMPLETE },
    };
    const findAppointment = await common.getByCondition(
      Appointment.model,
      condition
    );
    if (!findAppointment) {
      return response.success(
        { msgCode: "APPOINTMENT_NOT_FOUND" },
        res,
        httpStatus.NOT_FOUND
      );
    }
    const dataToupdate = {
      status: constants.BOOKING_STATUS.COMPLETE,
    };
    const update = await common.updateById(
      Appointment.model,
      condition,
      dataToupdate
    );
    return response.success(
      { msgCode: "APPOINTMENT_COMPLETED", data: update },
      res,
      httpStatus.OK
    );
  } catch (error) {
    return response.error(
      { msgCode: "INTERNAL_SERVER_ERROR" },
      res,
      httpStatus.INTERNAL_SERVER_ERROR
    );
  }
};

const doctorDeleteAppointment = async (req, res) => {
  try {
    const { appointmentId } = req.query;
    const condition = {
      _id: appointmentId,
    };
    const findAppointment = await common.getByCondition(
      Appointment.model,
      condition
    );
    if (!findAppointment) {
      return response.success(
        { msgCode: "DATA_NOT_FOUND" },
        res,
        httpStatus.NOT_FOUND
      );
    }
    const deleteAppointment = await common.deleteByField(
      Appointment.model,
      condition
    );
    if (!deleteAppointment) {
      return response.error(
        { msgCode: "FAILED_TO_DELETE" },
        res,
        httpStatus.FORBIDDEN
      );
    }
    return response.success({ msgCode: "DATA_DELETED" }, res, httpStatus.OK);
  } catch (error) {
    console.log(error);
    return response.error(
      { msgCode: "INTERNAL_SERVER_ERROR" },
      res,
      httpStatus.INTERNAL_SERVER_ERROR
    );
  }
};

const doctorEditAppointment = async (req, res) => {
  try {
    const { appointmentId, date, time, notes } = req.body;
    const condition = {
      _id: appointmentId,
    };
    const findAppointment = await common.getByCondition(
      Appointment.model,
      condition
    );
    if (!findAppointment) {
      return response.success(
        { msgCode: "APPOINTMENT_NOT_FOUND" },
        res,
        httpStatus.NOT_FOUND
      );
    }
    const convertDate = convertToUTCTimestamp(date, time);
    const dataToupdate = {
      date: convertDate,
      notes,
    };
    const update = await common.updateById(
      Appointment.model,
      condition,
      dataToupdate
    );
    return response.success(
      { msgCode: "APPOINTMENT_RESCHEDULE", data: update },
      res,
      httpStatus.OK
    );
  } catch (error) {
    return response.error(
      { msgCode: "INTERNAL_SERVER_ERROR" },
      res,
      httpStatus.INTERNAL_SERVER_ERROR
    );
  }
};

const getCalender = async (req, res) => {
  try {
    const decode = req.data;
    console.log(decode);
    const condition = {
      userId: new Types.ObjectId(decode.userId),
    };
    const condition1 = {};
    const { startDate, endDate, today } = req.body;
    const findDoctor = await common.getByCondition(Doctor.model, condition);
    if (!findDoctor) {
      return response.success(
        { msgCode: "DATA_NOT_FOUND" },
        res,
        httpStatus.NOT_FOUND
      );
    }
    const matchCondition = {
      doctorId: new Types.ObjectId(findDoctor._id),
      status: { $ne: constants.BOOKING_STATUS.RESCHEDULE },
    };
    if (today) {
      const startOfDay = new Date(today);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(today);
      endOfDay.setHours(23, 59, 59, 999);
      condition1.date = { $gte: startOfDay, $lte: endOfDay };
    }
    if (startDate && endDate) {
      const startOfDay = new Date(startDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(endDate);
      endOfDay.setHours(23, 59, 59, 999);
      condition1.date = {
        $gte: new Date(startOfDay),
        $lte: new Date(endOfDay),
      };
    }
    const findData = await doctor.calenderList(matchCondition, condition1);
    return response.success(
      { msgCode: "FETCHED", data: findData },
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

const getAllTopRatedDoctors = async (req, res) => {
  try {
    const data = await doctor.filterTopRatedDoctor();
    return response.success(
      { msgCode: "DOCTOR_LIST", data },
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

// ................Doctor Establihment Api................

const doctorEstablishmentList = async (req, res) => {
  try {
    const decode = req.data;
    console.log(decode);
    const condition1 = {
      userId: new Types.ObjectId(decode.userId),
    };
    const findDoctor = await common.getByCondition(Doctor.model, condition1);
    if (!findDoctor) {
      return response.success(
        { msgCode: "DATA_NOT_FOUND" },
        res,
        httpStatus.NOT_FOUND
      );
    }
    const { page, size } = req.query;
    const condition = {
      doctorId: findDoctor._id,
      // isVerified: constants.PROFILE_STATUS.APPROVE,
    };
    const { limit, offset } = getPagination(page, size);
    const findEstablishment = await doctor.establishmentList(
      condition,
      limit,
      offset
    );
    if (!findEstablishment) {
      return response.success(
        { msgCode: "DATA_NOT_FOUND" },
        res,
        httpStatus.NOT_FOUND
      );
    }
    return response.success(
      { msgCode: "FETCHED", data: findEstablishment },
      res,
      httpStatus.OK
    );
  } catch (error) {
    return response.error(
      { msgCode: "INTERNAL_SERVER_ERROR" },
      res,
      httpStatus.INTERNAL_SERVER_ERROR
    );
  }
};

const doctorAddEstablishment = async (req, res) => {
  try {
    const decode = req.data;
    const {
      hospitalId,
      isOwner,
      profilePic,
      name,
      hospitalTypeId,
      consultationFees,
      address,
      location,
      establishmentMobile,
      establishmentEmail,
      mon,
      tue,
      wed,
      thu,
      fri,
      sat,
      sun,
    } = req.body;

    // find Establishment using Hospital Id in Visiting Case..
    const estabMster = {
      hospitalId: new Types.ObjectId(hospitalId)
    }
    const findEstablishment = await common.getByCondition(
      EstablishmentMaster.model,
      estabMster
    );
    // if (!findEstablishment) {
    //   return response.success(
    //     { msgCode: "DATA_NOT_FOUND" },
    //     res,
    //     httpStatus.NOT_FOUND
    //   );
    // }

    // find Doctor using Decoded Id..
    const doctorId = {
      userId: new Types.ObjectId(decode.userId)
    }
    const findDoctor = await common.getByCondition(
      Doctor.model,
      doctorId
    );
    // if (!findDoctor) {
    //   return response.success(
    //     { msgCode: "DATA_NOT_FOUND" },
    //     res,
    //     httpStatus.NOT_FOUND
    //   );
    // }

    const condition = {
      _id: new Types.ObjectId(decode.userId)
    }
    if (isOwner === 1) {
      const checkUser = await common.getByCondition(
        User.model,
        condition
      );
      if (checkUser.userType.includes(constants.USER_TYPES.HOSPITAL)) {
        return response.error({ msgCode: 'ALREADY_ADDED_HOSPITAL' }, res, httpStatus.FORBIDDEN);
      }

      const userTableData = {
        userType: constants.USER_TYPES.HOSPITAL
      }
      const addUserType = await common.push(User.model, condition, userTableData);
      if (!addUserType) {
        return response.error({ msgCode: 'FAILED_TO_ADD' }, res, httpStatus.FORBIDDEN);
      }

      const dataHospital = {
        userId: new Types.ObjectId(decode.userId),
        profilePic,
        address,
        location,
      };
      const hospitalData = await common.create(
        Hospital.model,
        dataHospital
      );
      const estabMasterData = {
        hospitalId: hospitalData._id,
        doctorId: findDoctor._id,
        name,
        hospitalTypeId,
        address,
        location,
        establishmentMobile,
        establishmentEmail,
      };
      const establishmentMasterData = await common.create(
        EstablishmentMaster.model,
        estabMasterData
      );
      const estabTimingData = {
        establishmentId: establishmentMasterData._id,
        doctorId: findDoctor._id,
        isOwner,
        consultationFees,
        mon,
        tue,
        wed,
        thu,
        fri,
        sat,
        sun,
      };
      const establishmentTimingData = await common.create(
        EstablishmentTiming.model,
        estabTimingData
      );
      return response.success(
        {
          msgCode: "DATA_CREATED",
          data: {
            ...addUserType._doc,
            ...hospitalData._doc,
            ...establishmentMasterData._doc,
            ...establishmentTimingData._doc,
          },
        },
        res,
        httpStatus.CREATED
      );
    } else if (hospitalId && isOwner === 0) {
      const visitData = {
        doctorId: findDoctor._id,
        establishmentId: findEstablishment._id,
        isOwner,
        consultationFees,
        mon,
        tue,
        wed,
        thu,
        fri,
        sat,
        sun
      }
      const establishmentVisitData = await common.create(
        EstablishmentTiming.model,
        visitData
      );
      return response.success(
        {
          msgCode: "DATA_CREATED",
          data: {
            establishmentVisitData
          },
        },
        res,
        httpStatus.CREATED
      );

    } else if (!hospitalId && isOwner === 0) {
      const dataHospital = {
        userId: new Types.ObjectId(decode.userId),
        profilePic,
        address,
        location,
      };
      const hospitalData = await common.create(
        Hospital.model,
        dataHospital
      );
      const estabMasterData = {
        hospitalId: hospitalData._id,
        doctorId: findDoctor._id,
        name,
        hospitalTypeId,
        address,
        location,
        establishmentMobile,
        establishmentEmail,
      };
      const establishmentMasterData = await common.create(
        EstablishmentMaster.model,
        estabMasterData
      );
      const estabTimingData = {
        establishmentId: establishmentMasterData._id,
        doctorId: findDoctor._id,
        isOwner,
        consultationFees,
        mon,
        tue,
        wed,
        thu,
        fri,
        sat,
        sun,
      };
      const establishmentTimingData = await common.create(
        EstablishmentTiming.model,
        estabTimingData
      );
      return response.success(
        {
          msgCode: "DATA_CREATED",
          data: {
            ...hospitalData._doc,
            ...establishmentMasterData._doc,
            ...establishmentTimingData._doc,
          },
        },
        res,
        httpStatus.CREATED
      );
    }
  } catch (error) {
    console.log(error);
    return response.error(
      { msgCode: "INTERNAL_SERVER_ERROR" },
      res,
      httpStatus.INTERNAL_SERVER_ERROR
    );
  }
};

const doctorEditEstablishment = async (req, res) => {
  try {
    const decode = req.data;
    const {
      profilePic,
      name,
      hospitalTypeId,
      consultationFees,
      address,
      location,
      mon,
      tue,
      wed,
      thu,
      fri,
      sat,
      sun,
    } = req.body;
    const { hospitalId, establishmentId } = req.query
    const condition = {
      userId: new Types.ObjectId(decode.userId)
    }
    const findDoctor = await common.getByCondition(
      Doctor.model,
      condition
    );
    const condition1 = {
      doctorId: findDoctor._id,
      establishmentId
    }
    console.log("doctorId", findDoctor._id)
    const findEstbTiming = await common.getByCondition(
      EstablishmentTiming.model,
      condition1
    );
    console.log("findEstbTiming.isOwner", findEstbTiming.isOwner);

    if (findEstbTiming.isOwner === true) {
      const dataToupdateHospital = {
        profilePic,
        address,
        location,
      };
      const updateHospital = await common.updateByCondition(Hospital.model, condition, dataToupdateHospital)

      const estabMasterCondition = {
        doctorId: findDoctor._id,
        hospitalId: hospitalId
      }
      const dataToupdateEstabMaster = {
        name,
        hospitalTypeId,
        address,
        location,
      };
      const updateMasterData = await common.updateByCondition(EstablishmentMaster.model, estabMasterCondition, dataToupdateEstabMaster)
      const estabTimingCondition = {
        doctorId: findDoctor._id,
        establishmentId: establishmentId
      }
      const dataToupdateTime = {
        consultationFees,
        mon,
        tue,
        wed,
        thu,
        fri,
        sat,
        sun,
      };
      const updateTimingData = await common.updateByCondition(EstablishmentTiming.model, estabTimingCondition, dataToupdateTime)

      // await Promise.all([
      //   common.updateByCondition(
      //     EstablishmentMaster.model,
      //     condition,
      //     dataToupdate
      //   ),
      //   common.updateByCondition(
      //     EstablishmentTiming.model,
      //     hospitalcondition,
      //     dataToupdateTime
      //   ),
      // ]);
      return response.success({ msgCode: "DATA_UPDATE" }, res, httpStatus.OK);
    } else {
      const estabTimingCondition = {
        doctorId: findDoctor._id,
        establishmentId: establishmentId
      }
      const dataToupdateTime = {
        consultationFees,
        mon,
        tue,
        wed,
        thu,
        fri,
        sat,
        sun,
      };
      const updateTimingData = await common.updateByCondition(EstablishmentTiming.model, estabTimingCondition, dataToupdateTime)
      return response.success({ msgCode: "DATA_UPDATE" }, res, httpStatus.OK);
    }
  } catch (error) {
    console.log("catch error", error.message);
    return response.error(
      { msgCode: "INTERNAL_SERVER_ERROR" },
      res,
      httpStatus.INTERNAL_SERVER_ERROR
    );
  }
};

const establishmentData = async (req, res) => {
  try {
    const decode = req.data;
    const { page, size, establishmentId } = req.query;
    const condition = {
      doctorId: new Types.ObjectId(decode.userId),
      establishmentId: new Types.ObjectId(establishmentId),
    };
    const { limit, offset } = getPagination(page, size);
    const findEstablishment = await doctor.establishmentList(
      condition,
      limit,
      offset
    );
    if (!findEstablishment) {
      return response.success(
        { msgCode: "DATA_NOT_FOUND" },
        res,
        httpStatus.NOT_FOUND
      );
    }
    return response.success(
      { msgCode: "FETCHED", data: findEstablishment },
      res,
      httpStatus.OK
    );
  } catch (error) {
    return response.error(
      { msgCode: "INTERNAL_SERVER_ERROR" },
      res,
      httpStatus.INTERNAL_SERVER_ERROR
    );
  }
};

const doctorEstablishmentRequest = async (req, res) => {
  try {
    const decode = req.data;
    console.log(decode);
    const { page, size, sortBy, order } = req.query;
    const condition1 = {
      userId: new Types.ObjectId(decode.userId),
    };
    const findDoctor = await common.getByCondition(Doctor.model, condition1);
    if (!findDoctor) {
      return response.success(
        { msgCode: "DATA_NOT_FOUND" },
        res,
        httpStatus.NOT_FOUND
      );
    }
    const condition = {
      doctorId: findDoctor._id,
      isVerified: constants.PROFILE_STATUS.PENDING,
    };
    const { limit, offset } = getPagination(page, size);
    const findEstablishment = await doctor.establishmentRequest(
      condition,
      limit,
      offset,
      sortBy,
      order
    );
    if (!findEstablishment) {
      return response.success(
        { msgCode: "DATA_NOT_FOUND" },
        res,
        httpStatus.NOT_FOUND
      );
    }
    return response.success(
      { msgCode: "FETCHED", data: findEstablishment },
      res,
      httpStatus.OK
    );
  } catch (error) {
    return response.error(
      { msgCode: "INTERNAL_SERVER_ERROR" },
      res,
      httpStatus.INTERNAL_SERVER_ERROR
    );
  }
};

const doctorAcceptEstablishment = async (req, res) => {
  try {
    const decode = req.data;
    const condition1 = {
      userId: new Types.ObjectId(decode.userId),
    };
    const findDoctor = await common.getByCondition(Doctor.model, condition1);
    if (!findDoctor) {
      return response.success(
        { msgCode: "DATA_NOT_FOUND" },
        res,
        httpStatus.NOT_FOUND
      );
    }
    const { isVerified, rejectReason } = req.body;
    const { establishmentId } = req.query;
    const condition = {
      establishmentId: establishmentId,
      doctorId: findDoctor._id,
      // isVerified:1
    };
    const findHospital = await common.getByCondition(
      EstablishmentTiming.model,
      condition
    );
    if (!findHospital) {
      return response.success(
        { msgCode: "DATA_NOT_FOUND" },
        res,
        httpStatus.NOT_FOUND
      );
    }
    const dataToupdate = {
      isVerified,
      rejectReason,
    };
    const updateData = await common.updateByCondition(
      EstablishmentTiming.model,
      condition,
      dataToupdate
    );
    return response.success({ msgCode: "DATA_UPDATE" }, res, httpStatus.OK);
  } catch (error) {
    console.log(error);
    return response.error(
      { msgCode: "INTERNAL_SERVER_ERROR" },
      res,
      httpStatus.INTERNAL_SERVER_ERROR
    );
  }
};

// ....................Dashboard................................

const doctorAppointmentDashboard = async (req, res) => {
  try {
    const decode = req.data;
    const condition = {
      userId: new Types.ObjectId(decode.userId),
    };
    const findDoctor = await common.getByCondition(Doctor.model, condition);
    if (!findDoctor) {
      return response.success(
        { msgCode: "DATA_NOT_FOUND" },
        res,
        httpStatus.NOT_FOUND
      );
    }
    const { today } = req.body;
    const condition1 = { doctorId: new Types.ObjectId(findDoctor._id) };
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);
    condition1.date = { $gte: startOfDay, $lte: endOfDay };
    condition1.status = {
      $nin: [
        constants.BOOKING_STATUS.RESCHEDULE,
        constants.BOOKING_STATUS.CANCEL,
      ],
    };
    const todayData = await common.count(Appointment.model, condition1);
    // Pending Data
    const startDay = new Date(today);
    startDay.setHours(0, 0, 0, 0);
    const condition2 = {
      doctorId: new Types.ObjectId(findDoctor._id),
      status: constants.BOOKING_STATUS.PENDING,
      date: { $gte: startDay },
    };
    const pendingData = await common.count(Appointment.model, condition2);
    // Total Data
    const condition3 = {
      doctorId: new Types.ObjectId(findDoctor._id),
      status: {
        $nin: [
          constants.BOOKING_STATUS.RESCHEDULE,
          constants.BOOKING_STATUS.CANCEL,
        ],
      },
    };
    const totalData = await common.count(Appointment.model, condition3);
    const data = {
      todayData,
      pendingData,
      totalData,
    };
    return response.success({ msgCode: "FETCHED", data }, res, httpStatus.OK);
  } catch (error) {
    return response.error(
      { msgCode: "INTERNAL_SERVER_ERROR" },
      res,
      httpStatus.INTERNAL_SERVER_ERROR
    );
  }
};

const doctorAppointmentList = async (req, res) => {
  try {
    const decode = req.data;
    const condition1 = {
      userId: new Types.ObjectId(decode.userId),
    };
    const findDoctor = await common.getByCondition(Doctor.model, condition1);
    if (!findDoctor) {
      return response.success(
        { msgCode: "DATA_NOT_FOUND" },
        res,
        httpStatus.NOT_FOUND
      );
    }
    const condition = {
      doctorId: new Types.ObjectId(findDoctor._id),
    };
    const { upcoming, status, fromDate, toDate, page, size, search, isExport } = req.query;
    const { limit, offset } = getPagination(page, size);
    if (upcoming == "false") {
      // It works for Today Data.
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);
      condition.date = { $gte: startOfDay, $lte: endOfDay };
    } else {
      if (fromDate && toDate) {
        const startOfDay = new Date(fromDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(toDate);
        endOfDay.setHours(23, 59, 59, 999);
        condition.date = { $gte: startOfDay, $lte: endOfDay };
      } else {
        // It works for upcoming Data.
        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);
        condition.date = { $gt: endOfDay };
      }
    }
    if (status || status === 0) condition.status = status;
    const findData = await doctor.appointmentList(condition, limit, offset, search, isExport);
    if (!findData) {
      return response.success(
        { msgCode: "DATA_NOT_FOUND" },
        res,
        httpStatus.NOT_FOUND
      );
    }
    return response.success(
      { msgCode: "FETCHED", data: findData },
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

const getAllSpecializations = async (req, res) => {
  try {
    const data = await doctor.specializationList();
    return response.success(
      { msgCode: "DOCTOR_LIST", data },
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

const getAllDoctorByCity = async (req, res) => {
  try {
    const data = await doctor.findAllDoctorByCity();
    return response.success(
      { msgCode: "DOCTOR_LIST", data },
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

const doctorAboutUs = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(id);
    const data = await doctor.doctorAboutUs(id);
    return response.success(
      { msgCode: "DOCTOR_ABOUT_US", data },
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

const doctorReviews = async (req, res) => {
  try {
    const { id } = req.params;
    const { page, size, sort, search } = req.query;
    const { limit, offset } = getPagination(page, size);
    const searchQuery = search || "";
    const data = await appointment.doctorReviews(
      id,
      limit,
      offset,
      sort,
      searchQuery
    );
    const feedbackData = await common.findAll(AppointmentFeedback.model, {
      doctorId: new Types.ObjectId(id),
    });
    const waitTimeData = feedbackData.map((feedback) => {
      const experience = feedback.experience.find(
        (exp) => exp.questionNo === 3
      );
      return { waitTime: experience.option, points: experience.point };
    });
    let waitTimePoints = 0;
    const waitTimeLength = waitTimeData.length;
    waitTimeData.forEach((data) => {
      switch (data.waitTime) {
        case "Less than 15 minutes":
          waitTimePoints += 5;
          break;
        case "15-30 minutes":
          waitTimePoints += 4.5;
          break;
        case "30-45 minutes":
          waitTimePoints += 4;
          break;
        case "More than 1 hour":
          waitTimePoints += 3.5;
          break;
        default:
          break;
      }
    });
    const totalPoints = feedbackData.reduce(
      (sum, feedback) => sum + feedback.totalPoint,
      0
    );
    const averagePoints = totalPoints / feedbackData.length;
    const averageWaitTime =
      Math.round((waitTimePoints / waitTimeLength) * 100) / 100;

    return response.success(
      {
        msgCode: "DOCTOR_REVIEWS_LIST",
        data: { data, averageWaitTime, averagePoints, valueForMoney: 4.5 },
      },
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

const doctorSpeciality = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(id);
    const data = await common.getById(Doctor.model, id);
    return response.success(
      { msgCode: "DOCTOR_SPECIALITY_LIST", data: data.service },
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

const deleteDocProfile = async (req, res) => {
  try {
    const { id } = req.query;
    console.log(id);
    const data = await common.updateById(User.model, id, { isDeleted: true });
    return response.success(
      { msgCode: "DOCTOR_DELETED", data },
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

const doctorList = async (req, res) => {
  try {
    const { search, sort, page, size, sortOrder, isExport } = req.query;
    const sortCondition = {};
    console.log(req.query);
    let sortKey = sort;
    if (constants.NAME_CONSTANT.includes(sort)) sortKey = "lowerName";
    sortCondition[`${sortKey}`] = constants.LIST.ORDER[sortOrder];

    const { limit, offset } = getPagination(page, size);
    const condition = {
      userType: constants.USER_TYPES.DOCTOR,
    };

    const searchQuery = {
      $or: [
        {
          fullName: { $regex: new RegExp(search, "i") },
        },
        {
          phone: { $regex: new RegExp(search, "i") },
        },
      ],
    };
    const doctorList = await doctor.doctorList(
      condition,
      sortCondition,
      offset,
      limit,
      searchQuery,
      isExport
    );

    const msgCode = !doctorList?.count ? "NO_RECORD_FETCHED" : "PATIENT_LIST";
    return response.success({ msgCode, data: doctorList }, res, httpStatus.OK);
  } catch (err) {
    return response.error(
      { msgCode: "SOMETHING_WENT_WRONG" },
      res,
      httpStatus.SOMETHING_WENT_WRONG
    );
  }
};

const doctorListBasedOnEstablishmentSpecility = async (req, res) => {
  try {
    const { id } = req.params;
    const { filter, page, size, speciality } = req.query;
    const { offset, limit } = getPagination(page, size);
    console.log(id);
    const data = await doctor.doctorListBasedOnEstablishmentSpecility(
      id,
      filter,
      speciality,
      offset,
      limit
    );
    const specialities = await doctor.establishmentSpecialityList(id, filter);
    return response.success(
      { msgCode: "DOCTOR_ABOUT_US", data: { data, specialities } },
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

const specialityFirstLetterList = async (req, res) => {
  try {
    const { id } = req.params;
    const data = await doctor.specialityFirstLetterList(id);
    return response.success(
      { msgCode: "DOCTOR_ABOUT_US", data },
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

const establishmentspecialityListDoc = async (req, res) => {
  try {
    const { id } = req.params;
    const data = await doctor.establishmentspecialityListDoc(id);
    return response.success(
      { msgCode: "DOCTOR_ABOUT_US", data },
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

module.exports = {
  getAllDoctors,
  adminAddDoctor,
  adminDoctorList,
  adminEditDoctor,
  adminActiveInactiveDoctor,
  adminDoctorApprovalList,
  adminActionDoctor,
  doctorUpdateProfile,
  getDoctorProfile,
  getCalender,
  doctorCancelAppointment,
  doctorCompleteAppointment,
  doctorEditAppointment,
  doctorDeleteAppointment,
  getAllTopRatedDoctors,
  doctorAddEstablishment,
  doctorEditEstablishment,
  doctorAcceptEstablishment,
  establishmentData,
  doctorEstablishmentRequest,
  doctorAppointmentDashboard,
  doctorAppointmentList,
  doctorEstablishmentList,
  getAllSpecializations,
  getAllDoctorByCity,
  doctorAboutUs,
  doctorReviews,
  doctorSpeciality,
  deleteDocProfile,
  doctorList,
  doctorListBasedOnEstablishmentSpecility,
  specialityFirstLetterList,
  establishmentspecialityListDoc
};
