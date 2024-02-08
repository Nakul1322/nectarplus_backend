const { Schema } = require("mongoose");
const db = require("../config/database").getUserDB();

const EstablishmentMasterSchema = new Schema(
  {
    hospitalId: {
      type: Schema.Types.ObjectId,
      ref: "users",
    },
    city: {
      type: String,
    },
    isOwner: {
      type: Boolean,
    },
    name: {
      type: String,
    },
    locality: {
      type: String,
    },
    propertyStatus: {
      type: Number,
      enum: [1, 2, 3, 4],
    },
    establishmentProof: [
      {
        url: {
          type: String,
          default: null,
        },
        fileType: {
          type: String,
          default: null,
        },
      },
    ],
    establishmentMobile: {
      type: String,
    },
    establishmentEmail: {
      type: String,
    },
    address: {
      landmark: {
        type: String,
      },
      locality: {
        type: String,
      },
      city: {
        type: String,
      },
      state: {
        type: Schema.Types.ObjectId,
        ref: "statemasters",
      },
      country: {
        type: String,
        default: "India",
      },
      pincode: {
        type: String,
      },
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    isLocationShared: {
      type: Boolean,
      default: false,
    },
    location: {
      type: {
        type: String,
        default: "Point",
      },
      coordinates: {
        type: [
          {
            type: Number,
          },
        ],
        default: [77.216721, 28.6448],
        index: "2dsphere",
      },
    },
    totalreviews: {
      type: Number,
      default: 0,
    },
    rating: {
      type: Number,
      default: 0,
    },
    recommended: {
      type: Number,
      default: 0,
    },
    hospitalTypeId: {
      type: Schema.Types.ObjectId,
      ref: "hospitaltypes",
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "users",
    },
    modifiedBy: {
      type: Schema.Types.ObjectId,
      ref: "users",
    },
    profileSlug: {
      type: String,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

const EstablishmentMaster = db.model(
  "EstablishmentMaster",
  EstablishmentMasterSchema
);

module.exports = {
  model: EstablishmentMaster,
};
