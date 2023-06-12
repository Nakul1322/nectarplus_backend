const { Schema } = require("mongoose");
const { constants } = require('../utils/index')
const db = require("../config/database").getUserDB();

const cmsSchema = new Schema(
  {
    privacyPolicy: {
      type: Object,
      default: null,
    },
    termsAndCondition: {
      type: Object,
      default: null,
    },
    shippingPolicy: {
      type: Object,
      default: null,
    },
    type: {
      type: Number,
      enum: constants.CMS_TYPE, // 1: PP, 2: TAC, 3: SP
      required: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

const CMS = db.model("cms", cmsSchema);

module.exports = {
  model: CMS,
};
