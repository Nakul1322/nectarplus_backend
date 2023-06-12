const { Schema } = require("mongoose");
const db = require("../config/database").getUserDB();

const citySchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    active: {
      type: Boolean,
      default: true,
    },
    countryId: {
      type: Schema.Types.ObjectId,
      ref: "country",
      required: true,
    },
    stateId: {
      type: Schema.Types.ObjectId,
      ref: "state",
      required: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

const City = db.model("city", citySchema);

module.exports = {
  model: City,
};
