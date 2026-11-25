const categoriaService = require("../services/categoria.service");
const { serializeCategoria } = require("../utils/serializers");

function sendCategoria(res, statusCode, message, categoria) {
  return res.status(statusCode).json({
    success: true,
    message,
    data: serializeCategoria(categoria)
  });
}

async function listar(req, res, next) {
  try {
    const categorias = await categoriaService.listCategorias();

    return res.json({
      success: true,
      message: "Categorías obtenidas correctamente.",
      data: categorias.map(serializeCategoria)
    });
  } catch (error) {
    return next(error);
  }
}

async function obtenerPorId(req, res, next) {
  try {
    const categoria = await categoriaService.getCategoriaById(req.params.id);
    return sendCategoria(res, 200, "Categoría obtenida correctamente.", categoria);
  } catch (error) {
    return next(error);
  }
}

async function crear(req, res, next) {
  try {
    const categoria = await categoriaService.createCategoria(req.body);
    return sendCategoria(res, 201, "Categoría creada correctamente.", categoria);
  } catch (error) {
    return next(error);
  }
}

async function actualizar(req, res, next) {
  try {
    const categoria = await categoriaService.updateCategoria(req.params.id, req.body);
    return sendCategoria(res, 200, "Categoría actualizada correctamente.", categoria);
  } catch (error) {
    return next(error);
  }
}

async function eliminar(req, res, next) {
  try {
    const categoria = await categoriaService.deleteCategoria(req.params.id);

    return res.json({
      success: true,
      message: "Categoría eliminada correctamente.",
      data: serializeCategoria(categoria)
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  listar,
  obtenerPorId,
  crear,
  actualizar,
  eliminar
};
