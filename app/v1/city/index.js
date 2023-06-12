const { Router } = require("express");
const cityController = require("./controller");
const { validate } = require("../../../middlewares/index");
const schema = require("./schema");

const router = Router({ mergeParams: true });

router.post(
  "/",
  // validate(schema.addCity),
  cityController.addCity
);
router.get("/allCity", cityController.allCity); //
router.get(
  "/:id",
  //  validate(schema.findCity),
  cityController.findCity
);
router.put(
  "/:id",
  // validate(schema.updateCity),
  cityController.updateCity
); //,validate(schema.adminEditDoctor)
router.delete(
  "/:id",
  // validate(schema.deleteCity),
  cityController.deleteCity
);

module.exports = router;
