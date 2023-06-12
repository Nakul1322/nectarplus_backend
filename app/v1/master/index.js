const { Router } = require("express");
const controller = require("./controller");
const { validate } = require("../../../middlewares/index");
const schema = require("./schema");

const router = Router({ mergeParams: true });

router.post(
  "/",
  controller.addMaster
); // add master data

router.get(
  "/hospital-type", 
  validate(schema.masterListData, 'query'),
  controller.getAllMasterData
); // get list of all master data

router.get(
  "/state", 
  validate(schema.masterListData, 'query'),
  controller.getAllMasterData
); // get list of all master data

router.get(
  "/city", 
  validate(schema.masterListData, 'query'),
  controller.getAllMasterData
); // get list of all master data

router.get(
  "/procedure", 
  validate(schema.masterListData, 'query'),
  controller.getAllMasterData
); // get list of all master data

router.get(
  "/speciality", 
  validate(schema.masterListData, 'query'),
  controller.getAllMasterData
); // get list of all master data

router.get(
  "/degree", 
  validate(schema.masterListData, 'query'),
  controller.getAllMasterData
); // get list of all master data

router.get(
  "/college", 
  validate(schema.masterListData, 'query'),
  controller.getAllMasterData
); // get list of all master data

router.get(
  "/surgery", 
  validate(schema.masterListData, 'query'),
  controller.getAllMasterData
); // get list of all master data

router.get(
  "/social-media", 
  validate(schema.masterListData, 'query'),
  controller.getAllMasterData
); // get list of all master data

router.get(
  "/specialization", 
  validate(schema.masterListData, 'query'),
  controller.getAllMasterData
); // get list of all master data

router.get(
  "/", 
  validate(schema.masterList, 'query'),
  controller.getAllMasterDataList
); // get list of all master data

router.get(
  "/:id",
   validate(schema.recordId, 'params'),
   validate(schema.masterData, 'query'),
   controller.getMasterDataByID
); // get by ID

router.put(
  "/:id",
  validate(schema.recordId, 'params'),
  validate(schema.masterData, 'query'),
  controller.updateMaster
); // update by ID

router.delete(
  "/:id",
  validate(schema.recordId, 'params'),
  validate(schema.masterData, 'query'),
  controller.deleteMaster
); // delete by ID

module.exports = router;
