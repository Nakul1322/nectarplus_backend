const momentTZ = require("moment-timezone");
const { Types } = require("mongoose");
const mongoose = require("mongoose");
const { ObjectId } = mongoose.Types;
const httpStatus = require("http-status");

const {
  response,
  constants,
  sendSms,
  sendEmail,
} = require("../../../utils/index");
const {
  common,
  doctor,
  appointmentService,
  adminService,
} = require("../../../services/index");
const {
  User,
  Doctor,
  Hospital,
  Appointment,
  EstablishmentMaster,
  EstablishmentTiming,
  Notification,
  ProcedureMaster,
  MedicalReport,
  AppointmentFeedback,
  Specialization,
} = require("../../../models/index");
const {
  getPagination,
  filterFormatter,
  convertToUTCTimestamp,
  objectIdFormatter,
} = require("../../../utils/helper");
const config = require("../../../config/index");
const environment = config.ENVIRONMENT === constants.SERVER.PROD;

const getAllDoctors = async (req, res) => {
  try {
    const { sort, page, size, sortOrder, search, city, locality } = req.query;
    const sortCondition = {};
    sortCondition[`${sort}`] = constants.LIST.ORDER[sortOrder];
    const { offset, limit } = getPagination(page, size);
    const data = await doctor.filterDoctor(
      req.body,
      { filter: search, city, locality },
      sortCondition,
      offset,
      limit
    );
    const specialization = await common.getByCondition(Specialization.model, {
      $or: [
        { name: { $regex: new RegExp(`^${search}$`, "i") } },
        { slug: { $regex: new RegExp(`^${search}$`, "i") } },
      ],
    });
    const procedure = await common.getByCondition(ProcedureMaster.model, {
      $or: [
        { name: { $regex: new RegExp(`^${search}$`, "i") } },
        { slug: { $regex: new RegExp(`^${search}$`, "i") } },
      ],
    });
    data.specialization = specialization;
    data.procedure = procedure;
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

// ......................Super Admin portal Api's for Doctor..........

const adminAddDoctor = async (req, res) => {
  try {
    const {
      hospitalId,
      fullName,
      phone,
      specialization,
      gender,
      medicalRegistration,
      education,
      isOwner,
      experience,
      establishmentName,
      hospitalTypeId,
      address,
      location,
      isLocationShared,
    } = req.body;
    if (isOwner === 1) {
      const createUser = {
        userType: [constants.USER_TYPES.DOCTOR, constants.USER_TYPES.HOSPITAL],
        fullName,
        phone,
      };
      const userData = await common.create(User.model, createUser);

      const createDoctor = {
        userId: userData._id,
        specialization,
        gender,
        medicalRegistration,
        education,
        experience,
        isOwnEstablishment: true,
      };
      const doctorData = await common.create(Doctor.model, createDoctor);
      const createHospital = {
        userId: userData._id,
        address,
        location,
        isLocationShared,
        hospitalType: new ObjectId(hospitalTypeId),
        totalDoctor: 1,
      };
      const hospitalData = await common.create(Hospital.model, createHospital);

      const createMaster = {
        hospitalId: hospitalData._id,
        name: establishmentName,
        hospitalTypeId,
        address,
        location,
        isLocationShared,
      };
      const estabMasterData = await common.create(
        EstablishmentMaster.model,
        createMaster
      );
      const createHospitalTiming = {
        establishmentId: estabMasterData._id,
        isOwner: true,
        isVerified: constants.PROFILE_STATUS.APPROVE,
      };
      const createDoctorTiming = {
        establishmentId: estabMasterData._id,
        doctorId: doctorData._id,
        isOwner: true,
        isVerified: constants.PROFILE_STATUS.APPROVE,
      };

      await common.create(EstablishmentTiming.model, createHospitalTiming);
      await common.create(EstablishmentTiming.model, createDoctorTiming);
      return response.success(
        {
          msgCode: "DATA_CREATED",
          data: {},
        },
        res,
        httpStatus.CREATED
      );
    } else if (hospitalId && isOwner == 0) {
      const findEstablishment = await common.getByCondition(
        EstablishmentMaster.model,
        { hospitalId: new ObjectId(hospitalId) }
      );
      if (!findEstablishment)
        return response.error(
          {
            msgCode: "NOT_FOUND",
          },
          res,
          httpStatus.NOT_FOUND
        );
      const createDoctor = {
        userType: constants.USER_TYPES.DOCTOR,
        fullName,
        phone,
      };
      const userData = await common.create(User.model, createDoctor);

      const createDoctorData = {
        userId: userData._id,
        specialization,
        gender,
        medicalRegistration,
        education,
        experience,
      };
      const doctorData = await common.create(Doctor.model, createDoctorData);

      const doctorTiming = {
        doctorId: doctorData._id,
        establishmentId: findEstablishment._id,
      };
      await common.create(EstablishmentTiming.model, doctorTiming);
      return response.success(
        {
          msgCode: "DATA_CREATED",
          data: {},
        },
        res,
        httpStatus.CREATED
      );
    } else if (!hospitalId && isOwner == 0) {
      const createDoctor = {
        userType: constants.USER_TYPES.DOCTOR,
        fullName,
        phone,
      };
      const userData = await common.create(User.model, createDoctor);

      const createDoctorData = {
        userId: userData._id,
        specialization,
        gender,
        medicalRegistration,
        education,
        experience,
      };
      const doctorData = await common.create(Doctor.model, createDoctorData);

      const createHospital = {
        userType: constants.USER_TYPES.HOSPITAL,
        fullName: establishmentName,
        phone: "",
      };
      const dataHospital = await common.create(User.model, createHospital);
      const createHospitalData = {
        userId: dataHospital._id,
        address,
        location,
        isLocationShared,
        hospitalType: new ObjectId(hospitalTypeId),
      };
      const hospitalData = await common.create(
        Hospital.model,
        createHospitalData
      );

      const createMaster = {
        hospitalId: hospitalData._id,
        name: establishmentName,
        hospitalTypeId,
        address,
        location,
        isLocationShared,
      };
      const estabMasterData = await common.create(
        EstablishmentMaster.model,
        createMaster
      );
      const hospitalTimingData = {
        establishmentId: estabMasterData._id,
        isVerified: 2,
        isOwner: true,
      };
      await common.create(EstablishmentTiming.model, hospitalTimingData);
      const doctorHospitalTiming = {
        establishmentId: estabMasterData._id,
        doctorId: doctorData._id,
      };
      await common.create(EstablishmentTiming.model, doctorHospitalTiming);
      return response.success(
        {
          msgCode: "DATA_CREATED",
          data: {},
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

// cognitive complexity
const adminEditDoctor = async (req, res) => {
  try {
    const { userId } = req.data;
    const { doctorId } = req.query;
    const {
      fullName,
      phone,
      specialization,
      gender,
      medicalRegistration,
      education,
      city,
      isOwner,
      experience,
      establishmentName,
      hospitalTypeId,
      address,
      location,
      isLocationShared,
      hospitalId,
    } = req.body;
    const isDoctorOwner = isOwner === 1;
    const userCondition = {
      _id: doctorId,
      isDeleted: false,
    };
    const findDoctor = await common.getByCondition(User.model, userCondition);
    if (!findDoctor) {
      return response.success(
        { msgCode: "USER_NOT_FOUND" },
        res,
        httpStatus.NOT_FOUND
      );
    }
    let findEstablishment;
    if (hospitalId) {
      findEstablishment = await common.getByCondition(
        EstablishmentMaster.model,
        { hospitalId: new ObjectId(hospitalId) }
      );
      if (!findEstablishment)
        return response.error(
          {
            msgCode: "NOT_FOUND",
          },
          res,
          httpStatus.NOT_FOUND
        );
    }

    const doctorCondition = { userId: doctorId };
    const doctorData = await common.getByCondition(
      Doctor.model,
      doctorCondition
    );
    if (!doctorData) {
      return response.success(
        { msgCode: "USER_NOT_FOUND" },
        res,
        httpStatus.NOT_FOUND
      );
    }
    if (phone) {
      const phoneExists = await common.getByCondition(User.model, {
        phone,
        userType: constants.USER_TYPES.DOCTOR,
        _id: { $ne: new ObjectId(doctorId) },
      });
      if (phoneExists)
        return response.error(
          { msgCode: "PHONE_EXISTS" },
          res,
          httpStatus.FORBIDDEN
        );
    }
    const timingCondition = {
      doctorId: new ObjectId(doctorData._id),
      isDeleted: false,
    };
    const timingData = await common.findObject(
      EstablishmentTiming.model,
      timingCondition,
      { createdAt: 1 }
    );
    const updateUser = {
      fullName,
      phone,
    };
    await common.updateByCondition(
      User.model,
      userCondition,
      updateUser,
      constants.USER_TYPES.DOCTOR
    );
    const specializationArray = objectIdFormatter(specialization);
    const updateDoctor = {
      specialization: specializationArray,
      gender,
      medicalRegistration,
      education,
      experience,
      city,
    };
    await common.updateByCondition(
      Doctor.model,
      doctorCondition,
      updateDoctor,
      constants.USER_TYPES.DOCTOR
    );

    await common.updateByCondition(
      Doctor.model,
      doctorCondition,
      {
        isOwnEstablishment: isOwner,
      },
      constants.USER_TYPES.DOCTOR
    );
    if (doctorData.isOwnEstablishment === isDoctorOwner) {
      const hospitalCondition = {
        userId: doctorId,
        _id: new ObjectId(hospitalId),
      };
      const hospitalData = await common.getByCondition(
        Hospital.model,
        hospitalCondition
      );
      if (hospitalData) {
        const updateHospital = {
          address,
          location,
          isLocationShared,
        };
        await common.updateByCondition(
          Hospital.model,
          hospitalCondition,
          updateHospital
        );

        const masterCondition = { hospitalId: hospitalData._id };
        const updateMaster = {
          name: establishmentName,
          hospitalTypeId,
          address,
          location,
          isLocationShared,
        };
        await common.updateByCondition(
          EstablishmentMaster.model,
          masterCondition,
          updateMaster,
          constants.USER_TYPES.HOSPITAL
        );
      }
      if (!hospitalData && !findEstablishment) {
        const newUser = await common.create(User.model, {
          fullName: establishmentName,
          userType: [constants.USER_TYPES.HOSPITAL],
          createdBy: new ObjectId(userId),
          phone: "",
        });
        const newHospital = await common.create(Hospital.model, {
          address,
          hospitalType: new ObjectId(hospitalTypeId),
          userId: newUser._id,
          createdBy: new ObjectId(userId),
          location,
          isLocationShared,
        });
        const newEstablishmentMaster = await common.create(
          EstablishmentMaster.model,
          {
            address,
            hospitalTypeId: new ObjectId(hospitalTypeId),
            hospitalId: newHospital._id,
            createdBy: new ObjectId(userId),
            name: establishmentName,
            location,
            isLocationShared,
          }
        );
        await common.create(EstablishmentTiming.model, {
          establishmentId: newEstablishmentMaster?._id,
          isOwner: true,
          isVerified: constants.PROFILE_STATUS.APPROVE,
          createdBy: new ObjectId(userId),
        });
        const timingCondition = {
          doctorId: new ObjectId(doctorData._id),
          isDeleted: false,
        };
        const timingData = await common.findObject(
          EstablishmentTiming.model,
          timingCondition,
          { createdAt: 1 }
        );
        if (!timingData) {
          await common.create(EstablishmentTiming.model, {
            establishmentId: new ObjectId(newEstablishmentMaster._id),
            isDoctorOwner,
            isVerified: constants.PROFILE_STATUS.PENDING,
            doctorId: new ObjectId(doctorId),
          });
        }
        if (timingData.establishmentId !== findEstablishment?._id) {
          const updateTiming = {
            establishmentId: new ObjectId(newEstablishmentMaster?._id),
            isDoctorOwner,
            isVerified: constants.PROFILE_STATUS.PENDING,
          };
          await common.updateById(
            EstablishmentTiming.model,
            timingData._id,
            updateTiming
          );
        }
      }
      return response.success(
        { msgCode: "DATA_UPDATE", data: {} },
        res,
        httpStatus.OK
      );
    } else if (isDoctorOwner) {
      const updateUser = {
        userType: [constants.USER_TYPES.DOCTOR, constants.USER_TYPES.HOSPITAL],
      };
      await common.updateByCondition(
        User.model,
        userCondition,
        updateUser,
        constants.USER_TYPES.DOCTOR
      );
      await common.removeAllSessionByCondition(Hospital.model, { userId: new ObjectId(doctorId) })
      const newHospital = await common.create(Hospital.model, {
        address,
        hospitalType: new ObjectId(hospitalTypeId),
        userId: new ObjectId(doctorId),
        location,
        isLocationShared,
        createdBy: new ObjectId(userId),
      });
      const newEstablishmentMaster = await common.create(
        EstablishmentMaster.model,
        {
          address,
          hospitalTypeId: new ObjectId(hospitalTypeId),
          hospitalId: new ObjectId(newHospital._id),
          location,
          isLocationShared,
          createdBy: new ObjectId(userId),
          name: establishmentName,
        }
      );
      await common.create(EstablishmentTiming.model, {
        establishmentId: newEstablishmentMaster?._id,
        isOwner: true,
        isVerified: constants.PROFILE_STATUS.APPROVE,
        createdBy: new ObjectId(userId),
      });
      await common.updateById(EstablishmentTiming.model, timingData._id, {
        establishmentId: newEstablishmentMaster?._id,
        isOwner: true,
        doctorId: doctorData._id,
        isVerified: constants.PROFILE_STATUS.APPROVE,
      });
      return response.success(
        { msgCode: "DATA_UPDATE", data: {} },
        res,
        httpStatus.OK
      );
    } else if (findEstablishment) {
      await common.updateByCondition(
        User.model,
        userCondition,
        {
          userType: [constants.USER_TYPES.DOCTOR],
        },
        constants.USER_TYPES.DOCTOR
      );
      await common.updateByCondition(
        Doctor.model,
        doctorCondition,
        {
          isOwnEstablishment: isOwner,
        },
        constants.USER_TYPES.DOCTOR
      );
      await common.updateById(EstablishmentTiming.model, timingData._id, {
        establishmentId: findEstablishment?._id,
        isOwner: false,
        doctorId: doctorData._id,
        isVerified: constants.PROFILE_STATUS.PENDING,
      });
      return response.success(
        { msgCode: "DATA_UPDATE", data: {} },
        res,
        httpStatus.OK
      );
    } else {
      await common.updateByCondition(
        User.model,
        userCondition,
        {
          userType: [constants.USER_TYPES.DOCTOR],
        },
        constants.USER_TYPES.DOCTOR
      );
      const newUser = await common.create(User.model, {
        fullName: establishmentName,
        userType: [constants.USER_TYPES.HOSPITAL],
        createdBy: new ObjectId(userId),
        phone: "",
      });
      const newHospital = await common.create(Hospital.model, {
        address,
        hospitalType: new ObjectId(hospitalTypeId),
        userId: newUser._id,
        createdBy: new ObjectId(userId),
        location,
        isLocationShared,
      });
      const newEstablishmentMaster = await common.create(
        EstablishmentMaster.model,
        {
          address,
          hospitalTypeId: new ObjectId(hospitalTypeId),
          hospitalId: newHospital._id,
          createdBy: new ObjectId(userId),
          name: establishmentName,
          location,
          isLocationShared,
        }
      );
      await common.create(EstablishmentTiming.model, {
        establishmentId: newEstablishmentMaster?._id,
        isOwner: true,
        isVerified: constants.PROFILE_STATUS.APPROVE,
        createdBy: new ObjectId(userId),
      });
      await common.updateById(EstablishmentTiming.model, timingData._id, {
        establishmentId: newEstablishmentMaster?._id,
        isOwner: false,
        doctorId: doctorData._id,
        isVerified: constants.PROFILE_STATUS.PENDING,
      });
      return response.success(
        { msgCode: "DATA_UPDATE", data: {} },
        res,
        httpStatus.OK
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

const adminActiveInactiveDoctor = async (req, res) => {
  try {
    const { doctorId } = req.query;
    const { isVerified } = req.body;
    const condition = { _id: doctorId };
    const findDoctor = await common.getByCondition(User.model, condition);
    if (!findDoctor) {
      return response.success(
        { msgCode: "USER_NOT_FOUND" },
        res,
        httpStatus.NOT_FOUND
      );
    }
    const doctorCondition = { userId: doctorId };
    const doctorSchema = await common.getByCondition(
      Doctor.model,
      doctorCondition
    );
    const dataToUpdate = {
      status: isVerified,
    };
    const appointmentCondition = {
      doctorId: doctorSchema._id,
      status: constants.BOOKING_STATUS.BOOKED,
    };
    const cancelAppointment = {
      status: constants.BOOKING_STATUS.CANCEL,
    };
    //find Doctor exists in hospital from EstablishmentTiming
    const doctorHospital = {
      doctorId: doctorSchema._id,
      isDeleted: false,
      isVerified: constants.PROFILE_STATUS.APPROVE,
    };
    const doctorDataInHospital = await EstablishmentTiming.model
      .find(doctorHospital)
      .distinct("establishmentId");
    // Hospital Id From Mater
    const masterId = {
      _id: { $in: doctorDataInHospital },
    };
    const hospitalId = await EstablishmentMaster.model
      .find(masterId)
      .distinct("hospitalId");
    if (isVerified === constants.PROFILE_STATUS.DEACTIVATE) {
      await common.updateManyByCondition(
        Appointment.model,
        appointmentCondition,
        cancelAppointment
      );
      await Hospital.model.updateMany(
        { _id: { $in: hospitalId } },
        { $inc: { totalDoctor: -1 } }
      );
    }
    if (isVerified === constants.PROFILE_STATUS.APPROVE) {
      await Hospital.model.updateMany(
        { _id: { $in: hospitalId } },
        { $inc: { totalDoctor: 1 } }
      );
    }
    await common.updateByCondition(
      User.model,
      condition,
      dataToUpdate,
      constants.USER_TYPES.DOCTOR
    );
    return response.success(
      { msgCode: "DOCTOR_STATUS_UPDATED", data: {} },
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
      $or: [
        {
          isVerified: constants.PROFILE_STATUS.PENDING,
          steps: { $ne: constants.PROFILE_STEPS.COMPLETED },
        },
        {
          isVerified: {
            $in: [
              constants.PROFILE_STATUS.APPROVE,
              constants.PROFILE_STATUS.REJECT,
            ],
          },
        },
      ],
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
    const doctorQuery = {
      "doctorDetails.isDeleted": false,
    };
    const sortCondition = { sortBy, order };
    const data = await doctor.adminDoctorList(
      condition,
      doctorQuery,
      limit,
      offset,
      sortCondition,
      search,
      isExport
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

const adminDoctorApprovalList = async (req, res) => {
  try {
    const { search, page, size, sortBy, order } = req.query;
    const { limit, offset } = getPagination(page, size);
    const condition = {
      isVerified: constants.PROFILE_STATUS.PENDING,
      steps: constants.PROFILE_STEPS.COMPLETED,
    };
    const doctorQuery = {
      "doctorDetails.isDeleted": false,
      "doctorDetails.status": constants.PROFILE_STATUS.ACTIVE,
    };
    const data = await doctor.doctorListForApprove(
      condition,
      doctorQuery,
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

// cognitive complexity
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
      dataToupdate,
      constants.USER_TYPES.DOCTOR
    );
    if (!updateData) {
      return response.error(
        { msgCode: "UPDATE_ERROR" },
        res,
        httpStatus.NOT_ACCEPTABLE
      );
    }
    if (isVerified === constants.PROFILE_STATUS.APPROVE) {
      const timing = await common.getByCondition(EstablishmentTiming.model, {
        doctorId: new ObjectId(findDoctor._id),
      });
      if (!timing) return false;
      const doctorData = await common.getSendMailDoctor(timing.doctorId);
      const establishmentData = await common.getSendMailEstablishment(
        timing.establishmentId
      );
      const superadminArray = await adminService.superAdminList();
      await common.create(Notification.model, {
        userType: constants.USER_TYPES.HOSPITAL,
        eventType: constants.NOTIFICATION_TYPE.DOCTOR_VISIT_ESTABLISHMENT,
        senderId: superadminArray,
        receiverId: new ObjectId(establishmentData.hospital.userId),
        title:
          constants.MESSAGES.DOCTOR_VISIT_ESTABLISHMENT.TITLE.HOSPITAL.replace(
            /\[doctorName\]/g,
            doctorData.user.fullName
          ),
        body: constants.MESSAGES.DOCTOR_VISIT_ESTABLISHMENT.BODY,
      });
      if (environment) {
        const userData = await common.getById(User.model, userId);
        const loginLink = constants.SCREEN.DOCTOR_LOGIN;
        await sendSms.sendOtp(
          userData.phone,
          userData.countryCode,
          {
            name: userData?.fullName.substring(0, 30),
            loginLink,
          },
          constants.SMS_TEMPLATES.DOCTOR_ACCEPT
        );
        const mailParameters = { doctorName: doctorData.user.fullName };
        const htmlFile = constants.VIEWS.DOCTOR_APPROVED;
        await sendEmail.sendEmailPostAPI(
          doctorData.email,
          constants.EMAIL_TEMPLATES.DOCTOR_PROFILE_APPROVED,
          htmlFile,
          mailParameters
        );
      }
    } else if (isVerified === constants.PROFILE_STATUS.REJECT) {
      if (environment) {
        const user = await common.getById(User.model, userId);
        const mailParameters = { doctorName: user.fullName };
        const htmlFile = constants.VIEWS.DOCTOR_REJECTED;
        await sendEmail.sendEmailPostAPI(
          findDoctor.email,
          constants.EMAIL_TEMPLATES.DOCTOR_PROFILE_REJECTED,
          htmlFile,
          mailParameters
        );
      }
    }
    return response.success(
      { msgCode: "DOCTOR_STATUS_UPDATED" },
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

const updatesUser = (basicDetails) => {
  if (!basicDetails) return null;
  const { fullName } = basicDetails;
  if (fullName) return { fullName };
  else return null;
};

const updatesDoctor = (basicDetails, medicalRegistration, education) => {
  const result = {};
  if (basicDetails) {
    const { gender, specialization, city, email } = basicDetails;
    result.gender = gender;
    result.specialization = new ObjectId(specialization);
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

// cognitive complexity
const updatesEstablishmentMaster = async (
  establishmentDetails,
  parentDoctor,
  parentId
) => {
  try {
    const result = {};
    if (!establishmentDetails?.name) return false;
    const { name, isOwner, hospitalTypeId, hospitalId } = establishmentDetails;
    if (!hospitalId) {
      if (isOwner) {
        let establishmentHospital;
        await common.updateByCondition(
          User.model,
          { _id: new ObjectId(parentId) },
          {
            userType: [
              constants.USER_TYPES.DOCTOR,
              constants.USER_TYPES.HOSPITAL,
            ],
          }
        );
        await common.removeAllSessionByCondition(Hospital.model, { userId: new ObjectId(parentId) })
        await common.updateByCondition(
          Doctor.model,
          { userId: new ObjectId(parentId) },
          { isOwnEstablishment: true },
          constants.USER_TYPES.DOCTOR
        );
        establishmentHospital = await common.create(Hospital.model, {
          userId: new ObjectId(parentId),
          hospitalType: new ObjectId(hospitalTypeId),
          steps: constants.PROFILE_STEPS.SECTION_B,
          profileScreen: constants.HOSPITAL_SCREENS.ESTABLISHMENT_PROOF,
        });
        const establishmentMaster = await common.create(
          EstablishmentMaster.model,
          {
            hospitalId: new ObjectId(establishmentHospital?._id),
            name,
            hospitalTypeId: new ObjectId(hospitalTypeId),
          }
        );
        await common.create(EstablishmentTiming.model, {
          establishmentId: establishmentMaster._id,
          isOwner: true,
          isVerified: constants.PROFILE_STATUS.APPROVE,
        });

        result.establishmentId = establishmentMaster._id;
      } else {
        if (parentDoctor.isOwnEstablishment) {
          await common.removeById(
            EstablishmentMaster.model,
            parentDoctor.establishmentMasterId
          );
          await common.removeById(Hospital.model, parentDoctor.hospitalId);
          await common.updateById(User.model, parentId, {
            userType: [constants.USER_TYPES.DOCTOR],
          });
        }
        const hospitalUser = await common.create(User.model, {
          fullName: name,
          userType: constants.USER_TYPES.HOSPITAL,
          createdBy: new ObjectId(parentId),
        });
        const createHospital = await common.create(Hospital.model, {
          userId: new ObjectId(hospitalUser._id),
          hospitalType: new ObjectId(hospitalTypeId),
          createdBy: new ObjectId(parentId),
        });
        const createEstablishment = await common.create(
          EstablishmentMaster.model,
          {
            hospitalId: new ObjectId(createHospital?._id),
            name,
            hospitalTypeId,
            createdBy: new ObjectId(parentId),
          }
        );
        await common.create(EstablishmentTiming.model, {
          establishmentId: createEstablishment._id,
          isOwner: true,
          isVerified: constants.PROFILE_STATUS.APPROVE,
          createdBy: new ObjectId(parentId),
        });
        result.establishmentId = createEstablishment._id;
      }
    } else if (isOwner) {
      const hospitalData = await common.getByCondition(Hospital.model, {
        _id: new ObjectId(hospitalId),
        // userId: new ObjectId(parentId),
        steps: { $ne: constants.PROFILE_STEPS.COMPLETED },
        isVerified: { $ne: constants.PROFILE_STATUS.APPROVE },
      });
      if (hospitalData) {
        await common.updateById(Hospital.model, hospitalId, {
          hospitalType: new ObjectId(
            hospitalTypeId || hospitalData.hospitalType
          ),
        });
        const establishmentMasterData = await common.getByCondition(
          EstablishmentMaster.model,
          {
            hospitalId: new ObjectId(hospitalData._id),
          }
        );
        await common.updateById(
          EstablishmentMaster.model,
          establishmentMasterData._id,
          {
            name,
            hospitalTypeId: new ObjectId(
              hospitalTypeId || hospitalData.hospitalType
            ),
          }
        );
      }
    } else {
      if (parentDoctor.isOwnEstablishment) {
        await common.removeById(
          EstablishmentMaster.model,
          parentDoctor.establishmentMasterId
        );
        await common.removeById(Hospital.model, parentDoctor.hospitalId);
        await common.updateById(User.model, parentId, {
          userType: [constants.USER_TYPES.DOCTOR],
        });
      }
      const hospitalData = await common.getByCondition(Hospital.model, {
        _id: new ObjectId(hospitalId),
      });
      const establishmentData = await common.getByCondition(
        EstablishmentMaster.model,
        { hospitalId: new ObjectId(hospitalData._id) }
      );
      if (!hospitalData || !establishmentData) return null;
      await common.updateByCondition(
        Hospital.model,
        { _id: new ObjectId(hospitalId) },
        {
          hospitalType: new ObjectId(
            hospitalTypeId || hospitalData?.hospitalType
          ),
        }
      );
      await common.updateByCondition(
        EstablishmentMaster.model,
        { hospitalId: new ObjectId(hospitalId) },
        {
          name,
          hospitalTypeId: new ObjectId(
            hospitalTypeId || establishmentData?.hospitalTypeId
          ),
        },
        constants.USER_TYPES.HOSPITAL
      );

      await common.updateByCondition(
        Doctor.model,
        { userId: new ObjectId(parentId) },
        { isOwnEstablishment: false },
        constants.USER_TYPES.DOCTOR
      );
      result.establishmentId = establishmentData._id;
    }
    result.doctorId = parentDoctor.doctorId;
    result.isOwner = isOwner;
    result.isVerified = isOwner
      ? constants.PROFILE_STATUS.APPROVE
      : constants.PROFILE_STATUS.PENDING;
    return result;
  } catch (error) {
    console.log(error);
    return false;
  }
};

// cognitive complexity
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
    if (!findDoctor[0]?._id) {
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
          return response.success(
            { msgCode: "DOCTOR_LOGOUT" },
            res,
            httpStatus.OK
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
          findDoctor[0],
          userId
        );
        if (!isEdit) {
          if (!isSaveAndExit)
            updates.doctor.steps = constants.PROFILE_STEPS.SECTION_B;
        }
        if (!findDoctor[0].establishmentMasterTimingId) {
          updates.establishmentMaster.createdBy = new ObjectId(userId);
          await common.create(
            EstablishmentTiming.model,
            updates.establishmentMaster
          );
        }
        if (updates.user)
          await common.updateByCondition(
            User.model,
            condition,
            updates.user,
            constants.USER_TYPES.DOCTOR
          );
        if (updates.doctor)
          await common.updateByCondition(
            Doctor.model,
            { userId: new ObjectId(userId) },
            updates.doctor,
            constants.USER_TYPES.DOCTOR
          );
        if (findDoctor[0].establishmentMasterTimingId)
          await common.updateByCondition(
            EstablishmentTiming.model,
            { _id: new ObjectId(findDoctor[0].establishmentMasterTimingId) },
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
            doctor,
            constants.USER_TYPES.DOCTOR
          );
        if (establishmentDetail) {
          if (findDoctor[0].isOwnEstablishment) {
            const updateHospital = {
              ...establishmentDetail,
            };
            if (!isEdit) {
              updateHospital.steps = constants.PROFILE_STEPS.SECTION_C;
              updateHospital.profileScreen =
                constants.HOSPITAL_SCREENS.ESTABLISHMENT_LOCATION;
            }
            await common.updateByCondition(
              Hospital.model,
              { userId: new ObjectId(userId) },
              updateHospital
            );
            await common.updateByCondition(
              EstablishmentMaster.model,
              { _id: new ObjectId(findDoctor[0].establishmentMasterId) },
              establishmentDetail,
              constants.USER_TYPES.HOSPITAL
            );
          }
          await common.updateByCondition(
            EstablishmentTiming.model,
            { _id: new ObjectId(findDoctor[0].establishmentMasterTimingId) },
            establishmentDetail
          );
        }
        break;

      case constants.PROFILE_STEPS.SECTION_C:
        const {
          address,
          establishmentTiming,
          consultationFees,
          location,
          isLocationShared,
        } = records;
        if (
          !isEdit &&
          !address &&
          !establishmentTiming &&
          !consultationFees &&
          !location
        )
          return response.error(
            { msgCode: "BAD_REQUEST" },
            res,
            httpStatus.BAD_REQUEST
          );
        let establishmentTimingData = {};
        if (establishmentTiming)
          establishmentTimingData = { ...establishmentTiming };
        if (!isEdit) {
          if (!isSaveAndExit) {
            await common.updateByCondition(
              Doctor.model,
              { _id: new ObjectId(findDoctor[0]?.doctorId) },
              {
                steps: constants.PROFILE_STEPS.COMPLETED,
              },
              constants.USER_TYPES.DOCTOR
            );
            if (
              steps === constants.PROFILE_STEPS.SECTION_C &&
              findDoctor[0].steps !== constants.PROFILE_STEPS.COMPLETED
            ) {
              const superadminArray = await adminService.superAdminList();
              await common.create(Notification.model, {
                userType: constants.USER_TYPES.ADMIN,
                eventType: constants.NOTIFICATION_TYPE.DOCTOR_SIGN_UP_PROOFS,
                senderId: new ObjectId(userId),
                receiverId: superadminArray,
                title: constants.MESSAGES.DOCTOR_SIGN_UP_PROOFS.TITLE,
                body: constants.MESSAGES.DOCTOR_SIGN_UP_PROOFS.BODY,
              });
              if (environment) {
                const userData = await common.getById(User.model, userId);
                await sendSms.sendOtp(
                  userData.phone,
                  userData.countryCode,
                  {
                    name: userData.fullName.substring(0, 30),
                  },
                  constants.SMS_TEMPLATES.DOCTOR_REGISTRATION
                );
                const mailParameters = { doctorName: userData.fullName };
                const htmlFile =
                  constants.VIEWS.DOCTOR_PROFILE_UNDER_VERIFICATION;
                await sendEmail.sendEmailPostAPI(
                  findDoctor[0]?.sectionA?.basicDetails?.email,
                  constants.EMAIL_TEMPLATES.DOCTOR_PROFILE_UNDER_VERIFICATION,
                  htmlFile,
                  mailParameters
                );
              }
            }
          }
        }
        if (location && findDoctor[0].isOwnEstablishment) {
          await common.updateByCondition(
            EstablishmentMaster.model,
            {
              _id: new ObjectId(findDoctor[0].establishmentMasterId),
            },
            { location, isLocationShared },
            constants.USER_TYPES.HOSPITAL
          );
          await common.updateByCondition(
            Hospital.model,
            {
              _id: new ObjectId(findDoctor[0].hospitalId),
              isVerified: constants.PROFILE_STATUS.PENDING,
            },
            { location, isLocationShared }
          );
        }

        if (address) {
          const hospitalData = await common.getByCondition(Hospital.model, {
            _id: new ObjectId(findDoctor[0].hospitalId),
            isVerified: constants.PROFILE_STATUS.PENDING,
            userId: new ObjectId(userId),
          });
          if (hospitalData) {
            const updateHospital = {
              address,
            };

            if (!isEdit) {
              updateHospital.steps = constants.PROFILE_STEPS.SECTION_C;
              updateHospital.profileScreen =
                constants.HOSPITAL_SCREENS.ESTABLISHMENT_TIMING;
            }
            await common.updateByCondition(
              Hospital.model,
              {
                _id: new ObjectId(findDoctor[0].hospitalId),
                isVerified: constants.PROFILE_STATUS.PENDING,
                userId: new ObjectId(userId),
              },
              updateHospital
            );
            await common.updateByCondition(
              EstablishmentMaster.model,
              {
                hospitalId: new ObjectId(hospitalData._id),
              },
              { address },
              constants.USER_TYPES.HOSPITAL
            );
            if (establishmentTiming) {
              const establishmentTiming = await common.getByCondition(
                EstablishmentTiming.model,
                {
                  establishmentId: findDoctor[0].establishmentMasterId,
                  doctorId: { $exists: false },
                  isDeleted: false,
                }
              );
              await common.updateById(
                EstablishmentTiming.model,
                establishmentTiming._id,
                { ...establishmentTimingData }
              );
              await common.updateByCondition(
                Hospital.model,
                {
                  _id: new ObjectId(findDoctor[0].hospitalId),
                  isVerified: constants.PROFILE_STATUS.PENDING,
                  userId: new ObjectId(userId),
                },
                {
                  steps: constants.PROFILE_STEPS.COMPLETED,
                  profileScreen: constants.HOSPITAL_SCREENS.COMPLETED,
                }
              );
            }
          }
        }
        if (findDoctor[0].establishmentMasterTimingId)
          await common.updateByCondition(
            EstablishmentTiming.model,
            { _id: new ObjectId(findDoctor[0].establishmentMasterTimingId) },
            { ...establishmentTimingData, consultationFees }
          );

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
        { profileScreen },
        constants.USER_TYPES.DOCTOR
      );
    return response.success(
      { msgCode: "DOCTOR_UPDATED", data: {} },
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

const doctorCancelAppointment = async (req, res) => {
  try {
    const { userId } = req.data;
    const { appointmentId, reason } = req.body;
    const condition = {
      _id: appointmentId,
      status: constants.BOOKING_STATUS.BOOKED,
      isDeleted: false,
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
    const doctorData = await common.getSendMailDoctor(findAppointment.doctorId);
    const establishmentData = await common.getSendMailEstablishment(
      findAppointment.establishmentId
    );
    const [ISTDate, ISTTime, timeZone] = momentTZ
      .utc(findAppointment.date)
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
    const hospitalProfilePic =
      establishmentData.hospital.profilePic ||
      constants.MAIL_IMAGES.NECTAR_LOGO;
    const doctorProfilePic =
      doctorData.profilePic || constants.MAIL_IMAGES.NECTAR_LOGO;
    if (environment) {
      const findPatient = await doctor.getPatientDetails(
        findAppointment.patientId
      );
      const date = new Date(new Date(findAppointment.date)).toLocaleString(
        "en-IN"
      );
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
    if (environment) {
      const findPatient = await doctor.getPatientDetails(
        findAppointment.patientId
      );
      const loginLink = constants.SCREEN.PATIENT_LOGIN;
      await sendSms.sendOtp(
        findPatient.user.phone,
        findPatient.user.countryCode,
        {
          loginLink,
        },
        constants.SMS_TEMPLATES.PATIENT_REVIEW
      );
    }
    return response.success(
      { msgCode: "APPOINTMENT_COMPLETED", data: update },
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

// cognitive complexity
const doctorEditAppointment = async (req, res) => {
  try {
    const { userId } = req.data;
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
    const doctorData = await common.getSendMailDoctor(findAppointment.doctorId);
    const establishmentData = await common.getSendMailEstablishment(
      findAppointment.establishmentId
    );
    const [ISTDate, ISTTime, timeZone] = momentTZ
      .utc(update.date)
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
      constants.MESSAGES.APPOINTMENT_CANCELLATION.TITLE.DOCTOR.replace(
        /\[date\]/g,
        ISTDate
      )
        .replace(/\[slotTime\]/g, ISTTime)
        .replace(/\[timeZone\]/g, timeZone);

    await common.create(Notification.model, {
      userType: constants.USER_TYPES.HOSPITAL,
      eventType: constants.NOTIFICATION_TYPE.APPOINTMENT_RESCHEDULE,
      senderId: new ObjectId(userId),
      receiverId: new ObjectId(establishmentData.hospital.userId),
      title: titleHospital,
      body: constants.MESSAGES.APPOINTMENT_RESCHEDULE.BODY.HOSPITAL,
    });
    await common.create(Notification.model, {
      userType: constants.USER_TYPES.DOCTOR,
      eventType: constants.NOTIFICATION_TYPE.APPOINTMENT_RESCHEDULE,
      senderId: new ObjectId(userId),
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
        findAppointment.patientId
      );
      const loginLink = constants.SCREEN.PATIENT_LOGIN;
      const dateTime = new Date(new Date(update.date)).toLocaleString("en-IN");
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
            appointmentId +
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
      { msgCode: "APPOINTMENT_RESCHEDULE", data: update },
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

const getCalender = async (req, res) => {
  try {
    const decode = req.data;
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
      const start = startOfDay.toISOString();
      const end = endOfDay.toISOString();
      condition1.date = { $gte: new Date(start), $lte: new Date(end) };
    }

    if (startDate && endDate) {
      const startOfDay = new Date(startDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(endDate);
      endOfDay.setHours(23, 59, 59, 999);
      const start = startOfDay.toISOString();
      const end = endOfDay.toISOString();
      condition1.date = {
        $gte: new Date(start),
        $lte: new Date(end),
      };
    }
    const hospitalQuery = {
      "userData.isDeleted": false,
      "userData.status": constants.PROFILE_STATUS.ACTIVE,
    };
    const findData = await doctor.calenderList(
      matchCondition,
      condition1,
      hospitalQuery
    );
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
    console.log(error);
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
      isVerified: constants.PROFILE_STATUS.APPROVE,
    };
    const { limit, offset } = getPagination(page, size);
    const findEstablishment = await doctor.establishmentList(
      condition,
      limit,
      offset
    );
    return response.success(
      { msgCode: "FETCHED", data: findEstablishment },
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
      isLocationShared,
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
      hospitalId: new Types.ObjectId(hospitalId),
    };
    const findEstablishment = await common.getByCondition(
      EstablishmentMaster.model,
      estabMster
    );
    // find Doctor using Decoded Id..
    const doctorId = {
      userId: new Types.ObjectId(decode.userId),
    };
    const findDoctor = await common.getByCondition(Doctor.model, doctorId);
    const condition = {
      _id: new Types.ObjectId(decode.userId),
    };
    if (isOwner === 1) {
      const checkUser = await common.getByCondition(User.model, condition);
      if (checkUser.userType.includes(constants.USER_TYPES.HOSPITAL)) {
        return response.error(
          { msgCode: "ALREADY_ADDED_HOSPITAL" },
          res,
          httpStatus.CONFLICT
        );
      }

      const userTableData = {
        userType: [constants.USER_TYPES.DOCTOR, constants.USER_TYPES.HOSPITAL],
      };
      const addUserType = await common.updateByCondition(
        User.model,
        condition,
        userTableData
      );
      if (!addUserType) {
        return response.error(
          { msgCode: "FAILED_TO_ADD" },
          res,
          httpStatus.FORBIDDEN
        );
      }

      const dataHospital = {
        userId: new Types.ObjectId(decode.userId),
        profilePic,
        address,
        location,
        isLocationShared,
        hospitalType: hospitalTypeId,
        totalDoctor: 1,
      };
      const hospitalData = await common.create(Hospital.model, dataHospital);
      const estabMasterData = {
        hospitalId: hospitalData._id,
        // doctorId: findDoctor._id,
        name,
        hospitalTypeId,
        address,
        location,
        isLocationShared,
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
        createdBy: decode.userId,
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
      const checkCondition = {
        doctorId: findDoctor._id,
        establishmentId: findEstablishment._id,
        isDeleted: false,
      };
      const checkHospital = await common.getByCondition(
        EstablishmentTiming.model,
        checkCondition
      );
      if (checkHospital) {
        return response.error(
          { msgCode: "HOSPITAL_EXISTS" },
          res,
          httpStatus.CONFLICT
        );
      }
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
        sun,
        createdBy: decode.userId,
      };
      const establishmentVisitData = await common.create(
        EstablishmentTiming.model,
        visitData
      );
      return response.success(
        {
          msgCode: "DATA_CREATED",
          data: {
            establishmentVisitData,
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
        isLocationShared,
      };
      const hospitalData = await common.create(Hospital.model, dataHospital);
      const estabMasterData = {
        hospitalId: hospitalData._id,
        name,
        hospitalTypeId,
        address,
        location,
        isLocationShared,
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
        createdBy: decode.userId,
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

const getDayObject = (mon, tue, wed, thu, fri, sat, sun) => {
  return {
    mon: mon || [],
    tue: tue || [],
    wed: wed || [],
    thu: thu || [],
    fri: fri || [],
    sat: sat || [],
    sun: sun || [],
  };
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
      isLocationShared,
      establishmentEmail,
      mon,
      tue,
      wed,
      thu,
      fri,
      sat,
      sun,
      isActive,
    } = req.body;
    const daysObject = getDayObject(mon, tue, wed, thu, fri, sat, sun);
    const { establishmentId } = req.query;
    const condition = {
      userId: new Types.ObjectId(decode.userId),
    };
    const findDoctor = await common.getByCondition(Doctor.model, condition);
    const condition1 = {
      doctorId: findDoctor._id,
      establishmentId,
    };
    const findEstbTiming = await common.getByCondition(
      EstablishmentTiming.model,
      condition1
    );
    if (findEstbTiming.isOwner === true) {
      const dataToupdateHospital = {
        profilePic,
        address,
        location,
        isLocationShared,
      };
      await common.updateByCondition(
        Hospital.model,
        condition,
        dataToupdateHospital
      );

      const estabMasterCondition = {
        _id: findEstbTiming.establishmentId,
      };
      const dataToupdateEstabMaster = {
        name,
        hospitalTypeId,
        address,
        location,
        isLocationShared,
        establishmentEmail,
      };
      await common.updateByCondition(
        EstablishmentMaster.model,
        estabMasterCondition,
        dataToupdateEstabMaster,
        constants.USER_TYPES.HOSPITAL
      );
      const estabTimingCondition = {
        doctorId: findDoctor._id,
        establishmentId: establishmentId,
      };
      const dataToupdateTime = {
        consultationFees,
        isActive,
        ...daysObject,
      };
      await common.updateByCondition(
        EstablishmentTiming.model,
        estabTimingCondition,
        dataToupdateTime
      );

      return response.success({ msgCode: "DATA_UPDATE" }, res, httpStatus.OK);
    } else {
      const estabTimingCondition = {
        doctorId: findDoctor._id,
        establishmentId: establishmentId,
        isDeleted: false,
      };
      const dataToupdateTime = {
        consultationFees,
        isActive,
        ...daysObject,
      };
      await common.updateByCondition(
        EstablishmentTiming.model,
        estabTimingCondition,
        dataToupdateTime
      );
      return response.success({ msgCode: "DATA_UPDATE" }, res, httpStatus.OK);
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

const establishmentDataDetails = async (req, res) => {
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
    console.log(error);
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
      createdBy: { $ne: new Types.ObjectId(decode.userId) },
    };
    const { limit, offset } = getPagination(page, size);
    const findEstablishment = await doctor.establishmentRequest(
      condition,
      limit,
      offset,
      sortBy,
      order
    );
    return response.success(
      { msgCode: "FETCHED", data: findEstablishment },
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
      isDeleted: false,
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
    const masterData = {
      _id: establishmentId,
    };
    const masterSchema = await common.getByCondition(
      EstablishmentMaster.model,
      masterData
    );
    const hospitalData = {
      _id: masterSchema.hospitalId,
    };
    const hospitalSchema = await common.getByCondition(
      Hospital.model,
      hospitalData
    );
    const increaseDoctor = {
      totalDoctor: hospitalSchema.totalDoctor + 1,
    };
    if (isVerified == 2) {
      await common.updateByCondition(
        Hospital.model,
        hospitalData,
        increaseDoctor
      );
    }
    await common.updateByCondition(
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

const doctorAppointmentDashboard = async (req, res) => {
  try {
    const { userId } = req.data;

    const condition = {
      userId: new Types.ObjectId(userId),
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
    const currentTime = new Date();
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    const todayCompleteCondition = {
      doctorId: new Types.ObjectId(findDoctor._id),
      isDeleted: false,
      status: constants.BOOKING_STATUS.COMPLETE,
      date: { $gte: startOfDay, $lte: endOfDay },
    };
    const completeCount = await common.count(
      Appointment.model,
      todayCompleteCondition
    );

    const todayPendingCondition = {
      doctorId: new Types.ObjectId(findDoctor._id),
      isDeleted: false,
      status: constants.BOOKING_STATUS.BOOKED,
      date: { $gte: startOfDay, $lte: endOfDay },
    };
    const pendingCount = await common.count(
      Appointment.model,
      todayPendingCondition
    );

    const todayTotalCountCondition = {
      doctorId: new Types.ObjectId(findDoctor._id),
      isDeleted: false,
      status: { $ne: constants.BOOKING_STATUS.RESCHEDULE },
      date: { $gte: startOfDay, $lte: endOfDay },
    };
    const todayTotalCount = await common.count(
      Appointment.model,
      todayTotalCountCondition
    );

    const upcomingCountCondition = {
      doctorId: new Types.ObjectId(findDoctor._id),
      isDeleted: false,
      status: constants.BOOKING_STATUS.BOOKED,
      date: { $gte: currentTime },
    };
    const totalData = await common.count(
      Appointment.model,
      upcomingCountCondition
    );
    const data = {
      todayData: completeCount,
      pendingData: pendingCount,
      todayTotalCount,
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
    const { upcoming, status, fromDate, toDate, page, size, search, isExport } =
      req.query;
    const { limit, offset } = getPagination(page, size);
    if (upcoming == "false") {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);
      condition.date = { $gte: startOfDay, $lte: endOfDay };
    } else if (fromDate && toDate) {
      const startOfDay = new Date(fromDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(toDate);
      endOfDay.setHours(23, 59, 59, 999);
      condition.date = { $gte: startOfDay, $lte: endOfDay };
    } else {
      const currentTime = new Date();
      condition.date = { $gt: currentTime };
      condition.status = constants.BOOKING_STATUS.BOOKED;
    }
    if (status || status === 0) condition.status = status;
    const findData = await doctor.appointmentList(
      condition,
      limit,
      offset,
      search,
      isExport
    );
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
    console.log(error);
    return response.error(
      { msgCode: "INTERNAL_SERVER_ERROR" },
      res,
      httpStatus.INTERNAL_SERVER_ERROR
    );
  }
};

const getAllDoctorByCity = async (req, res) => {
  try {
    const cityList = ["Delhi", "Noida", "Gurugram", "Faridabad", "Ghaziabad"];
    const dataList = [
      {
        _id: "Delhi",
        specializations: [{ name: "Doctors", totalCount: 0 }],
        totalCount: 0,
      },
      {
        _id: "Noida",
        specializations: [{ name: "Doctors", totalCount: 0 }],
        totalCount: 0,
      },
      {
        _id: "Gurugram",
        specializations: [{ name: "Doctors", totalCount: 0 }],
        totalCount: 0,
      },
      {
        _id: "Faridabad",
        specializations: [{ name: "Doctors", totalCount: 0 }],
        totalCount: 0,
      },
      {
        _id: "Ghaziabad",
        specializations: [{ name: "Doctors", totalCount: 0 }],
        totalCount: 0,
      },
    ];
    const data = await doctor.findAllDoctorByCity(cityList);
    const result = dataList.map((dataItem) => ({
      ...dataItem,
      specializations: [
        ...dataItem.specializations,
        ...(data.find((resItem) => resItem._id === dataItem._id)
          ?.specializations || []),
      ],
      totalCount:
        dataItem.totalCount +
        (data.find((resItem) => resItem._id === dataItem._id)?.totalCount || 0),
    }));

    return response.success(
      { msgCode: "DOCTOR_LIST", data: result },
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

const doctorAboutUs = async (req, res) => {
  try {
    const { doctorId, doctorProfileSlug } = req.query;
    const condition = {};
    if (doctorId) condition._id = new Types.ObjectId(doctorId);
    if (doctorProfileSlug) condition.profileSlug = doctorProfileSlug;
    const data = await doctor.doctorAboutUs(condition);
    return response.success(
      {
        msgCode: !data ? "NO_RECORD_FOUND" : "DOCTOR_ABOUT_US",
        data: data || {},
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

const doctorReviews = async (req, res) => {
  try {
    const { id } = req.params;
    const { page, size, sort, search, doctorProfileSlug } = req.query;
    const { limit, offset } = getPagination(page, size);
    const searchQuery = search || "";
    let doctorId = id;
    if (doctorProfileSlug)
      doctorId = await common.getByCondition(Doctor.model, {
        profileSlug: doctorProfileSlug,
      });
    const data = await appointmentService.doctorReviews(
      doctorId,
      limit,
      offset,
      sort || "-1",
      searchQuery
    );
    let waitTimePoints = data.data[0]?.waitTime || 0;
    let waitTime;
    if (waitTimePoints > 0.75) waitTime = 5;
    else if (waitTimePoints > 0.5) waitTime = 4;
    else if (waitTimePoints > 0.25) waitTime = 3;
    else waitTime = 2;
    return response.success(
      {
        msgCode: "DOCTOR_REVIEWS_LIST",
        data: {
          data,
          averageWaitTime: data.count > 0 ? waitTime : 0,
          averagePoints: data.data[0]?.rating,
          valueForMoney: data.data[0]?.rating,
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

const doctorSpeciality = async (req, res) => {
  try {
    const { id } = req.params;
    // const condition = {};
    // if (doctorId) condition._id = new Types.ObjectId(doctorId);
    // if (doctorProfileSlug) condition.profileSlug = doctorProfileSlug;
    const data = await common.getById(Doctor.model, id);
    return response.success(
      { msgCode: "DOCTOR_SPECIALITY_LIST", data: data.service },
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

const deleteDocProfile = async (req, res) => {
  try {
    const { userId } = req.data;
    const deleteData = {
      isDeleted: true,
    };
    const data = await common.updateById(User.model, userId, deleteData);
    const doctorDetails = await common.getByCondition(Doctor.model, {
      userId: data._id,
    });
    await common.updateById(Doctor.model, doctorDetails._id, deleteData);
    const appointmentCondition = {
      doctorId: doctorDetails._id,
      isDeleted: false,
      status: constants.BOOKING_STATUS.BOOKED,
      date: { $gte: new Date() },
    };
    const patientList = await appointmentService.doctorAppointmentList(
      appointmentCondition
    );
    await common.updateManyByCondition(
      Appointment.model,
      appointmentCondition,
      {
        isDeleted: true,
        status: constants.BOOKING_STATUS.CANCEL,
      }
    );
    await common.updateManyByCondition(
      AppointmentFeedback.model,
      { doctorId: doctorDetails._id },
      deleteData
    );
    await common.updateManyByCondition(
      MedicalReport.model,
      { doctorId: doctorDetails._id },
      deleteData
    );
    await common.updateManyByCondition(
      EstablishmentTiming.model,
      { doctorId: doctorDetails._id },
      deleteData
    );
    const superadminArray = await adminService.superAdminList();
    await common.create(Notification.model, {
      userType: constants.USER_TYPES.ADMIN,
      eventType: constants.NOTIFICATION_TYPE.DOCTOR_PROFILE_DELETION,
      senderId: new ObjectId(userId),
      receiverId: superadminArray,
      title: data?.fullName + constants.MESSAGES.DOCTOR_PROFILE_DELETION.TITLE,
      body: constants.MESSAGES.DOCTOR_PROFILE_DELETION.BODY,
    });
    if (environment) {
      await sendSms.sendOtp(
        data.phone,
        data.countryCode,
        { name: data?.fullName.substring(0, 30) },
        constants.SMS_TEMPLATES.DOCTOR_DELETE_ACC
      );
      const mailParameters = { doctorName: data.fullName };
      const htmlFile = constants.VIEWS.DOCTOR_DELETE_ACC;
      await sendEmail.sendEmailPostAPI(
        doctorDetails.email,
        constants.EMAIL_TEMPLATES.DOCTOR_DELETE_ACC,
        htmlFile,
        mailParameters
      );
      const len = patientList.length;
      for (let i = 0; i < len; i++) {
        const date = new Date(new Date(patientList[i].slot)).toLocaleString(
          "en-IN"
        );
        await sendSms.sendOtp(
          patientList[i].patientPhone,
          patientList[i].countryCode,
          { name: patientList[i]?.doctorName.substring(0, 30), date },
          constants.SMS_TEMPLATES.PATIENT_APPT_CANCEL
        );
      }
    }
    return response.success(
      { msgCode: "DOCTOR_DELETED", data },
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

const doctorList = async (req, res) => {
  try {
    const { search, sort, page, size, sortOrder, isExport } = req.query;
    const sortCondition = {};
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
    const doctorData = await doctor.doctorList(
      condition,
      sortCondition,
      offset,
      limit,
      searchQuery,
      isExport
    );

    const msgCode = !doctorData?.count ? "NO_RECORD_FETCHED" : "PATIENT_LIST";
    return response.success({ msgCode, data: doctorData }, res, httpStatus.OK);
  } catch (error) {
    return response.error(
      { msgCode: "SOMETHING_WENT_WRONG" },
      res,
      httpStatus.SOMETHING_WENT_WRONG
    );
  }
};

const doctorListBasedOnProcedure = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      filter,
      page,
      size,
      procedure,
      search,
      speciality,
      // establishmentId,
      // establishmentProfileSlug,
    } = req.query;
    const { offset, limit } = getPagination(page, size);
    // let id = id || establishmentId;
    // if (establishmentProfileSlug) {
    //   const establishment = await common.getByCondition(
    //     EstablishmentMaster.model,
    //     { profileSlug: establishmentProfileSlug }
    //   );
    //   id = establishment._id;
    // }
    const data = await doctor.doctorListBasedOnProcedure(
      id,
      filter,
      procedure,
      offset,
      limit,
      search,
      speciality
    );
    const procedures = await doctor.establishmentProcedureList(id, filter);
    const mobileProcedures = await doctor.establishmentProcedureListNoFilter(
      id
    );
    return response.success(
      {
        msgCode: "DOCTOR_ABOUT_US",
        data: { data, procedures, mobileProcedures },
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
    console.log(error);
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
    // let id = establishmentId;
    // if (establishmentProfileSlug) {
    //   const establishment = await common.getByCondition(
    //     EstablishmentMaster.model,
    //     { profileSlug: establishmentProfileSlug }
    //   );
    //   id = establishment._id;
    // }
    const data = await doctor.establishmentspecialityListDoc(id);
    return response.success(
      { msgCode: "DOCTOR_ABOUT_US", data },
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

const checkDuplicateTimings = async (req, res, next) => {
  try {
    const decode = req.data;
    const { type, timings, hospitalId } = req.body;
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
    const condition = { doctorId: findDoctor._id };
    if (hospitalId) {
      const estabMster = {
        hospitalId: new Types.ObjectId(hospitalId),
      };
      const findEstablishment = await common.getByCondition(
        EstablishmentMaster.model,
        estabMster
      );
      condition["$ne"] = [
        "$establishmentId",
        new Types.ObjectId(findEstablishment._id),
      ];
    }
    const getDayTimings = await doctor.getAllTimings(condition, type);
    const timingExists = checkDayTiming(getDayTimings, timings, type);
    if (timingExists.exists) {
      return response.error(
        { msgCode: "TIMING_EXISTS", data: { slot: timingExists.slot } },
        res,
        httpStatus.CONFLICT
      );
    }
    return response.success({ msgCode: "OK" }, res, httpStatus.OK);
  } catch (error) {
    console.log(error);
    return response.error(
      { msgCode: "INTERNAL_SERVER_ERROR" },
      res,
      httpStatus.INTERNAL_SERVER_ERROR
    );
  }
};

const checkDayTiming = (dayTimings, timing, type) => {
  let exists = false;
  let slot = "";
  for (let time = 0; time < dayTimings.length; time++) {
    for (let i = 0; i < timing.length; i++) {
      if (
        timing[i].slot === dayTimings[time][type].slot &&
        timing[i].to <= dayTimings[time][type].to &&
        timing[i].from >= dayTimings[time][type].from
      ) {
        slot = timing[i].slot;
        exists = true;
        break;
      }
    }
    if (exists) break;
  }
  return { exists, slot };
};

const procedureList = async (req, res) => {
  try {
    const { userId } = req.data;
    const condition = { userId: new ObjectId(userId) };
    const procedureList = await doctor.getDoctorDataByID(
      Doctor.model,
      condition
    );
    const msgCode =
      procedureList.length === 0 ? "NO_RECORD_FETCHED" : "FECTHED";
    return response.success(
      {
        msgCode,
        data: {
          count: procedureList?.length || 0,
          list: procedureList.reverse() || [],
        },
      },
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

const addProcedure = async (req, res) => {
  try {
    const { records } = req.body;
    const { userId } = req.data;
    const { recordId } = records;
    const condition = { userId: new ObjectId(userId) };
    const recordKey = "procedure";
    const findMasterData = await common.getById(
      ProcedureMaster.model,
      recordId
    );
    if (!findMasterData)
      return response.error(
        {
          msgCode: "NOT_FOUND",
        },
        res,
        httpStatus.NOT_FOUND
      );

    const existsCondition = { userId: new ObjectId(userId) };
    existsCondition[`${recordKey}`] = { $in: [new ObjectId(recordId)] };
    const procedureExists = await common.getByCondition(
      Doctor.model,
      existsCondition
    );
    if (procedureExists)
      return response.error(
        {
          msgCode: "PROCEDURE_EXISTS",
        },
        res,
        httpStatus.BAD_REQUEST
      );
    const updates = {};
    updates[`${recordKey}`] = recordId;
    const addProcedure = await common.push(Doctor.model, condition, updates);
    if (!addProcedure) {
      return response.error(
        { msgCode: "FAILED_TO_ADD" },
        res,
        httpStatus.BAD_REQUEST
      );
    }

    return response.success(
      { msgCode: "ADDED", data: addProcedure },
      res,
      httpStatus.CREATED
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

const deleteProcedure = async (req, res) => {
  try {
    const { recordId } = req.params;
    const { userId } = req.data;
    const condition = { userId: new ObjectId(userId) };
    const recordKey = "procedure";
    const updates = {};
    updates[`${recordKey}`] = new ObjectId(recordId);
    const deleteProcedure = await common.pullObject(
      Doctor.model,
      condition,
      updates
    );
    if (!deleteProcedure) {
      return response.error(
        { msgCode: "FAILED_TO_DELETE" },
        res,
        httpStatus.BAD_REQUEST
      );
    }
    return response.success(
      { msgCode: "DELETED", data: {} },
      res,
      httpStatus.OK
    );
  } catch (error) {
    console.log(error);
    return response.error(
      { msgCode: "SOMETHING_WRONG" },
      res,
      httpStatus.SOMETHING_WRONG
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
  establishmentDataDetails,
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
  doctorListBasedOnProcedure,
  specialityFirstLetterList,
  establishmentspecialityListDoc,
  checkDuplicateTimings,
  procedureList,
  addProcedure,
  deleteProcedure,
};
