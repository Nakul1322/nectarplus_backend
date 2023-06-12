const { Schema } = require("mongoose");
const db = require("../config/database").getUserDB();

const labTestSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    active: {
      type: Boolean,
      default: true,
    },
    description: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

const LabTest = db.model("labTest", labTestSchema);

module.exports = {
  model: LabTest,
};
