const { Schema } = require("mongoose");
const db = require("../config/database").getUserDB();

const specialitySchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    hospitalId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "hospitals", // reference the hospitals collection
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

const Speciality = db.model("specialities", specialitySchema);

module.exports = {
  model: Speciality,
};
