const { Schema } = require("mongoose");
const { constants } = require("../utils/index");
const db = require("../config/database").getUserDB();

const surgerySchema = new Schema(
  {
    title: {
      type: String,
      required: true,
    },
    seoTitle: [
      {
        type: String,
      },
    ],
    isDeleted: {
      type: Boolean,
      default: false,
    },
    surgery: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    seoDescription: {
      type: String,
    },
    status: {
      type: Number,
      default: 1,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

const Surgery = db.model("Surgery", surgerySchema);

module.exports = {
  model: Surgery,
};
