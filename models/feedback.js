const { Schema } = require("mongoose");
const { constants } = require('../utils/index')
const db = require("../config/database").getUserDB();

const feedbackSchema = new Schema(
  {
    hospitalId: {
      type: Schema.Types.ObjectId,
      ref: 'Hospital',
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    doctorId: {
      type: Schema.Types.ObjectId,
      ref: 'Doctor',
    },
    status: {
      type: Number,
      enum: constants.FEEDBACK_STATUS,
      default: constants.FEEDBACK_STATUS.REQUESTED,
    },
    point: {
      type: Number,
      required: true,
    },
    rating: {
      type: Number,
      required: true,
    },
    replyMsg: {
      type: String,
    },
    replyId: {
      type: Schema.Types.ObjectId,
      ref: 'Feedback',
    },
    feedback: {
      masterFeedbackId: {
        type: Schema.Types.ObjectId,
        ref: 'MasterFeedback',
        required: true,
      },
      selectedOptionId: [{
        type: Schema.Types.ObjectId,
        ref: 'MasterFeedback.options',
        required: true,
      }],
      point: {
        type: Number,
        required: true,
      },
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

const Feedback = db.model('Feedback', feedbackSchema);

module.exports = {
  model: Feedback,
};
