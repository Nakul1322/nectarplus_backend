const { Schema } = require("mongoose");
const db = require("../config/database").getUserDB();

const surgeryFaqSchema = new Schema(
  {
    question: {
      type: String,
      required: true,
    },
    answer: {
      type: String,
      required: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    surgeryId: {
      type: Schema.Types.ObjectId,
      ref: "surgerymasters",
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

const SurgeryFaq = db.model("surgeryfaqs", surgeryFaqSchema);

module.exports = {
  model: SurgeryFaq,
};
