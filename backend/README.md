# Secure Net

Backend del sistema **Secure Net** para la evidencia SENA **GA8-220501096-AA1-EV02 — Módulos Integrados**.

API REST con Node.js, Express y MySQL (`secure_net`). No utiliza Prisma ni PostgreSQL en tiempo de ejecución.

## Descripción

Secure Net gestiona usuarios, clientes, categorías y servicios de seguridad, asignaciones de trabajo y el registro de reportes generados por un usuario.

## Objetivo

Demostrar módulos integrados con el flujo:

```
Postman → Ruta → Controlador → Servicio → SQL parametrizado → MySQL → JSON
```

## Tecnologías

Node.js, npm, Express, MySQL, mysql2, JWT, bcryptjs, dotenv, Helmet, CORS, Morgan, XAMPP, DBeaver, Postman, Git.

## Arquitectura

Ruta → controlador → servicio → MySQL → respuesta JSON.

## Módulos

- Autenticación y usuarios
- Clientes
- Categorías de servicios
- Servicios
- Asignaciones
- Reportes
- Health / conexión MySQL

## Base de datos

- Motor: MySQL  
- Nombre: `secure_net`  
- Tablas: `roles`, `usuarios`, `clientes`, `categorias_servicio`, `servicios`, `asignaciones`, `reportes`

El esquema no se modifica desde este repositorio.

## Instalación

```powershell
cd backend
npm install
```

## Configuración `.env`

Copiar `.env.example` a `.env` y completar credenciales locales. No versionar `.env`.

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

1. Iniciar MySQL en XAMPP (puerto 3306).  
2. Ejecutar:

```powershell
npm run dev
```

API: `http://localhost:3000`

## Endpoints principales

| Método | Ruta |
|---|---|
| GET | `/health` |
| GET | `/api/health/mysql` |
| POST | `/api/auth/login` |
| GET | `/api/auth/me` |
| GET/POST | `/api/usuarios` |
| GET/POST | `/api/clientes` |
| GET/POST | `/api/categorias` |
| GET/POST | `/api/servicios` |
| GET/POST | `/api/asignaciones` |
| GET/POST | `/api/reportes` |

Las mutaciones requieren JWT. Login de referencia de pruebas (no es un secreto de producción): usuario creado por el módulo de usuarios `prueba.auth@securenet.co`.

## Pruebas con Postman

1. `POST /api/auth/login` con `correo` y `clave`.  
2. Copiar `data.token`.  
3. Header: `Authorization: Bearer <token>`.  
4. Ejercitar GET/POST de cada módulo.  
5. Verificar en DBeaver que los INSERT quedaron en `secure_net`.

Registro de casos: `docs/PRUEBAS.md`.

## Estructura del proyecto

```
backend/
  src/app.js
  src/server.js
  src/config/
  src/middlewares/
  src/routes/
  src/controllers/
  src/services/
  src/utils/
  docs/
  .env.example
  package.json
```

## Documentación de la evidencia

- `docs/MODULOS_INTEGRADOS.md`
- `docs/DOCUMENTO_TECNICO.md`
- `docs/AMBIENTE_DESARROLLO_PRUEBAS.md`
- `docs/PRUEBAS.md`
- `docs/ACTA_PRUEBAS_ACEPTACION.md`

## Control de versiones

Git local. Ignorar `node_modules/` y `.env`. No hacer push a remoto hasta que el aprendiz lo solicite.

## Referencia de trabajos anteriores

En la carpeta padre del workspace se conservan, sin usarse como runtime:

- carpeta `Secure Net/` (Prisma / PostgreSQL)
- ZIP *Codificación de módulos*
- ZIP *Diseño y desarrollo de servicio web*
