const { Schema } = require("mongoose");
const { constants } = require("../utils");
const db = require("../config/database").getUserDB();

const sessionSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    jwt: {
      type: String,
      required: true,
    },
    deviceId: {
      type: String,
      required: true,
    },
    deviceToken: {
      type: String,
    },
    deviceType: {
      type: String,
      required: true,
    },
    browser: {
      type: String,
    },
    os: {
      type: String,
    },
    osVersion: {
      type: String,
    },
    tokenType: {
      type: Number,
      default: constants.TOKEN_TYPE.APPOINTMENT
    },
    isDeleted: {
      type: Boolean,
      default:false
    } 
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

const Session = db.model("Session", sessionSchema);

module.exports = {
  model: Session,
};
