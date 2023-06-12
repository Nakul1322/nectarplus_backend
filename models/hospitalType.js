const { Schema } = require("mongoose");
const db = require("../config/database").getUserDB();

const hospitalTypeSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

const HospitalType = db.model("hospitalType", hospitalTypeSchema);

module.exports = {
  model: HospitalType,
};
