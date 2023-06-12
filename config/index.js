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
  host: env.HOST,
  httpPort: env.HTTP_PORT,
  httpsPort: env.HTTPS_PORT,
  secret: env.SECRET,
  resetPasswordUrl: env.RESET_PASSWORD_URL,

  mongodbUserUri: env.MONGODB_USER_URI,
  SERVER_URL: env.SERVER_URL,

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
};
