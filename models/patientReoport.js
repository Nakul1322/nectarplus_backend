const { Schema } = require("mongoose");
const { constants } = require("../utils/index");
const db = require("../config/database").getUserDB();

const patientsReportsSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    title: {
        type: String,
        // required: true,
      },
    name: {
        type: String,
        // required: true,
      },
    type: {
      type: String,
      enum: ["Reports", "Prescription", "Invoice"],
    },
    fileUrl: {
        type: String,
        // required: true,
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
