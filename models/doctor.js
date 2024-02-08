const { Schema } = require("mongoose");
const { constants } = require("../utils/index");
const db = require("../config/database").getUserDB();

const doctorSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "users",
    },
    specialization: [
      {
        type: Schema.Types.ObjectId,
        ref: "specializations",
      },
    ],
    email: {
      type: String,
      default: null,
    },
    gender: {
      type: Number,
      enum: constants.GENDER,
    },
    city: {
      type: String,
      default: null,
    },
    isOwnEstablishment: {
      type: Boolean,
      default: false,
    },
    medicalRegistration: [
      {
        registrationNumber: {
          type: String,
          default: null,
        },
        council: {
          type: String,
          default: null,
        },
        year: {
          type: String,
          default: null,
        },
      },
    ],
    education: [
      {
        degree: {
          type: String,
          default: null,
        },
        college: {
          type: String,
          default: null,
        },
        year: {
          type: String,
          default: null,
        },
      },
    ],
    award: [
      {
        name: {
          type: String,
        },
        year: {
          type: String,
          default: null,
        },
      },
    ],
    membership: [
      {
        name: {
          type: String,
          default: null,
        },
      },
    ],
    social: [
      {
        socialMediaId: {
          type: Schema.Types.ObjectId,
          ref: "socialmedias",
          default: null,
        },
        url: {
          type: String,
          default: null,
        },
      },
    ],
    service: [
      {
        name: {
          type: String,
          default: null,
        },
      },
    ],
    experience: {
      type: String,
      default: null,
    },
    identityProof: [
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
    medicalProof: [
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
    profilePic: {
      type: String,
      default: null,
    },
    about: {
      type: String,
      default: null,
    },
    publicUrl: {
      type: String,
      default: null,
    },
    isDeleted: {
      type: Boolean,
      default: false,
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
    waitTime: {
      type: Number,
      default: 0,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "users",
    },
    status: {
      type: Number,
      enum: constants.DOCTOR_STATUS,
      default: constants.DOCTOR_STATUS.ACTIVE,
    },
    isVerified: {
      type: Number,
      enum: constants.PROFILE_STATUS,
      default: constants.PROFILE_STATUS.PENDING,
    },
    rejectReason: {
      type: String,
    },
    steps: {
      type: Number,
      enum: constants.PROFILE_STEPS,
      default: constants.PROFILE_STEPS.SECTION_A,
    },
    profileScreen: {
      type: Number,
      enum: constants.DOCTOR_SCREENS,
      default: constants.DOCTOR_SCREENS.DOCTOR_DETAILS,
    },
    procedure: [
      {
        type: Schema.Types.ObjectId,
        ref: "proceduremasters",
      },
    ],
    profileSlug: {
      type: String,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// doctorSchema.pre("save", async function (next) {
//   if (!this.isNew && (this.name || this.address.address)) {
//     const condition = this._conditions;
//     const establishmentMaster = await this.constructor.findOne(condition);
//     const slugStr =
//       (this.name || establishmentMaster.name) +
//       (this.address.locality || establishmentMaster.address.locality);
//     const baseSlug = slugify(slugStr, { lower: true });
//     let slug = baseSlug;
//     let slugCount = 1;

//     while (true) {
//       const existingEstablishment = await this.constructor.findOne({
//         profileSlug: slug,
//       });
//       if (!existingEstablishment) {
//         this.profileSlug = slug;
//         break;
//       }
//       slug = `${baseSlug}-${slugCount}`;
//       slugCount++;
//     }
//   }
//   next();
// });

const Doctor = db.model("doctors", doctorSchema);

module.exports = {
  model: Doctor,
};
