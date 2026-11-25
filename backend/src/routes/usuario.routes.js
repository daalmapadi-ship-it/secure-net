const express = require("express");
const usuarioController = require("../controllers/usuario.controller");
const { authenticate } = require("../middlewares/auth.middleware");
const { authorize } = require("../middlewares/role.middleware");
const {
  validateRequiredFields,
  validateEmailField
} = require("../middlewares/validate.middleware");

const router = express.Router();

router.use(authenticate);

router.get("/", usuarioController.listar);
router.get("/:id", usuarioController.obtenerPorId);

router.post(
  "/",
  authorize("administrador"),
  validateRequiredFields(["id_rol", "nombres", "apellidos", "correo", "clave"]),
  validateEmailField("correo"),
  usuarioController.crear
);

router.put(
  "/:id",
  authorize("administrador"),
  validateEmailField("correo"),
  usuarioController.actualizar
);

router.patch(
  "/:id/estado",
  authorize("administrador"),
  usuarioController.cambiarEstado
);

module.exports = router;
