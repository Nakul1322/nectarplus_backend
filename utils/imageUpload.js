const path = require("path");
const uuid = require("uuid");
const AWS = require('aws-sdk');
const { S3_BUCKET, AWS_REGION, ACCESS_KEY_ID, SECRET_ACCESS_KEY } = process.env;

// Create an s3 instance
const s3 = new AWS.S3({
  accessKeyId: ACCESS_KEY_ID,
  secretAccessKey: SECRET_ACCESS_KEY,
  region: AWS_REGION
});

// Function to upload an image file to S3
const imageUpload = async (file) => {
  const filename = path.basename(file.originalname);
  const key = `${uuid.v1()}-${filename}`;
  const mimeType = file.mimetype;
  // Create an instance of Upload with S3Client and upload parameters
  const uploadParams = {
      Bucket: S3_BUCKET,
      Key: key,
      Body: file.buffer,
      ContentType: mimeType,
  };

  try {
    // Upload the file and get the resulting Location (URL) of the uploaded file
    const { Location  } = await s3.upload(uploadParams).promise();;
    return { mimeType, uri: Location};
  } catch (err) {
    console.error(err);
    throw new Error("Failed to upload image to S3");
  }
};

module.exports = { imageUpload };
