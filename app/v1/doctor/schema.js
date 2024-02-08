const Joi = require("joi");
const { constants } = require("../../../utils/constant");
const {
  search,
  page,
  size,
  sort,
  sortOrder,
  _id,
  id,
  isExport,
} = require("../../../utils/validation");

const doctorStatus = Joi.object().keys({
  isVerified: Joi.number().valid(
    constants.PROFILE_STATUS.ACTIVE,
    constants.PROFILE_STATUS.DEACTIVATE
  ),
});

const doctorId = Joi.object({
  doctorId: Joi.string().trim().length(24).hex().required(),
});

const adminAddDoctor = Joi.object().keys({
  fullName: Joi.string().required(), //.min(3).max(20)
  specialization: Joi.array().required(),
  gender: Joi.number().required(),
  medicalRegistration: Joi.object().keys({
    registrationNumber: Joi.string().required(),
    year: Joi.string().required(),
    council: Joi.string().required(),
  }),
  education: Joi.array().items(
    Joi.object({
      degree: Joi.string().required(),
      college: Joi.string().required(),
      year: Joi.string().required(),
    })
  ),
  experience: Joi.string().required(),
  isOwner: Joi.number().required(),
  establishmentName: Joi.string().required(),
  hospitalTypeId: Joi.string().trim().length(24).hex().min(1).required(),
  address: Joi.object().keys({
    address: Joi.string().required(),
    locality: Joi.string().required(),
    city: Joi.string().required(),
    state: Joi.string().trim().length(24).hex().min(1).required(),
    pincode: Joi.string().required(),
    country: Joi.string().default("India").required()
  }),
  location: Joi.object().keys({
    lat: Joi.number().required(),
    long: Joi.number().required(),
  }),
  isLocationShared: Joi.boolean().default(false),
});

const adminEditDoctor = Joi.object().keys({
  fullName: Joi.string().optional(), //.min(3).max(20)
  specialization: Joi.array().optional(),
  gender: Joi.number().optional(),
  medicalRegistration: Joi.object().keys({
    registrationNumber: Joi.string().optional(),
    year: Joi.string().optional(),
    council: Joi.string().optional(),
  }),
  education: Joi.array().items(
    Joi.object({
      degree: Joi.string().optional(),
      college: Joi.string().optional(),
      year: Joi.string().optional(),
    })
  ),
  experience: Joi.string().optional(),
  isOwner: Joi.number().optional(),
  establishmentName: Joi.string().optional(),
  hospitalTypeId: Joi.string().trim().length(24).hex().min(1).optional(),
  address: Joi.object().keys({
    address: Joi.string().optional(),
    locality: Joi.string().optional(),
    city: Joi.string().optional(),
    state: Joi.string().trim().length(24).hex().min(1).optional(),
    pincode: Joi.string().optional(),
    country: Joi.string().default("India").optional()
  }),
  location: Joi.object().keys({
    lat: Joi.number().optional(),
    long: Joi.number().optional(),
  }),
  isLocationShared: Joi.boolean().default(false),
});

const cancelAppointment = Joi.object().keys({
  appointmentId: Joi.string().trim().length(24).hex().min(1).required(),
  reason: Joi.string().required(),
});

const completeAppointment = Joi.object().keys({
  appointmentId: Joi.string().trim().length(24).hex().min(1).required(),
});

const doctorAddEstablishment = Joi.object().keys({
  establishmentType: Joi.number().required(),
  name: Joi.string().required(),
  hospitalTypeId: Joi.string().trim().length(24).hex().min(1).required(),
  establishmentPic: Joi.string().required(),
  address: Joi.object().keys({
    address: Joi.string().required(),
    locality: Joi.string().required(),
    city: Joi.string().required(),
    state: Joi.string().trim().length(24).hex().min(1).required(),
    pincode: Joi.string().required(),
    country: Joi.string().default("India").required(),
  }),
  location: Joi.object().keys({
    latitude: Joi.number().required(),
    longitude: Joi.number().required(),
  }),
  isLocationShared: Joi.boolean().default(false),
  consultationFees: Joi.string().required(),
});

