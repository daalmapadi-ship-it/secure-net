const express = require("express");
const authController = require("../controllers/auth.controller");
const { authenticate } = require("../middlewares/auth.middleware");
const {
  validateRequiredFields,
  validateEmailField
} = require("../middlewares/validate.middleware");

const router = express.Router();

router.post(
  "/login",
  validateRequiredFields(["correo", "clave"]),
  validateEmailField("correo"),
  authController.login
);

router.get("/me", authenticate, authController.me);

module.exports = router;
