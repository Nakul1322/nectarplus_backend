const { Schema } = require("mongoose");
const { constants } = require("../utils/index");
const db = require("../config/database").getUserDB();

const establishmentTimingSchema = new Schema(
  {
    doctorId: {
      type: Schema.Types.ObjectId,
      ref: "doctors",
    },
    hospitalId: {
      type: Schema.Types.ObjectId,
      ref: "hospitals",
    },
    establishmentId: {
      type: Schema.Types.ObjectId,
      ref: "establishmentmasters",
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
    isOwner: {
      type: Boolean,
      default: false,
    },
    slotTime: {
      type: Number,
      default: 15,
    },
    specility: [
      {
        type: Schema.Types.ObjectId,
        ref: "specializations",
        default: null, // reference the specializations collection
      },
    ],
    procedure: [
      {
        type: Schema.Types.ObjectId,
        ref: "ProcedureMaster",
        default: null, // reference the ProcedureMaster collection
      },
    ],
    mon: [
      {
        slot: {
          type: String,
        },
        from: {
          type: String,
        },
        to: {
          type: String,
        },
      },
    ],
    tue: [
      {
        slot: {
          type: String,
        },
        from: {
          type: String,
        },
        to: {
          type: String,
        },
      },
    ],
    wed: [
      {
        slot: {
          type: String,
        },
        from: {
          type: String,
        },
        to: {
          type: String,
        },
      },
    ],
    thu: [
      {
        slot: {
          type: String,
        },
        from: {
          type: String,
        },
        to: {
          type: String,
        },
      },
    ],
    fri: [
      {
        slot: {
          type: String,
        },
        from: {
          type: String,
        },
        to: {
          type: String,
        },
      },
    ],
    sat: [
      {
        slot: {
          type: String,
        },
        from: {
          type: String,
        },
        to: {
          type: String,
        },
      },
    ],
    sun: [
      {
        slot: {
          type: String,
        },
        from: {
          type: String,
        },
        to: {
          type: String,
        },
      },
    ],
    isVerified: {
      type: Number,
      enum: [
        constants.PROFILE_STATUS.APPROVE,
        constants.PROFILE_STATUS.REJECT,
        constants.PROFILE_STATUS.PENDING,
      ],
      default: constants.PROFILE_STATUS.PENDING,
    },
    rejectReason: {
      type: String,
    },
    consultationFees: {
      type: Number,
    },
    addedFor: {
      type: Number,
      enum: [constants.USER_TYPES.DOCTOR, constants.USER_TYPES.HOSPITAL],
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "users",
      default: null,
    },
    modifiedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

const EstablishmentTiming = db.model(
  "EstablishmentTiming",
  establishmentTimingSchema
);

module.exports = {
  model: EstablishmentTiming,
};
