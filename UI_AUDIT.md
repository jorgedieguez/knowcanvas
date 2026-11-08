# Auditoría UI/UX de KnowCanvas

Fecha: 18 de octubre de 2026  
Alcance: aplicación web completa, revisión estática de código, estilos, documentación de producto y pruebas E2E.  
Marco de evaluación: recomendaciones de `ui-ux-pro-max`, WCAG 2.2 AA como objetivo del PRD y una dirección inspirada en Apple: claridad, deferencia hacia el contenido, profundidad funcional contenida, consistencia, respuesta inmediata y movimiento discreto.

> Esta auditoría no modifica la interfaz ni la lógica. Los hallazgos marcados como **Comprobado** se derivan directamente del código. Los marcados como **Validación visual** requieren abrir la aplicación y comprobarlos en los tamaños y escenarios indicados antes de considerarlos defectos cerrados.

## 1. Resumen ejecutivo

KnowCanvas ya tiene una base funcional valiosa: una arquitectura de producto comprensible (biblioteca → libro → árbol/lienzo/inspector), iconografía Lucide consistente, estados vacíos y errores básicos, una separación explícita entre selección y edición, soporte de teclado para varias operaciones, diseño responsive inicial y pruebas E2E de los flujos editoriales principales.

La principal debilidad no es la ausencia de estilos, sino la convivencia de **dos lenguajes visuales y varios sistemas de interacción**:

- `src/client/ui-system.css` define una interfaz blanca, neutra, sans serif y azul para foco/selección.
- `src/client/styles.css` conserva el lenguaje histórico editorial: fondos crema, Georgia, verde, terracota, violetas, sombras cálidas y numerosos valores directos.
- Algunos componentes siguen el patrón nuevo y otros heredan el anterior. El resultado probable es una experiencia que cambia de carácter entre login, biblioteca, editor, menús y modales.

El mayor riesgo de producto está en el editor: la interfaz necesita comunicar con absoluta claridad en qué estado se encuentra el usuario —navegación del lienzo, widget seleccionado, edición interna o herramienta modal—, pero hoy esa semántica se resuelve mediante una combinación extensa de selectores, eventos globales y controles pequeños. La experiencia tiene funcionalidad, aunque todavía no la serenidad ni la previsibilidad de una herramienta Apple.

### Valoración por dimensión

| Dimensión                    | Estado | Síntesis                                                                                                                  |
| ---------------------------- | -----: | ------------------------------------------------------------------------------------------------------------------------- |
| Arquitectura de navegación   |   7/10 | Modelo Biblioteca/Libro/Árbol/Lienzo/Inspector claro.                                                                     |
| Coherencia visual            |   4/10 | Dos lenguajes visuales compiten y existen muchos valores sin token.                                                       |
| Jerarquía y legibilidad      |   5/10 | Buena estructura general; exceso de texto entre 8 y 12 px y tipografía inconsistente.                                     |
| Interacción del editor       |   6/10 | Modelo conceptual sólido, pero elevado número de estados y menús con patrones diferentes.                                 |
| Feedback de estado           |   6/10 | Guardado/error/loading existen; faltan anuncios accesibles y recuperación más explícita.                                  |
| Responsive/táctil            |   4/10 | Hay drawers y dos breakpoints principales; el lienzo fijo y objetivos pequeños limitan móvil.                             |
| Accesibilidad                |   4/10 | Semántica parcial y foco básico; faltan foco modal, menús por teclado, live regions y alternativas completas al arrastre. |
| Reutilización/mantenibilidad |   3/10 | Componentes grandes, CSS monolítico y variantes duplicadas dificultan consistencia.                                       |
| Cobertura de interacción     |   7/10 | Buen punto de partida E2E en Chrome escritorio y Pixel 7; falta cobertura visual y accesible.                             |

**Diagnóstico general:** base de producto prometedora, pero sistema visual aún no consolidado. Antes de pulir píxeles aislados conviene unificar tokens, primitivas y estados de interacción. Esa inversión reducirá regresiones y hará que el producto se perciba más ligero sin eliminar capacidades.

## 2. Fuentes y método

Se revisaron:

- aplicación y composición principal: `src/client/App.tsx` (3.050 líneas);
- editor enriquecido: `src/client/components/RichTextEditor.tsx` (1.140 líneas);
- selector de imágenes, diagrama y superficie Excalidraw;
- sistema visual: `src/client/styles.css` (3.169 líneas) y `src/client/ui-system.css` (285 líneas);
- configuración de marca y recursos visuales;
- documentación: `docs/DESIGN.md`, `docs/EDITOR_SPEC.md`, `docs/PRD.md` y sistema de diseño de referencia `Arbol Geneologico/DESIGN_SYSTEM.md`;
- pruebas E2E y configuración Playwright.

La skill recomienda minimalismo funcional, jerarquía tipográfica, contraste AA, foco visible, objetivos táctiles, navegación completa por teclado, movimiento reducido, layouts sin desbordamiento accidental y validación en 375, 768, 1024 y 1440 px. Para este producto se amplía a 320 y 414 px por el contrato existente.

