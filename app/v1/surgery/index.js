const { Router } = require("express");
const surgeryController = require("./controller");
const { validate } = require("../../../middlewares/index");
const schema = require("./schema");

const router = Router({ mergeParams: true });

router.post("/", validate(schema.addSurgery), surgeryController.addSurgery);
router.get("/allSurgery", surgeryController.allSurgery); //
router.get("/:id", validate(schema.findSurgery), surgeryController.findSurgery);
router.put("/:id", validate(schema.updateSurgery), surgeryController.updateSurgery); //,validate(schema.adminEditDoctor)
router.delete("/:id", validate(schema.deleteSurgery), surgeryController.deleteSurgery);


router.post("/enquire", validate(schema.addEnquireSurgery), surgeryController.addEnquireSurgery);
router.get("/allEnquires", surgeryController.allSurgery); //
router.get("/enquire/:id", validate(schema.findEnquireSurgery), surgeryController.findEnquireSurgery);
router.put("/enquire/:id", validate(schema.updateEnquireSurgery), surgeryController.updateEnquireSurgery); //,validate(schema.adminEditDoctor)
router.delete("/enquire/:id", validate(schema.deleteEnquireSurgery), surgeryController.deleteEnquireSurgery);

module.exports = router;