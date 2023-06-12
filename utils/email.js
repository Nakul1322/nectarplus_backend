const nodemailer = require("nodemailer");
require("dotenv").config();
const path = require("path");
const { renderFile } = require("ejs");

const sendEmail = async (file, email, subject, link) => {
  console.log("🚀 ~ file: email.js:7 ~ sendEmail ~ file:", file,email,subject,link)
  
  try {
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
    renderFile(`${appRoot}/views/${file}`, { link }, (err, dataTemplate) => {
      if (err) {
        console.log("ERROR",err);
      } else {
        transporter.sendMail({
          from: process.env.SMTP_USER,
          to: email,
          subject: subject,
          html: dataTemplate,
        });
      }
    });
  } catch (error) {
    console.log("email not sent");
  }
};

module.exports = sendEmail;