No se realizó en esta fase una inspección visual autenticada de todas las rutas ni pruebas con lector de pantalla. Por ello, medidas perceptivas como equilibrio, recorte real, superposición y estabilidad durante gestos están identificadas como validación pendiente.

## 3. Inventario de pantallas, layouts y componentes

### Pantallas y estados de nivel superior

| Pantalla/estado      | Implementación                               | Elementos principales                                                                  |
| -------------------- | -------------------------------------------- | -------------------------------------------------------------------------------------- |
| Carga inicial        | `App.tsx:160`, `styles.css:72-109`           | Marca, indicador animado, mensaje.                                                     |
| Acceso Google        | `App.tsx:170`, `styles.css:110-271`          | Tarjeta de acceso, error/configuración OAuth, visual decorativo.                       |
| Biblioteca           | `App.tsx:218`, `styles.css:273-420`          | Topbar, cuenta, cabecera, grid de libros, estado vacío.                                |
| Espacio de trabajo   | `App.tsx:503`, `styles.css:441-1050`         | Topbar, selector Editar/Estudiar, explorador, lienzo e inspector.                      |
| Modo editar          | `App.tsx:1075`, `App.tsx:2249`               | Lienzo espacial, selección, toolbar contextual, ocho asas, inserción y multiselección. |
| Modo estudiar        | `App.tsx:503`, `styles.css`                  | Documento/flujo de lectura sin herramientas espaciales.                                |
| Editor de diagrama   | `DiagramWidget.tsx`, `ExcalidrawSurface.tsx` | Modal de pantalla amplia y Excalidraw lazy-loaded.                                     |
| Selector de imágenes | `ImagePicker.tsx`                            | Modal con biblioteca, subida, URL, alt y errores.                                      |

### Regiones y componentes UI

- `BrandLockup`: marca repetida en carga, acceso y biblioteca.
- `ExplorerPanel`: navegación jerárquica, plegado, drag-and-drop, renombrado, menú y creación.
- `CanvasPanel`: toolbar, guardado, historial, inserción, modos y composición espacial.
- `SpatialWidget`: selección, movimiento, capas, bloqueo, duplicado, borrado y redimensionado.
- `CanvasTableWidget`: contenedor de maquetación con celdas y widgets hijos.
- `RichTextEditor`: contenido visual, Markdown opcional, selección contextual, enlace, tabla, imagen y comandos `/`.
- `PropertiesPanel`: resumen, pestañas Contenido/Diseño/Comportamiento y formularios contextuales.
- `ImagePicker`: biblioteca de recursos y flujo de URL/subida.
- `DiagramWidget`: resumen de diagrama, lectura y edición modal.
- familias visuales actuales: botones primarios/secundarios/icono, tarjetas de libro, filas de árbol, menús, toolbars, tabs, campos, badges, estados vacíos, errores, modales, widgets y asas.

### Cobertura automatizada existente

`tests/e2e/editor-shell.spec.ts` cubre biblioteca→editor, drawers responsive, árbol plegable, inspector, inserción, Excalidraw, selección/edición, duplicado/bloqueo/borrado, tabs del inspector, slash commands, historial/autoguardado, teclado, tablas, enlaces, bloques provisionales y multiselección. `playwright.config.ts` ejecuta Desktop Chrome y Pixel 7.

No se encontraron pruebas de regresión visual, Axe/ARIA, Safari/WebKit, navegación completa solo con teclado, foco modal, contraste ni matriz completa de breakpoints.

## 4. Sistema de diseño actual

### Tipografía

**Comprobado.** Hay tres decisiones incompatibles:

1. `styles.css:3-11` prioriza Inter/system.
2. `ui-system.css:24-33`, cargado después, prioriza Arial y deja `-apple-system` casi al final.
3. Login, títulos, texto editorial, editor y previews fuerzan Georgia en numerosos puntos (`styles.css:84-88`, `125-138`, `258-267`, `324-332`, `1033-1046`, `1976-1978`, `2130-2135`).

Esto contradice `docs/DESIGN.md` y el sistema de referencia, que prescriben una sola voz sans serif. Además, el CSS contiene texto de 8, 9, 10 y 11 px de forma recurrente; el inventario detecta 80 declaraciones entre 8 y 12 px. Es insuficiente para contenido operativo, especialmente en pantallas táctiles.

### Color

**Comprobado.** `ui-system.css` declara tokens neutros coherentes (`#fff`, `#f7f7f8`, `#1e1919`, `#6f6b67`, `#0066ff`), pero `styles.css` contiene más de cien valores hexadecimales distintos y redefine los alias con crema, terracota y verde (`styles.css:12-27`). La capa posterior corrige algunos componentes, no todos. Persisten colores directos en login, biblioteca, árbol, editor, menús, tablas, estados y diagramas.

### Espaciado y densidad

**Comprobado.** No existe una escala de espaciado canónica. Se utilizan valores continuos (1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12… px) según cada componente. La densidad es especialmente alta en toolbars y menús, mientras login y biblioteca usan grandes vacíos. La variación reduce el ritmo visual.

### Bordes, radios y sombras

