const request = require("request");
const util = require("util");
const { AUTHKEY_IO, AUTHKEY_URL } = require("../config/index");

const requestPromise = util.promisify(request);

async function sendOtp(mobile, countryCode, data, sid) {
  try {
    const options = {
      url: AUTHKEY_URL,
      qs: {
        authkey: AUTHKEY_IO,
        mobile,
        country_code: countryCode,
        sid,
        ...data
      },
    };

    const response = await requestPromise(options);
    let smsStatus;
    if (response.statusCode === 200) smsStatus = true;
    else smsStatus = false;
    return smsStatus;
  } catch (error) {
    console.error("Error sending OTP:", error.message);
    return false;
  }
}

async function getOTPViaCall(mobile, countryCode, voice) {
  try {
    const options = {
      url: AUTHKEY_URL,
      qs: {
        authkey: AUTHKEY_IO,
        mobile,
        country_code: countryCode,
        voice
      },
    };

    const response = await requestPromise(options);
    let smsStatus;
    if (response.statusCode === 200) smsStatus = true;
    else smsStatus = false;
    return smsStatus;
  } catch (error) {
    console.error("Error sending OTP:", error.message);
    return false;
  }
}

module.exports = { sendOtp, getOTPViaCall };