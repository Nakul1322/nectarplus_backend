const { Schema } = require("mongoose");
const { constants } = require("../utils/index");
const db = require("../config/database").getUserDB();

const stateMasterSchema = new Schema(
  {
    code: {
      type: String,
    },
    name: {
      type: String,
    },
    status: {
      type: Number,
      enum: constants.STATUS, // 0-In-Active, 1-Active
      default: constants.STATUS.ACTIVE,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    modifiedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

const StateMaster = db.model("StateMaster", stateMasterSchema);

module.exports = {
  model: StateMaster,
};
