require("app-module-path").addPath(`${__dirname}/`);
const express = require("express");
const bodyParser = require("body-parser");
const http = require("http");
const { host, httpPort } = require("config");
const { connections } = require("./config/database");
const { errorHandler } = require("./middlewares");
const cors = require("cors");
const path = require('path')
const { constants } = require('./utils/index');
global.appRoot = path.join(__dirname);
const routes = require('./app/v1/index');

const app = express();

app.use((req, res, next) => {
  const language = req?.headers["accept-language"];
  const lang = constants.ACCEPT_HEADERS_LANGAUAGE.includes(language) ? language : constants.ACCEPT_HEADERS_LANGAUAGE[0]; // extract lang preference from request headers
  res.set("lang", lang); // set lang header in response
  next();
});

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

app.use(cors());
// app.use(bodyParser.json({ limit: '2mb' }));
// app.use(bodyParser.urlencoded({ extended: true }));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true, parameterLimit: 50000 }));
app.use((req, res, next) => {
  // Website you wish to allow to connect
  res.setHeader("Access-Control-Allow-Origin", "*");

  // Request methods you wish to allow
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, PATCH, DELETE"
  );

  // Request headers you wish to allow
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-Requested-With,content-type"
  );

  // Set to true if you need the website to include cookies in the requests sent
  // to the API (e.g. in case you use sessions)
  res.setHeader("Access-Control-Allow-Credentials", true);

  // Pass to next layer of middleware
  next();
});

const httpServer = http
  .createServer(app.handle.bind(app))
  .listen(httpPort, () => {
    console.info(`Server up successfully - host: ${host} , port: ${httpPort}`);
  });

// API routes
// const routes = require('./app')
app.use(require("./app"));

// Error Middlewares
app.use(errorHandler.methodNotAllowed);
app.use(errorHandler.genericErrorHandler);

process.on("unhandledRejection", (err) => {
  console.error("possibly unhandled rejection happened");
  console.error(err.message);
  // enabledStackTrace && console.error(`stack: ${err.stack}`);
});

const closeHandler = () => {
  Object.values(connections).forEach((connection) => connection.close());
  httpServer.close(() => {
    console.info("Server is stopped succesfully");
    process.exit(0);
  });
};

process.on("SIGTERM", closeHandler);
process.on("SIGINT", closeHandler);
