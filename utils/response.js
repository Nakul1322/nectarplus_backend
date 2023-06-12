const successMessage = {
  en: {
    LOGIN_SUCCESSFUL: "Login successful.",
    SIGNUP_SUCCESSFUL: "You've successfully signed up.",
    INTERNAL_SERVER_ERROR: "Internal server error.",
    OTP_VERIFIED: "OTP verified successfully.",
    USER_NOT_FOUND: "User not found.",
    APPOINTMENT_LIST_FETCHED: "Appointment list fetched successfully.",
    NO_RECORD_FETCHED: "No record found.",
    PASSWORD_UPDATED: "Password successfully updated.",
    HOSPITAL_DATA: "Hospital data fetched successfully.",
    HOSPITAL_ADDED: "Hospital added successfully.",
    HOSPITAL_UPDATED: "Hospital updated successfully.",
    HOSPITAL_STATUS_UPDATED:"Hospital status updated successfully.",
    DATA_CREATED: "Data successfully created.",
    DOCTOR_STATUS_UPDATED: "Doctor status successfully updated.",
    DATA_UPDATE: "Data successfully updated.",
    OTP_RESENT: "Otp successfully resend.",
    OTP_SENT: "Otp successfully send.",
    FAQ_ADDED: "FAQ added successfully.",
    FAQ_LIST: "FAQ List.",
    FAQ_UPDATED: "FAQ updated successfully.",
    FAQ_DELETED: "FAQ deleted successfully.",
    DATA_DELETED: "Data deleted successfully.",
    ACCOUNT_DELETED: "Account deleted successfully.",
    FAQ_FOUND: "FAQ found.",
    FEEDBACK_ADDED: "Feedback added successfully.",
    FEEDBACK_UPDATED: "Feedback updated successfully.",
    FEEDBACK_DELETED: "Feedback deleted successfully.",
    FEEDBACK_FOUND: "Feedback found successfully.",
    FEEDBACK_LIST: "Feedback list.",
    MASTER_FEEDBACK_ADDED: "Master feedback added successfully.",
    MASTER_FEEDBACK_UPDATED: "Master feedback updated successfully.",
    MASTER_FEEDBACK_DELETED: "Master feedback deleted successfully.",
    MASTER_FEEDBACK_FOUND: "Master feedback found successfully.",
    MASTER_FEEDBACK_LIST: "Master feedback list.",
    ACCOUNT_DATA: "Account data found successfully.",
    ACCOUNT_UPDATED: "Account updated successfully.",
    EDUCATION_DATA: "Education data found successfully.",
    AWARDS_AND_RECOGNITION_DATA: "Awards and recognition data found successfully.",
    MEDICAL_REGISTRATION_DATA: "Medical registration data found successfully.",
    DELETE_SUCCESS: "Delete operation executed successfully.",
    UPDATE_SUCCESS: "Update operation executed successfully.",
    SERVICES_DATA: "Services data found successfully.",
    DATA_NOT_FOUND: "Data not found",
    FETCHED: "Data successfully found",
    APPOINTMENT_NOT_FOUND: "Appointment not found",
    APPOINTMENT_DELETED: "Appointment deleted successfully",
    APPOINTMENT_COMPLETED: "Appointment successfully completed",
    PROFILE_UPDATED: "Profile updated successfully.",
    PATIENT_CLINICAL_RECORD: "Patient clinical record found successfully.",
    CLINICAL_RECORD_ADDED: "Clinical record added successfully.",
    PATIENT_LIST: "Patient list found successfully.",
    PATIENT_DATA: "Patient data fetched successfully.",
    PATIENT_DATA_UPDATED: "Patient data updated successfully.",
    MEMBERSHIP_DATA: "Membership data found successfully.",
    VIDEOS_DATA: "Video list found successfully.",
    PROFILE_DELETED_SUCCESSFUL: "Account deleted successfully",
    DOCTOR_UPDATED: "Doctor updated successfully.",
    DOCTOR_LIST:"Doctor data found successfully",
    MASTER_SURGERY_ADDED: "Master surgery added successfully.",
    MASTER_SURGERY_UPDATED: "Master surgery updated successfully.",
    MASTER_SURGERY_DELETED: "Master surgery deleted successfully.",
    MASTER_SURGERY_FOUND: "Master surgery found successfully.",
    MASTER_SURGERY_LIST: "Master surgery list.",
    FILE_ADDED: "File uploaded successfully.",
    APPOINTMENT_BOOKED:"Your appointment has been booked",
    APPOINTMENT_CANCELLATION:"Appointment cancelled successfully.",
    APPOINTMENT_STATUS:"Appointment status",
    APPOINTMENT_RESCHEDULE:"Appointment has been reschedule successfully",
    NO_RECORD_FOUND: "No record found.",
    SOCIAL_DATA: "Social data found.",
    DATA_ADDED: "Data added successfully.",
    VIDEO_LIST: "Video list found.",
    VIDEO_ADDED: "Video added successfully.",
    VIDEO_UPDATED: "Video updated successfully.",
    VIDEO_DELETED: "Video deleted successfully.",
    VIDEO_FOUND: "Video record fetched successfully.",
    DOCTOR_SPECIALITY_LIST:"List of doctor specialites",
    DOCTOR_REVIEWS_LIST:"List of doctor reviews",
    DOCTOR_ABOUT_US:"Doctor abbout us",
    ADMIN_DASHBOARD_APPOINTMENT_COUNT:"Count for appointment bar graph data",
    DOCTOR_DELETED:" Doctor deleted successfully.",
    EMAIL_AVAILABLE: "Email available for use.",
    EMAIL_EXISTS: "Email already in use.",
    MEDICAL_REGISTRATION_EXISTS: "Medical registration already in use.",
    MEDICAL_REGISTRATION_AVAILABLE: "Medical registration available for use.",
    DELETED: "Data deleted successfully.",
    HOSPITAL_LIST: "Hospital list fetched.",
    REVIEW_LIST: "Review list fetched."
  },
  zh: {
    LOGIN_SUCCESSFUL: "登入成功",
    INTERNAL_SERVER_ERROR: "內部服務器錯誤",
    SIGNUP_SUCCESSFUL: "注册成功",
  },
};

