const { Schema } = require("mongoose");
const { constants } = require("../utils/index");
const db = require("../config/database").getUserDB();

const adminSocialSchema = new Schema(
  {
    socialMediaId: {
      type: Schema.Types.ObjectId,
      ref: "socialmedias",
      default: null,
    },
    url: {
      type: String,
      default: null,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "users",
    },
    userType: {
      type: Number,
      default: constants.USER_TYPES.ADMIN,
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

const AdminSocial = db.model("adminsocials", adminSocialSchema);

module.exports = {
  model: AdminSocial,
};
