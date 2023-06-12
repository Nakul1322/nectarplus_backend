const { Schema } = require("mongoose");
const { constants } = require("../utils/index");
const db = require("../config/database").getUserDB();
const { genUUID } = require("../utils/helper");

const appointmentSchema = new Schema(
  {
    doctorId: {
      type: Schema.Types.ObjectId,
      ref: "doctors",
      // required: true,
    },
    establishmentId: {
      type: Schema.Types.ObjectId,
      ref: "establishmentmasters",
      // required: true,
    },
    appointmentId: {
      type: String,
      default: function () {
        const uuid = genUUID();
        const numericCode = parseInt(uuid.replace(/-/g, "").slice(0, 6), 16);
        return numericCode.toString().padStart(6, "0");
      },
    },
    slotTime: {
      type: Number,
      default: 15,
    },
    consultationFees: {
      type: Number,
      // required: true,
    },
    startTime: {
      type: Date,
      default: Date.now(),
    },
    date: {
      type: Date,
      // required: true,
    },
    slot: {
      type: Number,
      enum: constants.SLOT,
    },
    patientId: {
      type: Schema.Types.ObjectId,
      ref: "patients",
      // required: true,
    },
    self: {
      type: Boolean,
      default: true,
    },
    fullName: {
      type: String,
      // required: true,
    },
    phone: {
      type: String,
      // required: true,
    },
    email: {
      type: String,
      // required: true,
    },
    city: {
      type: String,
      default: null,
    },
    // os: {
    //   type: String,
    // },
    // browser: {
    //   type: String,
    // },
    // device: {
    //   type: String,
    // },
    cancelBy: {
      type: Number,
      enum: constants.CANCEL_BY,
    },
    reason: {
      type: String,
      default: null,
    },
    notes: {
      type: String,
      default: null,
    },
    status: {
      type: Number,
      default: constants.BOOKING_STATUS.BOOKED,
      // required: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "users", // reference the users collection
    },
    modifiedBy: {
      type: Schema.Types.ObjectId,
      ref: "users", // reference the users collection
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

const Appointment = db.model("appointments", appointmentSchema);

module.exports = {
  model: Appointment,
};
