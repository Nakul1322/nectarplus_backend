const { Router } = require("express");
const contactUsController = require("./controller");
const { validate } = require("../../../middlewares/index");
const schema = require("./schema");

const router = Router({ mergeParams: true });

router.post("/", validate(schema.addContactUs), contactUsController.addContactUs);
router.get("/allContactUs", contactUsController.allContactUs); //
router.get("/:id", validate(schema.findContactUs), contactUsController.findContactUs);
router.put("/:id", validate(schema.updateContactUs), contactUsController.updateContactUs); //,validate(schema.adminEditDoctor)
router.delete("/:id", validate(schema.deleteContactUs), contactUsController.deleteContactUs);

module.exports = router;