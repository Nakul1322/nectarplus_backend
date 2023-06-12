const { Schema } = require("mongoose");
const db = require("../config/database").getUserDB();

const surgeryMasterSchema = new Schema(
  {
    title: {
      type: String,
      // required: true,
    },
    seoTitle: {
      type: String,
      // required: true,
    },
    seoDescription: {
      type: String,
      // required: true,
    },
    name: {
      type: String,
      unique: true,
    },
    imageUrl: {
      type: String,
      // required: true,
    },
    description: {
      type: String,
      // required: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "users",
      default: null
    },
    modifiedBy: {
      type: Schema.Types.ObjectId,
      ref: "users",
      default: null
    },
    components: [
      {
        sno: {
          type: Number,
          // required: true,
        },
        title: {
          type: String,
          // required: true,
        },
        description: {
          type: String,
          // required: true,
        },
        image: [
          {
            type: String,
            // required: true,
          },
        ]
      }],
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

const SurgeryMaster = db.model("surgerymasters", surgeryMasterSchema);

module.exports = {
  model: SurgeryMaster,
};
