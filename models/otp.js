const { Schema } = require("mongoose");
const { constants } = require("../utils/index");
const db = require("../config/database").getUserDB();

const otpSchema = new Schema(
  {
    otp: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
    },
    email: {
      type: String,
    },
    userType: [
      {
        type: Number,
        enum: constants.USER_TYPES,
        default: constants.USER_TYPES.PATIENT,
      },
    ],
    expiresAt: {
  type: Date,
  default: () => new Date(Date.now() + 600000),
  index: { expires: 600 }, // Expiry time in seconds (10 minutes = 600 seconds)
},
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

const OTP = db.model("OTP", otpSchema);

module.exports = {
  model: OTP,
};
