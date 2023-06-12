const { Schema } = require("mongoose");
const { constants } = require('../utils/index')
const db = require("../config/database").getUserDB();

const surgerySchema = new Schema(
  {
    title: {
      type: String,
      required: true
    },
    seoTitle: [
      {
        type: String
      }
    ],
    surgery: {
      type: String,
      required: true
    },
    description: {
      type: String,
      required: true
    },
    seoDescription: {
      type: String
    },
    status: {
      type: Number,
      // enum: [0, 1], // 0: inActive, 1: active
      default: 1
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

const Surgery = db.model('Surgery', surgerySchema);

module.exports = {
  model: Surgery,
};
