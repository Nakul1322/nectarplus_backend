const { Router } = require("express");
const adminController = require('./controller')
const { validate, verifyAuthToken,isAdmin,isAdminCreator,isCreator } = require("../../../middlewares/index");
const schema = require("./schema");

const router = Router({ mergeParams: true });

router.get("/dashboard/appointmentCount", adminController.adminDashboard)

router.get("/dashboard/count", adminController.adminDashboardCount)

router.post("/adminLogin",validate(schema.adminLogin),adminController.adminLogin,adminController.createSession);

router.post("/adminForgotPassword",validate(schema.forgotPassword),adminController.forgotPassword)

router.put("/updateProfile/:id", validate(schema.updateAdminProfile),adminController.updateAdminProfile)



module.exports = router;