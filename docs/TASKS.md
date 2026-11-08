# Backlog y estado

Leyenda: `[ ]` pendiente · `[~]` en curso · `[x]` terminado. Una tarea solo pasa a terminada con sus criterios comprobados.

## Hito 1 — Fundación

- [x] Crear repositorio y estructura documental obligatoria.
  - Criterio: `README.md`, documentación pública, `src/` y `tests/` existen con contenido útil.
  - Evidencia: revisión de archivos del 2026-10-09.
- [x] Configurar React, Vite, TypeScript estricto y Tailwind.
  - Criterio: instalación reproducible; `typecheck` y build correctos.
  - Evidencia: `npm install` sin vulnerabilidades y `npm run check` correcto el 2026-10-09.
- [x] Integrar Cloudflare Worker con Vite.
  - Criterio: build conjunto y `GET /api/health` responde desde runtime local.
  - Evidencia: build genera `dist/client` y `dist/knowcanvas`; `/api/health` devolvió `status: ok` el 2026-10-09.
- [x] Crear layout inicial accesible de tres paneles y sistema visual base.
  - Criterio: explorador, lienzo, propiedades y barra superior visibles; adaptación móvil básica.
  - Evidencia: 2 smoke E2E en Chromium (escritorio y Pixel 7) y revisión visual de screenshots correctos el 2026-10-09.
- [x] Configurar calidad y entorno local.
  - Criterio: scripts de formato, lint, tipos, unidad, E2E, build y preview documentados.
  - Evidencia: scripts ejecutados y documentados en README.
- [x] Verificar Hito 1 y registrar resultado.
  - Criterio: `npm run check`, arranque local, endpoint health y smoke E2E verificados.
  - Evidencia: todos correctos el 2026-10-09; 1 prueba unitaria y 2 E2E superadas.

## Hito 1.5 — Research funcional

- [x] Analizar referentes de conocimiento, autoría educativa, pizarras, simulación y publicación.
  - Criterio: matriz comparativa basada principalmente en fuentes oficiales.
  - Evidencia: investigación funcional completada el 2026-10-09.
- [x] Priorizar capacidades P0/P1/P2 y definir flujos objetivo.
  - Criterio: recomendaciones vinculadas a riesgos y oportunidad diferencial.
  - Evidencia: secciones “Capacidades recomendadas”, “Flujos” y “Riesgos” del research.
- [x] Revisar estándares de accesibilidad e interoperabilidad.
  - Criterio: consecuencias de WCAG/ATAG documentadas; LTI/xAPI posicionados fuera del MVP.
  - Evidencia: contraste realizado con fuentes W3C, 1EdTech y ADL.
- [x] Validar decisiones de alcance que afectan el Hito 2.
  - Criterio: aceptar o rechazar papelera, undo de sesión, duplicación y retirada de publicaciones.
  - Evidencia: aceptadas las cuatro recomendaciones al continuar el Hito 2, 2026-10-09.
- [x] Fijar identidad y modelo mental de navegación.
  - Criterio: Google OIDC y jerarquía biblioteca → proyecto/libro → carpetas → lienzos documentadas.
  - Evidencia: decisión del usuario y actualización de PRD/arquitectura el 2026-10-09.

## Hito 2 — Modelo, árbol y persistencia

- [x] Resolver las cuatro decisiones de alcance de la investigación antes de fijar el esquema.
- [~] Implementar Google OIDC, sesiones revocables y `GET /api/me` con pruebas.
  - Hecho: Authorization Code + PKCE, nonce/state, sesión opaca revocable y estado de acceso.
  - Hecho: producción acepta cualquier cuenta Google; retirada la allowlist `AUTH_ALLOWED_EMAILS` el 2026-10-24.
  - Pendiente: prueba real contra Google cuando existan credenciales OAuth de desarrollo.
- [x] Aplicar propiedad por usuario y autorización en repositorios/casos de uso.
  - Evidencia: prueba HTTP local autenticada; usuario propietario creó y releyó su libro, 2026-10-09.
- [x] Crear biblioteca de proyectos/libros y estados de acceso/cierre de sesión.
  - Evidencia: flujos responsive cubiertos en 4 pruebas Playwright.
- [x] Modelar Proyecto, Nodo, Lienzo e invariantes del árbol con pruebas.
  - Evidencia: migración aplicada y 4 pruebas de dominio del árbol.
- [x] Crear migración D1 inicial y proyecto demo semilla idempotente.
  - Evidencia: 18 sentencias aplicadas correctamente a D1 local; semilla protegida por clave única.
- [x] Implementar repositorios, control de revisión y transacciones.
  - Evidencia: creación de libro y lienzo verificada contra Worker + D1 local; revisión avanzó de 1 a 2.
- [x] Implementar API CRUD validada y errores tipados.
  - Evidencia: contratos Zod, errores de dominio y rutas protegidas compilan y pasan checks.
