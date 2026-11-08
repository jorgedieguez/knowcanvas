# AGENTS.md — contrato operativo de KnowCanvas

Este archivo rige cualquier trabajo realizado en este repositorio.

## Antes de modificar código

1. Lee `docs/TASKS.md` y la documentación relacionada con el cambio.
2. Revisa `docs/MEMORY.md` para conocer decisiones y problemas vigentes.
3. Comprueba el estado del repositorio y conserva cambios ajenos o no relacionados.
4. Limita el alcance al hito activo; no adelantes funcionalidades sin autorización.

## Durante el trabajo

- Usa TypeScript estricto y respeta `docs/RULES.md`.
- Mantén separadas estructura, contenido, composición, interacción y publicación.
- No introduzcas una dependencia si la plataforma o una utilidad local resuelven el caso con claridad.
- No ejecutes JavaScript proporcionado por usuarios.
- No uses `localStorage` como persistencia principal ni simules éxito de guardado, publicación o aprendizaje.
- Trata accesibilidad, validación, errores y seguridad como requisitos funcionales.
- Prefiere cambios pequeños, módulos explícitos y contratos validados.

## Antes de terminar

1. Ejecuta las comprobaciones proporcionales al cambio; para un hito, ejecuta `npm run check` y las pruebas E2E relevantes.
2. No marques una tarea como terminada sin evidencia verificable.
3. Actualiza `docs/TASKS.md` con estado y comprobaciones.
4. Registra decisiones, incidencias y pendientes relevantes en `docs/MEMORY.md` sin duplicar otros documentos.
5. Actualiza `docs/ARCHITECTURE.md` si cambian límites, dependencias, contratos o despliegue.
6. Actualiza `docs/DESIGN.md` si cambian patrones visuales o de interacción.
7. Actualiza el README si cambia la forma de instalar, ejecutar, probar o desplegar.