const errorMessage = {
  en: {
    TOKEN_REQUIRED: "Token is required.",
    TOKEN_EXPIRED: "Token Expired resend again.",
    SESSION_EXPIRE: "Your session is expired.",
    ALREADY_REGISTERED: "Mobile number already registered.",
    UPDATE_ERROR: "Error in updating data.",
    API_ERROR: "Error in Api Execution.",
    VALIDATION_ERROR: "Validation error.",
    FAILED_TO_ADD: "Failed to Add Data.",
    INVALID_CREDENTIALS: "Invalid Credentials.",
    EMAIL_FAILURE: "Email not sent.",
    EMAIL_ALREADY_EXISTS: "Email already exists.",
    UNAUTHORISED: "Unauthorized Access.",
    FAILED_TO_UPDATE: "You can't Update.",
    FAILED_TO_DELETE: "Failed to Delete Data.",
    INTERNAL_SERVER_ERROR: "Internal server error.",
    INVALID_EMAIL: "Invalid email id.",
    INVALID_OTP: "Invalid otp.",
    SIGNUP_FAILED: "Your signUp failed.",
    EMAIL_NOT_VERIFIED: "Email is not verified.",
    INVALID_TOKEN: "Your token is invalid.",
    EMAIL_NOT_SENT: "Your email address is not a valid.",
    MISSING_TOKEN: "Missing token.",
    MISSING: "Parameter is missing.",
    IMAGE_NOT_ADDED: "Image not Added successfully.",
    NOT_VALID_IMAGE: "Image type is not valid.",
    IMAGE_IS_LARGE: "Image size is too large.",
    UNIQUE_TITLE: "cover_title must be unique.",
    UNIQUE_DESCRIPTION: "cover_description must be unique.",
    PASSWORD_MISMATCH: "Password mismatch.",
    HOSPITAL_NOT_FOUND: "Hospital Not found.",
    FAILED_TO_UPDATE_OTP: "Failed to update otp",
    ACCOUNT_NOT_FOUND: "Account not found.",
    NOT_FOUND: "Data not found.",
    INCOMPLETE_PROFILE: "Please complete the pending profile steps.",
    CLINICAL_RECORD_EXISTS: "Clinical record already exists.",
    CLINICAL_RECORD_NOT_FOUND: "Clinical record not found.",
    EXPIRED_OTP: "OTP is expired.",
    FAILED_TO_CREATE_OTP: "Failed to create OTP.",
    MISSING_FILE: "Missing file for upload.",
    FILE_NOT_ADDED: "File not uploaded.",
    DOCTOR_ID_MISSING: "doctorId is required.",
    WRONG_FILE_TYPE:  "Wrong file type.",
    USER_NOT_FOUND: "User not ffound.",
    BAD_REQUEST: "Bad request.",
    RECORD_EXISTS: "Similar record already exists.",
    ALREADY_ADDED_HOSPITAL:"You have already added your establishment"
  },
  zh: {
    TOKEN_EXPIRED: "登入成功",
    SESSION_EXPIRE: "內部服務器錯誤",
  },
};

exports.success = (result, res, code) => {
  try {
    const lang = res.get("lang") || "en";
    const response = {
      success: true,
      status_code: code,
      message:
        successMessage[lang][result.msgCode] ||
        successMessage["en"][result.msgCode],
      result: result.data ? result.data : "",
      time: Date.now(),
    };
    res.status(code).json(response);
  } catch (error) {
    console.log(
      "🚀 ~ file: response.js ~ line 49 ~ exports.success= ~ error",
      error
    );
    return res.json({
      success: true,
      status_code: 500,
      message: "Internal Server Error.",
      result: "",
      time: Date.now(),
    });
  }
};

exports.error = (error, res, code) => {
  try {
    const lang = res.get("lang") || "en";
    const response = {
      success: false,
      status_code: code,
      message:
        errorMessage[lang][error.msgCode] || errorMessage["en"][error.msgCode],
      result: {
        error: error.data ? error.data : "error",
      },
      time: Date.now(),
    };
    res.status(code).json(response);
  } catch (err) {
    console.log(
      "🚀 ~ file: response.js ~ line 77 ~ exports.success= ~ err",
      err
    );

    return res.status(500).json({
      success: false,
      status_code: 500,
      message: "Internal Server error.",
      result: "",
      time: Date.now(),
    });
  }
};
