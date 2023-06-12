const mongoose = require("mongoose");
const config = require("../config/index");

const mongoUri = config.mongodbUserUri;

mongoose.Promise = global.Promise;

const connections = {};

function createConnection(mongoUri) {
  if (connections[mongoUri]) {
    return connections[mongoUri];
  }

  const connection = mongoose.createConnection(mongoUri, {
    useNewUrlParser: true,
    // useFindAndModify: false,
    useUnifiedTopology: true,
  });

  // mongoose.set("useCreateIndex", true);

  connection.on("connected", () => {
    console.log(`Database connection is open to "${mongoUri}"`);
  });

  connection.on("error", (err) => {
    console.log(`Database connection has occured error: ${err}`);
  });

  connection.on("disconnected", () => {
    console.log(`Database Connection to "${mongoUri}" is disconnected`);
  });

  connections[mongoUri] = connection;
  return connection;
}

module.exports = {
  getUserDB: createConnection.bind(null, config.mongodbUserUri),
  connections,
};
