const { Schema } = require("mongoose");
const db = require("../config/database").getUserDB();

const patientClinicalRecordsSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },
    appointmentId: {
      type: Schema.Types.ObjectId,
      ref: "appointments",
      required: true,
    },
    vital: {
      weight: Number,
      bloodPressure: {
        systolic: Number,
        diastolic: Number,
      },
      pulse: Number,
      temperature: Number,
      respRate: Number,
      isDeleted: {
        type: Boolean,
        default: false
      }
    },
    clinicalNotes: {
      symptoms: String,
      observations: String,
      diagnoses: String,
      notes: String,
      isDeleted: {
        type: Boolean,
        default: false
      }
    },
    medicine: [
      {
        drugId: {
          type: Schema.Types.ObjectId,
          ref: "medicines",
          required: true,
        },
        drugName: String,
        dosageAndFrequency: {
          morning: Number,
          afternoon: Number,
          evening: Number,
        },
        intake: String,
        isDeleted: {
          type: Boolean,
          default: false
        }
      },
    ],
    labTest: [
      {
        labTestId: {
          type: Schema.Types.ObjectId,
          ref: "labtests",
          required: true,
        },
        name: String,
        instruction: String,
        files: [String],
        isDeleted: {
          type: Boolean,
          default: false
        }
      },
    ],
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

const PatientClinicalRecords = db.model("PatientClinicalRecords", patientClinicalRecordsSchema);

module.exports = {
  model: PatientClinicalRecords,
};