**Comprobado.** Los tokens definen radios de 10/14 px y ausencia de sombra por defecto, pero la implementación usa radios de 2 a 22 px y sombras desde `0 1px 4px` hasta `0 30px 100px`. Los menús usan variables específicas y los modales otras reglas. La profundidad no comunica una jerarquía estable.

### Iconografía

**Comprobado, positivo.** La interfaz usa `lucide-react` de manera consistente y ofrece `aria-label` en gran parte de los icon buttons. La excepción conceptual es la “G” textual de Google, que no reproduce el activo oficial. Los tamaños oscilan entre 14 y 28 px, razonables, aunque sus cajas interactivas suelen ser demasiado pequeñas.

### Componentes y estados

**Comprobado.** Hay patrones repetidos, pero no una biblioteca de primitivas. Menú de árbol, menú de bloque, menú de selección de texto, slash menu, popover de enlace, catálogo de widgets, modal de recursos y modal de diagrama definen dimensiones, radio, sombra, cierre y comportamiento propios.

## 5. Hallazgos comprobados en código

### P0 — Bloqueantes para una base coherente y accesible

#### P0.1 Dos sistemas visuales activos

- **Archivos:** `src/client/styles.css`, `src/client/ui-system.css`, `docs/DESIGN.md`.
- **Evidencia:** los tokens históricos se declaran primero y se remapean después; selectores específicos conservan Georgia, beige, verde, terracota y sombras aunque la capa canónica ordena blanco/sans/azul.
- **Impacto:** incoherencia entre pantallas, alta probabilidad de overrides inesperados y coste elevado de cualquier ajuste.
- **Recomendación:** consolidar primero los tokens semánticos y migrar por familias de componentes; retirar los alias históricos solo cuando no tengan consumidores.
- **Esfuerzo:** alto.

#### P0.2 Objetivos interactivos demasiado pequeños

- **Archivos:** `src/client/styles.css:560-589`, `755-757`, `808-843`, `1205-1264`, `1335-1355`, `1694-1697`, `1727-1760`.
- **Evidencia:** botones de 22×28, 26×26, 27×27, 28×28, 30×30 y 34×34 px; asas con hit area de 24×24 px. La skill recomienda 44×44 px en tacto y al menos separación suficiente.
- **Impacto:** errores de pulsación, especialmente en árbol, toolbar del widget, formato de texto y resize.
- **Recomendación:** mantener icono visual de 16–18 px, elevar el área activa a 36 px escritorio y 44 px en `pointer: coarse`; asas visuales de 8–10 px sobre hit area 32/44 px.
- **Esfuerzo:** medio.

#### P0.3 Diálogos sin gestión de foco demostrable

- **Archivos:** `ImagePicker.tsx:63-151`, `DiagramWidget.tsx:57-92`, catálogo en `App.tsx:2088-2131`, enlace en `RichTextEditor.tsx:910-963`.
- **Evidencia:** se usan `role="dialog"` y `aria-modal`, pero no se encontró focus trap, restauración de foco, `inert` del fondo ni un patrón común de Escape. El backdrop del selector de recursos tiene `role="presentation"`, pero tampoco implementa cierre o bloqueo común.
- **Impacto:** un usuario de teclado puede salir detrás del modal o perder su posición al cerrarlo.
- **Recomendación:** primitiva `Dialog/Popover` compartida con portal, posicionamiento, trap, Escape, retorno de foco y scroll lock.
- **Esfuerzo:** medio-alto.

#### P0.4 Menús con semántica parcial y navegación por teclado incompleta

- **Archivos:** `App.tsx:979-1048`, `App.tsx:2556-2569`, `RichTextEditor.tsx:800-963`.
- **Evidencia:** existen `role=menu/menuitem` y `listbox/option`, pero no se encontró gestión de flechas, Home/End, roving `tabIndex`, `aria-activedescendant` ni retorno al disparador. Algunos menús son `role=dialog`, otros `menu` o `listbox` para interacciones parecidas.
- **Impacto:** inconsistencias de teclado y modelo mental.
- **Recomendación:** diferenciar `Menu` (acciones), `Listbox/Combobox` (selección) y `Dialog/Popover` (formulario), con primitivas accesibles únicas.
- **Esfuerzo:** alto.

### P1 — Alto impacto

#### P1.1 Tipografía fragmentada y texto operativo microscópico

- **Archivos:** `src/client/styles.css`, `src/client/ui-system.css`.
- **Evidencia:** tres stacks activos y múltiples tamaños entre 8–11 px en etiquetas, metadata, menús y cabeceras.
- **Impacto:** baja legibilidad, personalidad poco consistente y apariencia menos profesional.
- **Recomendación:** stack de sistema Apple-first; cuerpo 14–15 escritorio y 16 móvil; metadata mínimo 12; labels 11–12 solo en mayúsculas con contraste adecuado; contenido de lectura 16–18/1.55–1.7.
- **Esfuerzo:** medio.

#### P1.2 Estado de guardado no anunciado

