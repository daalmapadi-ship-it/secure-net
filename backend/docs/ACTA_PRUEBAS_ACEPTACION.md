# Acta de pruebas y aceptación

## Identificación

| Campo | Dato |
|---|---|
| Nombre del proyecto | Secure Net |
| Programa / evidencia | GA8-220501096-AA1-EV02 — Módulos Integrados |
| Aprendiz | ________________________________ |
| Instructor | ________________________________ |
| Fecha | 9 de septiembre de 2026 |
| Ambiente | Local — Node.js + Express + MySQL `secure_net` |

## 1. Objeto del acta

Dejar constancia de las pruebas realizadas sobre el backend de Secure Net y de la aceptación académica de los módulos integrados para la evidencia SENA.

## 2. Módulos evaluados

1. Usuarios y autenticación  
2. Clientes  
3. Categorías de servicios  
4. Servicios  
5. Asignaciones  
6. Reportes  
7. Health check y conexión MySQL  

## 3. Resumen de pruebas

Las pruebas se ejecutaron contra `http://localhost:3000` y se contrastaron con consultas a MySQL `secure_net`. El detalle está en `docs/PRUEBAS.md`.

| Módulo | Casos ejecutados | Resultado |
|---|---|---|
| Health | 2 | CUMPLE |
| Usuarios / autenticación | 18 | CUMPLE |
| Clientes | 11 | CUMPLE |
| Categorías | 9 | CUMPLE |
| Servicios | 10 | CUMPLE |
| Asignaciones | 13 | CUMPLE |
| Reportes | 10 | CUMPLE |

## 4. Resultados

- La API responde JSON uniforme (`success`, `message`, `data`).
- Las consultas utilizan SQL parametrizado sobre MySQL (no Prisma, no PostgreSQL, no arreglos en memoria).
- Las contraseñas se almacenan con bcrypt y no se exponen en las respuestas.
- Las llaves foráneas se validan (cliente, servicio, usuario, categoría).
- Los datos de prueba de los módulos se persistieron en `secure_net`.
- No se modificó la estructura de las 7 tablas.

## 5. Observaciones

- No se implementó interfaz web; la demostración de extremo a extremo se realiza con Postman (o equivalente HTTP) hasta MySQL.
- El módulo Incidencias de una evidencia anterior no se integró porque no existe tabla `incidencias`.
- En reportes no hay PUT/DELETE: la tabla es un histórico de generación (`generado_en`).
- Quedaron registros de prueba adicionales (usuario, cliente, servicio, asignaciones y reporte de evidencia). Las filas originales de DBeaver no se eliminaron.

## 6. Declaración de aceptación

Los abajo firmantes declaran que:

1. Los módulos listados fueron probados en el ambiente local.
2. El flujo ruta → controlador → servicio → MySQL → JSON es demostrable.
3. El sistema es apto para presentar la evidencia GA8-220501096-AA1-EV02, con las observaciones indicadas.

**Concepto:** ACEPTADO CON OBSERVACIONES (sin interfaz gráfica; evidencias previas de Incidencias no integradas al esquema actual).

## 7. Firmas

| Rol | Nombre | Firma | Fecha |
|---|---|---|---|
| Aprendiz | | | |
| Instructor / evaluador | | | |

Espacio para sello o observaciones del instructor:

_______________________________________________
_______________________________________________
