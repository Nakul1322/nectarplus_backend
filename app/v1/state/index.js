const { Router } = require("express");
const stateController = require("./controller");
const { validate } = require("../../../middlewares/index");
const schema = require("./schema");

const router = Router({ mergeParams: true });

router.post(
  "/",
  // validate(schema.addState),
  stateController.addState
);
router.get("/allState", stateController.allState); //
router.get(
  "/:id",
  //  validate(schema.findState),
  stateController.findState
);
router.put(
  "/:id",
  // validate(schema.updateState),
  stateController.updateState
); //,validate(schema.adminEditDoctor)
router.delete(
  "/:id",
  // validate(schema.deleteState),
  stateController.deleteState
);

module.exports = router;
