exports.constants = {
  STATUS: {
    PENDING: 0,
    COMPLETE: 1,
    DELETED: -1,
    CANCEL: 2,
    RESCHEDULE: -2,
    APPROVE: 3,
    REJECT: -3,
    ACTIVE: 4,
    INACTIVE: -4,
  },
  CANCEL_BY: {
    PATIENT: 0,
    DOCTOR: 1,
    HOSPITAL: 2,
  },
  BOOKING_STATUS:{
    BOOKED:0,
    CANCEL:-1,
    COMPLETE:1,
    PENDING:2,
    RESCHEDULE: -2,
  },
  CMS_TYPE: {
    PP: 1,
    TAC: 2,
    SP: 3,
  },
  USER_TYPES: {
    PATIENT: 1,
    DOCTOR: 2,
    HOSPITAL: 3,
    ADMIN: 4,
    SUB_ADMIN: 5,
  },
  SLOT:{
    MORNING:1,
    AFTERNOON:2,
    EVENING:3
  },
  FEEDBACK_STATUS: {
    REQUESTED: 0,
    APPROVED: 1,
    REJECTED: 2,
    DELETED: 3,
  },
  MASTER_FEEDBACK_STATUS: {
    INACTIVE: 0,
    ACTIVE: 1,
  },
  DOCTOR_STATUS: {
    INACTIVE: 0,
    ACTIVE: 1,
  },
  PROFILE_STEPS: {
    SECTION_A: 1,
    SECTION_B: 2,
    SECTION_C: 3,
    COMPLETED: 4,
  },
  // DEVICE_TYPE: {
  //   IOS: 0,
  //   ANDROID: 1,
  //   WINDOWS: 2,
  //   BROWSER: 3,
  // },
  DEVICE_TYPE: {
    MOBILE: 0,
    TABLET: 1,
    DESKTOP: 2,
  },
  OS_TYPE:{ //Added new type
    IOS: 0,
    ANDROID: 1,
    WINDOWS: 2,
    BROWSER: 3,
    LINUX:4,
    MAC:5
  },
  PROFILE_STATUS: {
    PENDING: 1,
    APPROVE: 2,
    REJECT: 3,
    DELETE: 4,
    DEACTIVATE: 5,
  },
  GENDER: {
    MALE: 1,
    FEMALE: 2,
    OTHER: 3,
  },
  CREATOR: {
    ADMIN: 1,
    SELF: 2,
  },
  ESTABLISHMENT_TYPE: {
    "OWN A ESTABLISHMENT": 1,
    "VISIT A ESTABLISHMENT": 2,
  },
  NOTIFICATION_TYPE: {
    PHONE: 1,
    EMAIL: 2,
    WHATSAPP: 3,
  },
  ESTABLISHMENT_PROOF: {
    "THE OWNER OF THE ESTABLISHMENT": 1,
    "HAVE RENTED AT OTHER ESTABLISHMENT": 2,
    "A CONSULTING DOCTOR": 3,
    "PRACTICING AT HOME": 4,
  },
  OTP_MODE: {
    SMS: 0,
    CALL: 1,
  },
  ORDERING_KEYS: {
    ASC: "ASC",
    DESC: "DESC",
  },
  ORDER: {
    ASC: 1,
    DESC: -1,
  },
  LIST: {
    DEFAULT_PAGINATION_LIMIT: 10,
    DEFAULT_SORT: "createdAt",
    ORDERING_KEYS: {
      ASC: "ASC",
      DESC: "DESC",
    },
    ORDER: {
      ASC: 1,
      DESC: -1,
    },
    MIN_VALUE: 1,
  },
  ID_LENGTH: 24,
  NA: null,
  BLOOD_GROUP: {
    A_PLUS: 1,
    A_MINUS: 2,
    B_PLUS: 3,
    B_MINUS: 4,
    O_PLUS: 5,
    O_MINUS: 6,
    AB_PLUS: 7,
    AB_MINUS: 8,
  },
  AGE_GROUP: {
    BELOW_18: 1,
    "18-24": 2,
    "25-34": 3,
    "35-44": 4,
    "45-64": 5,
    "65+": 6,
  },
  AGE_GROUP_VALUES: {
    1: {
      MIN_AGE: 0,
      MAX_AGE: 17,
    },
    2: {
      MIN_AGE: 18,
      MAX_AGE: 24,
    },
    3: {
      MIN_AGE: 25,
      MAX_AGE: 34,
    },
    4: {
      MIN_AGE: 35,
      MAX_AGE: 44,
    },
    5: {
      MIN_AGE: 45,
      MAX_AGE: 64,
    },
    6: {
      MIN_AGE: 65,
    },
  },
  REGEX_FOR_PINCODE: /^\d{6}$/,
  PATIENT_CLINICAL_RECORDS: {
    VITAL_SIGNS: 1,
    CLINICAL_NOTES: 2,
    MEDICINES: 3,
    LAB_TEST: 4,
    FILES: 5,
  },
  DOCTOR_PATIENT_LIST: {
    TODAY: 1,
    ALL_TIME: 2,
  },
  PATIENT_CLINICAL_RECORDS_KEY: {
    1: "vital",
    2: "clinicalNotes",
    3: "medicine",
    4: "labTest",
    5: "files",
  },
  DOCTOR_PROFILE: {
    EDUCATION: 1,
    AWARDS_AND_RECOGNITION: 2,
    MEDICAL_REGISTRATION: 3,
    SERVICES: 4,
    MEMBERSHIPS: 5,
    SOCIALS: 6
  },
  DOCTOR_PROFILE_RECORD_KEY: {
    1: "education",
    2: "award",
    3: "medicalRegistration",
    4: "service",
    5: "membership",
    6: "social"
  },
  DOCTOR_PROFILE_MESSAGE: {
    1: "EDUCATION_DATA",
    2: "AWARDS_AND_RECOGNITION_DATA",
    3: "MEDICAL_REGISTRATION_DATA",
    4: "SERVICES_DATA",
    5: "MEMBERSHIP_DATA",
    6: "SOCIAL_DATA"
  },
  ACCEPT_HEADERS_LANGAUAGE: ["en", "zh"],
  LANGUAGES_SUPPORTED: {
    ENGLISH: 1
  },
  TIME_SLOT_RANGE_VALUES: {
    MORNING: 1,
    AFTERNOON: 2,
    EVENING: 3
  },
  DEFAULT_TIME_SLOT_APPOINTMENT: 15,
  PROFILE_DETAILS: {
    SIGN_UP: 1,
    OTHERS: 2,
    ADMIN: 3
  },
  MASTER_DATA: {
    HOSPITAL_TYPE: 1,
    STATE: 2,
    CITY: 3,
    PROCEDURE: 4,
    SPECIALITY: 5,
    DEGRESS: 6,
    COLLEGES: 7,
    SURGERY: 8,
    SOCIAL_MEDIA: 9,
    SPECIALIZATION: 10
  },
  DAYS_OF_WEEK : {
    0: "mon",
    1: "tue",
    2: "wed",
    3: "thu",
    4: "fri",
    5: "sat",
    6: "sun",
  },
  HOSPITAL_DETAIL_TYPE: {
    ADMIN: 1,
    HOSPITAL: 2
  },
  HOSPITAL_SCREENS: {
    ESTABLISHMENT_DETAILS: 1,
    ESTABLISHMENT_PROOF: 2,
    ESTABLISHMENT_LOCATION: 3,
    ESTABLISHMENT_TIMING: 4,
    COMPLETED: 5
  },
  DOCTOR_SCREENS: {
    DOCTOR_DETAILS: 1,
    MEDICAL_REGISTRATION: 2,
    EDUCATION: 3,
    ESTABLISHMENT_OWNER: 4,
    ESTABLISHMENT_DETAILS: 5,
    DOCTOR_IDENTITY_PROOF: 6,
    DOCTOR_MEDICAL_PROOF: 7,
    DOCTOR_ESTABLISHMENT_PROOF: 8,
    ESTABLISHMENT_LOCATION: 9,
    ESTABLISHMENT_TIMING: 10,
    ESTABLISHMENT_FEES: 11,
    COMPLETED: 12
  },
  NAME_CONSTANT: ["fullName", "hospitalName", "doctorName", "patientName", "name"],  
  SPECIALITY_PROCEDURE : {
    SPECIALITY: 1,
    PROCEDURE: 2
  },
  SPECIALITY_PROCEDURE_RECORD_KEY: {
    1: "speciality",
    2: "procedure",
  },
  APPOINTMENT_LIST: {
    "doctorName": "lowerDoctorName",
    "patientName": "lowerPatientName"
  },
  CALENDAR_LIST: {
    TODAY: 1,
    WEEK: 2,
    MONTH: 3
  }
};
