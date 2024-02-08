const httpStatus = require("http-status");
const {
  response,
  generateOtp,
  sendSms,
  generateHash,
  comparePassword,
} = require("../../../utils/index");
const { common, surgery, adminService } = require("../../../services/index");
const {
  SurgeryMaster,
  SurgeryEnquiry,
  OTP,
  Notification,
  DepartmentMaster,
  SurgeryFAQ,
} = require("../../../models/index");
const { getPagination, objectIdFormatter } = require("../../../utils/helper");
const { constants } = require("../../../utils/constant");
const moment = require("moment");
const { ObjectId } = require("mongoose").Types;
const config = require("../../../config/index");
const environment = config.ENVIRONMENT === constants.SERVER.PROD;
const slugify = require("slugify");

const addSurgery = async (req, res) => {
  try {
    const { userId } = req.data;
    const content = req.body;
    const { departmentId, faq } = content;
    const departmentData = await common.getById(
      DepartmentMaster.model,
      departmentId
    );
    if (!departmentData || departmentData.isDeleted)
      return response.error(
        { msgCode: "DEPT_NOT_FOUND", data: {} },
        res,
        httpStatus.NOT_FOUND
      );

    const { title } = content;
    const findSurgery = await common.getByCondition(SurgeryMaster.model, {
      title,
    });
    if (findSurgery)
      return response.error(
        { msgCode: "SURGERY_MASTER_EXISTS" },
        res,
        httpStatus.FORBIDDEN
      );
    content.createdBy = new ObjectId(userId);
    const baseSlug = slugify(title, {
      lower: true,
      remove: undefined,
      strict: true,
    });
    content.slug = baseSlug;
    const data = await common.create(SurgeryMaster.model, content);
    if (faq?.length !== 0) {
      faq.forEach((obj) => {
        obj["surgeryId"] = data.id;
      });
      await common.insertManyData(SurgeryFAQ.model, faq);
    }
    return response.success(
      { msgCode: "MASTER_SURGERY_ADDED", data },
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

const allSurgery = async (req, res) => {
  try {
    const { sort, sortOrder } = req.query;
    const sortCondition = {};
    sortCondition[`${sort}`] = constants.LIST.ORDER[sortOrder];
    const data = await common.findAll(
      SurgeryMaster.model,
      {
        isDeleted: false,
      },
      { title: 1 }
    );
    const count = await common.count(SurgeryMaster.model, { isDeleted: false });
    const result = {
      count,
      data: data,
    };
    return response.success(
      { msgCode: "MASTER_SURGERY_LIST", data: result },
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

const updateSurgery = async (req, res) => {
  try {
    const { userId } = req.data;
    const { id } = req.params;
    const content = req.body;
    const { title } = content;
    const findSurgery = await common.getByCondition(SurgeryMaster.model, {
      title,
      _id: { $ne: new ObjectId(id) },
    });
    if (findSurgery)
      return response.error(
        { msgCode: "SURGERY_MASTER_EXISTS" },
        res,
        httpStatus.FORBIDDEN
      );
    content.updatedBy = new ObjectId(userId);
    const data = await common.updateById(SurgeryMaster.model, id, content);
    return response.success(
      { msgCode: "MASTER_SURGERY_UPDATED", data },
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

const deleteSurgery = async (req, res) => {
  try {
    const { userId } = req.data;
    const { id } = req.params;
    await common.updateById(SurgeryMaster.model, id, {
      isDeleted: true,
      updatedBy: new ObjectId(userId),
    });
    return response.success(
      { msgCode: "MASTER_SURGERY_DELETED", data: {} },
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
    console.log(error);
    return response.error(
      { msgCode: "INTERNAL_SERVER_ERROR" },
      res,
      httpStatus.INTERNAL_SERVER_ERROR
    );
  }
};

const addEnquireSurgery = async (req, res) => {
  try {
    const { phone, countryCode } = req.body;
    const data = await common.create(SurgeryEnquiry.model, req.body);
    const otp = environment
      ? generateOtp(config.DEFAULT_OTP_LENGTH)
      : config.DEFAULT_OTP;
    const hashOtp = await generateHash(otp);
    const savedOtp = await common.create(OTP.model, {
      otp: hashOtp,
      phone: phone?.replace(/[-\s]/g, ""),
    });
    if (!savedOtp) {
      return response.error(
        { msgCode: "FAILED_TO_CREATE_OTP" },
        res,
        httpStatus.FORBIDDEN
      );
    }
    if (config.ENVIRONMENT === constants.SERVER.STAGE) {
      const sendOtp = await sendSms.sendOtp(
        phone,
        countryCode,
        { OTP: otp },
        constants.SMS_TEMPLATES.OTP
      );
      if (!sendOtp)
        return response.error(
          { msgCode: "OTP_NOT_SENT", data: {} },
          res,
          httpStatus.FORBIDDEN
        );
    }
    return response.success(
      { msgCode: "ENQUIRE_SURGERY_ADDED", data: { data } },
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

const allEnquireSurgery = async (req, res) => {
  try {
    const data = await common.findAll(SurgeryEnquiry.model, {});
    return response.success(
      { msgCode: "ENQUIRE_SURGERY_LIST", data },
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

const updateEnquireSurgery = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.data;
    const content = req.body;
    if (content.claimByUserType) {
      content.claimBy = new ObjectId(userId);
      content.claimedDate = new Date();
    }
    const data = await common.updateById(SurgeryEnquiry.model, id, content);
    return response.success(
      { msgCode: "ENQUIRE_SURGERY_UPDATED", data },
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
    console.log(error);
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
    console.log(error);
    return response.error(
      { msgCode: "INTERNAL_SERVER_ERROR" },
      res,
      httpStatus.INTERNAL_SERVER_ERROR
    );
  }
};

const enquiryVerifyOtp = async (req, res) => {
  try {
    const { id, phone, otp } = req.body;
    const data = await common.getById(SurgeryEnquiry.model, id);
    if (!data)
      return response.error(
        { msgCode: "ENQUIRY_NOT_FOUND", data: {} },
        res,
        httpStatus.NOT_FOUND
      );
    const findUserOTP = await common.findObject(OTP.model, {
      phone: phone?.replace(/[-\s]/g, ""),
    });
    const check = comparePassword(otp, findUserOTP?.otp);
    if (!check) {
      return response.error(
        { msgCode: "INVALID_OTP" },
        res,
        httpStatus.NOT_ACCEPTABLE
      );
    }
    if (check && new Date(findUserOTP.expiresAt).getTime() < Date.now()) {
      return response.error(
        { msgCode: "EXPIRED_OTP" },
        res,
        httpStatus.NOT_ACCEPTABLE
      );
    }
    //empty otp field by updating
    await common.removeById(OTP.model, findUserOTP._id); // Removing OTP
    await common.updateById(SurgeryEnquiry.model, id, { isMobileVerify: true });
    const superadminArray = await adminService.superAdminList();
    await common.create(Notification.model, {
      userType: constants.USER_TYPES.ADMIN,
      eventType: constants.NOTIFICATION_TYPE.SURGERY_LEAD,
      receiverId: superadminArray,
      title: constants.MESSAGES.SURGERY_LEAD.TITLE,
      body: constants.MESSAGES.SURGERY_LEAD.BODY,
    });
    return response.success(
      { msgCode: "OTP_VERIFIED", data: {} },
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

const enquiryResendOtp = async (req, res) => {
  try {
    const { id, phone } = req.body;
    const data = await common.getById(SurgeryEnquiry.model, id);
    if (!data)
      return response.error(
        { msgCode: "ENQUIRY_NOT_FOUND", data: {} },
        res,
        httpStatus.NOT_FOUND
      );

    const otp = environment
      ? generateOtp(config.DEFAULT_OTP_LENGTH)
      : config.DEFAULT_OTP;
    const hashOtp = await generateHash(otp);
    await common.updateByCondition(
      OTP.model,
      { phone: phone?.replace(/[-\s]/g, "") },
      {
        otp: hashOtp,
        expiresAt: new Date().setMinutes(new Date().getMinutes() + 10),
      }
    ); // update OTP in user document
    await common.updateById(SurgeryMaster.model, id, { phone });
    if (environment) {
      const sendOtp = await sendSms.sendOtp(
        phone,
        data.countryCode,
        { OTP: otp },
        constants.SMS_TEMPLATES.OTP
      );
      if (!sendOtp)
        return response.error(
          { msgCode: "OTP_NOT_SENT", data: {} },
          res,
          httpStatus.FORBIDDEN
        );
    }
    return response.success(
      { msgCode: "OTP_RESENT", data: {} },
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

const allEnquiresList = async (req, res) => {
  try {
    const {
      search,
      sort,
      page,
      size,
      sortOrder,
      status,
      isExport,
      service,
      source,
      typeOfList,
      startDate,
      endDate,
      surgeryTypes,
    } = req.body;
    const sortCondition = {};

    let sortKey = sort;
    if (constants.NAME_CONSTANT.includes(sort))
      sortKey = constants.SURGERY_LIST_SORT[sort];
    sortCondition[`${sortKey}`] = constants.LIST.ORDER[sortOrder];

    const { limit, offset } = getPagination(page, size);
    const searchQuery = search || "";
    const condition = { isDeleted: false };
    let todayListCondition = {},
      upcomingListCondition = {};
    if (status?.length > 0) {
      condition.$and = [];
      const statusCondition = { $in: status };
      condition.$and.push({ status: statusCondition });
    }
    if (source?.length > 0) {
      condition.$and = [];
      const sourceCondition = { $in: source };
      condition.$and.push({ source: sourceCondition });
    }
    if (service?.length > 0) {
      condition.$and = [];
      const servicesArray = objectIdFormatter(service);
      condition.$and.push({ treatmentType: { $in: servicesArray } });
    }
    if (surgeryTypes?.length > 0) {
      condition.$and = [];
      const surgeryTypesArray = objectIdFormatter(surgeryTypes);
      condition.$and.push({ treatmentType: { $in: surgeryTypesArray } });
    }
    if (typeOfList) {
      const startOfDay = moment().startOf("day").toISOString();
      const endOfDay = moment().endOf("day").toISOString();
      const todayDate = {
        $gte: new Date(startOfDay),
        $lt: new Date(endOfDay),
      };
      const upcomingDate = { $gte: new Date(endOfDay) };
      todayListCondition = {
        isDeleted: false,
        createdAt: todayDate,
      };
      upcomingListCondition = {
        isDeleted: false,
        followUpDate: upcomingDate,
      };
      switch (typeOfList) {
        case constants.SURGERY_ENQUIRY_LIST_TYPE.TODAY:
          condition.createdAt = todayDate;
          break;
        case constants.SURGERY_ENQUIRY_LIST_TYPE.UPCOMING:
          condition.followUpDate = upcomingDate;
          break;
        case constants.SURGERY_ENQUIRY_LIST_TYPE.ALL_TIME:
          break;
      }
    }
    if (isExport) condition.createdAt = { $gte: startDate, $lt: endDate };
    const enquiryList = await surgery.enquiryList(
      condition,
      sortCondition,
      offset,
      limit,
      searchQuery,
      isExport
    );
    const todayList = await surgery.enquiryList(
      todayListCondition,
      sortCondition,
      offset,
      limit,
      searchQuery,
      isExport
    );
    const upcomingList = await surgery.enquiryList(
      upcomingListCondition,
      sortCondition,
      offset,
      limit,
      searchQuery,
      isExport
    );
    const msgCode = !enquiryList?.count ? "NO_RECORD_FETCHED" : "ENQUIRY_LIST";

    return response.success(
      {
        msgCode,
        data: {
          todayCount: todayList.count,
          upcomingCount: upcomingList.count,
          enquiryList,
        },
      },
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

const departmentList = async (req, res) => {
  try {
    const condition = {
      isDeleted: false,
    };
    const data = await surgery.departmentList(condition);
    return response.success(
      { msgCode: "DEPARTMENT_LIST", data },
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

const departmentSurgeryList = async (req, res) => {
  try {
    const { id } = req.query;
    const departmentData = await common.getById(DepartmentMaster.model, id);
    if (!departmentData || departmentData.isDeleted)
      return response.error(
        { msgCode: "DEPT_NOT_FOUND", data: {} },
        res,
        httpStatus.NOT_FOUND
      );
    const condition = {
      isDeleted: false,
      departmentId: new ObjectId(id),
    };
    const data = await surgery.departmentSurgeryList(condition);
    return response.success(
      {
        msgCode: "DEPARTMENT_LIST",
        data: { count: data?.length || 0, list: data },
      },
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

const findSurgeryBySlug = async (req, res) => {
  try {
    const { slug, id } = req.query;
    const condition = { isDeleted: false };
    if (id) condition._id = new ObjectId(id);
    if (slug) condition.slug = slug;
    const data = await common.getByCondition(SurgeryMaster.model, condition);
    return response.success(
      { msgCode: "MASTER_SURGERY_FOUND", data },
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
  addSurgery,
  allSurgery,
  updateSurgery,
  deleteSurgery,
  findSurgery,
  addEnquireSurgery,
  allEnquireSurgery,
  updateEnquireSurgery,
  deleteEnquireSurgery,
  findEnquireSurgery,
  enquiryVerifyOtp,
  enquiryResendOtp,
  allEnquiresList,
  departmentList,
  departmentSurgeryList,
  findSurgeryBySlug,
};
