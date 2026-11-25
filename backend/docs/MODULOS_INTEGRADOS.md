# Secure Net — Módulos integrados

Evidencia: **GA8-220501096-AA1-EV02 — Módulos Integrados**

Este documento describe los módulos del backend oficial de Secure Net (`backend/`), conectado a MySQL `secure_net`.

## Flujo de integración

```
Interfaz / Postman
        ↓
      Ruta
        ↓
   Controlador
        ↓
     Servicio
        ↓
 SQL parametrizado
        ↓
   MySQL secure_net
        ↓
   Respuesta JSON
```

Cada petición autenticada sigue el mismo recorrido: Express recibe el HTTP, el controlador responde JSON, el servicio ejecuta la lógica y las consultas `?` contra MySQL.

---

## 1. Usuarios y autenticación

**Módulo:** Autenticación (`/api/auth`) y usuarios (`/api/usuarios`)

**Responsabilidad:** Iniciar sesión, emitir JWT, consultar el perfil autenticado y gestionar usuarios vinculados a un único rol.

**Ruta principal:** `/api/auth` y `/api/usuarios`

**Métodos HTTP:**

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Perfil del token |
| GET | `/api/usuarios` | Listar |
| GET | `/api/usuarios/:id` | Consultar |
| POST | `/api/usuarios` | Crear |
| PUT | `/api/usuarios/:id` | Actualizar |
| PATCH | `/api/usuarios/:id/estado` | Activar / desactivar |

**Entrada:** JSON con `correo` y `clave` (login); en alta de usuario: `id_rol`, `nombres`, `apellidos`, `correo`, `clave`. Header `Authorization: Bearer <token>` en rutas protegidas.

**Proceso:** El servicio busca el usuario por correo, verifica que esté activo, compara la clave con `clave_hash` (bcrypt), une el rol y firma un JWT. Las altas hashean la contraseña. Las respuestas nunca incluyen `clave_hash`.

**Salida:** `{ success, message, data }` con `token`, `usuario` y `rol` en el login.

**Tabla MySQL:** `usuarios`, `roles`

**Relaciones:** `usuarios.id_rol → roles.id_rol`. El usuario autenticado se reutiliza en asignaciones y reportes.

**Autenticación/autorización:** Login público. `/me` y consultas de usuarios requieren JWT. Crear, actualizar y cambiar estado: rol `administrador`.

**Validaciones:** Correo obligatorio y válido; correo único; nombres y apellidos obligatorios; `id_rol` existente y activo; clave obligatoria al crear; usuario inexistente (404); usuario inactivo (403 en login).

**Pruebas realizadas:** Login válido e inválido, `/me`, listar, obtener por ID, crear, duplicado, desactivar, login de inactivo. Persistencia de hash bcrypt verificada en MySQL.

---

## 2. Clientes

**Módulo:** Clientes (evolución del módulo Empresas del trabajo anterior)

**Responsabilidad:** Registrar y consultar clientes reales en MySQL (ya no en un arreglo en memoria).

**Ruta principal:** `/api/clientes`

**Métodos HTTP:** GET `/`, GET `/:id`, POST `/`, PUT `/:id`, PATCH `/:id/estado`

**Entrada:** `tipo_doc`, `num_doc`, `nombres`, `apellidos`; opcionales: `razon_social`, `correo`, `telefono`, `direccion`, `ciudad`.

**Proceso:** SQL parametrizado sobre `clientes`. El documento se valida como único.

**Salida:** JSON del cliente. `activo` se serializa como booleano.

**Tabla MySQL:** `clientes`

**Relaciones:** Usada por `asignaciones.id_cliente`.

**Autenticación/autorización:** JWT en todas. Escritura: `administrador`, `supervisor` o `comercial`.

**Validaciones:** `tipo_doc` y `num_doc` obligatorios; `num_doc` único; nombres y apellidos obligatorios; correo válido si se envía; cliente inexistente (404).

**Pruebas realizadas:** Listar, obtener ID 1, ID inexistente, crear, documento duplicado, campos faltantes, actualizar, desactivar y verificación en MySQL.

---

## 3. Categorías de servicios

**Módulo:** Categorías

**Responsabilidad:** Administrar `categorias_servicio`, usadas por los servicios.

**Ruta principal:** `/api/categorias`

**Métodos HTTP:** GET `/`, GET `/:id`, POST `/`, PUT `/:id`, DELETE `/:id`

**Entrada:** `nombre` obligatorio; `descripcion` opcional.

**Proceso:** Consultas parametrizadas. Antes de eliminar se cuenta si hay servicios relacionados; si hay, se responde 409 y no se ejecuta el `DELETE` (se evita el error de llave foránea).

**Salida:** `{ id_categoria, nombre, descripcion }`

