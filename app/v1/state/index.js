const { Router } = require("express");
const stateController = require("./controller");
const { validate } = require("../../../middlewares/index");
const schema = require("./schema");

const router = Router({ mergeParams: true });

router.post("/", stateController.addState);

router.get("/all-state", stateController.allState); //

router.get("/:id", stateController.findState);

router.put("/:id", stateController.updateState);

router.delete("/:id", stateController.deleteState);

module.exports = router;
