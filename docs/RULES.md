# Reglas de ingeniería

## TypeScript

- `strict`, `noUncheckedIndexedAccess` y tipos de frontera explícitos.
- No usar `any`; ante datos desconocidos usar `unknown` y validar.
- Preferir uniones discriminadas, funciones puras e invariantes en el dominio.
- Los casts requieren evidencia local; no ocultar errores con `as` o `!`.
- Fechas y cantidades deben indicar formato/unidad en nombre o tipo.

## React y componentes

- Componentes funcionales, pequeños y centrados en una responsabilidad.
- Estado local para interacción efímera; estado de servidor detrás de servicios/hooks de feature.
- No duplicar datos derivados ni introducir contextos globales sin necesidad.
- Claves estables del dominio, nunca índices para listas reordenables.
- Toda acción debe mostrar estado pendiente, éxito/error o estar honestamente deshabilitada.

## Validación y errores

- Validar todas las fronteras HTTP, persistencia JSON y configuraciones de widget con Zod.
- Traducir errores esperados a códigos estables; registrar causa interna sin exponerla.
- No capturar errores para ignorarlos. Ofrecer recuperación o feedback accionable.
- Operaciones destructivas requieren confirmación y objetivo explícito.

## Seguridad

- Solo consultas D1 parametrizadas; ningún secreto o token en código/variables `VITE_*`.
- No ejecutar JavaScript, HTML activo o URLs peligrosas proporcionadas por usuarios.
- Añadir límites de tamaño y listas de tipos permitidos en entradas/archivos.
- Endpoints de escritura en producción requieren control de acceso y protección CSRF/origen aplicable.

## Accesibilidad y diseño

- HTML semántico antes que ARIA; navegación completa por teclado y foco visible.
- Controles con nombre accesible, errores asociados y estados anunciables.
- Contraste AA, objetivos táctiles adecuados y respeto a `prefers-reduced-motion`.
- No depender solo del color para comunicar estado.

## Pruebas

- Unidad: invariantes, orden/ciclos, esquemas, migraciones de widgets y simulación.
- Integración: rutas, validación, repositorios y transacciones D1 aisladas.
- E2E: crear/recuperar, editar árbol, configurar/interactuar, estudiar y publicar.
- Una corrección de regresión incluye una prueba que falle antes del arreglo cuando sea viable.
- No afirmar funcionamiento sin ejecutar la comprobación correspondiente.

## Organización y dependencias

- Features co-localizan UI, hooks y pruebas; dominio/contratos compartidos no importan React.
- Evitar archivos comodín `utils`; nombrar por responsabilidad.
- Dependencias nuevas necesitan propósito, compatibilidad Workers, salud y coste de bundle evaluados.
- Importaciones no deben saltarse capas ni crear ciclos.

## Documentación

- Comentarios explican el porqué, no repiten código.
- Cambios de contrato, arquitectura, diseño o ejecución actualizan el documento dueño.
- `TASKS.md` refleja evidencia y `MEMORY.md` conserva decisiones/pending relevantes.
