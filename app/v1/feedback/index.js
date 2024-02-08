const { Router } = require("express");
const feedbackController = require("./controller");
const { validate, verifyAuthToken } = require("../../../middlewares/index");
const schema = require("./schema");

const router = Router({ mergeParams: true });

router.get("/all-feedback", feedbackController.allFeedback);

router.get("/all-master-feedback", feedbackController.allMasterFeedback);

router.post(
  "/add-master-feedback",
  validate(schema.addMasterFeedback),
  feedbackController.addMasterFeedback
);

router.get("/:id", feedbackController.findMasterFeedback);

router.put(
  "/:id",
  validate(schema.updateMasterFeedback),
  feedbackController.updateMasterFeedback
);

router.delete("/:id", feedbackController.deleteMasterFeedback);

router.post("/add-feedback", verifyAuthToken, feedbackController.addFeedback);

router.get("/find-feedback/:id", feedbackController.findFeedback);

router.put(
  "/update-feedback/:id",
  validate(schema.updateFeedback),
  feedbackController.updateFeedback
);

router.delete("/delete-feedback/:id", feedbackController.deleteFeedback);

module.exports = router;
