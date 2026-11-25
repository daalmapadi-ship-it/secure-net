# Documento técnico — Secure Net

**Proyecto:** Secure Net  
**Evidencia:** GA8-220501096-AA1-EV02 — Módulos Integrados  
**Fecha:** 9 de septiembre de 2026

## 1. Introducción

Secure Net es un sistema académico de gestión de clientes y servicios de seguridad electrónica. Este documento describe el backend oficial implementado con Node.js, Express y MySQL. El código Prisma/PostgreSQL y los ZIP de evidencias anteriores se conservan como referencia y no forman parte del runtime.

## 2. Objetivo del sistema

Permitir gestionar usuarios, clientes, categorías, servicios, asignaciones y reportes, demostrando una integración de extremo a extremo entre la petición HTTP, las capas de la aplicación y la base de datos MySQL `secure_net`.

## 3. Alcance

Incluye:

- API REST en `backend/`
- Autenticación JWT y control de roles
- CRUD coherente con las 7 tablas existentes
- Documentación de módulos, ambiente, pruebas y acta

No incluye:

- Interfaz web completa a partir de Figma
- Integración del módulo Incidencias (no existe tabla `incidencias`)
- Prisma, PostgreSQL ni persistencia en memoria
- Cambio de esquema MySQL

## 4. Arquitectura utilizada

```
Ruta → Controlador → Servicio → SQL parametrizado → MySQL → JSON
```

- **Rutas:** declaran URL, método, JWT y validación de campos.
- **Controladores:** reciben la petición y arman la respuesta HTTP.
- **Servicios:** reglas de negocio y acceso a datos.
- **MySQL:** única base de ejecución (`secure_net`) mediante `mysql2`.

## 5. Tecnologías

- Node.js
- npm
- Express
- MySQL
- mysql2
- dotenv
- JSON Web Token
- bcryptjs
- Helmet, CORS, Morgan
- XAMPP (servidor MySQL local)
- DBeaver (administración de la base)
- Postman (pruebas HTTP)
- Git

## 6. Estructura del proyecto

```
backend/
  src/
    server.js
    app.js
    config/          env.js, db.js
    middlewares/    auth, roles, validación, errores
    routes/
    controllers/
    services/
    utils/          jwt, bcrypt, serializers
  docs/
  .env.example
  .gitignore
  package.json
  README.md
```

## 7. Descripción de módulos

| Módulo | Prefijo | Tablas |
|---|---|---|
| Health | `/health`, `/api/health/mysql` | — |
| Auth / usuarios | `/api/auth`, `/api/usuarios` | `usuarios`, `roles` |
| Clientes | `/api/clientes` | `clientes` |
| Categorías | `/api/categorias` | `categorias_servicio` |
| Servicios | `/api/servicios` | `servicios` |
| Asignaciones | `/api/asignaciones` | `asignaciones` |
| Reportes | `/api/reportes` | `reportes` |

El detalle operativo está en `docs/MODULOS_INTEGRADOS.md`.

## 8. Modelo de datos

Tablas oficiales (sin modificación de estructura):

1. `roles` — `id_rol`, `nombre_rol`, `descripcion`, `activo`
2. `usuarios` — `id_usuario`, `id_rol`, `nombres`, `apellidos`, `correo`, `clave_hash`, `activo`, `creado_en`
3. `clientes` — `id_cliente`, `tipo_doc`, `num_doc`, `razon_social`, `nombres`, `apellidos`, `correo`, `telefono`, `direccion`, `ciudad`, `activo`, `creado_en`
4. `categorias_servicio` — `id_categoria`, `nombre`, `descripcion`
5. `servicios` — `id_servicio`, `id_categoria`, `nombre`, `descripcion`, `precio_base`, `activo`
6. `asignaciones` — `id_asignacion`, `id_cliente`, `id_servicio`, `id_usuario`, `fecha_inicio`, `fecha_fin`, `estado`, `observaciones`, `creado_en`
7. `reportes` — `id_reporte`, `id_usuario`, `tipo`, `titulo`, `parametros`, `generado_en`

## 9. Relaciones entre tablas

- Un usuario pertenece a un rol: `usuarios.id_rol → roles.id_rol`
- Un servicio pertenece a una categoría: `servicios.id_categoria → categorias_servicio.id_categoria`
- Una asignación une cliente, servicio y usuario
- Un reporte registra al usuario que lo genera: `reportes.id_usuario → usuarios.id_usuario`

## 10. Flujo de integración

Ejemplo demostrable: generar una asignación.

1. Postman envía `POST /api/asignaciones` con JWT.
2. La ruta valida campos y rol.
3. El controlador llama al servicio.
4. El servicio comprueba cliente, servicio y usuario activos.
5. Se ejecuta `INSERT` parametrizado.
6. MySQL persiste la fila.
7. Se responde JSON con JOIN de las tres entidades.

## 11. Seguridad

- Contraseñas almacenadas en `clave_hash` con bcrypt; nunca se devuelven.
- JWT en cabecera `Authorization: Bearer`.
- Roles existentes: `administrador`, `supervisor`, `tecnico`, `comercial`, `visualizador`.
- Consultas parametrizadas (`?`); no se concatena entrada del usuario al SQL.
- Variables de conexión en `.env` (no se versiona).
- Helmet y CORS habilitados.

## 12. Validaciones

Campos obligatorios, formato de correo, unicidad de correo y `num_doc`, existencia de FKs, precios no negativos, fechas coherentes, duplicados de asignación activa, bloqueo de borrado de categoría con servicios.

## 13. Manejo de errores

Respuesta uniforme:

```json
{ "success": false, "message": "..." }
```

Códigos usados en el sistema: 400 (validación), 401 (sin token o credenciales), 403 (rol o usuario inactivo), 404 (no encontrado), 409 (conflicto/duplicado), 500 (error interno).

## 14. Ambiente de desarrollo

Ver `docs/AMBIENTE_DESARROLLO_PRUEBAS.md`. Node.js, npm, XAMPP MySQL puerto 3306, DBeaver, Postman.

## 15. Ambiente de pruebas

Pruebas HTTP contra `http://localhost:3000` con la base `secure_net`. Detalle en `docs/PRUEBAS.md`.

## 16. Control de versiones

Git local en la carpeta `backend/`. Se ignoran `node_modules/` y `.env`. No se incluye historial de secretos.

## 17. Limitaciones conocidas

- No hay interfaz gráfica funcional en este workspace (el prototipo está en Figma).
- El módulo Incidencias de una evidencia previa no se integró: no existe tabla `incidencias`.
- Reportes no implementan PUT/DELETE: la tabla es un histórico de generación.
- Los 5 usuarios originales de MySQL no se usaron para login porque no se conocen sus claves en texto plano; se usó un usuario de prueba creado por la API.
- El backend Prisma/PostgreSQL permanece solo como referencia en otra carpeta.

## 18. Conclusión

Secure Net dispone de un backend único sobre MySQL `secure_net`, con módulos integrados y un flujo demostrable de extremo a extremo, suficiente para la evidencia de módulos integrados sin alterar el esquema de la base de datos.
