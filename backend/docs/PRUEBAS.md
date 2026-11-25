# Registro de pruebas — Secure Net

Evidencia: **GA8-220501096-AA1-EV02**  
Ambiente: `http://localhost:3000` + MySQL `secure_net`  
Estas pruebas se ejecutaron realmente contra la API y, cuando aplica, se verificó MySQL con `SELECT`.

Usuario de autenticación usado en las pruebas: `prueba.auth@securenet.co` (rol `administrador`), creado por el módulo de usuarios. No se modificaron las claves de los cinco usuarios originales.

---

## Health

| Caso | Método | Endpoint | Resultado esperado | Resultado obtenido | HTTP | Estado |
|---|---|---|---|---|---|---|
| Servidor activo | GET | `/health` | success true | API en ejecución | 200 | CUMPLE |
| Conexión MySQL | GET | `/api/health/mysql` | base `secure_net` y 7 tablas | 7 tablas listadas | 200 | CUMPLE |

---

## Usuarios / autenticación

| Caso | Método | Endpoint | Resultado esperado | Resultado obtenido | HTTP | Estado |
|---|---|---|---|---|---|---|
| Login correo inexistente | POST | `/api/auth/login` | credenciales inválidas | mensaje de credenciales | 401 | CUMPLE |
| Login sin clave | POST | `/api/auth/login` | validación | campos faltantes: clave | 400 | CUMPLE |
| Login correo inválido | POST | `/api/auth/login` | formato inválido | correo no válido | 400 | CUMPLE |
| Login correcto | POST | `/api/auth/login` | token, usuario, rol | token + usuario + rol; sin clave_hash | 200 | CUMPLE |
| Perfil sin token | GET | `/api/auth/me` | no autenticado | token obligatorio | 401 | CUMPLE |
| Perfil con token | GET | `/api/auth/me` | usuario autenticado | correo de prueba | 200 | CUMPLE |
| Listar usuarios | GET | `/api/usuarios` | listado sin hash | listado sin clave_hash | 200 | CUMPLE |
| Obtener usuario 1 | GET | `/api/usuarios/1` | admin original | admin@securenet.co | 200 | CUMPLE |
| Usuario inexistente | GET | `/api/usuarios/99999` | no encontrado | Usuario no encontrado | 404 | CUMPLE |
| Crear sin nombres | POST | `/api/usuarios` | validación | campos faltantes | 400 | CUMPLE |
| Crear con rol 999 | POST | `/api/usuarios` | rol inexistente | rol no existe | 400 | CUMPLE |
| Crear usuario de prueba | POST | `/api/usuarios` | alta con hash | id_usuario 7 | 201 | CUMPLE |
| Correo duplicado | POST | `/api/usuarios` | conflicto | ya existe correo | 409 | CUMPLE |
| Desactivar usuario | PATCH | `/api/usuarios/7/estado` | activo false | activo false | 200 | CUMPLE |
| Login inactivo | POST | `/api/auth/login` | bloqueo | usuario inactivo | 403 | CUMPLE |
| Listar sin token | GET | `/api/usuarios` | no autenticado | token obligatorio | 401 | CUMPLE |
| Hash en MySQL | SQL | `usuarios` ids 6 y 7 | bcrypt | tipo bcrypt (`$2`) | — | CUMPLE |

---

## Clientes

| Caso | Método | Endpoint | Resultado esperado | Resultado obtenido | HTTP | Estado |
|---|---|---|---|---|---|---|
| Listar | GET | `/api/clientes` | 5 originales al inicio | 5 registros | 200 | CUMPLE |
| Obtener ID 1 | GET | `/api/clientes/1` | cliente Orión | id_cliente 1 | 200 | CUMPLE |
| ID inexistente | GET | `/api/clientes/99999` | no encontrado | Cliente no encontrado | 404 | CUMPLE |
| Sin nombres/apellidos | POST | `/api/clientes` | validación | campos faltantes | 400 | CUMPLE |
| Correo inválido | POST | `/api/clientes` | validación | correo inválido | 400 | CUMPLE |
| Crear cliente | POST | `/api/clientes` | alta | id_cliente 6 | 201 | CUMPLE |
| Documento duplicado | POST | `/api/clientes` | conflicto | 409 sobre num_doc 900112233 | 409 | CUMPLE |
| Actualizar | PUT | `/api/clientes/6` | ciudad Pereira | ciudad Pereira | 200 | CUMPLE |
| Desactivar | PATCH | `/api/clientes/6/estado` | activo false | activo false | 200 | CUMPLE |
| Sin token | GET | `/api/clientes` | no autenticado | 401 | 401 | CUMPLE |
| Persistencia MySQL | SQL | `clientes` id 6 | mismos datos | Pereira, activo 0 | — | CUMPLE |

---

## Categorías

| Caso | Método | Endpoint | Resultado esperado | Resultado obtenido | HTTP | Estado |
|---|---|---|---|---|---|---|
| Listar | GET | `/api/categorias` | 5 originales | 5 | 200 | CUMPLE |
| Obtener ID 1 | GET | `/api/categorias/1` | CCTV | CCTV | 200 | CUMPLE |
| Inexistente | GET | `/api/categorias/99999` | 404 | no encontrada | 404 | CUMPLE |
| Sin nombre | POST | `/api/categorias` | 400 | nombre obligatorio | 400 | CUMPLE |
| Crear | POST | `/api/categorias` | 201 | id 6 de prueba | 201 | CUMPLE |
| Nombre duplicado CCTV | POST | `/api/categorias` | 409 | ya existe nombre | 409 | CUMPLE |
| Actualizar | PUT | `/api/categorias/6` | descripción nueva | actualizada | 200 | CUMPLE |
| Eliminar CCTV (con servicios) | DELETE | `/api/categorias/1` | 409 claro | 2 servicio(s) relacionado(s) | 409 | CUMPLE |
| Eliminar categoría vacía | DELETE | `/api/categorias/6` | 200 | eliminada la de prueba | 200 | CUMPLE |

