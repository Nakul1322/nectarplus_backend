const { Schema } = require("mongoose");
const db = require("../config/database").getUserDB();

const patientsReportsSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    title: {
      type: String,
    },
    name: {
      type: String,
    },
    type: {
      type: String,
      enum: ["Reports", "Prescription", "Invoice"],
    },
    fileUrl: {
      type: String,
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

const PatientsReports = db.model("PatientsReports", patientsReportsSchema);

module.exports = {
  model: PatientsReports,
};
