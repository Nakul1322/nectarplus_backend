const { Schema } = require("mongoose");
const { constants } = require("../utils/index");
const db = require("../config/database").getUserDB();

const adminSchema = new Schema(
  {
    fullName: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      required: true,
    },
    countryCode: {
      type: String,
      default: "+91",
    },
    email: {
      type: String,
      required: true,
    },
    password: {
      type: String,
      required: true,
    },
    profilePic: {
      type: String,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    userType: {
      type: Number,
      default: constants.USER_TYPES.ADMIN,
    },
    status: {
      type: Number,
      default: constants.PROFILE_STATUS.ACTIVE,
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

const Admin = db.model("admin", adminSchema);

module.exports = {
  model: Admin,
};
