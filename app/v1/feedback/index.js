const { Router } = require("express");
const feedbackController = require("./controller");
const { validate } = require("../../../middlewares/index");
const schema = require("./schema");

const router = Router({ mergeParams: true });

router.get("/allFeedback", feedbackController.allFeedback); //
router.get("/allMasterFeedback", feedbackController.allMasterFeedback);
router.post(
  "/addMasterFeedback",
  validate(schema.addMasterFeedback),
  feedbackController.addMasterFeedback
);
router.get(
  "/:id",
  //   validate(schema.findMasterFeedback),
  feedbackController.findMasterFeedback
);
router.put(
  "/:id",
  validate(schema.updateMasterFeedback),
  feedbackController.updateMasterFeedback
); //,validate(schema.adminEditDoctor)
router.delete(
  "/:id",
  //   validate(schema.deleteMasterFeedback),
  feedbackController.deleteMasterFeedback
);

router.post(
  "/addFeedback",
  validate(schema.addFeedback),
  feedbackController.addFeedback
);
router.get(
  "/findFeedback/:id",
  //   validate(schema.findFeedback),
  feedbackController.findFeedback
);
router.put(
  "/updateFeedback/:id",
  validate(schema.updateFeedback),
  feedbackController.updateFeedback
); //,validate(schema.adminEditDoctor)
router.delete(
  "/deleteFeedback/:id",
  //   validate(schema.deleteFeedback),
  feedbackController.deleteFeedback
);



module.exports = router;
