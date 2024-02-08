const db = require("../config/database").getUserDB();
const mongoose = require("mongoose");
const { constants } = require("../utils/index");

const notificationSchema = new mongoose.Schema(
  {
    receiverId: [
      {
        type: mongoose.Schema.Types.ObjectId,
      },
    ],
    senderId: [
      {
        type: mongoose.Schema.Types.ObjectId,
      },
    ],
    title: {
      type: String,
      required: true,
    },
    body: {
      type: String,
      default: null,
    },
    userType: { type: Number, enum: constants.USER_TYPES },
    eventType: {
      type: Number,
      enum: [constants.NOTIFICATION_TYPE],
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
    },
  },
  {
    collection: "notifications",
    timestamps: true,
    versionKey: false,
  }
);

const Notification = db.model("notifications", notificationSchema);

module.exports = { model: Notification };
