const { Schema } = require("mongoose");
const db = require("../config/database").getUserDB();

const specializationSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    status: {
      type: Number,
      required: true,
      default: true,
    },
    image:{
      type: String,
      required: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "users", // reference the users collection
    },
    modifiedBy: {
      type: Schema.Types.ObjectId,
      ref: "users", // reference the users collection
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

const Specialization = db.model("specializations", specializationSchema);

module.exports = {
  model: Specialization,
};
