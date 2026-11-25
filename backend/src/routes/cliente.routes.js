const express = require("express");
const clienteController = require("../controllers/cliente.controller");
const { authenticate } = require("../middlewares/auth.middleware");
const { authorize } = require("../middlewares/role.middleware");
const {
  validateRequiredFields,
  validateEmailField
} = require("../middlewares/validate.middleware");

const router = express.Router();

router.use(authenticate);

router.get("/", clienteController.listar);
router.get("/:id", clienteController.obtenerPorId);

router.post(
  "/",
  authorize("administrador", "supervisor", "comercial"),
  validateRequiredFields(["tipo_doc", "num_doc", "nombres", "apellidos"]),
  validateEmailField("correo"),
  clienteController.crear
);

router.put(
  "/:id",
  authorize("administrador", "supervisor", "comercial"),
  validateEmailField("correo"),
  clienteController.actualizar
);

router.patch(
  "/:id/estado",
  authorize("administrador", "supervisor", "comercial"),
  clienteController.cambiarEstado
);

module.exports = router;
