const { Schema } = require("mongoose");
const db = require("../config/database").getUserDB();
const { constants } = require("../utils/index");

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
    category: {
      type: Number,
      enum: constants.HOSPITAL_TYPE_CATEGORY,
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