- **Archivos:** `App.tsx:1745-1783`, `App.tsx:552-557`.
- **Evidencia:** el badge cambia entre Guardando/Sin guardar/Error/Guardado, pero no tiene `role=status` ni `aria-live`. La topbar muestra además “Base local”, una etiqueta que no corresponde al estado real de guardado.
- **Impacto:** feedback ambiguo y no accesible; “Base local” es lenguaje técnico sin valor para el usuario.
- **Recomendación:** un único `SaveStatus` con icono, texto breve, `aria-live=polite`, persistencia del error y acción de reintento. Mostrar “Guardado” solo tras confirmación.
- **Esfuerzo:** bajo.

#### P1.3 Responsive de autoría basado en lienzo mínimo fijo

- **Archivos:** `styles.css:980-1019`, `1661-1667`, `2980-3150`.
- **Evidencia:** edición fuerza `width: max(100%, 1800px)` y `min-height: max(100%, 1200px)`; en móvil mantiene superficie espacial y drawers de hasta 88vw. Es una decisión válida para autoría espacial, pero no existe modo táctil explícito, zoom, encajar o pan, capacidades todavía pendientes en `EDITOR_SPEC.md`.
- **Impacto:** mucho desplazamiento, dificultad para localizar contenido y manipulación precisa en móvil.
- **Recomendación:** en móvil priorizar edición de contenido y lectura; activar colocación espacial solo mediante modo explícito. En escritorio añadir zoom/pan/encajar antes de intentar “hacer responsive” las coordenadas.
- **Esfuerzo:** alto.

#### P1.4 Drawers móviles sin overlay ni contrato modal

- **Archivos:** `App.tsx:594-671`, `styles.css:3011-3145`.
- **Evidencia:** explorador e inspector son paneles `position: fixed` que se desplazan, pero no se encontró backdrop, cierre al tocar fuera, bloqueo de scroll, aislamiento del foco o Escape compartido.
- **Impacto:** el usuario puede interactuar accidentalmente con el lienzo bajo el panel y perder contexto.
- **Recomendación:** patrón `Sheet` modal en móvil; panel persistente en desktop.
- **Esfuerzo:** medio.

#### P1.5 Acciones dependientes de hover o difíciles de descubrir

- **Archivos:** `styles.css:830-847`, `styles.css:1173-1275`.
- **Evidencia:** el menú de nodo tiene `opacity: 0` y aparece por hover/focus; toolbars y controles laterales solo aparecen tras selección. El foco hace visible el botón del nodo, lo cual es positivo, pero en touch la acción secundaria no tiene affordance persistente.
- **Impacto:** descubribilidad baja y experiencia distinta entre ratón y tacto.
- **Recomendación:** menú de fila visible para activa/seleccionada y siempre accesible en `pointer: coarse`; mostrar ayuda contextual la primera vez, no cromo permanente.
- **Esfuerzo:** bajo-medio.

#### P1.6 Accesibilidad del lienzo incompleta

- **Archivos:** `App.tsx:2249-2673`, `docs/EDITOR_SPEC.md`.
- **Evidencia positiva:** widget focalizable, flechas para mover, panel numérico, Delete y Escape. **Carencias comprobadas:** las ocho asas solo responden a `pointerdown`; no implementan teclado. La selección múltiple y varias operaciones siguen dependiendo parcialmente de gestos. No hay skip link hacia el lienzo ni orden de lectura explícito para la composición espacial.
- **Impacto:** funciones centrales inaccesibles sin puntero y navegación extensa por topbar/árbol.
- **Recomendación:** comandos de tamaño por teclado y campos rápidos, “Saltar al lienzo”, orden semántico guardado, ayuda de atajos y alternativa para todas las operaciones espaciales.
- **Esfuerzo:** alto.

#### P1.7 Tabs incompletas como patrón ARIA

- **Archivos:** `App.tsx:2781-3010`.
- **Evidencia:** `tablist`, `tab`, `aria-selected` y `tabpanel` están presentes, pero faltan IDs, `aria-controls`, `aria-labelledby`, navegación con flechas y tab stop único.
- **Impacto:** experiencia parcial en lector de pantalla/teclado.
- **Recomendación:** componente `Tabs` reutilizable con patrón ARIA completo.
- **Esfuerzo:** bajo-medio.

### P2 — Calidad y consistencia

#### P2.1 Componentes monolíticos y estilos no encapsulados

- **Archivos:** `App.tsx` (3.050 líneas), `RichTextEditor.tsx` (1.140), `styles.css` (3.169).
- **Evidencia:** pantallas, estado, gestos, modales y componentes visuales coexisten en pocos archivos. Las primitivas no están separadas.
- **Impacto:** duplicación, selectores frágiles, regresiones por cascada y alto coste de QA.
- **Recomendación:** extraer primero primitivas sin cambiar comportamiento; después regiones del editor y hooks de estado.
- **Esfuerzo:** alto, incremental.

#### P2.2 Jerarquía de botones inconsistente

- **Archivos:** `styles.css`, `App.tsx`, `ImagePicker.tsx`, `DiagramWidget.tsx`.
- **Evidencia:** `primary-action`, `primary-button`, `publish-button`, `secondary-button`, `quiet-button`, botones locales de modal y toolbar compiten. Los estados disabled varían entre opacidad, gris y ausencia visual.
- **Impacto:** cuesta distinguir acción primaria, secundaria y destructiva.
- **Recomendación:** una primitiva `Button` con variantes `primary`, `secondary`, `ghost`, `danger`, `icon`; tamaños `sm/md/lg`; loading integrado.
- **Esfuerzo:** medio.

