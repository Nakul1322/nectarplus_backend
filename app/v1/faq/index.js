const { Router } = require("express");
const faqController = require("./controller");
const { validate } = require("../../../middlewares/index");
const schema = require("./schema");

const router = Router({ mergeParams: true });

router.post("/", validate(schema.addFAQ), faqController.addFAQ);

router.get("/all-faq", faqController.allFAQ);

router.get("/:id", validate(schema.findFAQ), faqController.findFAQ);

router.put("/:id", validate(schema.updateFAQ), faqController.updateFAQ);

router.delete("/:id", validate(schema.deleteFAQ), faqController.deleteFAQ);

module.exports = router;
