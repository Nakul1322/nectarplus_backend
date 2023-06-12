const { Router } = require("express");
const controller = require("./controller");
const { uploadFiles }  = require("../../../utils/multer")
const router = Router({ mergeParams: true });
const { validate } = require("../../../middlewares");
const schema = require("./schema");

router.post("/import/doctor", controller.importDataToDoctor);
router.post("/import/hospital", controller.importDataToHospital);
router.post(
    "/", 
    uploadFiles([{ name: 'file', count: 1 }]),
    controller.uploadFile, 
    controller.addFile
); // upload file to S3 Bucket

router.get(
    "/email-exist",
    validate(schema.searchQuery, 'query'),
    controller.checkEmailExists
);

router.get(
    "/medical-registration-exist",
    validate(schema.searchQuery, 'query'),
    controller.medicalRegistrationExists
);

router.get(
    "/hospital-for-address",
    validate(schema.hospitalSearch, 'query'),
    controller.hospitalListByAddress
);


module.exports = router;