#### P2.3 Superficies flotantes duplicadas

- **Archivos:** `styles.css:852-884`, `1120-1155`, `1197-1287`, `1712-1965`, `2092-2116`, `2390-2570`.
- **Evidencia:** cada menú/popover define ancho, radio, borde, sombra, padding y z-index.
- **Impacto:** menús visualmente diferentes y riesgo de recorte/posición errónea.
- **Recomendación:** tokens de elevación y primitivas `FloatingSurface`, `Menu`, `Popover`, `Dialog` mediante portal y colisión con viewport.
- **Esfuerzo:** medio-alto.

#### P2.4 Escala de z-index sin sistema

- **Archivos:** `styles.css`.
- **Evidencia:** valores 2, 4, 5, 6, 7, 8, 9, 10, 20, 25, 30, 50, 100, 400, 900, 1000, 1100 y 1200.
- **Impacto:** overlays que se solapan de forma impredecible.
- **Recomendación:** tokens `base`, `sticky`, `dropdown`, `popover`, `sheet`, `modal`, `toast` y eliminación gradual de números directos.
- **Esfuerzo:** bajo-medio.

#### P2.5 Carga y errores no forman un sistema común

- **Archivos:** `App.tsx:160-215`, `ImagePicker.tsx`, `DiagramWidget.tsx`.
- **Evidencia:** hay loading line, spinner, alertas inline y error global; no comparten componente, tono, título, acción de recuperación o política de persistencia.
- **Impacto:** el usuario recibe feedback distinto para problemas equivalentes.
- **Recomendación:** `Progress`, `InlineAlert`, `EmptyState`, `Toast` y `RetryState` compartidos. Evitar spinner indefinido sin texto o salida.
- **Esfuerzo:** medio.

#### P2.6 Metadatos técnicos visibles

- **Archivos:** `App.tsx:552-557`, `App.tsx:1068`, inspector.
- **Evidencia:** “Base local”, “guardado en D1”, `schemaVersion` y nombres de tipo en inglés aparecen en UI de usuario.
- **Impacto:** rompe la ilusión de producto acabado y añade ruido.
- **Recomendación:** retirar datos de infraestructura de la interfaz normal; mover información diagnóstica a un modo de desarrollo.
- **Esfuerzo:** bajo.

#### P2.7 Tema del navegador no coincide con el sistema nuevo

- **Archivo:** `index.html:9`.
- **Evidencia:** `theme-color` usa `#f5f3ed`, color cálido que no pertenece a la paleta canónica.
- **Impacto:** cromo del navegador incoherente en móvil/PWA.
- **Recomendación:** usar el fondo canónico del tema y definir variante dark solo cuando exista.
- **Esfuerzo:** bajo.

#### P2.8 Imágenes sin estrategia común de rendimiento

- **Archivos:** `App.tsx:239`, `App.tsx:1988`, `App.tsx:2223`, `ImagePicker.tsx:93`, contenido generado en `RichTextEditor.tsx`.
- **Evidencia:** no se declaran sistemáticamente `width/height`, `loading=lazy` o `decoding=async`; la subida sí optimiza recursos, lo cual es positivo.
- **Impacto:** riesgo de layout shift y carga innecesaria en bibliotecas/lienzos con imágenes.
- **Recomendación:** componente `AppImage` con dimensiones/aspect ratio y política de carga según ubicación.
- **Esfuerzo:** medio.

### Fortalezas comprobadas que deben conservarse

- Iconografía Lucide uniforme y predominantemente con nombres accesibles.
- `prefers-reduced-motion` ya está implementado globalmente (`styles.css:3160`).
- `viewport` móvil correcto en `index.html`.
- Excalidraw se carga con `lazy` y `Suspense`.
- Imágenes de contenido tienen `max-width: 100%; height: auto`.
- Errores relevantes usan `role=alert`.
- Estado disabled se usa para funcionalidades aún no disponibles en lugar de fingir éxito.
- La separación `canvas/object/tool` y el bloqueo de interacción con otros widgets durante edición interna son una buena base conceptual.
- Hay alternativas numéricas para posición/tamaño y movimiento por flechas.
- La suite E2E usa consultas por rol/label, una práctica accesible y robusta.

## 6. Hallazgos que requieren validación visual en navegador

Estos puntos son hipótesis fundadas en CSS/DOM; deben verificarse con screenshots, vídeo de interacción o sesión de navegador:

