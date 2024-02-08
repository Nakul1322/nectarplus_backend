const httpStatus = require("http-status");
const { response } = require("../../../utils/index");
const { common } = require("../../../services/index");
const { CityMaster } = require("../../../models/index");
const { constants } = require("../../../utils/constant");

const addCity = async (req, res) => {
    try {
        const content = req.body
        const data = await common.create(CityMaster.model, content);
        return response.success(
            { msgCode: "CITY_ADDED", data },
            res,
            httpStatus.OK
        );
    } catch (error) {
        console.log(error);
        return response.error(
            { msgCode: "INTERNAL_SERVER_ERROR" },
            res,
            httpStatus.INTERNAL_SERVER_ERROR
        );
    }
};

const allCity = async (req, res) => {
    try {
        const data = await common.findAll(CityMaster.model, { });
        return response.success(
            { msgCode: "CITY_LIST", data },
            res,
            httpStatus.OK
        );
    } catch (error) {
        console.log(error);
        return response.error(
            { msgCode: "INTERNAL_SERVER_ERROR" },
            res,
            httpStatus.INTERNAL_SERVER_ERROR
        );
    }
};

const updateCity = async (req, res) => {
    try {
        const { id } = req.params;
        const content = req.body;
        const data = await common.updateById(CityMaster.model, id, content);
        return response.success(
            { msgCode: "CITY_UPDATED", data },
            res,
            httpStatus.OK
        );
    } catch (error) {
        console.log(error);
        return response.error(
            { msgCode: "INTERNAL_SERVER_ERROR" },
            res,
            httpStatus.INTERNAL_SERVER_ERROR
        );
    }
};

const deleteCity = async (req, res) => {
    try {
        const { id } = req.params;
        await common.removeById(CityMaster.model, id); // Deleting the city
        return response.success(
            { msgCode: "CITY_DELETED", data: {} },
            res,
            httpStatus.OK
        );
    } catch (error) {
        console.log(error);
        return response.error(
            { msgCode: "INTERNAL_SERVER_ERROR" },
            res,
            httpStatus.INTERNAL_SERVER_ERROR
        );
    }
};

const findCity = async (req, res) => {
    try {
        const { id } = req.params;
        const data = await common.getById(CityMaster.model, id);
        return response.success(
            { msgCode: "CITY_FOUND", data },
            res,
            httpStatus.OK
        );
    } catch (error) {
        console.log(error);
        return response.error(
            { msgCode: "INTERNAL_SERVER_ERROR" },
            res,
            httpStatus.INTERNAL_SERVER_ERROR
        );
    }
};

module.exports = {
    addCity,
    allCity,
    updateCity,
    deleteCity,
    findCity
};