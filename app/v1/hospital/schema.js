const Joi = require("joi");
const { constants } = require("../../../utils/constant");
const {
  search,
  page,
  size,
  sort,
  sortOrder,
  id,
  _id,
  isExport,
} = require("../../../utils/validation");
const { Hospital } = require("../../../models");

const from = Joi.string().trim().default(null);

const to = Joi.string().trim().default(null);

const slot = Joi.string().trim();

const timing = Joi.array().items({
  from,
  to,
  slot,
  // isAvailable: Joi.boolean().default(true)
});

const location = Joi.object({
  type: Joi.string().trim().default("Point"),
  coordinates: Joi.array().items(Joi.number()).length(2).default([0, 0]),
});

const hospitalTiming = Joi.object({
  mon: timing,
  tue: timing,
  wed: timing,
  thu: timing,
  fri: timing,
  sat: timing,
  sun: timing,
}).allow(null);

const address = Joi.object({
  landmark: Joi.string().trim().min(3).max(250),
  locality: Joi.string().trim().min(3).max(250),
  city: Joi.string().trim(),
  state: _id,
  pincode: Joi.string().length(6).pattern(constants.REGEX_FOR_PINCODE).trim(),
  country: Joi.string().trim().min(1).max(500).default("India"),
});

const hospitalList = Joi.object({
  city: Joi.string().trim().replace(/,$/, ""),
  hospitalType: Joi.string().trim().replace(/,$/, ""),
  search,
  page,
  size,
  sort,
  sortOrder,
  isExport,
});

const hospitalDetails = Joi.object({
  hospitalId: id,
  type: Joi.number()
    .valid(...Object.values(constants.HOSPITAL_DETAIL_TYPE))
    .default(constants.HOSPITAL_DETAIL_TYPE.ADMIN),
});

const addHospitalDetails = Joi.object({
  fullName: Joi.string().trim().min(3).max(50).required(),
  hospitalType: id,
  address: Joi.object({
    landmark: Joi.string().trim().min(3).max(250).required(),
    locality: Joi.string().trim().min(3).max(250).required(),
    city: Joi.string().trim(),
    state: id,
    pincode: Joi.string()
      .length(6)
      .pattern(constants.REGEX_FOR_PINCODE)
      .trim()
      .required(),
    country: Joi.string().trim().min(1).max(500).default("India"),
  }).required(),
  phone: Joi.string().length(10).pattern(constants.regexForMobile).trim(),
  location,
  isLocationShared: Joi.boolean().default(false),
});

const editHospitalDetails = Joi.object({
  fullName: Joi.string().trim().min(3).max(50),
  hospitalType: _id,
  address,
  location,
  isLocationShared: Joi.boolean().default(false),
  isVerified: Joi.number().valid(
    constants.PROFILE_STATUS.ACTIVE,
    constants.PROFILE_STATUS.DEACTIVATE
  ),
  phone: Joi.string().length(10).pattern(constants.regexForMobile).trim(),
});

const steps = Joi.number()
  .valid(...Object.values(constants.PROFILE_STEPS))
  .required();

const stepsNumber = Joi.object({
  steps,
});

const stepsIsOne = Joi.object({
  fullName: Joi.string().trim().min(3).max(50),
  type: _id,
  city: Joi.string().trim(),
});

const stepsIsTwo = Joi.object({
  establishmentType: Joi.number().valid(
    ...Object.values(constants.ESTABLISHMENT_PROOF)
  ),
  acceptableProof: Joi.string().trim().uri(),
});

const stepsIsThree = Joi.object({
  address,
  hospitalTiming,
});

const editProfileDetails = Joi.object({
  steps,
  isEdit: Joi.boolean(),
  isSaveAndExit: Joi.boolean(),
  profileScreen: Joi.number().valid(
    ...Object.values(constants.HOSPITAL_SCREENS)
  ),
  records: Joi.object({
    fullName: Joi.string().trim().min(3).max(100).allow(null),
    hospitalType: Joi.string().hex().trim().allow(null),
    isOwner: Joi.boolean(),
    establishmentProof: Joi.array().items({
      url: Joi.string().trim(),
      fileType: Joi.string().trim(),
    }),
    address: Joi.object({
      landmark: Joi.string().trim().min(3).max(100).required(),
      locality: Joi.string().trim().min(3).max(100).required(),
      city: Joi.string().min(3).max(100).trim(),
      state: id,
      pincode: Joi.string()
        .length(6)
        .pattern(constants.REGEX_FOR_PINCODE)
        .trim()
        .required(),
      country: Joi.string().trim().min(1).max(500).default("India"),
    }).allow(null),
    location,
    isLocationShared: Joi.boolean().default(false),
    hospitalTiming,
  }),
});