**Tabla MySQL:** `categorias_servicio`

**Relaciones:** `servicios.id_categoria → categorias_servicio.id_categoria`

**Autenticación/autorización:** JWT. Escritura y borrado: `administrador` o `supervisor`.

**Validaciones:** Nombre obligatorio y no vacío; duplicado de nombre (aplicación); categoría inexistente; bloqueo de borrado si hay servicios.

**Pruebas realizadas:** Listar, obtener, inexistente, crear, nombre obligatorio, actualizar, eliminar con servicios relacionados (409), eliminar categoría vacía de prueba.

---

## 4. Servicios

**Módulo:** Servicios

**Responsabilidad:** Registrar servicios con categoría y precio base.

**Ruta principal:** `/api/servicios`

**Métodos HTTP:** GET `/`, GET `/:id`, POST `/`, PUT `/:id`, PATCH `/:id/estado`

**Entrada:** `id_categoria`, `nombre`, `precio_base`; `descripcion` opcional.

**Proceso:** JOIN con `categorias_servicio`. Se verifica que la categoría exista. `precio_base` se valida como número no negativo.

**Salida:** Servicio con objeto `categoria` (`id_categoria`, `nombre`).

**Tabla MySQL:** `servicios`

**Relaciones:** Categoría (obligatoria) y `asignaciones.id_servicio`.

**Autenticación/autorización:** JWT. Escritura: `administrador` o `supervisor`.

**Validaciones:** Categoría existente; nombre obligatorio; precio numérico y no negativo; servicio inexistente.

**Pruebas realizadas:** Listar con JOIN, obtener, inexistente, crear con categoría 4, categoría 999, nombre faltante, precio negativo, actualizar precio, desactivar. Persistencia verificada en MySQL.

---

## 5. Asignaciones

**Módulo:** Asignaciones

**Responsabilidad:** Relacionar un cliente, un servicio y un usuario responsable, con fechas y estado (`activo` / `finalizado`).

**Ruta principal:** `/api/asignaciones`

**Métodos HTTP:** GET `/`, GET `/:id`, POST `/`, PUT `/:id`, PATCH `/:id/estado`

**Entrada:** `id_cliente`, `id_servicio`, `id_usuario`, `fecha_inicio` (YYYY-MM-DD); opcionales: `fecha_fin`, `observaciones`, `estado`.

**Proceso:** JOIN a `clientes`, `servicios` y `usuarios`. Se comprueba que existan y estén activos. No se permite una segunda asignación **activa** del mismo servicio al mismo cliente.

**Salida:** Asignación con objetos `cliente`, `servicio` y `usuario` (sin `clave_hash`).

**Tabla MySQL:** `asignaciones`

**Relaciones:** `id_cliente → clientes`, `id_servicio → servicios`, `id_usuario → usuarios`

**Autenticación/autorización:** JWT. Escritura: `administrador`, `supervisor` o `comercial`.

**Validaciones:** FKs existentes y activas; fechas coherentes; duplicado activo (409); asignación inexistente (404).

**Pruebas realizadas:** Listar con JOIN, obtener, inexistente, campos faltantes, FKs inválidas, duplicado, crear, actualizar y cambiar estado a `finalizado`. Persistencia verificada en MySQL.

---

## 6. Reportes

**Módulo:** Reportes

**Responsabilidad:** Registrar la generación de reportes y quién los genera (`id_usuario`).

**Ruta principal:** `/api/reportes`

**Métodos HTTP:** GET `/`, GET `/?id_usuario=&tipo=`, GET `/:id`, POST `/`

**Entrada:** `tipo`, `titulo`; `parametros` opcional. El `id_usuario` **no** se toma del cuerpo: se toma del JWT.

**Proceso:** INSERT en `reportes` con el usuario autenticado. Listado con JOIN a `usuarios` y `roles`.

**Salida:** Reporte con `usuario` (nombres, correo, rol). Sin `clave_hash`.

**Tabla MySQL:** `reportes`

**Relaciones:** `reportes.id_usuario → usuarios.id_usuario`

**Autenticación/autorización:** JWT. POST: `administrador` o `supervisor`.

**Validaciones:** `tipo` y `titulo` obligatorios; usuario generador activo.

**Pruebas realizadas:** Listar, obtener, inexistente, título faltante, generar, trazabilidad del JWT, filtro por usuario, ausencia de `clave_hash`. Persistencia verificada en MySQL.

**Nota:** No hay PUT, PATCH de estado ni DELETE: la tabla es un registro histórico (`generado_en`) y no tiene columna `activo`.

---

## Health

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/health` | Servidor activo (no requiere JWT) |
| GET | `/api/health/mysql` | Comprueba conexión a `secure_net` y lista tablas |
