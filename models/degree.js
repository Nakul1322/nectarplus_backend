const { Schema } = require("mongoose");
const db = require("../config/database").getUserDB();

const degreeSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    active: {
      type: Boolean,
      required: true,
      default: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

const Degree = db.model("degrees", degreeSchema);

module.exports = {
  model: Degree,
};
