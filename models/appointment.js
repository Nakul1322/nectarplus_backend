const { Schema } = require("mongoose");
const { constants } = require("../utils/index");
const db = require("../config/database").getUserDB();
const { genUUID } = require("../utils/helper");

const appointmentSchema = new Schema(
  {
    doctorId: {
      type: Schema.Types.ObjectId,
      ref: "doctors",
    },
    establishmentId: {
      type: Schema.Types.ObjectId,
      ref: "establishmentmasters",
    },
    isDeleted: {
      type: Boolean,
      default: false,
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
    },
    startTime: {
      type: Date,
      default: Date.now(),
    },
    date: {
      type: Date,
    },
    slot: {
      type: Number,
      enum: constants.SLOT,
    },
    patientId: {
      type: Schema.Types.ObjectId,
      ref: "patients",
    },
    self: {
      type: Boolean,
      default: true,
    },
    fullName: {
      type: String,
    },
    phone: {
      type: String,
    },
    email: {
      type: String,
    },
    city: {
      type: String,
      default: null,
    },
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
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "users",
    },
    modifiedBy: {
      type: Schema.Types.ObjectId,
      ref: "users",
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
