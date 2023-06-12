const { Schema } = require("mongoose");
const db = require("../config/database").getUserDB();

const collegeSchema = new Schema(
    {
        name: {
            type: String,
            required: true,
        },
        status: {
            type: Boolean,
            default: true,
        },
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: "users", // reference the users collection
        },
        modifiedBy: {
            type: Schema.Types.ObjectId,
            ref: "users", // reference the users collection
        },
    },
    {
        timestamps: true,
        versionKey: false,
    }
);

const College = db.model("college", collegeSchema);

module.exports = {
    model: College,
};
