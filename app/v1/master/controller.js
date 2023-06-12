const httpStatus = require("http-status");
const { response } = require("../../../utils/index");
const { common } = require("../../../services/index");
const { constants } = require("../../../utils/constant");
const { ObjectId } = require("mongoose").Types;
const { getPagination } = require('../../../utils/helper');
const { 
    HospitalType, 
    StateMaster, 
    CityMaster, 
    ProcedureMaster, 
    Speciality, 
    DegreeMaster, 
    CollegeMaster, 
    SurgeryMaster, 
    SocialMedia, 
    Specialization 
} = require("../../../models/index")

const MASTER_DATA_MODELS = {
    1: HospitalType,
    2: StateMaster,
    3: CityMaster,
    4: ProcedureMaster,
    5: Speciality,
    6: DegreeMaster,
    7: CollegeMaster,
    8: SurgeryMaster,
    9: SocialMedia,
    10: Specialization
  }

  const MASTER_DATA_MODELS_REQ_URL = {
    'hospital-type': HospitalType,
    'state': StateMaster,
    'city': CityMaster,
    'procedure': ProcedureMaster,
    'speciality': Speciality,
    'degree': DegreeMaster,
    'college': CollegeMaster,
    'surgery': SurgeryMaster,
    'social-media': SocialMedia,
    'specialization': Specialization
  }

const addMaster = async (req, res) => {
    try {
        const { type, content } = req.body;
        const model = MASTER_DATA_MODELS[type].model;
        console.log(model)
        const data = await common.create(model, content);
        return response.success(
            { msgCode: "MASTER_ADDED", data },
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

const getAllMasterDataList = async (req, res) => {
    try {
        const { type, search, sort, page, size, sortOrder, isExport, recordId } = req.query;
        const model = MASTER_DATA_MODELS[type].model;
        const sortCondition = {};
        sortCondition[`${sort}`] = constants.LIST.ORDER[sortOrder];
    
        const { limit, offset } = getPagination(page, size);    
        const condition = {
            '$or': [{
              'name': { $regex: new RegExp(search, 'i') }
            }]
        };
        if  (type === constants.MASTER_DATA.CITY) condition.stateId = new ObjectId(recordId);        
        const data = await common.getMasterData(model, condition, sortCondition, offset, limit, isExport);
        return response.success(
            { msgCode: "MASTER_LIST", data },
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

const updateMaster = async (req, res) => {
    try {
        const { id } = req.params;
        const { type } = req.query;
        const model = MASTER_DATA_MODELS[type].model;
        const content = req.body;
        const data = await common.updateById(model, id, content);
        return response.success(
            { msgCode: "MASTER_UPDATED", data },
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

const deleteMaster = async (req, res) => {
    try {
        const { id } = req.params;
        const { type } = req.query;
        const model = MASTER_DATA_MODELS[type].model;
        const data = await common.removeById(model, id);
        return response.success(
            { msgCode: "MASTER_DELETED", data },
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

const getMasterDataByID = async (req, res) => {
    try {
        const { id } = req.params;
        const { type } = req.query;
        const model = MASTER_DATA_MODELS[type].model;
        const data = await common.getById(model, id);
        return response.success(
            { msgCode: "MASTER_FOUND", data },
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



const getAllMasterData = async (req, res) => {
    try {
        const { search, sort, page, size, sortOrder, isExport } = req.query;
        const model = MASTER_DATA_MODELS_REQ_URL[req.url.split('/')[1]].model;
        const sortCondition = {};
        sortCondition[`${sort}`] = constants.LIST.ORDER[sortOrder];
    
        const { limit, offset } = getPagination(page, size);    
        const condition = {
            '$or': [{
              'name': { $regex: new RegExp(search, 'i') }
            }]
        };
        // if  (type === constants.MASTER_DATA.CITY) condition.stateId = new ObjectId(recordId);        
        const data = await common.getMasterData(model, condition, sortCondition, offset, limit, isExport);
        return response.success(
            { msgCode: "MASTER_LIST", data },
            res,
            httpStatus.OK
        );
    } catch (error) {
        console.log("🚀  file: controller.js  line 301  login  error", error);
        return response.error(
            { msgCode: "INTERNAL_SERVER_ERROR" },
            res,
            httpStatus.INTERNAL_SERVER_ERROR
        );
    }
};

module.exports = {
    addMaster,
    getAllMasterData,
    updateMaster,
    deleteMaster,
    getMasterDataByID,
    getAllMasterDataList
};