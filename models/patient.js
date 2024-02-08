const { Schema } = require("mongoose");
const { constants } = require("../utils/index");
const db = require("../config/database").getUserDB();

const patientSchema = new Schema(
  {
    steps: {
      type: Number,
      enum: constants.PROFILE_STEPS,
      default: constants.PROFILE_STEPS.COMPLETED,
    },
    isVerified: {
      type: Number,
      enum: constants.PROFILE_STATUS,
      default: constants.PROFILE_STATUS.APPROVE,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "users",
    },
    languagePreference: {
      type: Number,
      enum: constants.LANGUAGES_SUPPORTED,
      default: constants.LANGUAGES_SUPPORTED.ENGLISH,
    },
    email: {
      type: String,
      default: null,
    },
    gender: {
      type: Number,
      enum: constants.GENDER,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    dob: {
      type: Date,
      // required: true,
      default: null,
    },
    bloodGroup: {
      type: Number,
      enum: constants.BLOOD_GROUP,
      default: null,
    },
    address: {
      houseNo: {
        type: String,
        default: null,
      },
      landmark: {
        type: String,
        default: null,
      },
      locality: {
        type: String,
        default: null,
      },
      city: {
        type: String,
        default: null,
      },
      state: {
        type: Schema.Types.ObjectId,
        ref: "statemasters",
        default: null,
      },
      pincode: {
        type: String,
        default: null,
      },
      country: {
        type: String,
        default: "India",
      },
    },
    profilePic: {
      type: String,
      default: null,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "users",
      default: null,
    },
    modifiedBy: {
      type: Schema.Types.ObjectId,
      ref: "users",
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

const Patient = db.model("patients", patientSchema);

module.exports = {
  model: Patient,
};
