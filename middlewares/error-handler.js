const HttpStatus = require("http-status");

// Error response middleware for 404 not found.
exports.notFound = (req, res) => {
  res.status(HttpStatus.NOT_FOUND).json({
    error: {
      code: HttpStatus.NOT_FOUND,
      message: HttpStatus[HttpStatus.NOT_FOUND],
    },
  });
};

// Method not allowed error middleware.
exports.methodNotAllowed = (req, res) => {
  res.status(HttpStatus.METHOD_NOT_ALLOWED).json({
    error: {
      code: HttpStatus.METHOD_NOT_ALLOWED,
      message: HttpStatus[HttpStatus.METHOD_NOT_ALLOWED],
    },
  });
};

// Generic error response middleware for validation and internal server errors.
exports.genericErrorHandler = (err, req, res, next) => {
  let error;
  console.log(err);
  if (err.isJoi) {
    // Validation error
    error = {
      code: HttpStatus.BAD_REQUEST,
      message: HttpStatus[HttpStatus.BAD_REQUEST],
      details: err.details
        ? err.details.map((e) => ({
            message: e.message,
            param: e.path.join("."),
          }))
        : err.errors.map((e) => e.messages.join(". ")).join(" and "),
    };
  } else if (err.status === undefined && err.response && err.response.data) {
    ({ error } = err.response.data);
  } else if (err.status < 500) {
    error = {
      code: err.status,
      message: err.message,
    };
    if (err.errors) {
      error.errors = err.errors;
    } else if (err.actionCode) {
      error.actionCode = err.actionCode;
    }
  } else {
    // Return INTERNAL_SERVER_ERROR for all other cases
    error = {
      code: HttpStatus.INTERNAL_SERVER_ERROR,
      message: HttpStatus[HttpStatus.INTERNAL_SERVER_ERROR],
    };
  }

  res.status(error.code).json({ error });
};
