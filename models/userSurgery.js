const { Schema } = require("mongoose");
const db = require("../config/database").getUserDB();

const userSurgerySchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      // required: true,
    },
    surgeryId: {
      type: Schema.Types.ObjectId,
      ref: "Surgery",
      required: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    city: {
      type: String,
      default: null,
    },
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      default: null,
    },
    mobileNo: {
      type: String,
      required: true,
    },
    // claimedBy: {
    //   type: Schema.Types.ObjectId,
    //   ref: "User",
    // },
    // leadClaimedTime: {
    //   type: Date,
    // },
    // userStatus: {
    //   type: Number,
    // },
    // followUp: {
    //   type: Number,
    // },
    // comments: {
    //   type: String,
    // },
    // leadId: {
    //   type: Number,
    // },
    // source: {
    //   type: Schema.Types.ObjectId || String,
    //   required: true,
    // },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

userSurgerySchema.virtual("daysToFollowUp").get(function () {
  if (!this.followUp) return null;
  const today = new Date();
  const followUpDate = new Date(this.followUp);
  const diffInTime = followUpDate.getTime() - today.getTime();
  const diffInDays = Math.round(diffInTime / (1000 * 3600 * 24));
  return diffInDays;
});

const UserSurgery = db.model("userSurgery", userSurgerySchema);

module.exports = {
  model: UserSurgery,
};
