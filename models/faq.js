const { Schema } = require("mongoose");
const { constants } = require('../utils/index')
const db = require("../config/database").getUserDB();

const faqSchema = new Schema(
  {
    question: {
      type: String,
      required: true,
    },
    answer: {
      type: String,
      required: true,
    },
    userType: {
      type: Number,
      enum: constants.USER_TYPES,
      default: constants.USER_TYPES.PATIENT,
      required: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "users", // reference the users collection,
      default:null
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

const FAQ = db.model("faqs", faqSchema);

module.exports = {
  model: FAQ,
};
