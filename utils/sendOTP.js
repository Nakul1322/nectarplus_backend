const twilio = require("twilio");
const config = require("../config/index");

// Twilio credentials
const client = twilio(config.twilio.accountSid, config.twilio.authToken);

/**
 * Sends an OTP to the provided mobile number using Twilio SMS API.
 *
 * @param {string} phone The mobile number to which the OTP should be sent.
 * @param {string} message The message in which the OTP should be sent.
 * @returns {Promise<string>} A Promise that resolves with the generated OTP if the SMS is sent successfully.
 * @throws {Error} Throws an error if the SMS fails to send.
 */
async function sendOTP(phone, mode, message, otp) {
  // Twilio SMS or Voice API call to send OTP to the provided mobile number
  try {
    if (mode === 1) {
      await client.calls.create({
        twiml: `<Response><Say>${message} ${otp.toString().split('').join(' ')}</Say></Response>`,
        from: config.twilio.senderPhoneNumber,
        to: phone,
      });
      console.log(`OTP sent via call to ${phone}: ${otp}`);
    } else {
      await client.messages.create({
        body: `${message} ${otp}`,
        from: config.twilio.senderPhoneNumber,
        to: phone,
      });
      console.log(`OTP sent via SMS to ${phone}: ${otp}`);
    }
    return otp.toString();
  } catch (error) {
    console.error(`Error sending OTP: ${error}`);
    throw new Error("Error sending OTP");
  }
}

module.exports = sendOTP;
