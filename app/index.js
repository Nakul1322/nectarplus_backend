const { Router } = require("express");
const routesV1 = require("./v1");
const router = Router();

router.use("/api/v1", routesV1);

module.exports = router;
