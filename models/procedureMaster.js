const { Schema } = require("mongoose");
const { constants } = require("../utils/index");
const db = require("../config/database").getUserDB();

const procedureMasterSchema = new Schema(
  {
    name: {
      type: String,
    },
    description: {
      type: String,
    },
    links: {
      type: String,
    },
    slug: {
      type: String,
    },
    status: {
      type: Number,
      enum: constants.PROFILE_STATUS,
      default: constants.PROFILE_STATUS.ACTIVE,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    modifiedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    slug: {
      type: String,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

const ProcedureMaster = db.model("ProcedureMaster", procedureMasterSchema);

module.exports = {
  model: ProcedureMaster,
};
