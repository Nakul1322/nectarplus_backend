const { Schema } = require("mongoose");
const { constants } = require("../utils/index");
const db = require("../config/database").getUserDB();

const cityMasterSchema = new Schema(
  {
    code: {
        type: String,
        // required: true,
      },
    name: {
        type: String,
        // required: true,
      },
    stateId: {
      type: Schema.Types.ObjectId,
      ref: "statemasters",
    },
    status: {
        type: Number,
        enum: constants.STATUS,
        default: constants.STATUS.PENDING,
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

const CityMaster = db.model("citymasters", cityMasterSchema);

module.exports = {
  model: CityMaster,
};