const hospitalUpdateDoctorProfile = Joi.object().keys({
  fullName: Joi.string().optional(), //.min(3).max(20)
  email: Joi.string().optional(),
  phone: Joi.string().length(10).pattern(constants.regexForMobile).optional(),
  profilePic: Joi.string().optional(),
  speciality: Joi.array().optional(),
  procedure: Joi.array().optional(),
});

const hospitalAddDoctor = Joi.object().keys({
  publicUrl: Joi.string().optional(),
  phone: Joi.string().length(10).pattern(constants.regexForMobile).optional(),
  specility: Joi.array().required(),
  consultationFees: Joi.number().required(),
});

// Hospital setting profile

const hospitalUpdateProfile = Joi.object().keys({
  profilePic: Joi.string().optional().allow(null),
  name: Joi.string().optional().allow(null), //.min(3).max(20)
  hospitalType: Joi.string().trim().length(24).hex().min(1).required(),
  about: Joi.string().optional().allow(null),
  totalBed: Joi.number().optional().allow(null),
  ambulance: Joi.number().optional().allow(null),
});

const hospitalAddService = Joi.object().keys({
  service: Joi.array().items(
    Joi.object({
      name: Joi.string().required(),
    })
  ),
});

const hospitalDeleteService = Joi.object().keys({
  serviceId: Joi.string().trim().length(24).hex().min(1).required(),
});

const hospitalAddVideo = Joi.object().keys({
  videos: Joi.array().items(
    Joi.object({
      title: Joi.string().required(),
      url: Joi.string().required(),
    })
  ),
});

const hospitalUpdateVideos = Joi.object().keys({
  videos: Joi.array().items(
    Joi.object({
      title: Joi.string().optional(),
      url: Joi.string().optional(),
    })
  ),
});

const hospitalUpdateTiming = Joi.object().keys({
  mon: Joi.array().items(
    Joi.object({
      slot: Joi.string().optional(),
      from: Joi.string().optional(),
      to: Joi.string().optional(),
    })
  ),
});

const hospitalUpdateAddress = Joi.object().keys({
  address: Joi.object().keys({
    landmark: Joi.string().optional(),
    locality: Joi.string().optional(),
    city: Joi.string().optional(),
    state: Joi.string().trim().length(24).hex().min(1).required(),
    pincode: Joi.string().optional(),
    country: Joi.string().default("India").optional(),
  }),
  location: Joi.object().keys({
    coordinates: Joi.array().items(Joi.number()).optional(),
  }),
  isLocationShared: Joi.boolean().default(false),
});

const hospitalAddImages = Joi.object().keys({
  image: Joi.array().items(
    Joi.object({
      url: Joi.string().required(),
    })
  ),
});

const hospitalDeleteImage = Joi.object().keys({
  imageId: Joi.string().trim().length(24).hex().min(1).required(),
});

const hospitalAddSocial = Joi.object().keys({
  social: Joi.array().items(
    Joi.object({
      socialMediaId: Joi.string().trim().length(24).hex().min(1).required(),
      url: Joi.string().required(),
    })
  ),
});

const hospitalUpdateSocial = Joi.object().keys({
  social: Joi.array().items(
    Joi.object({
      socialMediaId: Joi.string().trim().length(24).hex().min(1).required(),
      url: Joi.string().required(),
    })
  ),
});
const objectId = Joi.string().trim().length(24).hex().required();

const paramsId = Joi.object({
  hospitalId: objectId,
});

const procedureList = Joi.object({
  type: Joi.number().default(constants.SPECIALITY_PROCEDURE.PROCEDURE),
  reverse: Joi.boolean().default(true),
  sort,
  sortOrder,
});

const procedureByID = Joi.object({
  recordId: id,
  type: Joi.number().default(constants.SPECIALITY_PROCEDURE.PROCEDURE),
});

const specialityList = Joi.object({
  type: Joi.number().default(constants.SPECIALITY_PROCEDURE.SPECIALITY),
  reverse: Joi.boolean().default(true),
  sort,
  sortOrder,
});

