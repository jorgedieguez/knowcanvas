# Contribuir a KnowCanvas

Gracias por ayudar a mejorar KnowCanvas. El proyecto busca que crear experiencias de aprendizaje visuales e interactivas sea accesible, portable y comprensible.

## Antes de empezar

1. Abre una incidencia para cambios grandes o que alteren contratos persistidos.
2. Lee [AGENTS.md](AGENTS.md), [docs/RULES.md](docs/RULES.md) y [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).
3. No incluyas credenciales, datos personales ni contenido de usuarios en ejemplos o pruebas.

## Entorno local

```bash
npm install
cp .dev.vars.example .dev.vars
npm run db:migrate
npm run dev
```

Las credenciales de Google y las claves de cifrado son opcionales para trabajar en partes que no dependan de autenticación, Drive o IA. Consulta el README para configurarlas.

## Flujo de cambios

- Crea una rama corta y enfocada.
- Mantén TypeScript estricto y los contratos validados con Zod.
- Añade pruebas proporcionales al cambio.
- Actualiza la documentación viva cuando cambien arquitectura, UX o alcance.
- Ejecuta antes de abrir una pull request:

```bash
npm run check
npm run test:e2e
```

## Principios técnicos

- Estructura, contenido, composición, interacción y publicación son capas distintas.
- Ningún widget ejecuta JavaScript proporcionado por un autor.
- La accesibilidad y las alternativas de teclado son requisitos funcionales.
- Los cambios persistidos deben ser compatibles o incluir migración explícita.
- No se simulan guardados, publicaciones ni resultados de aprendizaje.

## Pull requests

Describe el problema, la decisión tomada, las comprobaciones realizadas y los riesgos de regresión. Incluye capturas o vídeo para cambios visuales y explica cómo verificaste teclado, foco y responsive.

Al contribuir aceptas que tu aportación se distribuya bajo Apache License 2.0.