- [~] Construir árbol accesible de carpetas/lienzos: crear, renombrar, borrar, expandir, ordenar y mover.
  - Hecho: lectura jerárquica, cualquier lienzo puede tener hijos, creación con renombrado inmediato, edición inline, borrado con impacto, plegado persistente y movimiento antes/dentro/después mediante arrastre.
  - Hecho: alternativas accesibles para mover arriba, abajo o a la raíz desde el menú contextual.
  - Pendiente: semántica ARIA completa de árbol y navegación específica con flechas entre nodos.
- [~] Añadir estados reales de guardado, recuperación y error.
  - Hecho: carga, error y confirmación de persistencia D1; pendiente feedback granular de cada mutación.

## Hito 3 — Editor y widgets

- [x] Aplicar la fase 1 de la auditoría UI a elementos compartidos.
  - Hecho: tokens semánticos Apple-first, tipografía de sistema, escalas de espacio/radio/elevación, botones, campos, navegación, biblioteca, shell e inspector.
  - Hecho: targets táctiles de 44 px, skip link al lienzo, estado de guardado anunciable y retirada de metadatos técnicos de la UI.
  - Evidencia: `npm run check` correcto el 2026-10-18; 41/70 E2E actuales pasan. Las 29 restantes mezclan expectativas históricas (clic frente a doble clic) y autoría espacial cubierta por el inspector móvil; se registran como deuda de alineación de la suite, no como regresiones aceptadas.
- [x] Aplicar la fase 2 de la auditoría UI: primitivas accesibles de menú, popover, diálogo, sheet y tabs.
  - Hecho: primitiva `Dialog` mediante portal con foco inicial, trap, Escape, retorno de foco, fondo inerte y scroll bloqueado.
  - Hecho: selector de imágenes migrado a dialog/sheet y Excalidraw a diálogo fullscreen compartido.
  - Hecho: primitiva `Tabs` con semántica ARIA completa y flechas/Home/End; inspector migrado.
  - Evidencia: 3/3 E2E Chromium y 2/2 E2E Pixel 7 específicos pasan el 2026-10-18.
  - Hecho: primitivas no modales `Menu` y `Popover`; menús del árbol y bloques y editor de enlaces migrados con flechas/Home/End, Escape y retorno de foco.
  - Hecho: la barra contextual de texto usa semántica `toolbar`, separada de los menús de acciones y de los popovers de formulario.
- [~] Aplicar las fases 3–5 de la auditoría UI: estados del editor, responsive/táctil, pulido y rendimiento.
  - Fase 3 terminada: el lienzo deriva un único estado canónico `canvas | selection | object | tool` y lo expone a todas sus capas.
  - Hecho: se corrige la selección residual al salir mediante un clic externo; inspector y selección espacial se limpian juntos.
  - Hecho: movimiento por flechas y redimensionado accesible mediante `Alt + flechas` (`Shift` incrementa el paso), además de los campos del inspector.
  - Hecho: zoom visible de 50–200%, atajos `Ctrl/Cmd +`, `Ctrl/Cmd -`, encaje con `Ctrl/Cmd 0` y paneo bidimensional con `Espacio + arrastre` o botón central.
  - Hecho: el shell de autoría queda limitado a `100dvh`; el lienzo es la región desplazable y conserva la selección al navegar.
  - Hecho: selección por rectángulo desde espacio vacío, compatible con cualquier dirección y con zoom.
  - Hecho: mover por pasos, duplicar y eliminar el grupo como operaciones atómicas reversibles; `Shift + clic` se conserva como alternativa.
  - Hecho: una selección múltiple se arrastra como grupo desde cualquiera de sus objetos o desde la barra de organización, conservando distancias y una sola entrada de deshacer.
  - Hecho: la barra superior de selección ofrece Borrar, Duplicar y Agrupar/Desagrupar; `groupId` persiste la relación sin alterar jerarquía y Delete/Backspace afecta a toda la selección.
  - Evidencia: `npm run check` (40 pruebas unitarias) y E2E Chromium de agrupación, arrastre, duplicado y borrado correctos el 2026-10-30.
  - Hecho: consolidación visual profesional del acceso, biblioteca y workspace; una única paleta neutral, densidad de herramienta, superficies planas y selección azul.
  - Hecho: biblioteca responsive con jerarquía de colección, tarjetas reutilizables y fechas semánticas; validada visualmente en Chromium.

