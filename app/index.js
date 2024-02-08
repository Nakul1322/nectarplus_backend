const { Router } = require("express");
const routesV1 = require("./v1");
const router = Router();
const { verifyApiKey } = require("../middlewares/index");

router.use(
  "/api/v1",
  // verifyApiKey,
  routesV1
);

module.exports = router;