1. **Login a 820–900 px:** comprobar que la combinación de `minmax(390px)` + `minmax(440px)` no comprime contenido antes del breakpoint.
2. **Biblioteca con nombres largos, 0/1/20 libros:** confirmar truncado, altura consistente y equilibrio entre tarjeta y lista.
3. **Topbar a 821–1050 px:** comprobar solapamiento de marca, nombre del libro, modos y acciones.
4. **Lienzo con inspector a 1024 px:** validar espacio útil cuando conviven 226 px de árbol y 280–480 px de inspector.
5. **Lienzo móvil:** medir si la superficie 1800×1200 produce desorientación, scroll accidental o pérdida del widget recién creado.
6. **Drawers en iOS Safari/Android Chrome:** comprobar `100vh`, teclado virtual, safe areas, scroll del fondo y cierre.
7. **Menús junto a bordes:** probar menú de texto, enlace, bloque, árbol e inserción en cuatro esquinas y con zoom del navegador 200%.
8. **Selección/edición:** comprobar que azul (selección) y verde (edición) se distinguen sin depender solo del color y no generan saltos visuales.
9. **Asas y toolbar:** verificar que no queden fuera del viewport o debajo de la topbar en widgets próximos a los bordes.
10. **Contenido rico:** probar texto largo, tabla ancha, imagen vertical/horizontal, caption y enlace en auto-height/fixed-height.
11. **Contraste real:** medir todas las combinaciones después de consolidar tokens, en especial metadata, disabled, placeholder, líneas y selección.
12. **Safari/WebKit:** validar `:has`, contenteditable, selección de texto, pointer capture y drag-and-drop.
13. **Lector de pantalla:** VoiceOver Safari y NVDA/Chrome en biblioteca, árbol, selección de widget, inspector y diálogos.
14. **Solo teclado:** recorrer toda la aplicación sin ratón; registrar orden, trampas, pérdida de foco y acciones inalcanzables.
15. **Modo Estudiar:** validar ancho de lectura, orden semántico, tablas e imágenes a 320/375/768/1440 px.

## 7. Propuesta de sistema visual “Apple-inspired”

La referencia Apple debe aplicarse como principios, no como imitación literal: menos decoración, controles previsibles, tipografía nativa, capas discretas, feedback inmediato y contenido dominante.

### 7.1 Principios

1. **Claridad:** una acción principal por contexto, etiquetas directas y estados legibles.
2. **Deferencia:** el lienzo y el contenido son protagonistas; paneles y toolbars se retiran cuando no aportan.
3. **Profundidad funcional:** borde y sombra comunican nivel de superposición, no decoración.
4. **Continuidad:** selección, edición y herramienta mantienen origen, foco y retorno predecibles.
5. **Precisión tranquila:** feedback en menos de 100 ms, animaciones breves y ningún movimiento ornamental.
6. **Accesibilidad por defecto:** contraste, foco, teclado y tacto forman parte de cada primitiva.

### 7.2 Tokens propuestos

#### Color claro

| Token                    | Valor inicial | Uso                                  |
| ------------------------ | ------------: | ------------------------------------ |
| `--color-bg`             |     `#F5F5F7` | Fondo global fuera del contenido.    |
| `--color-surface`        |     `#FFFFFF` | Paneles, documento, popovers.        |
| `--color-surface-subtle` |     `#F9F9FB` | Sidebar, filas hover, grupos.        |
| `--color-text`           |     `#1D1D1F` | Texto principal.                     |
| `--color-text-secondary` |     `#5F5F66` | Metadata accesible.                  |
| `--color-separator`      |     `#D9D9DE` | Separadores principales.             |
| `--color-separator-soft` |     `#EAEAEE` | Divisiones internas.                 |
| `--color-accent`         |     `#0066CC` | Acción secundaria, foco y selección. |
| `--color-accent-soft`    |     `#EAF3FF` | Selección sin saturación.            |
| `--color-success`        |     `#248A3D` | Guardado/confirmación, no selección. |
| `--color-warning`        |     `#A05A00` | Avisos.                              |
| `--color-danger`         |     `#B42318` | Destructivo/error.                   |

No introducir modo oscuro en la primera migración. Preparar pares semánticos, pero implementarlo solo con contraste y QA completos.

#### Tipografía

```css
font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Inter, sans-serif;
```

| Rol                | Tamaño/alto |    Peso |
| ------------------ | ----------- | ------: |
| Título de pantalla | 28/34       | 650–700 |
| Título de panel    | 17/22       |     600 |
| Título de sección  | 15/20       |     600 |
| Cuerpo UI          | 14/20       | 400–500 |
| Cuerpo de lectura  | 17/27       |     400 |
| Metadata           | 12/16       | 400–500 |
| Label compacta     | 11/14       |     600 |

Evitar Georgia en toda la UI y en el editor por defecto. Si se desea tipografía editorial, ofrecerla como propiedad del contenido/publicación, nunca como identidad del shell.

#### Espaciado, forma y profundidad

- escala: `4, 8, 12, 16, 24, 32, 48, 64`;
- radios: `6` (control), `10` (campo/botón), `14` (popover/tarjeta), `18` (dialog/sheet);
- alturas: 32 compacto, 36 escritorio, 44 táctil/formulario principal;
- sombra popover: `0 8px 24px rgba(0,0,0,.10)`;
- sombra dialog: `0 24px 64px rgba(0,0,0,.16)`;
- borde de superficie flotante siempre visible; sin sombra en tarjetas ordinarias;
- transiciones: 120–180 ms, `ease-out`, solo `opacity/transform/background-color/border-color`;
- z-index semántico: 0 base, 10 sticky, 20 toolbar, 30 menu, 40 popover, 50 sheet, 60 modal, 70 toast.

