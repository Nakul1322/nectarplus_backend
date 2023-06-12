const { Schema } = require("mongoose");
const { constants } = require('../utils/index')
const db = require("../config/database").getUserDB();

const procedureMasterSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    status: {
        type: Number,
        enum: constants.STATUS,
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

const ProcedureMaster = db.model("ProcedureMaster", procedureMasterSchema);

module.exports = {
  model: ProcedureMaster,
};
