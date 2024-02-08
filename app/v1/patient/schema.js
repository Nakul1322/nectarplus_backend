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

const patientList = Joi.object({
  bloodGroup: Joi.string().trim(),
  gender: Joi.number().valid(...Object.values(constants.GENDER)),
  age: Joi.string().trim(),
  search,
  page,
  size,
  sort,
  sortOrder,
  isExport,
});

const getPatientList = Joi.object({
  type: Joi.number()
    .valid(...Object.values(constants.DOCTOR_PATIENT_LIST))
    .required(),
  search,
  page,
  size,
  sort,
  sortOrder,
});

const vitalSigns = Joi.object({
  weight: Joi.number().min(1),
  bloodPressure: Joi.object({
    systolic: Joi.number().min(1),
    diastolic: Joi.number().min(1),
  }),
  pulse: Joi.number().min(1),
  temperature: Joi.number().min(1),
  respRate: Joi.number().min(1),
}).min(1);

const clinicalNotes = Joi.object({
  symptoms: Joi.string().trim(),
  observations: Joi.string().trim(),
  diagnoses: Joi.string().trim(),
  notes: Joi.string().trim(),
}).min(1);

const medicine = Joi.array()
  .items({
    drugId: id,
    dosageAndFrequency: Joi.object({
      morning: Joi.number().min(0),
      afternoon: Joi.number().min(0),
      evening: Joi.number().min(0),
    }),
    intake: Joi.string().trim(),
  })
  .min(1);

const labTest = Joi.array()
  .items({
    labTestId: id,
    instruction: Joi.string().trim(),
    name: Joi.string().trim(),
  })
  .min(1);

const files = Joi.array().items(Joi.string().trim().uri()).min(1);

const getPatientRecord = Joi.object({
  type: Joi.number()
    .valid(...Object.values(constants.PATIENT_CLINICAL_RECORDS))
    .required(),
});

const editPatientRecord = Joi.object({
  type: Joi.number()
    .valid(...Object.values(constants.PATIENT_CLINICAL_RECORDS))
    .required(),
  isDeleted: Joi.boolean().valid(true),
  records: Joi.any()
    .when("type", {
      is: constants.PATIENT_CLINICAL_RECORDS.VITAL_SIGNS,
      then: vitalSigns,
    })
    .when("type", {
      is: constants.PATIENT_CLINICAL_RECORDS.CLINICAL_NOTES,
      then: clinicalNotes,
    })
    .when("type", {
      is: constants.PATIENT_CLINICAL_RECORDS.MEDICINES,
      then: medicine,
    })
    .when("type", {
      is: constants.PATIENT_CLINICAL_RECORDS.LAB_TEST,
      then: labTest,
    })
    .when("type", {
      is: constants.PATIENT_CLINICAL_RECORDS.FILES,
      then: files,
    }),
});

const addPatientRecord = Joi.object({
  type: Joi.number()
    .valid(...Object.values(constants.PATIENT_CLINICAL_RECORDS))
    .required(),
  records: Joi.any()
    .required()
    .when("type", {
      is: constants.PATIENT_CLINICAL_RECORDS.VITAL_SIGNS,
      then: vitalSigns,
    })
    .when("type", {
      is: constants.PATIENT_CLINICAL_RECORDS.CLINICAL_NOTES,
      then: clinicalNotes,
    })
    .when("type", {
      is: constants.PATIENT_CLINICAL_RECORDS.MEDICINES,
      then: medicine,
    })
    .when("type", {
      is: constants.PATIENT_CLINICAL_RECORDS.LAB_TEST,
      then: labTest,
    })
    .when("type", {
      is: constants.PATIENT_CLINICAL_RECORDS.FILES,
      then: files,
    })
    .required(),
});

const appointmentId = Joi.object({
  appointmentId: id,
  patientId: id,
});

const patientId = Joi.object({
  patientId: id,
});

const editPatientData = Joi.object({
  isDeleted: Joi.boolean().valid(true),
  bloodGroup: Joi.number().valid(...Object.values(constants.BLOOD_GROUP)),
  gender: Joi.number().valid(...Object.values(constants.GENDER)),
  dob: Joi.date().optional(),
  address: Joi.object({
    street: Joi.string().trim().min(3).max(250),
    landmark: Joi.string().trim().min(3).max(250),
    locality: Joi.string().trim(),
    city: Joi.string().trim(),
    state: _id,
    pincode: Joi.string().length(6).pattern(constants.REGEX_FOR_PINCODE).trim(),
    country: Joi.string().trim().min(1).max(500).default("India"),
  }),
  fullName: Joi.string().trim(),
  profilePic: Joi.string().trim().uri(),
  language: Joi.number().valid(...Object.values(constants.LANGUAGES_SUPPORTED)),
});

const hospitalPatientList = Joi.object({
  search,
  page,
  size,
  sort,
  sortOrder,
  isExport,
});

const historyRecord = Joi.object({
  search,
  page,
  size,
  sort,
  sortOrder,
  patientId: id,
});

const recordId = Joi.object({
  recordId: id,
});

const commonList = Joi.object({
  search,
  page,
  size,
  sort,
  sortOrder,
  isExport,
});

const feedbackList = Joi.object({
  search,
  page,
  size,
  sort,
  sortOrder,
  toDate: Joi.date().default(new Date(Date.now() + 730 * 24 * 60 * 60 * 1000)),
  fromDate: Joi.date(),
});

const patientAppointmentList = Joi.object({
  status: Joi.number().valid(
    constants.BOOKING_STATUS.BOOKED,
    constants.BOOKING_STATUS.COMPLETE,
    constants.BOOKING_STATUS.CANCEL
  ),
  toDate: Joi.date().default(new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)),
  fromDate: Joi.date(),
  patientId: id,
});

const hospitalAppointmentList = Joi.object({
  search,
  page,
  size,
  sort,
  sortOrder,
  isExport,
  status: Joi.number().valid(...Object.values(constants.BOOKING_STATUS)),
  doctorId: _id,
  toDate: Joi.date().default(new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)),
  fromDate: Joi.date().default(new Date(Date.now())),
  typeOfList: Joi.number()
    .valid(...Object.values(constants.HOSPITAL_APPOINTMENT_LIST_TYPES))
    .default(constants.HOSPITAL_APPOINTMENT_LIST_TYPES.UPCOMING),
});

module.exports = {
  patientList,
  appointmentId,
  getPatientRecord,
  addPatientRecord,
  editPatientRecord,
  getPatientList,
  editPatientData,
  patientId,
  hospitalPatientList,
  historyRecord,
  recordId,
  commonList,
  feedbackList,
  patientAppointmentList,
  hospitalAppointmentList,
};
