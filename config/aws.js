const { S3Client } = require("@aws-sdk/client-s3");
const { S3_BUCKET, AWS_REGION, ACCESS_KEY_ID, SECRET_ACCESS_KEY } = process.env;

const s3Client = new S3Client({
  region: AWS_REGION,
  credentials: {
    accessKeyId: ACCESS_KEY_ID,
    secretAccessKey: SECRET_ACCESS_KEY,
  },
});

module.exports = {
  s3Client,
  bucket: S3_BUCKET,
};
