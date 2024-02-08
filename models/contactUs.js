const { Schema } = require("mongoose");
const db = require("../config/database").getUserDB();

const contactUsSchema = new Schema({
  name: {
    type: String,
    required: true,
  },
  phone: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  comment: {
    type: String,
    required: true,
  },
  isDeleted: {
    type: Boolean,
    default: false,
  },
},
  {
    timestamps: true,
    versionKey: false
  });

const ContactUs = db.model("contactus", contactUsSchema);

module.exports = {
  model: ContactUs,
};
