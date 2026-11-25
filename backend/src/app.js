const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

const { env } = require("./config/env");
const routes = require("./routes");
const healthController = require("./controllers/health.controller");
const { notFoundHandler, errorHandler } = require("./middlewares/error.middleware");

const app = express();

app.set("trust proxy", 1);
app.use(helmet());
app.use(
  cors({
    origin: env.CORS_ORIGIN === "*" ? true : env.CORS_ORIGIN.split(",").map((item) => item.trim())
  })
);
app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));
app.use(express.json());

app.get("/health", healthController.getHealth);
app.use("/api", routes);
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
