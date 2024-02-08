const { Schema } = require("mongoose");
const { constants } = require("../utils/index");
const db = require("../config/database").getUserDB();

const videoSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "users",
      // required: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    title: {
      type: String,
    },
    url: {
      type: String,
    },
    userType: {
      type: Number,
      enum: constants.USER_TYPES,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

const Video = db.model("Video", videoSchema);

module.exports = {
  model: Video,
};
