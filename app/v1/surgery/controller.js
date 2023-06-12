const httpStatus = require("http-status");
const { response } = require("../../../utils/index");
const { common } = require("../../../services/index");
const { SurgeryMaster, SurgeryEnquiry, OTP } = require("../../../models/index");
const { constants } = require("../../../utils/constant");

const addSurgery = async (req, res) => {
    try {
        const content = req.body
        const data = await common.create(SurgeryMaster.model, content);
        return response.success(
            { msgCode: "MASTER_SURGERY_ADDED", data },
            res,
            httpStatus.OK
        );
    } catch (error) {
        console.log("🚀 ~ file: controller.js ~ line 301 ~ login ~ error", error);
        return response.error(
            { msgCode: "INTERNAL_SERVER_ERROR" },
            res,
            httpStatus.INTERNAL_SERVER_ERROR
        );
    }
};

const allSurgery = async (req, res) => {
    try {
        const data = await common.findAll(SurgeryMaster.model, {});
        return response.success(
            { msgCode: "MASTER_SURGERY_LIST", data },
            res,
            httpStatus.OK
        );
    } catch (error) {
        console.log("🚀 ~ file: controller.js ~ line 301 ~ login ~ error", error);
        return response.error(
            { msgCode: "INTERNAL_SERVER_ERROR" },
            res,
            httpStatus.INTERNAL_SERVER_ERROR
        );
    }
};

const updateSurgery = async (req, res) => {
    try {
        const { id } = req.params;
        const content = req.body;
        const data = await common.updateById(SurgeryMaster.model, id, content);
        return response.success(
            { msgCode: "MASTER_SURGERY_UPDATED", data },
            res,
            httpStatus.OK
        );
    } catch (error) {
        console.log("🚀 ~ file: controller.js ~ line 301 ~ login ~ error", error);
        return response.error(
            { msgCode: "INTERNAL_SERVER_ERROR" },
            res,
            httpStatus.INTERNAL_SERVER_ERROR
        );
    }
};

const deleteSurgery = async (req, res) => {
    try {
        const { id } = req.params;
        await common.removeById(SurgeryMaster.model, id); // Deleting the Surgery data
        return response.success(
            { msgCode: "MASTER_SURGERY_DELETED", data: {} },
            res,
            httpStatus.OK
        );
    } catch (error) {
        console.log("🚀 ~ file: controller.js ~ line 301 ~ login ~ error", error);
        return response.error(
            { msgCode: "INTERNAL_SERVER_ERROR" },
            res,
            httpStatus.INTERNAL_SERVER_ERROR
        );
    }
};

const findSurgery = async (req, res) => {
    try {
        const { id } = req.params;
        const data = await common.getById(SurgeryMaster.model, id);
        return response.success(
            { msgCode: "MASTER_SURGERY_FOUND", data },
            res,
            httpStatus.OK
        );
    } catch (error) {
        console.log("🚀 ~ file: controller.js ~ line 301 ~ login ~ error", error);
        return response.error(
            { msgCode: "INTERNAL_SERVER_ERROR" },
            res,
            httpStatus.INTERNAL_SERVER_ERROR
        );
    }
};

const addEnquireSurgery = async (req, res) => {
    try {
        const { phone } = req.body
        const data = await common.create(SurgeryEnquiry.model, req.body);
        const message = `OTP sent to ${phone}: `;
        const otp = "123456" //generateOtp(6).toString();
        // await sendOTP(phone, mode, message, otp);
        const savedOtp = await common.create(OTP.model, {
            otp,
            phone: phone.replace(/[-\s]/g, ""),
        });
        if (!savedOtp) {
            return response.error(
                { msgCode: "FAILED_TO_CREATE_OTP" },
                res,
                httpStatus.FORBIDDEN
            );
        }
        return response.success(
            { msgCode: "ENQUIRE_SURGERY_ADDED", data: { data, otp } },
            res,
            httpStatus.OK
        );
    } catch (error) {
        console.log("🚀 ~ file: controller.js ~ line 301 ~ login ~ error", error);
        return response.error(
            { msgCode: "INTERNAL_SERVER_ERROR" },
            res,
            httpStatus.INTERNAL_SERVER_ERROR
        );
    }
};

const allEnquireSurgery = async (req, res) => {
    try {
        const data = await common.findAll(SurgeryEnquiry.model, {});
        return response.success(
            { msgCode: "ENQUIRE_SURGERY_LIST", data },
            res,
            httpStatus.OK
        );
    } catch (error) {
        console.log("🚀 ~ file: controller.js ~ line 301 ~ login ~ error", error);
        return response.error(
            { msgCode: "INTERNAL_SERVER_ERROR" },
            res,
            httpStatus.INTERNAL_SERVER_ERROR
        );
    }
};

const updateEnquireSurgery = async (req, res) => {
    try {
        const { id } = req.params;
        const content = req.body;
        const data = await common.updateById(SurgeryEnquiry.model, id, content);
        return response.success(
            { msgCode: "ENQUIRE_SURGERY_UPDATED", data },
            res,
            httpStatus.OK
        );
    } catch (error) {
        console.log("🚀 ~ file: controller.js ~ line 301 ~ login ~ error", error);
        return response.error(
            { msgCode: "INTERNAL_SERVER_ERROR" },
            res,
            httpStatus.INTERNAL_SERVER_ERROR
        );
    }
};

const deleteEnquireSurgery = async (req, res) => {
    try {
        const { id } = req.params;
        await common.removeById(SurgeryEnquiry.model, id); // Deleting the Surgery data
        return response.success(
            { msgCode: "ENQUIRE_SURGERY_DELETED", data: {} },
            res,
            httpStatus.OK
        );
    } catch (error) {
        console.log("🚀 ~ file: controller.js ~ line 301 ~ login ~ error", error);
        return response.error(
            { msgCode: "INTERNAL_SERVER_ERROR" },
            res,
            httpStatus.INTERNAL_SERVER_ERROR
        );
    }
};

const findEnquireSurgery = async (req, res) => {
    try {
        const { id } = req.params;
        const data = await common.getById(SurgeryEnquiry.model, id);
        return response.success(
            { msgCode: "ENQUIRE_SURGERY_FOUND", data },
            res,
            httpStatus.OK
        );
    } catch (error) {
        console.log("🚀 ~ file: controller.js ~ line 301 ~ login ~ error", error);
        return response.error(
            { msgCode: "INTERNAL_SERVER_ERROR" },
            res,
            httpStatus.INTERNAL_SERVER_ERROR
        );
    }
};

module.exports = {
    addSurgery,
    allSurgery,
    updateSurgery,
    deleteSurgery,
    findSurgery,
    addEnquireSurgery,
    allEnquireSurgery,
    updateEnquireSurgery,
    deleteEnquireSurgery,
    findEnquireSurgery
};