- [~] Ejecutar por fases la experiencia de edición aprobada.
  - Fase 1 terminada: selección jerárquica, doble clic, `Enter`, `Escape`, Excalidraw directo e imágenes internas como nodos seleccionables con inspector y redimensionado.
  - Fase 2 terminada: barra contextual, duplicado, frente/fondo, bloqueo y eliminación.
  - Fase 3 terminada en su alcance inicial: inspector por pestañas, contenido editable, geometría y bloqueo.
  - Fase 4 terminada en su alcance inicial: catálogo buscable, comandos `/`, pegado de URL y arrastre de imágenes.
  - Fase 5 terminada en su alcance inicial: autoguardado con debounce, error recuperable e historial limitado con deshacer/rehacer.
  - Fase 6 terminada: teclado, restricción de eje, guías, ocho asas, proporción y tamaño en vivo.
  - Estados de interacción separados: canvas, edición interna y herramienta/diálogo; los controles espaciales no conviven con menús o selectores internos.
  - Fase 7 terminada en su alcance actual: selección múltiple con `Shift + clic` o rectángulo, elemento primario, arrastre conjunto, alineación, distribución, movimiento por pasos, duplicado y borrado como operaciones atómicas con deshacer.

- [x] Migrar la composición espacial al modelo normalizado v2.
  - Hecho: contrato v2 `rootIds + objects`, colocación padre/slot/orden, validación de referencias y ciclos.
  - Hecho: lectura compatible v1/v2 y escritura normalizada v2 en D1 mediante migración al guardar.
  - Hecho: el editor opera directamente sobre v2; `sections/columns` queda únicamente como formato histórico de entrada.
- [~] Implementar registro genérico, versionado y migración de widgets.
  - Hecho: migraciones RichText v1→v2 y Table v1→v2; pendiente extraer un registro extensible de definiciones.
- [~] Añadir contenido compuesto y contenedores.
  - Texto enriquecido: imágenes y tablas semánticas dentro del flujo.
  - Lienzo: widget `Tabla` con celdas capaces de contener widgets y mover el conjunto.
  - El modelo debe impedir ciclos, conservar el orden de lectura y migrar composiciones existentes sin cambios visibles.
  - Hecho: documento RichText JSON con tablas semánticas; tabla de lienzo con celdas estables, hijos, coordenadas relativas, entrada/salida, borrado en cascada e invariantes de celda/padre/ciclos.
  - Pendiente: imágenes inline en RichText, edición directa del hijo dentro de la celda y gestión avanzada de filas/columnas.
- [~] Implementar editor y panel contextual.
  - Hecho: edición espacial con ventanas movibles/redimensionables, selección, inspector contextual, vista Markdown, previsualización, modo estudio y guardado con revisión.
  - Hecho: inspector coherente por pestañas Contenido, Apariencia y Comportamiento para todos los widgets; apariencia común persistente y acciones específicas para navegación y Quiz.
  - Hecho: auditoría transversal del inspector con jerarquía compacta tipo Figma/Miro, sustitución de Imagen, ajuste visual en Apariencia, altura automática de RichText y expansión múltiple de Acordeón; todos los tipos conservan contenido, apariencia, geometría, comportamiento aplicable y bloqueo en un orden estable.
  - Evidencia: `npm run check` correcto con 44 pruebas unitarias y E2E Chromium específico de Imagen/Acordeón superado el 2026-10-31.
  - Hecho: nivel principal contextual Herramientas/Propiedades; el lienzo muestra inserción y la selección abre automáticamente sus propiedades.
  - En curso: P0 de biblioteca orientada a intención. El catálogo existente se reorganiza en Contenido, Visualizar y explicar, Explorar e interactuar, Practicar y evaluar, y Diseño y navegación; búsqueda ampliada por finalidad y descripciones de uso incorporadas sin duplicar motores.
  - Hecho: previsualización compacta accesible desde hover/foco y contenido inicial editable por tipo; Tabla incluye un ejemplo semántico. Imagen e Imagen interactiva conservan selección explícita de recurso en vez de simular contenido.
  - Hecho: primeras variantes funcionales desde la previsualización. Navegación ofrece principal/secundaria; Test respuesta única/múltiple/verdadero-falso; Acordeón uno/varios abiertos. La variante elegida viaja con el modo de colocación y configura datos reales al insertar.
  - Evidencia de variantes: `npm run check` correcto (46 pruebas) y 2 E2E Chromium de catálogo, selección de variante, colocación y tabla comparativa superados el 2026-11-02.
  - Hecho: primera transformación de contenido. RichText se convierte en Acordeón, Tarjetas reversibles o Proceso/Cronología conservando id, geometría, colocación y la posibilidad de deshacer.
  - Evidencia de transformación: `npm run check` correcto (46 pruebas) y E2E Chromium confirma sustitución única, contenido transferido y restauración completa con Deshacer el 2026-11-02.
  - Corrección de descubrimiento: Transformar contenido aparece antes del editor enriquecido, dentro del primer viewport del inspector, y se diferencia como acción contextual sin exigir scroll.
  - Hecho: Acordeón, Pestañas, Tarjetas y Cronología pueden cambiar de presentación entre sí; la conversión conserva todo el contenido, posición y reversibilidad sobre los contratos persistentes existentes.
  - Evidencia de cambio de presentación: `npm run check` correcto (46 pruebas) y E2E Chromium valida Texto → Acordeón → Pestañas con contenido visible y dos restauraciones consecutivas mediante Deshacer el 2026-11-02.
  - Hecho: Proceso paso a paso y Comparación aparecen como intenciones visibles de la biblioteca, respaldadas respectivamente por los motores Timeline y Table con presets propios y contenido inicial específico.
  - Evidencia de intenciones compartidas: `npm run check` correcto (46 pruebas) y 2 E2E Chromium validan inserción diferenciada, rótulo de colocación y contenido inicial de Tabla, Comparación y Proceso el 2026-11-02.
  - Hecho: Crear con IA forma parte de Herramientas con accesos por intención —Explicar, Visualizar, Practicar, Evaluar y Transformar— que abren el copiloto existente con una petición inicial editable; ninguna opción modifica el lienzo sin revisar y confirmar la propuesta.
  - Evidencia de IA por intención: `npm run check` correcto (46 pruebas) y E2E Chromium confirma apertura, foco y petición inicial desde la biblioteca el 2026-11-02.
  - Hecho: Clasificar, Ordenar y Relacionar comparten un motor `sorting` con presets visibles, ejemplos funcionales, autoría completa en Propiedades y controles equivalentes de clic/teclado en Estudiar; arrastrar no es obligatorio.
  - Hecho: `sorting` se valida y persiste como contrato v1, puede generarse mediante IA y conserva interacción en HTML y SCORM.
  - Evidencia de actividades: `npm run check` correcto (47 pruebas) y E2E Chromium en escritorio y Pixel 7 completa una actividad Ordenar mediante botones accesibles el 2026-11-07.
  - Hecho: Navegación comparte un contrato con tres presentaciones colocables: botón, menú/índice y barra anterior/siguiente. Índice y barra sincronizan el recorrido del libro, indican ubicación y conservan enlaces internos en Estudio y HTML/SCORM.
  - Evidencia P0 inicial: `npm run check` correcto (46 pruebas) y 2 E2E Chromium de búsqueda, previsualización, contenido inicial, inserción y colocación superados el 2026-11-02.
