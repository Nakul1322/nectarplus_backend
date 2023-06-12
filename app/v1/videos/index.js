const { Router } = require("express");
const videoController = require("./controller");
const { validate } = require("../../../middlewares/index");
const schema = require("./schema");

const router = Router({ mergeParams: true });

router.post(
    "/", 
    validate(schema.addVideo), 
    videoController.addVideo
);

router.get(
    "/list", 
    videoController.allVideo
);

router.get(
    "/", 
    validate(schema.findVideo, 'query'), 
    videoController.findVideo
);

router.put(
    "/", 
    validate(schema.findVideo, 'query'), 
    validate(schema.updateVideo), 
    videoController.updateVideo
); 

router.delete(
    "/", 
    validate(schema.findVideo, 'query'), 
    videoController.deleteVideo
);

module.exports = router;