### 7.3 Primitivas reutilizables

Crear en una capa UI independiente, sin lógica de negocio:

- `Button`, `IconButton`, `ButtonGroup`;
- `TextField`, `NumberField`, `Select`, `Checkbox/Switch`;
- `Badge/Status`, `InlineAlert`, `EmptyState`, `Progress`;
- `Tabs`, `SegmentedControl`;
- `Menu`, `Popover`, `Dialog`, `Sheet`, `Toast`;
- `PanelHeader`, `InspectorSection`, `PropertyRow`;
- `Tooltip` para iconos compactos;
- `FocusRing` y utilidades visually-hidden;
- `AppImage` con ratio, dimensiones y loading;
- `FloatingSurface` y posicionamiento compartido.

### 7.4 Reglas específicas de la experiencia

- **Topbar:** 56–60 px, una única línea, nombre de libro truncado, estado de guardado silencioso y claro. Publicar solo cuando esté disponible.
- **Árbol:** filas de 36–40 px escritorio / 44 px tacto; selección azul suave; acción `…` persistente en activo/touch; creación en cabecera o pie, no duplicada.
- **Lienzo:** fondo neutro con trama casi imperceptible; widget sin marco en reposo; hover tenue solo cuando ningún widget está en edición; selección azul, edición con el mismo acento más una etiqueta/estado, no solo otro color.
- **Inspector:** cabecera compacta, propiedades en filas alineadas, disclosure progresivo, sticky solo si no tapa foco.
- **Menús:** máximo una superficie principal y un subpopover; ítems 36/44 px; atajos alineados; funciones futuras fuera del menú, no disabled decorativo.
- **Modales:** cabecera/título/acción consistentes; Escape, trap y retorno de foco; sheet en móvil.
- **Feedback:** cambio optimista local, guardando discreto, error persistente con reintento; toast con deshacer tras borrado.

## 8. Mejoras priorizadas por impacto y esfuerzo

|   # | Mejora                                                           |    Impacto |   Esfuerzo | Prioridad |
| --: | ---------------------------------------------------------------- | ---------: | ---------: | --------: |
|   1 | Consolidar tokens y eliminar conflicto visual histórico/canónico |   Muy alto |       Alto |        P0 |
|   2 | Crear primitivas Button/Menu/Popover/Dialog/Sheet/Tabs           |   Muy alto |       Alto |        P0 |
|   3 | Corregir foco modal y navegación de menús/tabs                   |   Muy alto | Medio-alto |        P0 |
|   4 | Unificar tipografía y elevar tamaños mínimos                     |       Alto |      Medio |        P0 |
|   5 | Aumentar hit areas, especialmente tacto y resize                 |       Alto |      Medio |        P0 |
|   6 | Unificar estado de guardado con `aria-live` y reintento          |       Alto |       Bajo |        P1 |
|   7 | Definir sistema explícito canvas/object/tool en UI y foco        |       Alto |      Medio |        P1 |
|   8 | Convertir paneles móviles en sheets accesibles                   |       Alto |      Medio |        P1 |
|   9 | Añadir alternativas completas a drag/resize y skip link          |       Alto |       Alto |        P1 |
|  10 | Extraer regiones de `App.tsx` y `RichTextEditor.tsx`             | Medio-alto |       Alto |        P1 |
|  11 | Normalizar loading/error/empty/disabled                          |      Medio |      Medio |        P2 |
|  12 | Aplicar estrategia de imágenes y evitar CLS                      |      Medio |      Medio |        P2 |
|  13 | Retirar metadata técnica de producción                           |      Medio |       Bajo |        P2 |
|  14 | Añadir pruebas visuales, Axe, WebKit y breakpoints               |   Muy alto |      Medio |        P1 |
|  15 | Preparar tema oscuro semántico sin publicarlo aún                |       Bajo |      Medio |        P3 |

## 9. Plan de implementación por fases

### Fase 0 — Baseline y protección de regresiones

- Capturar screenshots de login, biblioteca, editor vacío/poblado, selección, edición, menús, inspector, recursos, diagrama y estudio.
- Matriz: 320, 375, 414, 768, 1024 y 1440 px; Chrome y WebKit.
- Añadir Axe smoke tests, recorrido solo teclado y mediciones de contraste.
- Congelar flujos funcionales actuales con E2E antes de mover componentes.

**Salida:** baseline aprobada y lista de excepciones conocidas.

### Fase 1 — Fundamentos visuales

- Definir tokens semánticos únicos de color, tipo, espacio, radio, sombra, movimiento y z-index.
- Cambiar a stack Apple-first y escala tipográfica propuesta.
- Migrar `body`, topbar, paneles y estados comunes; no tocar aún interacción del editor.
- Sustituir colores directos por tokens por familias, no con una reescritura global ciega.

**Salida:** shell coherente y sin cambio de funcionalidad.

### Fase 2 — Primitivas accesibles

