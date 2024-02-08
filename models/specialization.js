const { Schema } = require("mongoose");
const db = require("../config/database").getUserDB();

const specializationSchema = new Schema(
  {
    name: {
      type: String,
    },
    description: {
      type: String,
    },
    links: {
      type: String,
    },
    status: {
      type: Number,
      default: 1,
    },
    slug: {
      type: String,
    },
    image: {
      type: String,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "users",
    },
    modifiedBy: {
      type: Schema.Types.ObjectId,
      ref: "users",
    },
    slug: {
      type: String,
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