const establishmentId = Joi.object().keys({
  establishmentId: Joi.string().trim().length(24).hex().min(1).required(),
});

const doctorEditEstablishment = Joi.object().keys({
  establishmentType: Joi.number().optional(),
  name: Joi.string().optional(),
  hospitalTypeId: Joi.string().trim().length(24).hex().min(1).optional(),
  establishmentPic: Joi.string().optional(),
  address: Joi.object().keys({
    address: Joi.string().optional(),
    locality: Joi.string().optional(),
    city: Joi.string().optional(),
    state: Joi.string().trim().length(24).hex().min(1).optional(),
    pincode: Joi.string().optional(),
    country: Joi.string().default("India").optional(),
  }),
  location: Joi.object().keys({
    lat: Joi.number().optional(),
    long: Joi.number().optional(),
  }),
  isLocationShared: Joi.boolean().default(false),
  consultationFees: Joi.string().optional(),
});

const doctorAcceptEstablishment = Joi.object().keys({
  isApproved: Joi.number().required(),
});

const steps = Joi.number()
  .valid(...Object.values(constants.PROFILE_STEPS))
  .required();

const basicDetails = Joi.object({
  fullName: Joi.string().trim().min(3).max(500).required(),
  gender: Joi.number().valid(...Object.values(constants.GENDER)),
  specialization: _id,
  email: Joi.string().trim().lowercase(),
  city: Joi.string().trim().min(3).max(500),
})
  .allow(null)
  .min(1);

const medicalRegistration = Joi.object({
  registrationNumber: Joi.string().trim().min(1).max(20).default(null),
  council: Joi.string().trim().min(1).max(500).default(null),
  year: Joi.string().trim().min(1).default(null),
})
  .allow(null)
  .min(1);

const education = Joi.object({
  degree: Joi.string().trim().min(2).max(500).allow(null),
  college: Joi.string().trim().min(2).max(500).allow(null),
  year: Joi.string().trim().min(1).max(50).allow(null), // key for experience not in educcation
  experience: Joi.string().trim().min(1).max(50).allow(null),
})
  .allow(null)
  .min(1);

const establishmentDetails = Joi.object({
  name: Joi.string().trim().min(2).max(500),
  locality: Joi.string().trim().min(1).max(500),
  city: Joi.string().trim().min(1).max(500),
  isOwner: Joi.boolean(),
  hospitalTypeId: _id,
  hospitalId: Joi.string().trim().allow(null),
})
  .allow(null)
  .min(1);

const location = Joi.object({
  type: Joi.string().trim().default("Point"),
  coordinates: Joi.array().items(Joi.number()).length(2).default([0, 0]),
});

const address = Joi.object({
  landmark: Joi.string().trim().min(3).max(500),
  city: Joi.string().trim().min(3).max(500).allow(null),
  locality: Joi.string().trim().min(3).max(500).allow(null),
  state: _id,
  pincode: Joi.string().length(6).pattern(constants.REGEX_FOR_PINCODE).trim(),
  country: Joi.string().trim().min(1).max(500).default("India"),
})
  .allow(null)
  .min(1);

const from = Joi.string().trim();

const to = Joi.string().trim();

const slot = Joi.string().trim();

const timing = Joi.array().items({
  from,
  to,
  slot,
});

const establishmentTiming = Joi.object({
  mon: timing,
  tue: timing,
  wed: timing,
  thu: timing,
  fri: timing,
  sat: timing,
  sun: timing,
}).allow(null);

const validationSectionA = Joi.object({
  basicDetails,
  medicalRegistration,
  education,
  establishmentDetails,
});

const validationSectionB = Joi.object({
  doctor: Joi.object({
    identityProof: Joi.array().items({
      url: Joi.string().trim(),
      fileType: Joi.string().trim(),
    }),
    medicalProof: Joi.array().items({
      url: Joi.string().trim(),
      fileType: Joi.string().trim(),
    }),
  })
    .allow(null)
    .min(1),
  establishmentDetail: Joi.object({
    establishmentProof: Joi.array().items({
      url: Joi.string().trim(),
      fileType: Joi.string().trim(),
    }),
    propertyStatus: Joi.number().valid(
      ...Object.values(constants.ESTABLISHMENT_PROOF)
    ),
  }).allow(null),
});

