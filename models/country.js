const { Schema } = require("mongoose");
const db = require("../config/database").getUserDB();

const countrySchema = new Schema(
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

const Country = db.model("country", countrySchema);

module.exports = {
  model: Country,
};
