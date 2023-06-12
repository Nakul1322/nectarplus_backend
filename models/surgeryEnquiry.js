const { Schema } = require("mongoose");
const db = require("../config/database").getUserDB();

const surgeryEnquirySchema = new Schema(
  {
    leadId: {
      type: String,
      unique: true
    },
    source: {
      type: String,
      enum: ['website', 'facebook'],
      default: 'website'
    },
    city: {
      type: String,
          default: null,
    },
    treatmentType: {
      type: Schema.Types.ObjectId,
      ref: "surgerymasters",
      // required: true,
    },
    name: {
      type: String,
      // required: true,
    },
    phone: {
      type: String,
      // required: true,
    },
    claimedDate: {
      type: Date,
      default: Date.now()
    },
    followup: {
      type: Date,
      validate: {
        validator: function (value) {
          if (this.followup === '2 days') {
            const today = new Date();
            const twoDaysLater = new Date(today);
            twoDaysLater.setDate(today.getDate() + 2);
            return value.getTime() === twoDaysLater.getTime();
          } else if (this.followup === '7 days') {
            const today = new Date();
            const sevenDaysLater = new Date(today);
            sevenDaysLater.setDate(today.getDate() + 7);
            return value.getTime() === sevenDaysLater.getTime();
          } else if (this.followup === '15 days') {
            const today = new Date();
            const fifteenDaysLater = new Date(today);
            fifteenDaysLater.setDate(today.getDate() + 15);
            return value.getTime() === fifteenDaysLater.getTime();
          }
          return true;
        },
        message: 'Follow-up date must be the specified number of days from today if a specific number of days is selected.'
      },
      default:null
    },
    comments: {
      type: String,
      default:null
    }
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

surgeryEnquirySchema.pre('save', async function (next) {
  if (!this.leadId) {
    const lastEnquiry = await this.constructor.findOne({}, { leadId: 1 }, { sort: { leadId: -1 } }).exec();
    const lastLeadId = lastEnquiry ? lastEnquiry.leadId : '0000';
    const nextLeadId = (parseInt(lastLeadId, 10) + 1).toString().padStart(4, '0');
    this.leadId = nextLeadId;
  }
  next();
});

const SurgeryEnquiry = db.model("surgeryenquiry", surgeryEnquirySchema);

module.exports = {
  model: SurgeryEnquiry,
};
