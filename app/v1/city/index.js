const { Router } = require("express");
const cityController = require("./controller");
const { validate } = require("../../../middlewares/index");
const schema = require("./schema");

const router = Router({ mergeParams: true });

router.post("/", cityController.addCity);
router.get("/all-city", cityController.allCity);
router.get("/:id", cityController.findCity);
router.put("/:id", cityController.updateCity);
router.delete("/:id", cityController.deleteCity);

module.exports = router;
