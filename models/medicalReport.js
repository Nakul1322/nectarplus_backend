const { Schema } = require("mongoose");
const db = require("../config/database").getUserDB();

const medicalReportsSchema = new Schema(
  {
    url: {
      type: String,
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
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
      // enum: [0, 1, 2, 3],
      default: 0,
    },
    type: {
      type: Number,
      // enum: [0, 1, 2],
      default: 0,
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
