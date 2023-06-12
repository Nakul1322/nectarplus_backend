const { Schema } = require("mongoose");
const db = require("../config/database").getUserDB();

const stateSchema = new Schema(
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
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

const State = db.model("state", stateSchema);

module.exports = {
  model: State,
};