- Implementar Button/IconButton, campos, Tabs, Status y feedback.
- Implementar Menu/Popover/Dialog/Sheet con portal, colisión, foco, Escape y retorno.
- Migrar árbol, catálogo, menú de texto, enlace, recursos y diagrama uno por uno.

**Salida:** interacción flotante consistente y accesible.

### Fase 3 — Editor y estados de interacción

- Formalizar visualmente canvas/object/tool con una única fuente de estado.
- Ajustar hover, selección, edición, multiselección y bloqueo.
- Mejorar hit areas, toolbars y asas; añadir resize por teclado/inspector.
- Incorporar zoom/pan/encajar antes de profundizar autoría móvil.

**Salida:** editor predecible, preciso y con menor interferencia entre capas.

### Fase 4 — Responsive y tacto

- Convertir laterales en sheets modales bajo breakpoint.
- Modo móvil centrado en contenido; colocación espacial explícita.
- Safe areas, teclado virtual, `dvh`, touch targets y gestos con alternativa.
- Revalidar tablas, imágenes y menús en viewport estrecho.

**Salida:** uso móvil viable sin intentar replicar exactamente el escritorio.

### Fase 5 — Pulido y rendimiento

- Unificar imágenes, skeletons, estados vacíos, errores y toasts con deshacer.
- Reducir CSS histórico, eliminar selectores huérfanos y dividir estilos por capa.
- Revisar bundle, CLS, latencia de entrada y reflows durante drag/resize.
- Documentar Storybook o una página interna de componentes si el producto continúa creciendo.

**Salida:** sistema mantenible con QA automatizado.

## 10. Riesgos de regresión

| Riesgo                                | Causa probable                         | Mitigación                                                      |
| ------------------------------------- | -------------------------------------- | --------------------------------------------------------------- |
| Pérdida de selección o foco           | Migrar menús/modales a portal          | Tests de apertura, cierre, Escape y retorno al disparador.      |
| Coordenadas incorrectas               | Cambiar contenedores, padding o escala | Tests de drag/resize en zoom 100/125/200% y con scroll.         |
| Menús mal posicionados                | Nueva superficie flotante              | Pruebas en bordes, scroll y viewport móvil.                     |
| Altura de rich text alterada          | Cambio tipográfico/line-height         | Fixtures con texto, tablas e imágenes en auto/fixed height.     |
| Autoguardado excesivo                 | Refactor de inputs/controlados         | Contar PATCH, debounce y estados durante edición continua.      |
| Historial roto                        | Separar estado UI/documento            | E2E de undo/redo para texto, frame, insertar, borrar y agrupar. |
| Tree drag-and-drop roto               | Aumentar filas/hit areas               | Tests before/inside/after, ciclos y alternativa por menú.       |
| Ocultación bajo drawers               | Nuevos sheets/z-index                  | Test de foco, scroll lock y backdrop.                           |
| Contraste insuficiente                | Ajustes de tokens/disabled             | Test automático más verificación manual de estados.             |
| Safari/contenteditable                | Cambios en editor y portales           | Suite WebKit dedicada a selección, enlaces, tablas e imágenes.  |
| Excalidraw contaminado por CSS global | Normalización de botones/campos        | Encapsular reset y smoke test del modal completo.               |

## 11. Verificaciones obligatorias antes de cerrar cada fase

### Visual

- screenshots comparables en 320/375/414/768/1024/1440;
- zoom de navegador 200% sin pérdida de acción o contenido;
- textos reales largos, traducciones y estados vacíos/error/loading;
- contraste de texto normal ≥ 4.5:1 y componentes/foco ≥ 3:1;
- ninguna barra horizontal salvo superficies que la requieran explícitamente.

### Interacción

- click, doble click, right click, drag, resize y selección de texto no compiten;
- Escape retrocede un nivel; Enter activa; flechas navegan menús/tabs;
- Delete no actúa dentro de un campo editable;
- menús no se recortan y restauran foco;
- guardado, error y deshacer son perceptibles y fiables.

### Accesibilidad

- recorrido completo solo con teclado;
- VoiceOver + Safari y NVDA + Chrome;
- Axe sin violaciones críticas/serias;
- targets táctiles de 44 px en `pointer: coarse`;
- `prefers-reduced-motion` y foco no oculto por topbar/toolbars;
- lectura semántica de modo Estudiar independiente de coordenadas.

### Técnica

- `npm run check` y E2E Desktop Chrome/Pixel 7/WebKit;
- visual regression de las pantallas inventariadas;
- medición de bundle, CLS e interacción durante drag/resize;
- confirmar que ningún cambio visual modifica contratos API, modelo de datos o lógica de negocio.

## 12. Decisión recomendada

No conviene comenzar por retocar componentes aislados. La secuencia de mayor retorno es:

1. aprobar tokens, tipografía y densidad;
2. aprobar las primitivas accesibles de superficies flotantes y controles;
3. migrar shell y navegación;
4. migrar el editor preservando su comportamiento mediante pruebas;
5. completar responsive/táctil y pulido.

Así se obtiene una experiencia más cercana a Apple por coherencia y precisión —no por añadir efectos— y se evita volver a entrar en un ciclo de correcciones locales de menús, focos, bordes y tamaños.
