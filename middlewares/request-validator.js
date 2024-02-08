const response = require("../utils/response");
const httpStatus = require("http-status");

const validate =
  (schema, source = "body") =>
    async (req, res, next) => {
      const data = req[source];
      const { value, error } = await schema.validate(data, {
        abortEarly: false, // include all errors
        allowUnknown: true, // ignore unknown props
        stripUnknown: true // remove unknown props
      });
      if (!error) {
        req[source] = value;
        return next();
      } else {
        const { details } = error;
        const message = details.map((i) => i.message).join(",");
        return response.error(
          { msgCode: "VALIDATION_ERROR", data: { message, joiError: true }  },
          res,
          httpStatus.BAD_REQUEST
        );
      }
    };

module.exports = {
  validate,
};