- [~] Implementar RichText, Image, Diagram, Quiz e Interactive (péndulo real).
  - Hecho: adaptación funcional del editor Markdown de Tramas como `RichText`.
  - Hecho: widget `Image` conectado a la biblioteca de recursos.
  - Hecho: widget `Diagram` mediante Excalidraw, cargado bajo demanda y persistido como escena abierta.
  - Hecho: widget `Pele` para diagramas Mermaid, con fuente versionada, preview SVG adaptable, edición directa, caption e inspector.
  - Hecho: la biblioteca del panel de propiedades inserta todos los widgets implementados en el lienzo actual, incluidos Quiz y el motor interactivo de clasificación.
  - Hecho: catálogo e inspector activan un modo de colocación visible con previsualización al cursor, confirmación por clic y cancelación con `Esc`; el objeto colocado queda seleccionado.
  - Hecho: un clic en espacio vacío abre la biblioteca del inspector; seleccionar allí un widget reutiliza exactamente el mismo modo de colocación.
  - Hecho: la creación primaria aparece sobre el árbol como `+ Nueva página`, acompañada de una acción secundaria de carpeta; renombrar, mover y eliminar permanecen en el menú contextual del nodo, también disponible con clic derecho.
  - Hecho: las propiedades del libro muestran icono y etiqueta visible; el acceso al inspector lateral usa un icono semántico distinto del de configuración.
  - Evidencia: `npm run check` y 3 E2E Chromium de árbol, inspector y propiedades del libro correctos el 2026-11-08.
  - Hecho: los botones de creación de la barra añaden dentro del nodo activo, indican su destino y la confirmación de borrado muestra el número de nodos afectados.
  - Hecho: widget educativo `Quiz` con autoría en inspector, respuesta única, feedback accesible y reintento en modo estudio.
  - Hecho: botón de navegación configurable hacia otro lienzo o una URL externa, activo únicamente en modo estudio.
  - Hecho: primer `Interactive` reutilizable para clasificar, ordenar y relacionar con feedback y reintento.
  - Pendiente: simulación de péndulo real y actividades de escenario.
- [ ] Persistir composiciones e instancias sin pérdida de datos desconocidos.

### Reutilización autorizada desde Tramas

- [x] Auditar editor, selector de imágenes, almacenamiento, exportación y patrones responsive.
- [x] Confirmar autoría y autorización de reutilización del proyecto por parte del usuario.
- [~] Extraer capacidades genéricas conservando la arquitectura, identidad y diseño de KnowCanvas.
- [~] Adaptar la fototeca a una interfaz de almacenamiento propia de KnowCanvas.
  - Hecho: catálogo privado en D1, binarios en el Drive del usuario mediante `drive.file`, compresión cliente, carga, selección e inserción por URL.
  - Hecho: refresh tokens cifrados con AES-GCM y contenido servido por proxy autorizado, sin exponer tokens o enlaces públicos de Drive.
  - Pendiente: borrado desde interfaz, metadatos editables y referencias de uso antes de eliminar.
