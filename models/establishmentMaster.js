const { Schema } = require("mongoose");
const db = require("../config/database").getUserDB();

const EstablishmentMasterSchema = new Schema(
  {
    doctorId: {
      type: Schema.Types.ObjectId,
      ref: "users",
      // required: true,
    },
    hospitalId: {
      type: Schema.Types.ObjectId,
      ref: "users",
      // required: true,
    },
    city: {
      type: String,
      // required: true,
    },
    isOwner: {
      type: Boolean,
      // required: true
    },
    name: {
      type: String,
      // required: true,
    },
    locality: {
      type: String,
      // required: true,
    },
    propertyStatus: {
      type: Number,
      enum: [1, 2, 3, 4],
      // required: true,
    },
    establishmentProof: [{
      url: {
        type: String,
        default: null
      },
      fileType: {
        type: String,
        default: null
      }
    }],
    establishmentMobile: {
      type: String
    },
    establishmentEmail: {
      type: String
    },
    address: {
      landmark: {
        type: String,
        // required: true,
      },
      locality: {
        type: String,
        // required: true,
      },
      city: {
        type: String,
        default: null,
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
        // required: true,
      },
    },
    location: {
      type: {
        type: String,
        default: "Point",
      },
      coordinates: {
        type: [{
          type: Number,
          // required: true,
        }],
        index: "2dsphere",
      },
    },
    // location: {
    //   type: {
    //     type: String,
    //     enum: ['Point'],
    //     required: true
    //   },
    //   coordinates: {
    //     type: [Number],
    //     required: true
    //   },
    //   index: '2dsphere'
    // },
    location: {
      latitude: {
        type: Number,
        // required: true,
      },
      longitude: {
        type: Number,
        // required: true,
      },      // required: true,
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
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// EstablishmentMasterSchema.index({ location: '2dsphere' });

const EstablishmentMaster = db.model(
  "EstablishmentMaster",
  EstablishmentMasterSchema
);

module.exports = {
  model: EstablishmentMaster,
};
