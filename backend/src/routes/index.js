const express = require("express");
const healthController = require("../controllers/health.controller");
const authRoutes = require("./auth.routes");
const usuarioRoutes = require("./usuario.routes");
const clienteRoutes = require("./cliente.routes");
const categoriaRoutes = require("./categoria.routes");
const servicioRoutes = require("./servicio.routes");
const asignacionRoutes = require("./asignacion.routes");
const reporteRoutes = require("./reporte.routes");

const router = express.Router();

router.get("/health/mysql", healthController.getMysqlHealth);
router.use("/auth", authRoutes);
router.use("/usuarios", usuarioRoutes);
router.use("/clientes", clienteRoutes);
router.use("/categorias", categoriaRoutes);
router.use("/servicios", servicioRoutes);
router.use("/asignaciones", asignacionRoutes);
router.use("/reportes", reporteRoutes);

module.exports = router;