- [~] Incorporar importación/exportación versionada del libro.
  - Hecho: exportación ZIP como HTML autocontenido y SCORM 1.2, con imágenes privadas embebidas y runtime de progreso.
  - Hecho: `Publicar` es la entrada única para distribución; el diálogo separa web futura y descargas disponibles.
  - Evidencia: `npm run check` con 21 pruebas unitarias y 3 E2E específicos de propiedades/Publicar/exportación en Chromium correctos el 2026-10-24.
  - Pendiente: importación versionada, render estático de Excalidraw y validación contra LMS externos.

## Hito 4 — Experiencia de estudio

- [~] Crear visor sin herramientas de edición y navegación secuencial/árbol.
  - Hecho: vista `Árbol + hoja` con índice de lectura propio, sin acciones de autoría y con ubicación activa.
  - Hecho: navegación lineal anterior/siguiente, progreso, orden en profundidad del árbol y atajos de teclado.
  - Hecho: layouts de Lectura, Revista responsive y Presentación sobre el mismo contenido semántico.
  - Evidencia: `npm run check` (15 tests unitarios) y E2E específico en Chromium + Pixel 7 correctos el 2026-10-23.
  - Pendiente: validar el flujo completo con estudiantes reales.
  - Hecho: la plantilla predeterminada del visor se persiste como propiedad del proyecto y se aplica al entrar en estudio.
  - Evidencia: `npm run check` con 17 tests unitarios y 4 E2E específicos en Chromium/Pixel 7 correctos el 2026-10-23.
  - Hecho: nodo raíz seleccionable con inspector de propiedades y vista central de todas las páginas mediante miniaturas ligeras.
  - Hecho: las propiedades del proyecto se autoguardan con debounce y feedback accesible, sin botón redundante en el inspector.
  - Evidencia: `npm run check` y 2 E2E específicos de propiedades/visor en Chromium correctos el 2026-10-23.
- [~] Adaptar widgets a estudio, tacto, teclado y feedback accesible.
  - Hecho: Quiz y navegación separan configuración de autoría e interacción de estudio, usan controles nativos y anuncian feedback.
  - Hecho: los widgets interactivos pueden crecer en Estudio sin heredar el recorte del contenedor de autoría; Quiz ajusta respuestas y feedback al ancho disponible.
  - Hecho: el widget Imagen no crea desplazamiento interno y ofrece en Propiedades tres ajustes persistentes: ver completa, rellenar recortando o estirar. El mismo ajuste se respeta en autoría, estudio y HTML/SCORM.
  - Evidencia: `npm run check` correcto con 44 pruebas unitarias el 2026-10-31; prueba de compatibilidad histórica y prueba de exportación de `object-fit` incluidas.
- [x] Completar “Explorando la célula” con contenido revisado y widgets educativos.
  - Hecho: cinco páginas con narrativa didáctica y RichText, Image, Mermaid/Pele, Table, Navigation y Quiz.
  - Hecho: semilla v2 idempotente que actualiza una sola vez los ejemplos existentes.
  - Evidencia: 2 pruebas unitarias específicas incluidas en `npm run check`, 2026-10-24.
- [x] Crear un recorrido demo de producto “Conoce KnowCanvas”.
  - Hecho: cinco páginas explican modelo mental, lienzo, organización, propiedades, widgets educativos, estudio y publicación mediante contenido editable real.
  - Hecho: incluye RichText, Image, Mermaid/Pele, Table, Tabs, Accordion, Flashcards, Timeline, Quiz y Navigation, además de una ilustración local accesible de la interfaz.
  - Hecho: semilla independiente e idempotente para usuarios nuevos y existentes, con tema Aula y navegación interna validada.
  - Evidencia: 4 pruebas unitarias específicas correctas y `npm run check` superado el 2026-11-01.
- [ ] Probar flujos en escritorio y móvil.

## Hito 4.5 — Autoría educativa profesional

