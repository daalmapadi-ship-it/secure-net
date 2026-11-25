const express = require("express");
const reporteController = require("../controllers/reporte.controller");
const { authenticate } = require("../middlewares/auth.middleware");
const { authorize } = require("../middlewares/role.middleware");
const { validateRequiredFields } = require("../middlewares/validate.middleware");

const router = express.Router();

router.use(authenticate);

router.get("/", reporteController.listar);
router.get("/:id", reporteController.obtenerPorId);

router.post(
  "/",
  authorize("administrador", "supervisor"),
  validateRequiredFields(["tipo", "titulo"]),
  reporteController.crear
);

module.exports = router;
