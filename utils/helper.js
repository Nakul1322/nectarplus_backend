const { v4: uuidv4 } = require("uuid");
const { ObjectId } = require("mongoose").Types;
const { constants } = require("./constant");
const crypto = require("crypto");
const moment = require("moment");
const ExcelJS = require("exceljs");

const genUUID = () => {
  const uuid = uuidv4();
  return uuid;
};

const generateOtp = (digit) => {
  const max = 10 ** digit - 1;
  const randomBytes = crypto.randomBytes(Math.ceil(digit / 2));
  const otp = parseInt(randomBytes.toString("hex"), 16) % max;
  return otp;
};

const filterFormatter = (filter, type = 1, recordKey = '') => {
  const filterQuery = [];
  if (type === 1) filter.split(",").map((filter) => filterQuery.push(new ObjectId(filter)));
  if (type === 2) { 
    filter.split(",").map((filter) => { 
    const queryObject = {};
    const filterKey = "/" + filter + "/i"
    queryObject[`${recordKey}`] = { $regex: new RegExp(`^${filter}$`, 'i') };
    filterQuery.push(queryObject); 
    })
  };
  return filterQuery;
};

const getPagination = (page, size) => {
  const limit = isNaN(parseInt(size)) ? 10 : parseInt(size);
  const offset = page ? (page - 1) * limit : 0;
  return { limit, offset };
};

const getSort = (sort, order) => {
  const orderBy = {
    asc: 1,
    desc: -1,
  };
  let sortingFilter = {};
  if (sort != "" && sort != undefined && sort != "undefined") {
    if (order != "" && order != undefined && order != "undefined") {
      sort = sort.trim();
      order = order.trim();
      sortingFilter[sort] = orderBy[order];
    }
  } else {
    sortingFilter = { approved_date: -1 };
  }
  return sortingFilter;
};

const getSearch = (search) => {
  let searchCase = {};
  if (search) {
    searchCase = {
      $or: [
        {
          cover_title: { $regex: search.trim(), $options: "i" },
        },
        {
          description: { $regex: search.trim(), $options: "i" },
        },
      ],
    };
  }
  return searchCase;
};

const getBloodGroup = (bloodGroup) => {
  let bloodGroupData = bloodGroup.split(",").map((group) => parseInt(group));
  return bloodGroupData;
};

const getAgeGroup = (ageGroup) => {
  const ageGroupData = [];
  ageGroup.split(",").map((age) =>
    ageGroupData.push({
      age: {
        $gte: constants.AGE_GROUP_VALUES[age].MIN_AGE,
        $lt: constants.AGE_GROUP_VALUES[age].MAX_AGE,
      },
    })
  );
  return ageGroupData;
};

const convertToUTCTimestamp = (dateString, timeString) => {
  const dateFormats = ["DD-MM-YYYY", "YYYY-MM-DD", "MMM DD, YYYY"];
  const date = moment(dateString, dateFormats);
  const time = moment(timeString, "hh:mm A");
  const hour = time.get("hour");
  const minute = time.get("minute");
  const second = time.get("second");
  date.set({
    hour,
    minute,
    second,
  });
  return date.toISOString();
};

const readExcelFile = async (filePath, fileName, type) => {
  let headers;
  console.log(filePath, fileName);
  const workbook = new ExcelJS.Workbook();
  const fileExtension = fileName.split(".").pop();
  console.log(fileExtension);

  if (fileExtension === "csv") {
    await workbook.csv.readFile(filePath);
  } else if (fileExtension === "xlsx") {
    await workbook.xlsx.readFile(filePath);
  } else {
    throw new Error("Unsupported file format");
  }

  const worksheet = workbook.getWorksheet(1);
  const rows = [];

  // Define headers for each column in the Excel file
  if ((type === 1)) {
    headers = [
      "Image",
      "Name",
      "Specialization",
      "Locality",
      "Degree",
      "Mobile",
      "Email",
    ];
  }
  if ((type === 2)) {
    headers = [
      "Image",
      "Name",
      "Type of Hospital",
      "Locality",
      "Total Doctors",
      "Mobile",
    ];
  }

  worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber > 1) {
      // Skip header row
      const rowData = row.values.slice(1); // Remove row number
      const rowObject = {};
      rowData.forEach((cell, index) => {
        rowObject[headers[index]] = cell;
      });
      rows.push(rowObject);
    }
  });

  return rows;
};

module.exports = {
  genUUID,
  generateOtp,
  getPagination,
  getSort,
  getSearch,
  filterFormatter,
  getAgeGroup,
  getBloodGroup,
  convertToUTCTimestamp,
  readExcelFile,
};
