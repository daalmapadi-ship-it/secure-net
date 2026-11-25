# Ambiente de desarrollo y pruebas — Secure Net

Evidencia: **GA8-220501096-AA1-EV02**

## Herramientas utilizadas

| Herramienta | Uso en el proyecto |
|---|---|
| Node.js | Runtime de la API (verificado: v24.19.0) |
| npm | Instalación de dependencias (verificado: 11.17.0) |
| Express | Servidor HTTP y rutas |
| MySQL | Base de datos `secure_net` |
| mysql2 | Pool de conexiones y SQL parametrizado |
| XAMPP | Motor MySQL local (puerto 3306) |
| DBeaver | Construcción y consulta de las 7 tablas |
| Postman | Pruebas de endpoints (equivalente: peticiones HTTP a localhost:3000) |
| Git | Control de versiones del backend |
| JWT | Autenticación |
| bcryptjs | Hash de contraseñas |

## Requisitos previos

1. Node.js 20 o superior.
2. MySQL en ejecución (XAMPP → Start MySQL).
3. Base de datos **`secure_net`** ya creada (no se modifica el esquema).
4. DBeaver o cliente SQL opcional para verificar datos.

## Instalación

En una terminal:

```powershell
cd "c:\Users\HP\Documents\DANY\TECNOLOGO\Secure Net\backend"
npm install
```

## Configuración

1. Copiar `.env.example` a `.env`.
2. Ajustar usuario y contraseña de MySQL según XAMPP/DBeaver.
3. Dejar `DB_NAME=secure_net`.

Plantilla (sin secretos reales):

```
PORT=3000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=secure_net
JWT_SECRET=change_this_secret
JWT_EXPIRES_IN=8h
```

## Ejecución

MySQL debe estar activo antes de arrancar la API.

```powershell
npm run dev
```

Producción local:

```powershell
npm start
```

El servidor queda en `http://localhost:3000`.

## Comprobación rápida

```
GET http://localhost:3000/health
GET http://localhost:3000/api/health/mysql
```

La segunda ruta debe indicar `connectedDatabase: secure_net` y las siete tablas.

## Pruebas

1. Abrir Postman.
2. Hacer login en `POST /api/auth/login`.
3. Copiar el token.
4. En el resto de peticiones, header `Authorization: Bearer <token>`.

El detalle de casos ejecutados está en `docs/PRUEBAS.md`.

## DBeaver

Conexión local típica: host `localhost`, puerto `3306`, base `secure_net`. Sirve para confirmar que los INSERT/UPDATE de la API quedan persistidos.
