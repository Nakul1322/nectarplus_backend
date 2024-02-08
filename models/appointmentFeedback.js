const { Schema } = require("mongoose");
const { constants } = require("../utils/index");
const db = require("../config/database").getUserDB();

const appointmentFeedbackSchema = new Schema(
  {
    appointmentId: {
      type: Schema.Types.ObjectId,
      ref: "appointments",
    },
    doctorId: {
      type: Schema.Types.ObjectId,
      ref: "doctors",
    },
    patientId: {
      type: Schema.Types.ObjectId,
      ref: "patients",
    },
    establishmentId: {
      type: Schema.Types.ObjectId,
      ref: "establishmentmasters",
      // required: true,
    },
    anonymous: {
      type: Boolean,
      default: false,
    },
    experience: [
      {
        questionNo: {
          type: Number,
          // required: true,
        },
        option: [
          {
            type: String,
            // required: true,
          },
        ],
        point: {
          type: Number,
          // required: true,
        },
      },
    ],
    treatment: [
      {
        type: String,
      },
    ],
    totalPoint: {
      type: Number,
      default: 0,
    },
    feedback: {
      type: String,
      // required: true,
    },
    reason: {
      type: String,
      // required: true,
    },
    status: {
      type: Number,
      enum: constants.PROFILE_STATUS,
      default: constants.PROFILE_STATUS.PENDING,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    modifiedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

const AppointmentFeedback = db.model(
  "AppointmentFeedback",
  appointmentFeedbackSchema
);

module.exports = {
  model: AppointmentFeedback,
};
