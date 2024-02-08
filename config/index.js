const { env } = process;
let envFile = ".env";

if (env.NODE_ENV) {
  switch (env.NODE_ENV.toString().trim()) {
    case "development":
      envFile = ".dev.env";
      break;
    case "test":
      envFile = ".test.env";
      break;
    default:
      break;
  }
}

// Load env variables from file based on NODE_ENV
require("dotenv").config({ path: `./${envFile}`, silent: true });

module.exports = {
  LOCAL_HOST: env.LOCAL_HOST,
  LIVE_HOST: env.LIVE_HOST,
  DEV_HOST: env.LIVE_HOST,
  HTTP_PORT: env.HTTP_PORT,
  HTTPS_PORT: env.HTTPS_PORT,
  LIVE_HOST_URL: env.LIVE_HOST_URL,
  secret: env.SECRET,
  resetPasswordUrl: env.RESET_PASSWORD_URL,

  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_PORT: process.env.SMTP_PORT,
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PASSWORD: process.env.SMTP_PASSWORD,

  ENVIRONMENT: env.ENVIRONMENT,
  AUTHKEY_IO: env.AUTHKEY_IO,
  AUTHKEY_URL: env.AUTHKEY_URL,
  AUTHKEY_URL_EMAIL: env.AUTHKEY_URL_EMAIL,
  AUTHKEY_EMAIL: env.AUTHKEY_EMAIL,

  mongodbUserUri: env.MONGODB_USER_URI,
  SERVER_URL: env.SERVER_URL,
  ENV : env.ENVIRONMENT,
  appName: env.APP_NAME,
  writeLogsToFile: env.WRITE_LOGS_TO_FILE === "true",
  expireIn: env.EXPIRE_IN,
  twilio: {
    authToken: env.TWILIO_AUTH_TOKEN,
    accountSid: env.TWILIO_ACCOUNT_SID,
    senderPhoneNumber: env.TWILIO_SENDER_PHONE_NUMBER,
  },
  aws: {
    acessKey: env.ACCESS_KEY_ID,
    secretKey: env.SECRET_ACCESS_KEY,
    region: env.AWS_REGION,
    bucket: env.S3_BUCKET,
  },
  DEFAULT_OTP: env.DEFAULT_OTP,
  DEFAULT_OTP_LENGTH: env.DEFAULT_OTP_LENGTH,
};