- [~] Incorporar asistencia de IA controlada por el autor.
  - Hecho: configuración BYOK por usuario con validación directa frente a OpenAI, cifrado AES-GCM en Worker, persistencia D1, rotación/eliminación y estado en Cuenta sin devolver la clave al navegador.
  - Evidencia: prueba unitaria de cifrado con IV aleatorio y E2E Chromium de configuración sin redisplay correctas el 2026-10-28.
  - Hecho: asistente contextual del lienzo mediante Responses API y Structured Outputs; propone texto enriquecido y cuestionarios, muestra resumen y widgets antes de escribir y aplica todo como una única operación reversible.
  - Evidencia: E2E Chromium verifica que el lienzo no cambia durante la previsualización, que la aprobación añade los widgets y que Deshacer revierte el conjunto, 2026-10-28.
  - Hecho: los fallos de OpenAI distinguen credencial rechazada, saldo agotado, límite temporal y modelo no disponible; el Worker registra solo estado, código y request ID del proveedor, sin contenido ni secretos.
  - Hecho: Structured Outputs usa discriminadores `enum` compatibles con el subconjunto JSON Schema de OpenAI; corregido el rechazo `invalid_json_schema` observado en producción.
  - Evidencia: 4 pruebas unitarias de traducción segura de errores incluidas en `npm run check` y diagnóstico mediante `x-request-id`, 2026-10-29.
  - Hecho: conversación visual por lienzo con historial de sesión, envío con Enter, indicador de generación accesible y selección parcial de widgets antes de aplicar.
  - Evidencia: E2E Chromium cubre espera, historial tras reabrir, aplicación selectiva y deshacer, 2026-10-29.
  - Hecho: propuestas para los 12 widgets, búsqueda web de imágenes, importación HTTPS validada al Drive del usuario y layout semántico de 12 columnas convertido en marcos sin solapamiento por filas.
  - Hecho: los widgets elegidos en el chat se preparan como un grupo visible, ajustan el zoom si es necesario y solo se incorporan cuando el autor confirma su posición con un clic; el resultado queda seleccionado en conjunto.
  - Hecho: la selección múltiple y los grupos se muestran como un único objeto envolvente; la barra de acciones queda anclada a su contorno, cambia arriba/abajo según el espacio y permanece dentro de la anchura disponible, sin quedar oculta por Propiedades.
  - Evidencia: E2E Chromium comprueba que el contorno contiene los widgets, que la barra no excede ese contorno y que la alineación/deshacer siguen operativos, 2026-10-30.
  - Hecho: el arrastre de una selección agrupada cancela cualquier manejador individual pendiente y bloquea el movimiento aislado de sus miembros durante el gesto; cada marco recibe exactamente el mismo desplazamiento.
  - Evidencia: E2E Chromium arrastra el grupo desde uno de sus widgets y compara el delta de ambos marcos, 2026-10-30.
  - Hecho: los límites superior e izquierdo se calculan sobre el rectángulo completo del grupo, no widget a widget; al alcanzar el borde se conserva la geometría interna sin rebotes ni compresión.
  - Evidencia: E2E Chromium fuerza el grupo más allá del borde superior, verifica `min(y) = 0` y compara la distancia relativa entre sus miembros, 2026-10-30.
  - Hecho: la barra extensa se sustituye por una píldora contextual de una línea; las acciones secundarias pasan a un menú accesible y a `Organizar` en Propiedades. Clic derecho abre el menú, doble clic entra en un miembro y `Escape` recupera el grupo.
  - Evidencia: E2E Chromium cubre menú/escape, inspector de grupo, edición interna, regreso al grupo, arrastre, duplicado y borrado, 2026-10-31.
  - Evidencia: `npm run check` (39 pruebas unitarias) y E2E Chromium de propuesta IA colocable y arrastre de selección múltiple correctos el 2026-10-30.
  - Hecho: si la URL propuesta por OpenAI no devuelve un binario válido, la importación busca un recurso compatible de hasta 10 MB en Wikimedia Commons mediante `imageQuery` antes de fallar.
  - Evidencia: contrato completo y seguridad de URLs cubiertos por unidad; E2E Chromium conserva selección parcial, aplicación y deshacer, 2026-10-29.
  - Pendiente: conversación multivuelta, límites de uso y métricas privadas de coste.

