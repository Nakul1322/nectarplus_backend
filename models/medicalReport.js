const { Schema } = require("mongoose");
const db = require("../config/database").getUserDB();

const medicalReportsSchema = new Schema(
  {
    url: [
      {
        url: { type: String, required: true },
        status: { type: Number, default: 0 },
        fileType: { type: String }
      },
    ],
    userId: {
      type: Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    patientName: {
      type: String,
      required: true,
    },
    date: {
      type: Date,
      default: Date.now(),
    },
    status: {
      type: Number,
      default: 0,
    },
    type: {
      type: Number,
      default: 0,
    },
    doctorId: {
      type: Schema.Types.ObjectId,
      ref: "doctors",
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

const MedicalReports = db.model("MedicalReports", medicalReportsSchema);

module.exports = {
  model: MedicalReports,
};
