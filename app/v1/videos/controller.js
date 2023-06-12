const httpStatus = require("http-status");
const { response } = require("../../../utils/index");
const { common } = require("../../../services/index");
const { Video, Doctor, EstablishmentMaster, Hospital } = require("../../../models/index");
const { ObjectId } = require('mongoose').Types;

const addVideo = async (req, res) => {
    try {
        // const { userId } = req.data;
        const content = req.body;
        // content.userId = new ObjectId(userId);
        const addVideo = await common.create(Video.model, content);
        return response.success(
            { msgCode: "VIDEO_ADDED", data: addVideo },
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

const allVideo = async (req, res) => {
    try {
        let videoList;
        const {id,establishmentId} =req.query;
        if(id){
            const findDoctor = await common.getById(Doctor.model, id)
            console.log(findDoctor);
            videoList = await common.findAll(Video.model, { userId: new ObjectId(findDoctor.userId) });
        }
        else if(establishmentId){
            const findEstablishment = await common.getById(EstablishmentMaster.model, establishmentId)
            const findEstablishmentUserId = await common.getById(Hospital.model, findEstablishment.hospitalId)
            videoList = await common.findAll(Video.model, { userId: new ObjectId(findEstablishmentUserId.userId) });
        }
        else{
            videoList = await common.findAll(Video.model, { userId: new ObjectId(userId) });
        }
        return response.success(
            { msgCode: "VIDEO_LIST", data: { count: videoList.length, data: videoList } },
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

const updateVideo = async (req, res) => {
    try {
        const { id } = req.query;
        const updates = req.body;
        const updateVideo = await common.updateById(Video.model, id, updates);
        return response.success(
            { msgCode: "VIDEO_UPDATED", data: updateVideo },
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

const deleteVideo = async (req, res) => {
    try {
        const { id } = req.query;
        await common.removeById(Video.model, id); // Deleting the Video data
        return response.success(
            { msgCode: "VIDEO_DELETED", data: {} },
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

const findVideo = async (req, res) => {
    try {
        const { id } = req.query;
        const videoData = await common.getById(Video.model, id);
        return response.success(
            { msgCode: "VIDEO_FOUND", data : videoData },
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
    addVideo,
    allVideo,
    updateVideo,
    deleteVideo,
    findVideo
};