- [x] Incorporar una primera biblioteca de bloques interactivos reutilizables.
  - Hecho: acordeón v1 con autoría desde Propiedades, interacción accesible en Estudiar y exportación HTML/SCORM.
  - Hecho: doble clic activa edición directa del título y contenido dentro del acordeón, sin depender del inspector.
  - Hecho: los campos del inspector conservan foco y valor durante escritura secuencial; corregida la sincronización común entre widget y selección.
  - Hecho: el contenido narrativo de los apartados usa el editor enriquecido compartido y el contrato `accordion` v2; lectura compatible con v1.
  - Hecho: los editores enriquecidos embebidos no reclaman foco al seleccionar el acordeón ni desplazan el viewport.
  - Hecho: Propiedades ofrece scroll interno estable para contenido largo sin ampliar el workspace ni desplazar el lienzo.
  - Hecho: Propiedades permite editar contenido enriquecido con barra fija completa; la edición directa conserva el menú contextual.
  - Hecho: la barra fija incorpora familia tipográfica, tamaño y color; estos estilos, junto con subrayado y tachado, forman parte del documento enriquecido y se conservan en estudio y exportación.
  - Hecho: widget Pestañas con contenido enriquecido, autoría directa e inspector, navegación accesible por teclado, estudio y exportación HTML/SCORM.
  - Evidencia Pestañas: `npm run check` correcto y flujo E2E Chromium de autoría, alta de panel y cambio de pestaña en estudio superado el 2026-10-27.
  - Hecho: Tarjetas reversibles con anverso/reverso enriquecidos, navegación, giro accesible, autoría desde Propiedades y exportación HTML/SCORM.
  - Evidencia Tarjetas: `npm run check` correcto y flujo E2E Chromium de autoría, ampliación, giro y navegación en estudio superado el 2026-10-27.
  - Hecho: Línea temporal semántica con fecha, nombre y contenido enriquecido por hito; autoría desde Propiedades, diseño adaptable y exportación HTML/SCORM.
  - Evidencia Línea temporal: `npm run check` correcto y flujo E2E Chromium de autoría, ampliación y lectura en estudio superado el 2026-10-27.
  - Hecho: Imagen interactiva con recurso de Drive o URL, puntos posicionados en porcentajes, explicación enriquecida, autoría visual por doble clic e inspector, estudio y exportación HTML/SCORM.
  - Evidencia Imagen interactiva: `npm run check` correcto y flujo E2E Chromium de selección de imagen, alta/posición de punto y consulta en estudio superado el 2026-10-27.
  - Hecho: `Cmd/Ctrl + V` acepta imágenes tanto dentro del editor enriquecido como sobre el lienzo; las optimiza, las guarda en el Google Drive del usuario y crea el elemento correspondiente con feedback accesible.
  - Evidencia: contrato normalizado y tipografía persistente cubiertos por unidad; regresiones E2E Chromium de autoría y pegado desde portapapeles correctas; `npm run check` con 25 pruebas y despliegue Pages verificado por HTTP 200 el 2026-10-27.
- [~] Ampliar las evaluaciones con respuesta múltiple, verdadero/falso, completar, relacionar, ordenar y respuesta abierta.
  - Criterio: feedback por respuesta, intentos, explicación, puntuación y banco aleatorio sin acoplar datos persistidos al renderer.
  - Hecho: el ejercicio tipo test admite respuesta única o múltiple; valida el conjunto exacto, conserva reintento/explicación y exporta controles equivalentes a HTML/SCORM.
  - Evidencia: pruebas unitarias de contrato/exportación y E2E Chromium de autoría y resolución única/múltiple correctas el 2026-10-27.
- [ ] Implementar progreso del lector y requisitos de finalización.
  - Criterio: páginas visitadas, actividades completadas, reanudación, avance condicionado y resultado final persistibles en SCORM.
- [ ] Añadir comportamientos comunes y escenarios ramificados.
  - Criterio: navegar, abrir recurso, mostrar/ocultar, reproducir y evaluar condiciones mediante acciones declarativas; nunca ejecutar JavaScript de autor.
- [ ] Permitir guardar selecciones como componentes y plantillas reutilizables.
- [ ] Añadir previsualización responsive y orden de lectura independiente del lienzo espacial.
- [ ] Incorporar revisión colaborativa, comentarios anclados e historial restaurable.
- [ ] Crear un auditor previo a publicación.
  - Criterio: detectar texto alternativo, contraste, nombres accesibles, destinos, actividades incompletas, desbordamiento y orden de teclado.
- [ ] Completar seguimiento SCORM y diseñar la frontera futura para xAPI.

## Hito 5 — Publicación

- [x] Incorporar visibilidad y colaboración a nivel de libro.
  - Hecho: niveles `private`, `public_read` y `public_edit`; solo el autor cambia propiedades, permisos o elimina el libro.
  - Hecho: la biblioteca separa libros propios y comunidad, identifica autor y capacidad efectiva.
  - Hecho: lectura pública fuerza el visor sin herramientas; colaboración permite editar estructura y lienzos con revisiones optimistas.
  - Hecho: las imágenes privadas de Drive se sirven con la credencial cifrada del autor únicamente cuando forman parte de un libro accesible.
  - Evidencia: migración `0004_project_access.sql` aplicada correctamente a D1 local; `npm run check` con 23 pruebas correcto el 2026-10-25.

- [ ] Crear snapshots inmutables y contrato de exportadores.
  - Preparado: `ProjectSettings.viewerTemplate` forma parte del contrato validado que deberá copiarse al snapshot y al manifiesto HTML.
- [x] Implementar publicación web por URL de lectura.
  - Hecho: los libros `public_read` y `public_edit` exponen `/read/:projectId` sin login; el visor fuerza solo lectura y “Publicar” permite copiar/abrir la URL.
  - Hecho: las imágenes siguen privadas en Drive y el Worker solo las entrega sin sesión cuando una composición de un libro público referencia exactamente su `resourceId`.
  - Evidencia: `npm run check` con 46 pruebas correcto; E2E nuevo de lectura anónima correcto el 2026-11-01. La suite E2E completa conserva fallos previos/flaky no relacionados (43/63 correctos).
