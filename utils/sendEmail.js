const request = require("request");
const axios = require("axios");
const ejs = require("ejs");
const util = require("util");
const path = require("path");
const fs = require("fs");
const { AUTHKEY_IO, AUTHKEY_URL_EMAIL } = require("../config/index");

const requestPromise = util.promisify(request);

const sendEmail = async (email, mid, data) => {
  try {
    const options = {
      url: AUTHKEY_URL_EMAIL,
      qs: {
        authkey: AUTHKEY_IO,
        email,
        mid,
        ...data,
      },
    };

    const response = await requestPromise(options);
    let emailStatus;
    if (response.statusCode === 200) emailStatus = true;
    else emailStatus = false;
    return emailStatus;
  } catch (error) {
    console.error("Error sending Email:", error.message);
    return false;
  }
};

const sendEmailPostAPI = async (email, mid, htmlFile, mailParameters) => {
  try {
    const parsedHTML = renderHTMLByEJS(htmlFile, mailParameters);
    if (!parsedHTML) return false;
    const apiUrl = AUTHKEY_URL_EMAIL;
    const requestBody = {
      mid,
      email,
      body: parsedHTML,
    };
    const response = await axios.post(apiUrl, requestBody, {
      headers: {
        Authorization: "Basic " + AUTHKEY_IO,
      },
    });
    let emailStatus;
    if (response.statusCode === 200) emailStatus = true;
    else emailStatus = false;
    return emailStatus;
  } catch (error) {
    console.error("Error sending email:", error.message);
    return false;
  }
};

const renderHTMLByEJS = (htmlFileName, data) => {
  try {
    const htmlFilePath = path.join(__dirname, "../", htmlFileName);
    const htmlContent = fs.readFileSync(htmlFilePath, "utf8");
    const renderedHTML = ejs.render(htmlContent, data);
    return renderedHTML;
  } catch (error) {
    console.log(error);
    return false;
  }
};

module.exports = { sendEmail, sendEmailPostAPI, renderHTMLByEJS };
