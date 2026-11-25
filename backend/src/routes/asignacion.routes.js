const express = require("express");
const asignacionController = require("../controllers/asignacion.controller");
const { authenticate } = require("../middlewares/auth.middleware");
const { authorize } = require("../middlewares/role.middleware");
const { validateRequiredFields } = require("../middlewares/validate.middleware");

const router = express.Router();

router.use(authenticate);

router.get("/", asignacionController.listar);
router.get("/:id", asignacionController.obtenerPorId);

router.post(
  "/",
  authorize("administrador", "supervisor", "comercial"),
  validateRequiredFields(["id_cliente", "id_servicio", "id_usuario", "fecha_inicio"]),
  asignacionController.crear
);

router.put(
  "/:id",
  authorize("administrador", "supervisor", "comercial"),
  asignacionController.actualizar
);

router.patch(
  "/:id/estado",
  authorize("administrador", "supervisor", "comercial"),
  asignacionController.cambiarEstado
);

module.exports = router;
