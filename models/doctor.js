const { Schema } = require("mongoose");
const { constants } = require("../utils/index");
const db = require("../config/database").getUserDB();

const doctorSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "users", // reference the users collection
    },
    specialization: [
      {
        type: Schema.Types.ObjectId,
        ref: "specializations",
        default: null, // reference the specializations collection
      },
    ],
    email: {
      type: String,
      default: null,
    },
    gender: {
      type: Number,
      enum: constants.GENDER,
      default: constants.GENDER.MALE,
    },
    city: {
      type: String,
      default: null,
    },
    medicalRegistration: [
      {
        registrationNumber: {
          type: String,
          default: null,
        },
        council: {
          type: String,
          default: null,
        },
        year: {
          type: String,
          default: null,
        },
      },
    ],
    education: [
      {
        degree: {
          type: String,
          default: null,
        },
        college: {
          type: String,
          default: null,
        },
        year: {
          type: String,
          default: null,
        },
      },
    ],
    award: [
      {
        name: {
          type: String,
        },
        year: {
          type: String,
          default: null,
        },
      },
    ],
    membership: [
  {    
  name:  {
        type: String,
        default: null,
      }},
    ],
    social: [
      {
        socialMediaId: {
          type: Schema.Types.ObjectId,
          ref: 'socialmedias',
          default: null,
        },
        url: {
          type: String,
          default: null,
        },
      },
    ],
    service: [
      {
        name: {
          type: String,
          default: null,
        },
      },
    ],
    experience: {
      type: String,
      default: null,
    },
    identityProof: [{
      url: {
      type: String,
      default: null
      },
      fileType: {
        type: String,
        default: null
      }
    }],
    medicalProof: [{
      url: {
      type: String,
      default: null
      },
      fileType: {
        type: String,
        default: null
      }
    }],
    profilePic: {
      type: String,
      default: null,
    },
    about: {
      type: String,
      default: null,
    },
    publicUrl: {
      type: String,
      default: null,
    },
    rating: {
      type: Number,
      default: null,
    },
    recommended: {
      type: Number,
      default: null,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "users", // reference the users collection
    },
    status: {
      type: Number,
      enum: constants.DOCTOR_STATUS,
      default: constants.DOCTOR_STATUS.ACTIVE,
    },
    isVerified: {
      type: Number,
      enum: constants.PROFILE_STATUS,
      default: constants.PROFILE_STATUS.PENDING,
    },
    rejectReason: {
      type: String,
      // required: true,
    },
    steps: {
      type: Number,
      enum: constants.PROFILE_STEPS,
      default: constants.PROFILE_STEPS.SECTION_A
    },
    profileScreen: {
      type: Number,
      enum: constants.DOCTOR_SCREENS,
      default: constants.DOCTOR_SCREENS.DOCTOR_DETAILS
    }
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

const Doctor = db.model("doctors", doctorSchema);

module.exports = {
  model: Doctor,
};
