const { Schema } = require("mongoose");
const db = require("../config/database").getUserDB();

const surgeryMasterSchema = new Schema(
  {
    title: {
      type: String,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    seoTitle: {
      type: String,
    },
    seoDescription: {
      type: String,
    },
    imageUrl: {
      type: String,
    },
    description: {
      type: String,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "users",
      default: null,
    },
    modifiedBy: {
      type: Schema.Types.ObjectId,
      ref: "users",
      default: null,
    },
    components: [
      {
        sno: {
          type: Number,
        },
        title: {
          type: String,
        },
        description: {
          type: String,
        },
        image: [
          {
            type: String,
          },
        ],
      },
    ],
    departmentId: {
      type: Schema.Types.ObjectId,
      ref: "departments",
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

const SurgeryMaster = db.model("surgerymasters", surgeryMasterSchema);

module.exports = {
  model: SurgeryMaster,
};
