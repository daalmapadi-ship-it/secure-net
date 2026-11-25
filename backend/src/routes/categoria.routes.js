const express = require("express");
const categoriaController = require("../controllers/categoria.controller");
const { authenticate } = require("../middlewares/auth.middleware");
const { authorize } = require("../middlewares/role.middleware");
const { validateRequiredFields } = require("../middlewares/validate.middleware");

const router = express.Router();

router.use(authenticate);

router.get("/", categoriaController.listar);
router.get("/:id", categoriaController.obtenerPorId);

router.post(
  "/",
  authorize("administrador", "supervisor"),
  validateRequiredFields(["nombre"]),
  categoriaController.crear
);

router.put(
  "/:id",
  authorize("administrador", "supervisor"),
  categoriaController.actualizar
);

router.delete(
  "/:id",
  authorize("administrador", "supervisor"),
  categoriaController.eliminar
);

module.exports = router;
