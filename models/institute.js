const { Schema } = require("mongoose");
const db = require("../config/database").getUserDB();

const instituteSchema = new Schema(
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

const Institute = db.model("institutes", instituteSchema);

module.exports = {
  model: Institute,
};
