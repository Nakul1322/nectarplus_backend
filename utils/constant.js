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
  BOOKING_STATUS: {
    BOOKED: 0,
    CANCEL: -1,
    COMPLETE: 1,
    PENDING: 2,
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
  SLOT: {
    MORNING: 1,
    AFTERNOON: 2,
    EVENING: 3,
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
  DEVICE_TYPE: {
    MOBILE: "mobile",
    TABLET: "tablet",
    DESKTOP: "desktop",
  },
  OS_TYPE: {
    IOS: 0,
    ANDROID: 1,
    WINDOWS: 2,
    BROWSER: 3,
    LINUX: 4,
    MAC: 5,
  },
  PROFILE_STATUS: {
    PENDING: 1,
    APPROVE: 2,
    REJECT: 3,
    DELETE: 4,
    DEACTIVATE: 5,
    ACTIVE: 2,
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
    APPOINTMENT_CONFIRMATION: 1,
    APPOINTMENT_REMINDER: 2,
    APPOINTMENT_CANCELLATION: 3,
    APPOINTMENT_RESCHEDULE: 4,
    FEEDBACK_GIVEN_PATIENT: 5,
    FEEDBACK_APPROVED: 6,
    DOCTOR_SIGN_UP_PROOFS: 7,
    HOSPITAL_SIGN_UP_PROOFS: 8,
    DOCTOR_PROFILE_DELETION: 9,
    HOSPITAL_PROFILE_DELETION: 10,
    SURGERY_LEAD: 11,
    DOCTOR_VISIT_ESTABLISHMENT: 12,
  },
  ESTABLISHMENT_PROOF: {
    "THE OWNER OF THE ESTABLISHMENT": 1,
    "HAVE RENTED AT OTHER ESTABLISHMENT": 2,
    "A CONSULTING DOCTOR": 3,
    "PRACTICING AT HOME": 4,
  },
  OTP_MODE: {
    SMS: 1,
    CALL: 2,
    EMAIL: 3,
    WHATSAPP: 4,
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
    MEMBERSHIPS: 4,
    SERVICES: 5,
    SOCIALS: 8,
  },
  DOCTOR_PROFILE_RECORD_KEY: {
    1: "education",
    2: "award",
    3: "medicalRegistration",
    4: "membership",
    5: "service",
    8: "social",
  },
  DOCTOR_PROFILE_MESSAGE: {
    1: "EDUCATION_DATA",
    2: "AWARDS_AND_RECOGNITION_DATA",
    3: "MEDICAL_REGISTRATION_DATA",
    4: "MEMBERSHIP_DATA",
    5: "SERVICES_DATA",
    8: "SOCIAL_DATA",
  },
  ACCEPT_HEADERS_LANGAUAGE: ["en", "zh"],
  LANGUAGES_SUPPORTED: {
    ENGLISH: 1,
  },
  TIME_SLOT_RANGE_VALUES: {
    MORNING: 1,
    AFTERNOON: 2,
    EVENING: 3,
  },
  DEFAULT_TIME_SLOT_APPOINTMENT: 15,
  PROFILE_DETAILS: {
    SIGN_UP: 1,
    OTHERS: 2,
    ADMIN: 3,
  },
  MASTER_DATA: {
    HOSPITAL_TYPE: 1,
    STATE: 2,
    PROCEDURE: 4,
    SURGERY: 8,
    SOCIAL_MEDIA: 9,
    SPECIALIZATION: 10,
  },
  DAYS_OF_WEEK: {
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
    HOSPITAL: 2,
  },
  HOSPITAL_SCREENS: {
    ESTABLISHMENT_DETAILS: 1,
    ESTABLISHMENT_PROOF: 2,
    ESTABLISHMENT_LOCATION: 3,
    ESTABLISHMENT_TIMING: 4,
    COMPLETED: 5,
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
    COMPLETED: 12,
  },
  NAME_CONSTANT: [
    "fullName",
    "hospitalName",
    "doctorName",
    "patientName",
    "name",
  ],
  SPECIALITY_PROCEDURE: {
    SPECIALITY: 1,
    PROCEDURE: 2,
  },
  SPECIALITY_PROCEDURE_RECORD_KEY: {
    1: "speciality",
    2: "procedure",
  },
  APPOINTMENT_LIST: {
    doctorName: "lowerDoctorName",
    patientName: "lowerPatientName",
  },
  CALENDAR_LIST: {
    TODAY: 1,
    WEEK: 2,
    MONTH: 3,
  },
  USER_STATUS_LIST: {
    DELETE: 1,
    REJECT: 2,
    INACTIVE: 3,
  },
  TOKEN_TYPE: {
    LOGIN: 1,
    VERIFICATION: 2,
    APPOINTMENT: 3,
  },
  DAYS: {
    MON: 0,
    TUE: 1,
    WED: 2,
    THU: 3,
    FRI: 4,
    SAT: 5,
    SUN: 1,
  },
  HOSPITAL_SERVICE_TYPES: {
    DOCTOR: 1,
    HOSPITAL: 2,
  },
  HOSPITAL_APPOINTMENT_LIST_TYPES: {
    TODAY: 1,
    UPCOMING: 2,
  },
  SURGERY_LEAD_TYPES: {
    PENDING: 1,
    INTERESTED: 2,
    NOT_INTERESTED: 3,
    NO_RESPONSE: 4,
    WRONG_NUMBER: 5,
    CALL_BACK_LATER: 6,
    APPOINTMENT_FIXED: 7,
    COMPLETED: 8,
  },
  SURGERY_LEAD_SOURCES: {
    WEBSITE: "website",
    FACEBOOK: "facebook",
  },
  SURGERY_CLAIM_BY: {
    ADMIN: 1,
  },
  SURGERY_LIST_SORT: {
    name: "lowerName",
    surgeryName: "lowerSurgeryName",
  },
  SURGERY_ENQUIRY_LIST_TYPE: {
    TODAY: 1,
    UPCOMING: 2,
    ALL_TIME: 3,
  },
  regexForMobile: /^\d{10}$/,
  regexForMobileEnquiry: /^\d$/,
  ADMIN_DASHBOARD_TYPE_LIST: {
    APPOINTMENT: 1,
    SURGERY_LEAD: 2,
  },
  MAIL_IMAGES: {
    LINKEDIN:
      "https://nectorplus.s3.ap-south-1.amazonaws.com/13c0c570-31bb-11ee-a0c0-ad1b782616cb-Linkedin.png",
    FACEBOOK:
      "https://nectorplus.s3.ap-south-1.amazonaws.com/41b9e010-31bb-11ee-a0c0-ad1b782616cb-Facebook.png",
    TWITTER:
      "https://nectorplus.s3.ap-south-1.amazonaws.com/a03380b0-5df3-11ee-bc42-013c92cb596b-x.png",
    INSTAGRAM:
      "https://nectorplus.s3.ap-south-1.amazonaws.com/74e2a580-31bb-11ee-a0c0-ad1b782616cb-Instagram.png",
    YOUTUBE:
      "https://nectorplus.s3.ap-south-1.amazonaws.com/916513f0-31bb-11ee-a0c0-ad1b782616cb-YouTube.png",
    NECTAR_LOGO:
      "https://nectorplus.s3.ap-south-1.amazonaws.com/aa697f30-31bb-11ee-a0c0-ad1b782616cb-Nectar%20Logo.png",
    VERIFY_VECTAR_SVG:
      "https://nectorplus.s3.ap-south-1.amazonaws.com/bddbd450-31bb-11ee-a0c0-ad1b782616cb-Vector.png",
    CANCEL:
      "https://nectorplus.s3.ap-south-1.amazonaws.com/d3c56b00-31bb-11ee-a0c0-ad1b782616cb-Cancel.png",
    TODAY:
      "https://nectorplus.s3.ap-south-1.amazonaws.com/e742bca0-31bb-11ee-a0c0-ad1b782616cb-Today.png",
    NECTAR_LOGO_SVG:
      "https://nectorplus.s3.ap-south-1.amazonaws.com/00c70640-31bc-11ee-a0c0-ad1b782616cb-Nectar%20Logo%20%281%29.png",
    REMINDER:
      "https://nectorplus.s3.ap-south-1.amazonaws.com/13dbd210-31bc-11ee-a0c0-ad1b782616cb-reminder%201.png",
    HELP: "https://nectorplus.s3.ap-south-1.amazonaws.com/2b1bd540-35d3-11ee-b256-a5c7a40b76f5-Help.png",
    HOSPITAL_LOGO: "https://nector-prod.s3.ap-south-1.amazonaws.com/750ca970-7d6f-11ee-9e5b-abda31f383a9-33777.png",
    DOCTOR_LOGO: "https://nector-prod.s3.ap-south-1.amazonaws.com/f7c3f300-7d6f-11ee-9e5b-abda31f383a9-doctor.png"
  },
  MESSAGES: {
    DOCTOR_SIGN_UP_PROOFS: {
      TITLE: "We have received an application for a Doctor",
      BODY: null,
    },
    HOSPITAL_SIGN_UP_PROOFS: {
      TITLE: "We have received an application for a Hospital",
      BODY: null,
    },
    DOCTOR_PROFILE_DELETION: {
      TITLE: " have decided to delete their account.",
      BODY: null,
    },
    HOSPITAL_PROFILE_DELETION: {
      TITLE: " have decided to delete their account.",
      BODY: null,
    },
    SURGERY_LEAD: {
      TITLE: "New Surgery lead generated.",
      BODY: "You have received a lead for the Surgery.",
    },
    FEEDBACK_GIVEN_PATIENT: {
      TITLE: "New patient review received.  Waiting for your approval.",
      BODY: null,
    },
    FEEDBACK_APPROVED: {
      TITLE:
        "Congratulations! You have received [starsCount] stars based on recent patient reviews.",
      BODY: null,
    },
    APPOINTMENT_CONFIRMATION: {
      BODY: {
        DOCTOR:
          "You have an appointment for [date] at [slotTime] [timeZone] with Patient [patientName]. \nPatient ID:- [patientId]",
        HOSPITAL:
          "[doctorName] has an appointment for [date] [slotTime] [timeZone] with Patient [patientName]. \nPatient ID:- [patientId]",
        PATIENT: `Your appoinment has been Confirmed with [doctorName] at [hospitalName].

        Appointment ID:- [appointmentId]
        Date : [date]
        Time : [slotTime] [timeZone]
        Address : [address](Google MAP)
        
        To RESCHEDULE appointment - [serverUrl]
        To CANCEL appoinment -[serverUrl]`,
      },
      TITLE: {
        DOCTOR: "New appointment received for [date] [slotTime] [timeZone]",
        HOSPITAL:
          "[doctorName] received an appointment for [date]  [slotTime] [timeZone]",
      },
    },
    APPOINTMENT_CANCELLATION: {
      BODY: {
        DOCTOR: `We would like to inform you that Patient [patientName] has canceled their upcoming appointment scheduled with you. The details of the canceled appointment are as follows:

        Patient: [patientName]
        Patient ID:- [patientId]
        Appointment Date: [date]
        Appointment Time: [slotTime] [timeZone]
        
        Please update your schedule.
        
        Thanks`,
        HOSPITAL: `Dear [hospitalName] Team,
        
        We would like to inform you that Patient [patientName] has canceled their upcoming appointment scheduled with you. The details of the canceled appointment are as follows:

        Patient: [patientName]
        Patient ID:- [patientId]
        Doctor: [doctorName]
        Appointment Date: [date]
        Appointment Time: [slotTime] [timeZone]
        
        Please update your schedule.
        
        Thanks`,
        PATIENT: `We regret to inform you that your appointment with [doctorName] on [date] at [slotTime] [timeZone] has been canceled due to unforeseen circumstances. We apologize for any inconvenience caused. Our team will contact you shortly to reschedule the appointment.

        For urgent concerns, please contact our support team at info@nectarplus.health.
        
        Thank you for your understanding.
        
        For future appointment bookings, please visit nectarplus.health.`,
      },
      TITLE: {
        DOCTOR: `Appointment cancelled for [date] [slotTime] [timeZone].`,
        HOSPITAL: `[doctorName] Appointment cancelled for [date] [slotTime] [timeZone].`,
      },
    },
    APPOINTMENT_RESCHEDULE: {
      BODY: {
        DOCTOR: `We would like to inform you that Patient [patientName] has canceled their upcoming appointment scheduled with you. The details of the canceled appointment are as follows:

        Patient: [patientName]
        Patient ID:- [patientId]
        Appointment Date: [date]
        Appointment Time: [slotTime] [timeZone]
        
        Please update your schedule.
        
        Thanks`,
        HOSPITAL: `Dear [hospitalName] Team,
        
        We would like to inform you that Patient [patientName] has canceled their upcoming appointment scheduled with you. The details of the canceled appointment are as follows:

        Patient: [patientName]
        Patient ID:- [patientId]
        Doctor: [doctorName]
        Appointment Date: [date]
        Appointment Time: [slotTime] [timeZone]
        
        Please update your schedule.
        
        Thanks`,
        PATIENT: `We regret to inform you that your appointment with [doctorName] on [date] at [slotTime] [timeZone] has been canceled due to unforeseen circumstances. We apologize for any inconvenience caused. Our team will contact you shortly to reschedule the appointment.

        For urgent concerns, please contact our support team at info@nectarplus.health.
        
        Thank you for your understanding.
        
        For future appointment bookings, please visit nectarplus.health.`,
      },
      TITLE: {
        DOCTOR: `Appointment reschedule for [date] [slotTime] [timeZone].`,
        HOSPITAL: `[doctorName] Appointment reschedule for [date] [slotTime] [timeZone].`,
      },
    },
    DOCTOR_VISIT_ESTABLISHMENT: {
      TITLE: {
        DOCTOR:
          "New inclusion request from [hospitalName]. Waiting for your approval.",
        HOSPITAL:
          "New inclusion request from [doctorName]. Waiting for your approval.",
      },
      BODY: null,
    },
  },
  SERVER: {
    PROD: "prod",
    STAGE: "staging",
    DEVELOPMENT: "development",
  },
  SMS_TEMPLATES: {
    OTP: 9735,
    HOSPITAL_DELETE_ACC: 9924,
    PATIENT_RESCHEDULE: 9926,
    HOSPITAL_ACCEPT: 9923,
    DOCTOR_REGISTRATION: 9922,
    SURGERY_LEAD: 9921,
    PATIENT_APPT_CANCEL: 9920,
    DOCTOR_DELETE_ACC: 9919,
    HOSPITAL_REGISTRATION: 9918,
    DOCTOR_ACCEPT: 9917,
    PATIENT_APPT_CONFIRM: 9916,
    PATIENT_REVIEW: 9915,
  },
  EMAIL_TEMPLATES: {
    DOCTOR_PROFILE_UNDER_VERIFICATION: 233,
    TEMPLATE_LAYOUT: 238,
    DOCTOR_DELETE_ACC: 238,
    CONTACT_US: 239,
    APPOINTMENT_CANCELLATION: 246,
    APPOINTMENT_CONFIRMATION: 247,
    APPOINTMENT_RESCHEDULE: 248,
    APPOINTMENT_REMINDER_TOMORROW: 249,
    APPOINTMENT_REMINDER_TODAY: 250,
    DOCTOR_PROFILE_APPROVED: 251,
    DOCTOR_PROFILE_REJECTED: 254,
    DOCTOR_REMOVAL_HOSPITAL: 255,
    EMAIL_OTP: 256,
  },
  SCREEN: {
    DOCTOR_LOGIN: "bit.ly/48wkDex",
    HOSPITAL_LOGIN: "bit.ly/3LEUpg7",
    PATIENT_LOGIN: "bit.ly/46jbvs8",
  },
  VIEWS: {
    APPOINTMENT_CANCELLATION: "/views/appointment-cancel.html",
    APPOINTMENT_CONFIRMATION: "/views/appointment-confirmed.html",
    APPOINTMENT_REMINDER_TOMORROW: "/views/appointment-reminder-tomorrow.html",
    APPOINTMENT_REMINDER_TODAY: "/views/appointment-reminder-today.html",
    APPOINTMENT_RESCHEDULE: "/views/appointment-reschedule.html",
    DOCTOR_DELETE_ACC: "/views/doctor-profile-deletion.html",
    DOCTOR_PROFILE_UNDER_VERIFICATION:
      "/views/doctor-profile-under-verification.html",
    DOCTOR_APPROVED: "/views/doctor-verified-successfully.html",
    DOCTOR_REJECTED: "/views/doctor-profile-disapproval.html",
    DOCTOR_REMOVAL_HOSPITAL: "/views/doctor-removal-by-hospital.html",
  },
  arrayForSpecialization: [
    "Orthopedist",
    "Dentist",
    "Gynecologist",
    "General Physician",
    "Dermatologist",
    "ENT (ear, nose and throat)",
    "Homeopathy",
    "Ayurveda",
    "General Surgery",
    "Ophthalmologist",
    "Oncologist",
    "Urologist",
    "Physiotherapist",
    "Pediatrician",
    "Cardiologist",
    "Psychiatrist (Stress & Mental health)",
    "Gastroenterologist",
    "Neurologist",
    "Radiologist",
    "Infertility Specialist",
  ],
  EMAIL_ROUTE_URL: {
    BASE: "https://nectarplus.health/confirm-booking?id=",
    PARAMETERS: "&isEmail=true&user=patient&route=confirm-booking",
  },
  NECTAR_SOCIAL_LINKS: {
    FB: "https://www.facebook.com/nectarplushealth",
    X: "https://twitter.com/nectarhealth_IN",
    YT: "https://www.youtube.com/@nectarplushealth",
    IG: "https://www.instagram.com/nectarplushealth/",
    LINKEDIN: "https://www.linkedin.com/company/nectar-plus-health/about/",
  },
  HOSPITAL_TYPE_CATEGORY: {
    HOSPITAL: 1,
    CLINIC: 2
  }
};
