const multer = require('multer');
const { response } = require("./response");
const httpStatus = require("http-status");

const uploadFiles = (fields) => async (req, res, next) => {
  const fileSize = 5 * 1024 * 1024;
  const upload = multer({ fileFilter, limits: { fileSize } }).fields(fields);
  upload(req, res, (error) => {
    if (error) {
      return response.error({ msgCode: error.code }, res, httpStatus.BAD_REQUEST);
    } else {
      next();
    }
  });
};

const fileFilter = (req, file, cb) => {
  if (
    file.mimetype === 'image/png' ||
    file.mimetype === 'image/jpg' ||
    file.mimetype === 'image/jpeg' ||
    file.mimetype === 'application/pdf'
  ) {
    cb(null, true);
  } else {
    cb({ code: 'WRONG_FILE_TYPE', fileName: file.fieldname }, false);
  }
};

module.exports = { fileFilter, uploadFiles }