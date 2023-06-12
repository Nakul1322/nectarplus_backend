const { Schema } = require("mongoose");
const { constants } = require('../utils/index')
const db = require("../config/database").getUserDB();

const masterFeedbackSchema = new Schema({
  sno: {
    type: Number,
    required: true
  },
  question: {
    type: String,
    required: true
  },
  pointAvailable: {
    type: Boolean,
    required: true
  },
  status: {
    type: Number,
    enum: constants.MASTER_FEEDBACK_STATUS, // 0: inactive, 1: active
    default: constants.MASTER_FEEDBACK_STATUS.ACTIVE
  },
  options: {
    type: [{
      opt: String,
      point: Number
    }],
    required: true
  }
});

const MasterFeedback = db.model('MasterFeedback', masterFeedbackSchema);

module.exports = {
  model: MasterFeedback
};
