const express = require("express");
const servicioController = require("../controllers/servicio.controller");
const { authenticate } = require("../middlewares/auth.middleware");
const { authorize } = require("../middlewares/role.middleware");
const { validateRequiredFields } = require("../middlewares/validate.middleware");

const router = express.Router();

router.use(authenticate);

router.get("/", servicioController.listar);
router.get("/:id", servicioController.obtenerPorId);

router.post(
  "/",
  authorize("administrador", "supervisor"),
  validateRequiredFields(["id_categoria", "nombre", "precio_base"]),
  servicioController.crear
);

router.put(
  "/:id",
  authorize("administrador", "supervisor"),
  servicioController.actualizar
);

router.patch(
  "/:id/estado",
  authorize("administrador", "supervisor"),
  servicioController.cambiarEstado
);

module.exports = router;
