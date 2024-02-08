require("app-module-path").addPath(`${__dirname}/`);
const cors = require("cors");
const path = require("path");
const express = require("express");
const https = require("https");
const http = require("http");
const fs = require("fs");
const {
  LOCAL_HOST,
  LIVE_HOST,
  HTTPS_PORT,
  HTTP_PORT,
  ENV,
} = require("config/index");
const { connections } = require("./config/database");
const { errorHandler } = require("./middlewares");
const { constants } = require("./utils/index");
global.appRoot = path.join(__dirname);

const app = express();

app.use((req, res, next) => {
  const language = req?.headers["accept-language"];
  const lang = constants.ACCEPT_HEADERS_LANGAUAGE.includes(language)
    ? language
    : constants.ACCEPT_HEADERS_LANGAUAGE[0]; // extract lang preference from request headers
  res.set("lang", lang); // set lang header in response
  next();
});

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(cors());

app.use(express.json({ limit: "50mb" }));
app.use(
  express.urlencoded({ limit: "50mb", extended: true, parameterLimit: 50000 })
);
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

let server = {};

if (ENV === constants.SERVER.PROD) {
  const privateKey = fs.readFileSync(
    "/etc/letsencrypt/live/nectarplus.health/privkey.pem",
    "utf8"
  );
  const certificate = fs.readFileSync(
    "/etc/letsencrypt/live/nectarplus.health/fullchain.pem",
    "utf8"
  );
  const credentials = { key: privateKey, cert: certificate };

  server = https.createServer(credentials, app).listen(HTTPS_PORT, () => {
    console.log(
      `Server up successfully - host: ${LIVE_HOST} , port: ${HTTPS_PORT}`
    );
  });
} else {
  server = http.createServer(app.handle.bind(app)).listen(HTTP_PORT, () => {
    console.log(
      `Server up successfully - host: ${LOCAL_HOST} , port: ${HTTP_PORT}`
    );
  });
}

app.use(require("./app"));

// Error Middlewares
app.use(errorHandler.methodNotAllowed);
app.use(errorHandler.genericErrorHandler);

process.on("unhandledRejection", (err) => {
  console.error("possibly unhandled rejection happened");
  console.error(err.message);
});

const closeHandler = () => {
  Object.values(connections).forEach((connection) => connection.close());
  server.close(() => {
    console.info("Server is stopped succesfully");
    process.exit(0);
  });
};

process.on("SIGTERM", closeHandler);
process.on("SIGINT", closeHandler);
