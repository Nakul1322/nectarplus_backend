const { Schema } = require("mongoose");
const { constants } = require("../utils/index");
const db = require("../config/database").getUserDB();

const hospitalSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "users",
    },
    profilePic: {
      type: String,
      default: null,
    },
    city: {
      type: String,
      default: null,
    },
    totalDoctor: {
      type: Number,
      default: 0,
    },
    hospitalType: {
      type: Schema.Types.ObjectId,
      ref: "hospitaltypes",
    },
    isOwner: {
      type: Boolean,
    },
    totalBed: {
      type: Number,
    },
    ambulance: {
      type: Number,
    },
    about: {
      type: String,
    },
    service: [
      {
        name: {
          type: String,
        },
      },
    ],
    social: [
      {
        type: {
          type: Schema.Types.ObjectId,
          ref: "socialmedias",
        },
        url: {
          type: String,
        },
      },
    ],
    image: [
      {
        url: {
          type: String,
        },
      },
    ],
    specialization: [
      {
        type: Schema.Types.ObjectId,
        ref: "Specialization",
      },
    ],
    steps: {
      type: Number,
      enum: constants.PROFILE_STEPS,
      default: constants.PROFILE_STEPS.SECTION_A,
    },
    speciality: [
      {
        type: Schema.Types.ObjectId,
        ref: "specializations",
      },
    ],
    procedure: [
      {
        type: Schema.Types.ObjectId,
        ref: "proceduremasters",
      },
    ],
    address: {
      landmark: {
        type: String,
      },
      locality: {
        type: String,
      },
      city: {
        type: String,
      },
      state: {
        type: Schema.Types.ObjectId,
        ref: "statemasters",
      },
      country: {
        type: String,
        default: "India",
      },
      pincode: {
        type: String,
      },
    },
    isLocationShared: {
      type: Boolean,
      default: false,
    },
    location: {
      type: {
        type: String,
        default: "Point",
      },
      coordinates: {
        type: [
          {
            type: Number,
          },
        ],
        default: [77.216721, 28.6448],
        index: "2dsphere",
      },
    },
    publicUrl: {
      type: String,
    },
    isVerified: {
      type: Number,
      enum: constants.PROFILE_STATUS,
      default: constants.PROFILE_STATUS.PENDING,
    },
    rejectReason: {
      type: String,
    },
    establishmentProof: [
      {
        url: {
          type: String,
          default: null,
        },
        fileType: {
          type: String,
          default: null,
        },
      },
    ],
    status: {
      type: String,
      enum: constants.PROFILE_STATUS.PENDING,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "users",
    },
    profileScreen: {
      type: Number,
      enum: constants.HOSPITAL_SCREENS,
      default: constants.HOSPITAL_SCREENS.ESTABLISHMENT_DETAILS,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

const Hospital = db.model("Hospital", hospitalSchema);

module.exports = {
  model: Hospital,
};
