const { Schema } = require("mongoose");
const db = require("../config/database").getUserDB();

const medicineSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    active: {
      type: Boolean,
      default: true,
    },
    mg: {
      type: Number,
      required: true,
    },
    description: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

const Medicine = db.model('medicine', medicineSchema);

module.exports = {
  model: Medicine,
};
