const { Schema } = require("mongoose");
const db = require("../config/database").getUserDB();

const procedureSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    hospitalId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "hospitals", // reference the hospitals collection
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

const Procedure = db.model("procedures", procedureSchema);

module.exports = {
  model: Procedure,
};