const specialityByID = Joi.object({
  recordId: id,
  type: Joi.number().default(constants.SPECIALITY_PROCEDURE.SPECIALITY),
});

const adminActionHospital = Joi.object().keys({
  isVerified: Joi.number().required(),
  rejectReason: Joi.string().optional(),
});

const hospitalDoctorList = Joi.object().keys({
  search: Joi.string().default(""),
  page: Joi.number().min(1).default(1),
  size: Joi.number().min(1).default(10),
  sortBy: Joi.string().default("createdAt"),
  order: Joi.string().default("DESC"),
});

const commonList = Joi.object().keys({
  search: Joi.string().default(""),
  page: Joi.number().min(1).default(1),
  size: Joi.number().min(1).default(10),
  sortBy: Joi.string().default("createdAt"),
  order: Joi.string().default("DESC"),
});

const appointmentId = Joi.object({
  appointmentId: _id,
});

const rescheduleAppointment = Joi.object({
  email: Joi.string().trim().lowercase(),
  date: Joi.date().greater("now").iso().raw().required().messages({
    "date.greater": "Please choose a relevant time",
  }),
  notes: Joi.string().trim().required(),
});

const changeAppointmentStatus = Joi.object({
  status: Joi.number().valid(
    constants.BOOKING_STATUS.COMPLETE,
    constants.BOOKING_STATUS.CANCEL
  ),
  reason: Joi.string().trim(),
  isDeleted: Joi.boolean(),
});

const dateTimeObject = Joi.object({
  page,
  size,
  sort,
  sortOrder,
  toDate: Joi.date().required(),
  fromDate: Joi.date().required(),
  doctorId: _id,
});

const calendarList = Joi.object({
  doctorId: _id,
  page,
  size,
  toDate: Joi.date().required(),
  fromDate: Joi.date().required(),
});

const patientHospitalServiceList = Joi.object({
  search,
  page,
  size,
  sort,
  sortOrder,
  establishmentId: _id,
  type: Joi.number()
    .default(constants.HOSPITAL_SERVICE_TYPES.DOCTOR)
    .valid(...Object.values(constants.HOSPITAL_SERVICE_TYPES)),
  establishmentProfileSlug: Joi.string().trim()
});

const hospitalReviewList = Joi.object({
  search,
  page,
  size,
  sort: Joi.number().valid(1, 2).default(2),
  establishmentId: _id,
  establishmentProfileSlug: Joi.string().trim()
});

const findDoctorList = Joi.object({
  establishmentId: id,
  page,
  size,
});

const establishmentId = Joi.object({
  establishmentId: id,
});

const hospitalSpecialityGraph = Joi.object({
  toDate: Joi.date().default(
    new Date(new Date().getFullYear(), new Date().getMonth(), 31)
  ),
  fromDate: Joi.date().default(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  ),
  specialization: Joi.array().items(_id),
});

const hospitalDoctorGraph = Joi.object({
  toDate: Joi.date().default(
    new Date(new Date().getFullYear(), new Date().getMonth(), 31)
  ),
  fromDate: Joi.date().default(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  ),
  doctors: Joi.array().items(_id).default([]),
  groupByWeek: Joi.boolean().default(true),
});

const hospitalProfile = Joi.object({
  establishmentId: _id,
  establishmentProfileSlug: Joi.string().trim()
}).min(1);


module.exports = {
  hospitalDetails,
  hospitalList,
  addHospitalDetails,
  editHospitalDetails,
  stepsNumber,
  stepsIsOne,
  stepsIsTwo,
  stepsIsThree,
  editProfileDetails,
  hospitalUpdateDoctorProfile,
  hospitalAddDoctor,
  hospitalUpdateProfile,
  hospitalAddService,
  hospitalAddVideo,
  hospitalUpdateVideos,
  hospitalUpdateTiming,
  hospitalUpdateAddress,
  hospitalAddImages,
  hospitalDeleteImage,
  hospitalAddSocial,
  hospitalUpdateSocial,
  procedureList,
  procedureByID,
  paramsId,
  adminActionHospital,
  commonList,
  hospitalDoctorList,
  hospitalDeleteService,
  specialityList,
  specialityByID,
  appointmentId,
  rescheduleAppointment,
  changeAppointmentStatus,
  dateTimeObject,
  calendarList,
  patientHospitalServiceList,
  hospitalReviewList,
  findDoctorList,
  establishmentId,
  hospitalSpecialityGraph,
  hospitalDoctorGraph,
  hospitalProfile
};
