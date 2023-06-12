const { Schema } = require("mongoose");
const { constants } = require("../utils/index");
const db = require("../config/database").getUserDB();

const establishmentTimingSchema = new Schema(
    {
        doctorId: {
            type: Schema.Types.ObjectId,
            ref: "doctors",
            // required: true,
        },
        hospitalId: {
            type: Schema.Types.ObjectId,
            ref: "hospitals",
            // required: true,
        },
        establishmentId: {
            type: Schema.Types.ObjectId,
            ref: "establishmentmasters",
            // required: true,
        },
        isOwner: {
            type: Boolean,
            default: true,
        },
        slotTime: {
            type: Number,
            default: 15,
        },
        specility: [
            {
                type: Schema.Types.ObjectId,
                ref: "specializations",
                default: null, // reference the specializations collection
            },
        ],
        procedure: [
            {
                type: Schema.Types.ObjectId,
                ref: "ProcedureMaster",
                default: null, // reference the ProcedureMaster collection
            },
        ],
        mon: [
            {
                slot: {
                    type: String,
                    // required: true,
                },
                from: {
                    type: String,
                    // required: true,
                },
                to: {
                    type: String,
                    // required: true,
                },
            },
        ],
        tue: [
            {
                slot: {
                    type: String,
                    // required: true,
                },
                from: {
                    type: String,
                    // required: true,
                },
                to: {
                    type: String,
                    // required: true,
                },
            },
        ],
        wed: [
            {
                slot: {
                    type: String,
                    // required: true,
                },
                from: {
                    type: String,
                    // required: true,
                },
                to: {
                    type: String,
                    // required: true,
                },
            },
        ],
        thu: [
            {
                slot: {
                    type: String,
                    // required: true,
                },
                from: {
                    type: String,
                    // required: true,
                },
                to: {
                    type: String,
                    // required: true,
                },
            },
        ],
        fri: [
            {
                slot: {
                    type: String,
                    // required: true,
                },
                from: {
                    type: String,
                    // required: true,
                },
                to: {
                    type: String,
                    // required: true,
                },
            },
        ],
        sat: [
            {
                slot: {
                    type: String,
                    // required: true,
                },
                from: {
                    type: String,
                    // required: true,
                },
                to: {
                    type: String,
                    // required: true,
                },
            },
        ],
        sun: [
            {
                slot: {
                    type: String,
                    // required: true,
                },
                from: {
                    type: String,
                    // required: true,
                },
                to: {
                    type: String,
                    // required: true,
                },
            },
        ],
        // isApproved: {
        //     type: Boolean,
        //     default: false,
        // },
        isVerified: {
            type: Number,
            enum: [constants.PROFILE_STATUS.APPROVE, constants.PROFILE_STATUS.REJECT, constants.PROFILE_STATUS.PENDING],
            default: constants.PROFILE_STATUS.PENDING,
        },
        rejectReason:{
            type:String
        },
        consultationFees: {
            type: Number,
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

const EstablishmentTiming = db.model(
    "EstablishmentTiming",
    establishmentTimingSchema
);

module.exports = {
    model: EstablishmentTiming,
};
