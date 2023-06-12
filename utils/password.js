const bcrypt = require("bcrypt");
const saltRounds = 10;

exports.generateHash = async (password) => {
  let salt = bcrypt.genSaltSync(saltRounds);
  let hash = bcrypt.hashSync(password, salt);
  return hash;
};

exports.comparePassword = async (password, hash) => {
  return bcrypt.compareSync(password, hash);
};
