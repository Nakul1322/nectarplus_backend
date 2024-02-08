const { Schema } = require("mongoose");
const db = require("../config/database").getUserDB();
const { constants } = require("../utils/index");

const surgeryEnquirySchema = new Schema(
  {
    leadId: {
      type: String,
      unique: true,
    },
    isMobileVerify: {
      type: Boolean,
      default: false,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    source: {
      type: String,
      enum: constants.SURGERY_LEAD_SOURCES,
      default: constants.SURGERY_LEAD_SOURCES.WEBSITE,
    },
    city: {
      type: String,
    },
    treatmentType: {
      type: Schema.Types.ObjectId,
      ref: "surgerymasters",
    },
    name: {
      type: String,
    },
    phone: {
      type: String,
    },
    countryCode: {
      type: String,
    },
    claimedDate: {
      type: Date,
    },
    followUpIn: {
      type: String,
    },
    followUpDate: {
      type: Date,
      default: null,
    },
    comments: {
      type: String,
      default: null,
    },
    status: {
      type: Number,
      default: constants.SURGERY_LEAD_TYPES.PENDING,
      enum: constants.SURGERY_LEAD_TYPES,
    },
    claimByUserType: {
      type: Number,
      enum: constants.SURGERY_CLAIM_BY,
      default: constants.SURGERY_CLAIM_BY.ADMIN,
    },
    claimBy: {
      type: Schema.Types.ObjectId,
      ref: "users",
      default: null // null for ref to admin
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

surgeryEnquirySchema.pre("save", async function (next) {
  if (!this.leadId) {
    const lastEnquiry = await this.constructor
      .findOne({}, { leadId: 1 }, { sort: { leadId: -1 } })
      .exec();
    const lastLeadId = lastEnquiry ? lastEnquiry.leadId : "0000";
    const nextLeadId = (parseInt(lastLeadId, 10) + 1)
      .toString()
      .padStart(4, "0");
    this.leadId = nextLeadId;
  }
  next();
});

const SurgeryEnquiry = db.model("surgeryenquiry", surgeryEnquirySchema);

module.exports = {
  model: SurgeryEnquiry,
};