const validationSectionC = Joi.object({
  address,
  location: Joi.object({
    type: Joi.string().trim().default("Point"),
    coordinates: Joi.array().items(Joi.number()).length(2).default([0, 0]),
  }),
  isLocationShared: Joi.boolean().default(false),
  establishmentTiming,
  consultationFees: Joi.number().max(99999).allow(null),
});

const doctorCompleteProfile = Joi.object({
  steps,
  isEdit: Joi.boolean().required(),
  isSaveAndExit: Joi.boolean().default(false),
  profileScreen: Joi.number().valid(...Object.values(constants.DOCTOR_SCREENS)),
  records: Joi.any()
    .when("steps", {
      is: constants.PROFILE_STEPS.SECTION_A,
      then: validationSectionA,
    })
    .when("steps", {
      is: constants.PROFILE_STEPS.SECTION_B,
      then: validationSectionB,
    })
    .when("steps", {
      is: constants.PROFILE_STEPS.SECTION_C,
      then: validationSectionC,
    })
    .required(),
});

const getDoctorProfile = Joi.object({
  type: Joi.number()
    .valid(...Object.values(constants.PROFILE_DETAILS))
    .default(constants.PROFILE_DETAILS.OTHERS),
  doctorId: Joi.when("type", {
    is: constants.PROFILE_DETAILS.OTHERS,
    then: _id,
  }),
});

const adminActionDoctor = Joi.object().keys({
  isVerified: Joi.number().required(),
  rejectReason: Joi.string().optional(),
});

const adminDoctorList = Joi.object().keys({
  search: Joi.string().default(""),
  page: Joi.number().min(1).default(1),
  size: Joi.number().min(1).default(10),
  specialization: Joi.string(),
  cities: Joi.string(),
  sortBy: Joi.string().default("createdAt"),
  order: Joi.string().default("DESC"),
  isExport: Joi.boolean(),
});

const commonList = Joi.object().keys({
  search: Joi.string().default(""),
  page: Joi.number().min(1).default(1),
  size: Joi.number().min(1).default(10),
  sortBy: Joi.string().default("createdAt"),
  order: Joi.string().default("DESC"),
});

const doctorList = Joi.object({
  bloodGroup: Joi.string().trim(),
  gender: Joi.number().valid(...Object.values(constants.GENDER)),
  age: Joi.string().trim(),
  search,
  page,
  size,
  sort,
  sortOrder,
  isExport,
  // type: Joi.number().default()
});

const doctorPatientList = Joi.object().keys({
  upcoming: Joi.string().default("false"),
  status: Joi.number().default(""),
  fromDate: Joi.string().default(""),
  toDate: Joi.string().default(""),
  search: Joi.string().default(""),
  page: Joi.number().min(1).default(1),
  size: Joi.number().min(1).default(10),
  isExport: Joi.boolean(),
});

const procedureByID = Joi.object({
  recordId: id,
});

const addProcedure = Joi.object({
  records: Joi.object({
    recordId: id,
  }),
});

const getAllDoctors = Joi.object({
  filter: search,
  page,
  size,
  sort,
  sortOrder,
  location: search
});

const doctorProfile = Joi.object({
  doctorId: _id,
  doctorProfileSlug: Joi.string().trim()
}).min(1);


module.exports = {
  doctorStatus,
  adminAddDoctor,
  adminEditDoctor,
  cancelAppointment,
  completeAppointment,
  doctorCompleteProfile,
  doctorAddEstablishment,
  doctorEditEstablishment,
  doctorAcceptEstablishment,
  getDoctorProfile,
  doctorId,
  adminActionDoctor,
  adminDoctorList,
  commonList,
  establishmentId,
  doctorList,
  doctorPatientList,
  procedureByID,
  addProcedure,
  getAllDoctors,
  doctorProfile
};