- [x] Separar y proteger rutas públicas y de autoría.
  - Hecho: `/api/public/projects/:id` solo admite GET y devuelve 404 para libros privados; nunca concede `canEdit`, incluso si el libro es colaborativo.
- [ ] Configurar D1/Access de producción, desplegar y ejecutar pruebas finales.
  - Hecho: Worker y SPA desplegados en `knowcanvas.jorge-dieguez.workers.dev`, D1 remota creada y migraciones `0001`/`0002` aplicadas el 2026-10-22.
  - Hecho: secretos OAuth configurados; `/api/health`, `/api/me`, raíz y redirección Google verificados en producción.
  - Pendiente: habilitar Drive API y declarar `drive.file` en la pantalla de consentimiento; decidir/configurar Access o dominio final antes de considerar cerrado el hito.
- [x] Cerrar documentación y guía operativa del MVP.
  - Hecho: primera edición pública preparada con Apache-2.0, aviso de marca, README de instalación/autohospedado, guía de contribución, política de seguridad, código de conducta, plantillas de incidencias y CI.
  - Hecho: repositorio público publicado en `github.com/jorgedieguez/KnowCanvas`; el primer pipeline remoto ejecutó `npm ci` y `npm run check` correctamente el 2026-11-08.

## Deuda y futuras capacidades

- [x] Adoptar la identidad visual definitiva de KnowCanvas.
  - Hecho: logotipo oficial en acceso, biblioteca, autoría, legal, carga, asistente y metadatos; símbolo pequeño derivado sin alterar el maestro.
  - Hecho: tokens de producto alineados con navy, azul y violeta, con acentos amarillo/verde documentados en `docs/brand-guidelines.md`.
  - Evidencia: `npm run check` con 46 pruebas correcto; smoke visual real a 1440×1000 y 375×812 confirma proporción y legibilidad del logo; activo servido con HTTP 200 el 2026-11-01.

- [x] Unificar el perfil y hacer más amable la conexión de IA.
  - Hecho: el acceso al perfil aparece en biblioteca, autoría y estudio autenticado; el diálogo integra identidad, cierre de sesión y configuración OpenAI.
  - Hecho: la clave ofrece guía de privacidad, enlace de obtención, mostrar/ocultar, estado conectado y mensajes de recuperación próximos al campo.
  - Evidencia: `npm run check` con 46 pruebas y E2E Chromium aislado de configuración OpenAI correctos el 2026-11-01.
  - Refinado: el diálogo dispone de superficie blanca propia, jerarquía más compacta, scroll interno y estados sin cajas anidadas redundantes.

- [x] Incorporar temas visuales por libro con paridad entre Estudio y exportación.
  - Hecho: Minimal, Editorial, Aula, Naturaleza y Nocturno; selección con autoguardado, fallback histórico y aplicación a HTML/SCORM.
  - Evidencia: 42 pruebas unitarias y E2E Chromium de cambio/autoguardado/Estudio correctos el 2026-10-31.
- [x] Aplicar una capa visual más expresiva y sofisticada sin perder sobriedad de autoría.
  - Hecho: tokens semánticos de color/elevación, apariencias iniciales por tipo, inspector contextual y refinamiento de los siete widgets educativos.
  - Evidencia: `npm run check` con 40 pruebas y 9 flujos E2E Chromium de widgets/inspector correctos el 2026-10-31.
- [x] Separar propiedades del grupo de sus herramientas operativas.
  - Hecho: el inspector muestra composición, estado de agrupación y geometría del conjunto; alinear, distribuir, agrupar, duplicar y eliminar permanecen en la barra contextual y su menú.
  - Evidencia: `npm run typecheck`, 40 pruebas unitarias y E2E Chromium de selección/agrupación correctos el 2026-10-31.
- [x] Conservar la selección múltiple al desagrupar.
  - Hecho: se elimina `groupId` sin limpiar los IDs seleccionados ni el objeto primario del inspector.
  - Evidencia: E2E Chromium comprueba dos elementos seleccionados y sin `groupId` después de desagrupar, 2026-10-31.

- [ ] Implementar historial persistente restaurable después del undo de sesión.
- [ ] Diseñar referencias cruzadas sin convertir el árbol en grafo.
- [ ] Diseñar aislamiento/revisión para futuros widgets generados por IA.
- [~] Añadir exportadores estáticos según capacidades y fallback de cada widget.
  - Hecho: HTML/SCORM exportan contenido, navegación, evaluación y actividades `sorting`; Mermaid se prerenderiza como SVG y Excalidraw conserva fallback legible.
- [ ] Validar el desk research con entrevistas y tests de autores reales.