---

## Servicios

| Caso | Método | Endpoint | Resultado esperado | Resultado obtenido | HTTP | Estado |
|---|---|---|---|---|---|---|
| Listar | GET | `/api/servicios` | JOIN categoría | 6 al inicio con categoria | 200 | CUMPLE |
| Obtener ID 1 | GET | `/api/servicios/1` | con categoría | JOIN presente | 200 | CUMPLE |
| Inexistente | GET | `/api/servicios/99999` | 404 | no encontrado | 404 | CUMPLE |
| Categoría 999 | POST | `/api/servicios` | 400 | categoría no existe | 400 | CUMPLE |
| Sin nombre | POST | `/api/servicios` | 400 | nombre obligatorio | 400 | CUMPLE |
| Precio negativo | POST | `/api/servicios` | 400 | precio no negativo | 400 | CUMPLE |
| Crear | POST | `/api/servicios` | 201 categoría Redes | id_servicio 7 | 201 | CUMPLE |
| Actualizar precio | PUT | `/api/servicios/7` | 175000 | 175000 | 200 | CUMPLE |
| Desactivar | PATCH | `/api/servicios/7/estado` | activo false | activo false | 200 | CUMPLE |
| Persistencia MySQL | SQL | `servicios` id 7 | 175000, activo 0 | confirmado | — | CUMPLE |

---

## Asignaciones

| Caso | Método | Endpoint | Resultado esperado | Resultado obtenido | HTTP | Estado |
|---|---|---|---|---|---|---|
| Listar | GET | `/api/asignaciones` | JOIN cliente, servicio, usuario | JOIN presente | 200 | CUMPLE |
| Obtener ID 1 | GET | `/api/asignaciones/1` | existente | id 1 | 200 | CUMPLE |
| Inexistente | GET | `/api/asignaciones/99999` | 404 | no encontrada | 404 | CUMPLE |
| Campos faltantes | POST | `/api/asignaciones` | 400 | validación | 400 | CUMPLE |
| Cliente 99999 | POST | `/api/asignaciones` | 400 | cliente no existe | 400 | CUMPLE |
| Servicio 99999 | POST | `/api/asignaciones` | 400 | servicio no existe | 400 | CUMPLE |
| Usuario 99999 | POST | `/api/asignaciones` | 400 | usuario no existe | 400 | CUMPLE |
| Duplicado activo 1+1 | POST | `/api/asignaciones` | 409 | asignación activa existente | 409 | CUMPLE |
| Crear | POST | `/api/asignaciones` | 201 | id 9 (cliente 4, servicio 5, usuario 3) | 201 | CUMPLE |
| Actualizar | PUT | `/api/asignaciones/9` | fecha_fin 2026-09-30 | persistido | 200 | CUMPLE |
| Estado finalizado | PATCH | `/api/asignaciones/9/estado` | finalizado | finalizado | 200 | CUMPLE |
| Sin token | GET | `/api/asignaciones` | 401 | token obligatorio | 401 | CUMPLE |
| Persistencia MySQL | SQL | `asignaciones` | originales 1–7 intactos | 1–7 iguales; 8 y 9 de prueba | — | CUMPLE |

Nota: la fila 8 quedó de una corrida previa de creación (cliente 2 + servicio 5). No se borraron filas originales 1–7.

---

## Reportes

| Caso | Método | Endpoint | Resultado esperado | Resultado obtenido | HTTP | Estado |
|---|---|---|---|---|---|---|
| Listar | GET | `/api/reportes` | 4 originales + JOIN | 4 al inicio, usuario en JSON | 200 | CUMPLE |
| Obtener ID 1 | GET | `/api/reportes/1` | reporte de clientes | id 1 | 200 | CUMPLE |
| Inexistente | GET | `/api/reportes/99999` | 404 | no encontrado | 404 | CUMPLE |
| Sin título | POST | `/api/reportes` | 400 | título obligatorio | 400 | CUMPLE |
| Generar | POST | `/api/reportes` | 201 y usuario del JWT | id_reporte 6, id_usuario 6 | 201 | CUMPLE |
| Ignorar id_usuario del body | POST | `/api/reportes` | usa JWT, no body | no usó id 1 del body | 201 | CUMPLE |
| Filtro por usuario | GET | `/api/reportes?id_usuario=6` | incluye el nuevo | incluye id 6 | 200 | CUMPLE |
| Sin token | GET | `/api/reportes` | 401 | token obligatorio | 401 | CUMPLE |
| Sin clave_hash | varios | `/api/reportes` | no exponer hash | no aparece clave_hash | — | CUMPLE |
| Persistencia MySQL | SQL | `reportes` | 1–4 originales + 6 | confirmado | — | CUMPLE |

---

## Resumen

Todas las pruebas listadas en este documento se ejecutaron y **CUMPLEN**. No se registran casos PENDIENTE de los módulos implementados.
