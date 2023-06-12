const { Schema } = require("mongoose");
const { constants } = require("../utils/index");
const db = require("../config/database").getUserDB();


const hospitalSchema = new Schema(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: "users",
        },
        profilePic: String,
        city: {
            type: String,
            default: null,
        },
        totalDoctor: {
            type: Number,
            default: 0,
        },
        hospitalType: {
            type: Schema.Types.ObjectId,
            ref: "hospitaltypes",
        },
        // timing:{
        //     type: Schema.Types.ObjectId,
        //     ref: "EstablishmentTiming",
        // },
        isOwner: {
            type: Boolean,
            // required: true
          },      
        totalBed: {
            type: Number,
            // required: true,
        },
        ambulance: {
            type: Number,
            // required: true,
        },
        about: {
            type: String,
            // required: true,
        },
        service: [
            {
                name: {
                    type: String,
                    // required: true,
                },
            },
        ],
        social: [
            {
                type: {
                    type: String,
                    // required: true,
                },
                url: {
                    type: String,
                    // required: true,
                },
            },
        ],
        image: [
            {
                url: {
                    type: String,
                    // required: true,
                },
            },
        ],
        specialization: [
            {
                type: Schema.Types.ObjectId,
                ref: "Specialization",
            },
        ],
        steps: {
            type: Number,
            enum: constants.PROFILE_STEPS,
            default: constants.PROFILE_STEPS.SECTION_A
          },      
        speciality: [
            {
                type: Schema.Types.ObjectId,
                ref: "specializations",
            },
        ],
        procedure: [
            {
                type: Schema.Types.ObjectId,
                ref: "proceduremasters",
            },
        ],
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
        publicUrl: {
            type: String,
            // required: true,
        },
        isVerified: {
            type: Number,
            enum: constants.PROFILE_STATUS,
            default: constants.PROFILE_STATUS.PENDING,
        },
        rejectReason: {
            type: String,
            // required: true,
        },
        establishmentProof:[{
            url: {
            type: String,
            default: null
            },
            fileType: {
              type: String,
              default: null
            }
          }],
        status: {
            type: String,
            enum: constants.PROFILE_STATUS.PENDING
        },
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: "users",
        },
        profileScreen: {
            type: Number,
            enum: constants.HOSPITAL_SCREENS,
            default: constants.HOSPITAL_SCREENS.ESTABLISHMENT_DETAILS
          }
    },
    {
        timestamps: true,
        versionKey: false,
    }
);

const Hospital = db.model("Hospital", hospitalSchema);

module.exports = {
    model: Hospital,
};
