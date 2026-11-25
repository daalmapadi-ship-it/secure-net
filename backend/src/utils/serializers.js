function toBoolean(value) {
  return Boolean(value);
}

function serializeUsuario(row) {
  if (!row) {
    return null;
  }

  return {
    id_usuario: row.id_usuario,
    nombres: row.nombres,
    apellidos: row.apellidos,
    correo: row.correo,
    activo: toBoolean(row.activo),
    creado_en: row.creado_en,
    rol: {
      id_rol: row.id_rol,
      nombre_rol: row.nombre_rol,
      descripcion: row.descripcion_rol
    }
  };
}

function serializeRol(row) {
  if (!row) {
    return null;
  }

  return {
    id_rol: row.id_rol,
    nombre_rol: row.nombre_rol,
    descripcion: row.descripcion_rol
  };
}

function serializeCliente(row) {
  if (!row) {
    return null;
  }

  return {
    id_cliente: row.id_cliente,
    tipo_doc: row.tipo_doc,
    num_doc: row.num_doc,
    razon_social: row.razon_social,
    nombres: row.nombres,
    apellidos: row.apellidos,
    correo: row.correo,
    telefono: row.telefono,
    direccion: row.direccion,
    ciudad: row.ciudad,
    activo: toBoolean(row.activo),
    creado_en: row.creado_en
  };
}

function serializeCategoria(row) {
  if (!row) {
    return null;
  }

  return {
    id_categoria: row.id_categoria,
    nombre: row.nombre,
    descripcion: row.descripcion
  };
}

function serializeServicio(row) {
  if (!row) {
    return null;
  }

  return {
    id_servicio: row.id_servicio,
    nombre: row.nombre,
    descripcion: row.descripcion,
    precio_base: Number(row.precio_base),
    activo: toBoolean(row.activo),
    categoria: {
      id_categoria: row.id_categoria,
      nombre: row.nombre_categoria
    }
  };
}

function formatDate(value) {
  if (!value) {
    return null;
  }

  if (typeof value === "string") {
    return value.slice(0, 10);
  }

  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function serializeAsignacion(row) {
  if (!row) {
    return null;
  }

  return {
    id_asignacion: row.id_asignacion,
    fecha_inicio: formatDate(row.fecha_inicio),
    fecha_fin: formatDate(row.fecha_fin),
    estado: row.estado,
    observaciones: row.observaciones,
    creado_en: row.creado_en,
    cliente: {
      id_cliente: row.id_cliente,
      nombres: row.cliente_nombres,
      apellidos: row.cliente_apellidos,
      razon_social: row.razon_social,
      num_doc: row.num_doc
    },
    servicio: {
      id_servicio: row.id_servicio,
      nombre: row.servicio_nombre,
      precio_base: Number(row.precio_base)
    },
    usuario: {
      id_usuario: row.id_usuario,
      nombres: row.usuario_nombres,
      apellidos: row.usuario_apellidos,
      correo: row.usuario_correo
    }
  };
}

function serializeReporte(row) {
  if (!row) {
    return null;
  }

  return {
    id_reporte: row.id_reporte,
    tipo: row.tipo,
    titulo: row.titulo,
    parametros: row.parametros,
    generado_en: row.generado_en,
    usuario: {
      id_usuario: row.id_usuario,
      nombres: row.usuario_nombres,
      apellidos: row.usuario_apellidos,
      correo: row.usuario_correo,
      rol: row.nombre_rol
    }
  };
}

module.exports = {
  serializeUsuario,
  serializeRol,
  serializeCliente,
  serializeCategoria,
  serializeServicio,
  serializeAsignacion,
  serializeReporte
};
