const { v4: uuidv4 } = require("uuid");
const { ObjectId } = require("mongoose").Types;
const { constants } = require("./constant");
const moment = require("moment");
const ExcelJS = require("exceljs");
const { Readable } = require("stream");
const bcrypt = require('bcrypt');
let saltRounds = 10;

const genUUID = () => {
  const uuid = uuidv4();
  return uuid;
};

const generateOtp = (digit) => {
  const otp = Math.floor(
      10 ** (digit - 1) + Math.random() * (10 ** (digit - 1) * 9)
  );
  return otp;
};

const filterFormatter = (filter, type = 1, recordKey = '') => {
  const filterQuery = [];
  if (type === 1) filter.split(",").map((filter) => filterQuery.push(new ObjectId(filter)));
  if (type === 2) { 
    filter.split(",").map((filter) => { 
    const queryObject = {};
    queryObject[`${recordKey}`] = { $regex: new RegExp(`^${filter}$`, 'i') };
    filterQuery.push(queryObject); 
    })
  };
  return filterQuery;
};

const objectIdFormatter = (filter, type = 1, recordKey = '') => {
  const filterQuery = [];
  if (type === 1) filter.map((filterData) => filterQuery.push(new ObjectId(filterData)));
  if (type === 2) { 
    filter.map((filterData) => { 
    const queryObject = {};
    const filterKey = "/" + filterData + "/i"
    queryObject[`${recordKey}`] = { $regex: new RegExp(`^${filterKey}$`, 'i') };
    filterQuery.push(queryObject); 
    })
  }
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

const readExcelFile = async (fileBuffer, fileName, type) => {
  let headers;
  const workbook = new ExcelJS.Workbook();
  const fileExtension = fileName.split(".").pop();
  const readableStream = new Readable({
    read() {
      this.push(fileBuffer);
      this.push(null);
    },
  });
  if (fileExtension === "csv") {
    await workbook.csv.read(readableStream);
  } else if (fileExtension === "xlsx") {
    await workbook.xlsx.read(readableStream);
  } else {
    return false;
  }
  const worksheet = workbook.getWorksheet(1);
  const rows = [];
  // Define headers for each column in the Excel file
  if ((type === 1)) {
    headers = [
      "HospitalType",
      "Name",
      "Street",
      "Locality",
      "City",
      "Phone",
      "State",
      "Pincode",
      "Country",
      "ChangePhone"
    ];
  }
  if ((type === 2)) {
    headers = [
      "Name",
      "Phone",
      "Specialization",
      "Gender",
      "RegistrationNumber",
      "RegistrationCouncil",
      "RegistrationYear",
      "Degree",
      "College",
      "YearOfCompletion",
      "Experience",
      "Owner",
      "EstablishmentName",
      "HospitalType",
      "Street",
      "Locality",
      "City",
      "State",
      "Pincode",
      "Country",
      "ChangePhone"
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

const generateHash = async (password) => {
  try {
    saltRounds = parseInt(saltRounds);
    const salt = bcrypt.genSaltSync(saltRounds);
    const hash = bcrypt.hashSync(password.toString(), salt);
    return hash;
  } catch (err) {
    return err;
  }
};
// you can compare hash otp by below function
const comparePassword = (password, hash) =>
  bcrypt.compareSync(password, hash);

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
  objectIdFormatter,
  generateHash,
  comparePassword
};
