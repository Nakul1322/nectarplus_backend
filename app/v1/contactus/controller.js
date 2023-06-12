const httpStatus = require("http-status");
const { response } = require("../../../utils/index");
const { common } = require("../../../services/index");
const { ContactUs } = require("../../../models/index");
const { constants } = require("../../../utils/constant");

const addContactUs = async (req, res) => {
    try {
        const content = req.body
        console.log(content)
        const data = await common.create(ContactUs.model, content);
        console.log(data)
        return response.success(
            { msgCode: "CONTACT_US_ADDED", data },
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

const allContactUs = async (req, res) => {
    try {
        const data = await common.findAll(ContactUs.model,{});
        return response.success(
            { msgCode: "CONTACT_US_LIST", data },
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

const updateContactUs = async (req, res) => {
    try {
        const { id } = req.params;
        const content = req.body;
        const data = await common.updateById(ContactUs.model, id, content);
        return response.success(
            { msgCode: "CONTACT_US_UPDATED", data },
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

const deleteContactUs = async (req, res) => {
    try {
        const { id } = req.params;
        await common.removeById(ContactUs.model, id); // Deleting the ContactUs data
        return response.success(
            { msgCode: "CONTACT_US_DELETED", data: {} },
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

const findContactUs = async (req, res) => {
    try {
        const { id } = req.params;
        const data = await common.getById(ContactUs.model, id);
        return response.success(
            { msgCode: "CONTACT_US_FOUND", data },
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
    addContactUs,
    allContactUs,
    updateContactUs,
    deleteContactUs,
    findContactUs
};