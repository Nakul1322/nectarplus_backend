const nodemailer = require("nodemailer");
require("dotenv").config();
const { renderFile } = require("ejs");
const { callbackPromise } = require("nodemailer/lib/shared");

const TRANSPORTER = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false,
  requireTLS: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

const sendMail = (email, sendData, subject, textTemplate) => {
  try {
    renderFile(
      `${textTemplate}`,
      { email, ...sendData },
      (error, dataTemplate) => {
        if (error) {
          return callbackPromise(error, null);
        } else {
          const mainOptions = {
            from: process.env.SMTP_USER,
            to: email,
            subject,
            html: dataTemplate,
          };
          TRANSPORTER.sendMail(mainOptions, (error, info) => {
            if (error) {
              return callbackPromise(error, null);
            }
            return callbackPromise(null, info);
          });
        }
      }
    );
  } catch (error) {
    console.log(error);
    return false;
  }
};

module.exports = {
  sendMail,
};
