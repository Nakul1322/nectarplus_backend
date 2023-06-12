const { Schema } = require("mongoose");
const db = require("../config/database").getUserDB();

const videoSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "users",
      // required: true,
    },
    title: {
      type: String,
    },
    url: {
      type: String,
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
