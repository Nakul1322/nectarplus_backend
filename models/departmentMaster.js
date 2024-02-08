const { Schema } = require("mongoose");
const db = require("../config/database").getUserDB();

const departmentSchema = new Schema(
  {
    name: {
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
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

const Department = db.model("departments", departmentSchema);

module.exports = {
  model: Department,
};
