const { Router } = require("express");
const controller = require("./controller");
const {
  validate,
  verifyAuthToken,
  isAdmin,
} = require("../../../middlewares/index");
const schema = require("./schema");

const router = Router({ mergeParams: true });

router.post(
  "/",
  verifyAuthToken,
  isAdmin,
  validate(schema.addMasterData),
  controller.addMaster
);

router.get(
  "/hospital-type",
  validate(schema.masterListData, "query"),
  controller.getAllMasterData
);

router.get(
  "/state",
  validate(schema.masterListData, "query"),
  controller.getAllMasterData
);

router.get(
  "/procedure",
  validate(schema.masterListData, "query"),
  controller.getAllMasterData
);

router.get(
  "/surgery",
  validate(schema.masterListData, "query"),
  controller.getAllMasterData
);

router.get(
  "/social-media",
  validate(schema.masterListData, "query"),
  controller.getAllMasterData
);

router.get(
  "/specialization",
  validate(schema.masterListData, "query"),
  controller.getAllMasterData
);

router.get("/little-critical-issue", controller.littleToCriticalIssueList);

router.get(
  "/:id",
  validate(schema.recordId, "params"),
  validate(schema.masterData, "query"),
  controller.getMasterDataByID
);

router.put(
  "/:id",
  verifyAuthToken,
  isAdmin,
  validate(schema.recordId, "params"),
  validate(schema.masterData, "query"),
  controller.updateMaster
);

router.delete(
  "/:id",
  verifyAuthToken,
  isAdmin,
  validate(schema.recordId, "params"),
  validate(schema.masterData, "query"),
  controller.deleteMaster
);

router.post(
  "/generate-slug",
  verifyAuthToken,
  isAdmin,
  controller.generateSlug
);

module.exports = router;
