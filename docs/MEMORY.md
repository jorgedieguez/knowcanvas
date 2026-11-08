# Memoria persistente

- La identidad oficial usa `/public/brand/logo_knowcanvas_primary_20261101_horizontal.png`, paleta navy/azul/violeta con acentos amarillo/verde y el lema “Conocimiento que cobra vida”. La interfaz muestra la composición horizontal en cabeceras y recorta el símbolo desde el mismo maestro para usos pequeños, sin alterar el arte proporcionado.

## 2026-11-08 — Primera publicación de código abierto

- KnowCanvas se publica en `github.com/jorgedieguez/KnowCanvas` bajo Apache-2.0; el nombre, el logotipo y la identidad visual quedan reservados mediante `NOTICE`.
- La edición pública incluye README de autohospedado, contribución, seguridad privada mediante GitHub, código de conducta, plantillas de incidencias y CI para `npm run check` sobre Node 22.
- No se publican secretos locales ni credenciales. El primer workflow de GitHub Actions terminó correctamente sobre el commit inicial.

## 2026-11-08 — Navegación colocable y apertura del repositorio

- Navegación deja de significar únicamente “botón”. El mismo contrato admite botón, menú/índice y barra anterior/siguiente; las dos últimas conservan una lista ordenada y resincronizable de páginas para que el autor pueda colocarlas donde la composición las necesite.
- En autoría los enlaces son inertes. En Estudio y HTML/SCORM usan navegación semántica, página actual, foco visible y adaptación móvil; no se introduce un segundo sistema de navegación global.
- Se aprueba publicar KnowCanvas como código abierto bajo Apache License 2.0. El código puede reutilizarse y modificarse; el nombre, logotipo e identidad KnowCanvas quedan fuera de la concesión salvo atribución razonable.
- La edición pública incorpora README reproducible, contribución, seguridad, conducta, plantillas de incidencias y CI. Credenciales y datos personales deben permanecer fuera del repositorio.

## 2026-11-07 — Un motor accesible para Clasificar, Ordenar y Relacionar

- Las tres intenciones visibles comparten el contrato persistente `sorting` v1. El modo, los elementos, destinos y solución forman datos declarativos; el estado de respuesta del alumno no se guarda dentro del contenido.
- Ordenar usa botones subir/bajar y Clasificar/Relacionar usan selección de elemento seguida de destino. El gesto de arrastre puede añadirse como mejora, pero nunca será el único mecanismo por WCAG 2.2.
- El mismo contrato se interpreta en React y en el runtime limitado de HTML/SCORM. La IA puede proponerlo mediante el esquema cerrado y el cliente lo convierte a IDs internos antes de colocarlo.

## 2026-11-02 — Biblioteca orientada a intención pedagógica

- La biblioteca deja de organizarse por la distinción genérica Contenido/Visual/Educativo y adopta cinco intenciones estables: Contenido, Visualizar y explicar, Explorar e interactuar, Practicar y evaluar, y Diseño y navegación.
- Los tipos persistentes actuales no cambian. La taxonomía, las variantes futuras y la IA contextual son una capa de descubrimiento sobre motores reutilizables, no nuevos contratos por cada rótulo visible.
- El P0 comienza por búsqueda semántica, descripciones y ejemplos listos para usar. Transformaciones entre widgets, previsualizaciones ampliadas y nuevos motores permanecen como fases posteriores del mismo hito.
- Las primeras variantes reutilizan motores existentes y viajan como preset efímero durante la colocación; el lienzo persiste únicamente el contrato normal del widget resultante. No se añade `variant` al modelo cuando sus propiedades actuales ya expresan el resultado.
- La transformación inicial opera sobre RichText y reemplaza la instancia con el contrato normal de Acordeón, Flashcards o Timeline, conservando id, frame, bloqueo y apariencia. Los párrafos constituyen las unidades semánticas de partida y la mutación entra en el historial como una sola operación reversible.
- Las transformaciones se muestran antes del editor enriquecido en Propiedades. Colocarlas después de una superficie de edición alta las hacía técnicamente disponibles pero invisibles sin scroll, incumpliendo su función de descubrimiento.
- Acordeón, Tabs, Flashcards y Timeline comparten una normalización efímera a secciones para cambiar de presentación. No se persiste un modelo intermedio: el resultado vuelve a ser inmediatamente un widget válido del tipo elegido y conserva identidad y geometría.
- El catálogo separa intención visible y tipo persistente cuando aporta claridad: `Proceso paso a paso` inserta `timeline` con preset `process`; `Comparación` inserta `table` con preset `comparison`. El preset solo existe durante la colocación y el resultado queda expresado por datos válidos del motor compartido.
- Crear con IA se integra al principio de Herramientas mediante cinco intenciones que preparan una petición editable en el copiloto existente. La intención orienta la conversación, pero se conserva el flujo seguro de propuesta, selección y confirmación antes de alterar el lienzo.

## 2026-10-30 — Agrupación persistente sin contenedor ficticio

- `CanvasObject.groupId` relaciona objetos para selección, arrastre, duplicado y borrado conjuntos. No cambia `parentId`, `slotId`, orden de lectura ni la composición adaptable de Estudio.
- La barra superior de una selección múltiple prioriza Borrar, Duplicar y Agrupar/Desagrupar. Seleccionar un miembro de un grupo recupera todos sus miembros; la selección por rectángulo también expande grupos intersectados.
- Duplicar un grupo asigna una identidad de grupo nueva a las copias. `Delete` y `Backspace` eliminan toda la selección activa y Deshacer restaura la operación completa.

## 2026-10-30 — Las propuestas de IA entran como grupo colocable

- Elegir widgets en el chat no los fija inmediatamente: tras importar recursos se cierra el panel, aparece una previsualización fiel de la composición y el autor la coloca con un clic o cancela con `Escape`.
- El zoom se reduce, hasta el mínimo permitido del editor, cuando el grupo propuesto no cabe en el viewport. Tras colocarlo, todos sus objetos quedan seleccionados y la inserción completa forma una sola operación de deshacer.
- Una selección múltiple puede arrastrarse directamente desde cualquiera de sus objetos o mediante el asa de la barra del grupo. Los objetos bloqueados no se desplazan y existe la alternativa de movimiento por botones.

## 2026-10-29 — El visor permite crecimiento interactivo

- En modo Estudio, `widget-card` no debe heredar `overflow: hidden` de las tarjetas de autoría: tests, acordeones y pestañas pueden aumentar su altura tras una interacción y la hoja debe crecer con ellos.
- Las opciones del Quiz son contenedores relativos, encogen correctamente dentro de la rejilla y parten textos largos sin provocar recorte horizontal.

## 2026-10-26 — Hito de autoría educativa profesional

- El roadmap incorpora bloques interactivos, evaluaciones ampliadas, progreso, comportamientos declarativos, plantillas, responsive, revisión, auditor de publicación y seguimiento SCORM/xAPI.
- El primer patrón implementado es `accordion` v1: datos propios validados, hasta 20 apartados, autoría en el inspector, interacción exclusiva de Estudiar y salida nativa con `details/summary` en HTML/SCORM.
- El acordeón también respeta la convención del lienzo: selección con un clic y edición directa interna con doble clic. La vista de autoría sustituye cada apartado por controles editables y Estudiar conserva la interacción desplegable.
- Se corrige una regresión transversal del inspector: `updateWidgetRecord` y `updateFrame` intentaban derivar la selección desde dentro de un setter diferido, por lo que los campos controlados recibían de nuevo el objeto antiguo tras cada pulsación. Ahora calculan la siguiente instancia antes de mutar y actualizan lienzo y selección con la misma referencia.
- Se adopta una regla para widgets educativos: el contenido narrativo reutiliza `RichTextNode` y `RichTextEditor`; los rótulos estructurales breves permanecen como texto plano para conservar nombres accesibles y navegación predecible. `accordion` v2 migra automáticamente el cuerpo string de v1.
- `RichTextEditor` distingue montaje y autofocus. El editor principal conserva foco al entrar expresamente en edición; instancias embebidas en acordeones o Propiedades usan `autoFocus=false` para no robar el cursor ni desplazar el lienzo al seleccionar un widget.
- El inspector cierra explícitamente la cadena de altura del workspace (`min-height: 0` y overflow exterior oculto). Herramientas/Propiedades es la única región con scroll vertical, conserva cabecera, resumen y pestañas visibles, y contiene el overscroll.
- `RichTextEditor` admite `toolbarMode=contextual|fixed`. El lienzo mantiene formato contextual y Propiedades usa una barra persistente con el conjunto completo de comandos; el widget Contenido deja de ser una previsualización pasiva en el inspector.
- Las futuras acciones educativas serán declarativas y nunca ejecutarán JavaScript proporcionado por autores.

## 2026-10-25 — El acceso al libro tiene tres niveles

- `private` limita lectura y edición al autor; `public_read` permite descubrir y estudiar; `public_edit` permite además modificar estructura y contenido a cualquier usuario identificado.
- Solo el autor puede cambiar nombre, descripción, plantilla, visibilidad o eliminar el libro. La colaboración usa las revisiones optimistas existentes; no equivale a coedición de cursores en tiempo real.
- Los archivos continúan privados en Google Drive. El Worker comprueba que el recurso pertenece al autor o está referenciado por un libro público y obtiene el contenido con la credencial cifrada del propietario.
- La biblioteca distingue libros propios de libros de la comunidad y el modo de solo lectura entra directamente en Estudiar.

## 2026-10-24 — El libro demo es una experiencia didáctica versionada

- “Explorando la célula” se reduce a cinco páginas con una progresión narrativa: unidad de la vida, anatomía, red de procesos, comparación y reto final.
- El ejemplo ejercita RichText, Image, Mermaid/Pele, Table, Navigation y Quiz con contenido coherente, no bloques de prueba.
- `metadata_json.seedVersion = 2` permite actualizar una sola vez los proyectos semilla existentes sin tocar libros ordinarios ni sobrescribir posteriores ediciones en cada acceso.

## 2026-10-24 — Publicar es la única entrada de distribución

- El botón `Publicar` de la barra superior abre las opciones de distribución; HTML y SCORM dejan de estar mezclados con las propiedades del proyecto.
- Publicar en la web ofrece un enlace vivo `/read/:projectId` para libros no privados. El acceso anónimo siempre es de lectura, incluso si `accessLevel` es `public_edit`; los snapshots inmutables siguen pendientes para versiones publicadas congeladas.
- Los recursos de Drive no se hacen públicos: el Worker usa la credencial cifrada del autor y exige que el `resourceId` aparezca como campo exacto dentro de la composición de algún libro público antes de servirlo sin sesión.

## 2026-10-24 — Acceso abierto a cualquier cuenta Google

- Se elimina el secreto `AUTH_ALLOWED_EMAILS` del Worker de producción; KnowCanvas deja de aplicar una allowlist propia de beta.
- Google OIDC continúa validando identidad y cada usuario conserva proyectos y recursos aislados por `owner_user_id`.
- Un callback OAuth ya caducado no puede reutilizarse: debe iniciarse un acceso nuevo desde la aplicación.

## 2026-10-23 — HTML y SCORM comparten un exportador portable

- El libro guardado puede descargarse como ZIP HTML autocontenido o como paquete SCORM 1.2 con `imsmanifest.xml` en la raíz.
- Las imágenes privadas de Google Drive se incorporan como datos embebidos durante la exportación; el paquete no necesita sesión ni acceso posterior a Drive.
- SCORM conserva la página mediante `cmi.core.lesson_location` y marca `cmi.core.lesson_status` como completado al alcanzar la última página.
- RichText, Image, Table, Navigation y Quiz conservan contenido/función; Mermaid se prerenderiza como SVG y conserva su fuente como fallback. Excalidraw mantiene un fallback explícito hasta incorporar render estático.

## 2026-10-23 — Las propiedades del proyecto se autoguardan

- El inspector del nodo raíz no requiere una acción explícita de guardado: agrupa cambios durante 700 ms y los persiste automáticamente.
- El feedback pendiente/guardando/guardado/error permanece visible y se anuncia mediante una región viva.

## 2026-10-23 — El proyecto es la raíz seleccionable del explorador

- El nombre del proyecto ocupa el nivel superior del árbol y su selección representa un contexto distinto de lienzo o widget.
- Seleccionar la raíz abre las propiedades del proyecto en el inspector y una vista general de páginas en el centro.
- Volver a la biblioteca deja de estar asociado al nodo raíz y se mantiene como acción independiente de navegación.

## 2026-10-23 — La plantilla del visor pertenece al proyecto

- `viewerTemplate` se guarda en `projects.settings_json` y no como preferencia local del navegador.
- El modo estudio permite previsualizar otros layouts, pero al volver a entrar aplica la plantilla guardada.
- La futura exportación HTML debe incluir `ProjectSettings` en su snapshot para reproducir el mismo visor sin depender del proyecto editable.

## 2026-10-23 — El modo estudio se desacopla de la autoría

- El árbol del libro es también el orden canónico de lectura: recorrido en profundidad y `position` entre hermanos.
- El estudio no muestra controles de autoría. Ofrece cuatro presentaciones sobre el mismo contenido: árbol + hoja, lectura, revista y presentación.
- Anterior/siguiente, progreso y teclado son invariantes compartidas; los layouts son estado efímero y no modifican la composición guardada.

## 2026-10-22 — Google Drive sustituye a R2 para imágenes

- Por decisión del usuario, los binarios de la fototeca no se almacenan en Cloudflare: cada imagen subida se guarda en el Google Drive de su propietario.
- Se usa el alcance no sensible `drive.file`; KnowCanvas solo administra archivos creados por la propia aplicación y no solicita acceso general al Drive.
- D1 mantiene exclusivamente metadatos, referencias opacas y el refresh token cifrado con AES-GCM. El Worker renueva el acceso y actúa como proxy autorizado para que ningún token o enlace público llegue al navegador.
- Esta decisión sustituye el pendiente anterior de habilitar R2. Producción requiere habilitar Google Drive API, declarar el alcance en la pantalla de consentimiento y que cada usuario vuelva a autorizar la aplicación.

## 2026-10-22 — Primer despliegue Cloudflare

- KnowCanvas queda publicado en `https://knowcanvas.jorge-dieguez.workers.dev`, versión `ffa975bf-b3d7-4fde-98cb-dcee0e0c83a6`.
- Se crea D1 `knowcanvas-db` en WEUR con ID `eb802029-0e6b-47ac-9b48-31f4c5bc352b` y se aplican correctamente `0001_initial.sql` y `0002_resources.sql`.
- Los secretos Google OAuth y la allowlist se cargan mediante Wrangler. Producción responde `200`, health devuelve `ok` y `/api/me` informa `authConfigured: true`.
- R2 no está habilitado en la cuenta. Para no bloquear la publicación inicial se despliega sin `RESOURCES`: la fototeca propia queda temporalmente no disponible, mientras editor y persistencia D1 permanecen operativos.

## 2026-10-22 — Acceso y biblioteca alineados con el workspace

- El acceso y la biblioteca abandonan los restos editoriales decorativos del estilo inicial y comparten el lenguaje neutral, tipográfico y de elevación del editor.
- La biblioteca presenta una sola acción primaria, una cabecera de colección con recuento y tarjetas compactas en una cuadrícula adaptable de tres, dos o una columna.
- Las portadas se convierten en miniaturas documentales discretas, las descripciones pueden ocupar dos líneas y la fecha usa un elemento `time` legible por máquina.
- La previsualización del acceso deja de estar inclinada y elimina ornamentos circulares dominantes; funciona como una muestra sobria del producto.

## 2026-10-22 — Consolidación visual profesional del workspace

- Tras validar con capturas reales en Chromium, se unifica el shell hacia un editor espacial suizo/minimalista de alta densidad: neutros fríos, divisores suaves, una única selección azul y sombras reservadas a superficies flotantes.
- La topbar baja a 56 px, elimina tagline y estado redundante; explorador, toolbar del lienzo e inspector comparten alturas, espaciado e iconografía.
- El antiguo bloque grande “Insertar widget” se sustituye por un control compacto de 34 px; menús, toolbar contextual y selección abandonan los restos beige/verde del estilo histórico.
- El lienzo usa una superficie gris neutra con retícula discreta y sin marco de “página” en autoría. El modo estudio conserva su documento adaptable.
- Se mantienen los drawers móviles mediante overrides posteriores a la consolidación de escritorio y se respeta `prefers-reduced-motion`.

## 2026-10-22 — Inspector contextual Herramientas / Propiedades

- El panel lateral derecho se reorganiza en dos pestañas principales: Herramientas contiene la biblioteca de widgets; Propiedades contiene Contenido, Apariencia y Comportamiento.
- El contexto gobierna la pestaña principal: seleccionar el lienzo o hacer clic en espacio vacío abre Herramientas; seleccionar un widget o un elemento interno abre Propiedades.
- El autor puede cambiar manualmente entre ambas pestañas sin perder la selección. Al insertar un widget, la selección resultante devuelve automáticamente a Propiedades.
- Las pestañas principales y secundarias mantienen relaciones ARIA independientes y navegación por teclado, evitando paneles ambiguos para lectores de pantalla.
- Herramientas incorpora búsqueda y agrupa el catálogo en Contenido, Visual y Educativo; el filtrado y el estado sin resultados se anuncian semánticamente y funcionan también en el drawer móvil.
- Una revisión visual real en Chromium simplifica el inspector al patrón de herramientas de diseño: pestañas planas con indicador inferior, contexto compacto, una única zona de scroll, iconografía monocroma y menos cajas decorativas.
- Se eliminan del UI identificadores internos como `richText`, se corrigen etiquetas numéricas truncadas y se compacta la cabecera de la biblioteca sin perder nombres accesibles ni objetivos táctiles.

## 2026-10-21 — Inspector completo por contenido, apariencia y comportamiento

- Las pestañas del inspector quedan semánticamente separadas: Contenido modifica la información, Apariencia controla la presentación y Comportamiento define interacción y bloqueo.
- Todos los widgets admiten apariencia persistente común: fondo, texto, acento, borde, radio y relleno, además de geometría. El botón añade variante principal/secundaria.
- El destino del botón de navegación se mueve de Contenido a Comportamiento: lienzo interno o URL, con apertura opcional en nueva pestaña.
- Quiz añade comportamiento persistente para permitir reintentos y mostrar u ocultar la explicación. Los widgets no interactivos explican su papel en modo Estudiar en lugar de mostrar controles sin efecto.
- La apariencia se aplica tanto en el lienzo de autoría como en el flujo de estudio y puede restablecerse sin dejar valores visuales residuales.

## 2026-10-21 — Primer paquete de widgets educativos

- Se añaden contratos persistentes propios `navigation` v1 y `quiz` v1 para no acoplar el contenido almacenado a una biblioteca de renderizado.
- El botón de navegación admite destino interno por `canvasId` o URL HTTP(S), variante primaria/secundaria y apertura opcional en pestaña nueva; sólo navega en modo Estudiar.
- El Quiz incluye pregunta, 2–8 respuestas de elección única, respuesta correcta y explicación. El inspector permite editar todo el contenido; en Estudiar ofrece selección por teclado, comprobación, feedback anunciado y reintento.
- Ambos widgets reutilizan el modo de colocación al cursor, selección, resize, undo/redo y guardado del editor. Los tests cubren persistencia normalizada y los dos flujos principales en Chromium.
- Se mantiene `Interactive` como siguiente tipo educativo. H5P queda reservado a una futura integración aislada por su runtime y almacenamiento propios.

## 2026-10-20 — Widget Mermaid con Pele

- Se añade `pele` 1.6.0 como dependencia MIT y un tipo persistente `pele` v1 con `source` Mermaid y `caption`.
- El widget se inserta desde el catálogo como “Diagrama Mermaid”, se edita con doble clic mediante un textarea monoespaciado y mantiene preview SVG durante la edición y en estudio.
- Se usa `pele/lazy`: el runtime base y cada tipo de diagrama se cargan bajo demanda. La integración limita fuente a 50.000 caracteres y SVG a 1 MB, y desactiva enlaces e imágenes externas.
- Los errores de sintaxis se muestran como texto con `role=alert`; nunca se interpola el mensaje como HTML.
- `npm audit --omit=dev` informa 0 vulnerabilidades. `npm run check` y el E2E de creación, cambio a diagrama de secuencia y salida de edición son correctos.
- La “Biblioteca de widgets” del inspector era decorativa: todos sus botones estaban deshabilitados. Se conecta mediante un callback al `CanvasPanel`, reutilizando exactamente las acciones de inserción del catálogo inferior y conservando el lienzo seleccionado como destino.

## 2026-10-18 — Fase 3 UI, estados del editor

- El estado visual e interactivo del lienzo se deriva de una única unión discriminada: `canvas`, `selection`, `object` o `tool`. El atributo `data-interaction-mode` es el contrato compartido para las capas visuales; se evita deducir estados distintos mediante combinaciones independientes de booleanos.
- Las herramientas tienen prioridad sobre la edición interna, la edición sobre la selección y la selección sobre el reposo del canvas. Durante `object` o `tool`, los widgets ajenos quedan fuera de la interacción y no muestran hover.
- Se corrigió una desincronización comprobada: el clic exterior limpiaba el inspector pero conservaba `selectedWidgetIds`, dejando contornos residuales. Ahora ambas selecciones se limpian mediante la misma operación.
- Un widget seleccionado se mueve con flechas y se redimensiona con `Alt + flechas`; `Shift` cambia el paso de 1 a 10 px. El inspector continúa siendo la alternativa numérica precisa.
- El lienzo ofrece zoom explícito 50–200%, encaje calculado sobre los objetos y paneo con `Espacio + arrastre` o botón central. Los atajos de zoom no se capturan dentro de campos editables y la navegación no borra la selección.
- El shell de autoría usa una altura estable de `100dvh` y overflow interno. Antes sólo tenía `min-height`, por lo que el documento crecía con el canvas y anulaba el paneo vertical.
- La selección múltiple admite rectángulo por intersección desde espacio vacío y conserva `Shift + clic` como alternativa sin arrastre. El rectángulo respeta el zoom y puede trazarse en cualquier dirección.
- La barra del grupo permite desplazar 10 px por eje, duplicar y eliminar. Cada acción modifica el snapshot una sola vez y por tanto se deshace/rehace de forma atómica.
- Evidencia: `npm run check` correcto y E2E Chromium para selección exclusiva, transición de modos, salida por espacio vacío, resize por teclado, zoom, encaje, paneo bidimensional, marquee y acciones grupales.

## 2026-10-18 — Fase 2 UI, superficies accesibles

- Se crea una primitiva `Dialog` local, sin dependencia adicional. Se monta en `document.body`, usa fondo inerte, bloqueo de scroll, foco inicial, ciclo de Tab, Escape y retorno al origen.
- `ImagePicker` usa la primitiva como modal en escritorio y sheet inferior en móvil; `DiagramWidget` la usa en variante fullscreen.
- El inspector usa una primitiva `Tabs` con un único tab stop y navegación ArrowLeft/ArrowRight/Home/End, además de relaciones ARIA entre tabs y paneles.
- Menús y popovers no son modales y no reutilizan el trap de `Dialog`. `Menu` implementa foco inicial, flechas, Home/End, Escape y retorno al disparador; `Popover` conserva interacción de formulario, cierra con Escape y restaura el foco.
- Los menús del árbol y de bloque usan `Menu`; la edición de enlaces usa `Popover`; el formato de una selección textual es una `toolbar`, no un menú. Esta separación evita mezclar patrones ARIA y comportamiento de teclado.
- La fase queda validada con pruebas E2E de enlace, foco, navegación por teclado y acciones del árbol en Chromium.
- Verificación específica: 3 pruebas Chromium y 2 Pixel 7 correctas para tabs, diálogo de imagen y Excalidraw.

## 2026-10-18 — Fase 1 de consolidación UI

- Se adopta la dirección aprobada en `UI_AUDIT.md`: claridad y deferencia inspiradas en Apple, sin imitar componentes propietarios ni introducir decoración innecesaria.
- `src/client/ui-system.css` es la capa canónica de tokens semánticos. Prioriza tipografía nativa de plataforma, fondo gris neutro, superficies blancas, texto `#1d1d1f`, selección/foco `#0066cc`, espaciado 4/8 px y profundidad reservada a overlays.
- Botones y campos compartidos se normalizan por CSS antes de extraer componentes React, reduciendo el riesgo de alterar los flujos complejos del editor en la misma fase.
- En móvil, controles y navegación usan objetivos mínimos de 44 px; se añade enlace para saltar al lienzo y el guardado pasa a una región `status` anunciable.
- Se retiran de la interfaz normal “Base local”, “guardado en D1” y la versión de esquema del widget; siguen existiendo como detalles internos.
- `npm run check` pasa. El E2E completo da 41/70: parte de la suite conserva expectativas incompatibles con `EDITOR_SPEC.md` (crear con un clic en lugar de doble clic) y ejecuta autoría espacial bajo el inspector móvil abierto. Antes de usarla como puerta de calidad visual hay que alinear escenarios por dispositivo y especificación.
- Próxima fase: primitivas accesibles para menús, popovers, diálogos, sheets y tabs, con foco, Escape y retorno al disparador.

## 2026-10-09 — Inicio del proyecto

### Decisiones

- Se parte de un repositorio vacío y se limita esta entrega al Hito 1.
- Arquitectura: monolito modular TypeScript, React SPA y API en un único Worker mediante el plugin oficial de Cloudflare. Justificación y alternativas en `ARCHITECTURE.md`.
- Se usa Tailwind 4 como motor, pero la superficie expresa tokens y componentes propios; evita atar el dominio a clases visuales.
- El usuario proporcionó el sistema visual de Tramas como referencia vinculante. Se adaptó a KnowCanvas en `src/client/ui-system.css`: blanco primero, sans única, acción negra, selección/foco azul, bordes mínimos y sin sombras por defecto. No se trasladan nombres ni patrones de dominio de Tramas.
- No se añade router HTTP, gestor de estado, librería DnD, editor rich text ni ORM hasta que el caso del hito correspondiente justifique su coste.
- D1 no se declara con un `database_id` ficticio en el Hito 1. Binding, migración y base local se incorporan en Hito 2.
- El inspector de depuración del plugin Cloudflare queda desactivado en Vite (`inspectorPort: false`) para evitar abrir un puerto adicional; puede habilitarse de forma deliberada cuando se necesite depurar el Worker.
- La marca comercial vive en `src/config/brand.ts`; paquete y Worker permanecen `knowcanvas`.
- El shell muestra controles futuros deshabilitados y explica el hito; no simula guardado o publicación.

### Contexto verificado

- La documentación oficial vigente de Cloudflare recomienda `@cloudflare/vite-plugin` para SPA React + API, `assets.not_found_handling: single-page-application` y `run_worker_first` para `/api/*`.
- Las versiones iniciales se consultaron en npm el 2026-10-09 y se fijaron por rango compatible en `package.json`.
- El entorno aporta Node 22.11. Vite 8 y Vitest 5 requieren Node 22.12; ESLint 10 requiere 22.13. Se seleccionaron Vite 6.4.4, Vitest 4.1, ESLint 9.39, React plugin 4.7 y TypeScript 5.9.3: líneas compatibles y soportadas por el plugin actual de Cloudflare. No se forzaron peers ni se alteró el Node global.

### Pendientes

- En Hito 2 decidir protección concreta del espacio de autoría (recomendación inicial: Cloudflare Access) antes de cualquier despliegue con escritura.
- No crear R2 hasta implementar carga multimedia real.

### Verificación del Hito 1

- `npm run check`: formato, lint, tipos, 1 prueba unitaria y build correctos.
- Servidor Vite/Workers iniciado en local; `GET /api/health` respondió con el contrato esperado.
- Playwright: 2 pruebas E2E correctas en Chromium escritorio y emulación Pixel 7, incluyendo drawers móviles.
- Revisión visual de ambas vistas correcta con el sistema proporcionado. Chromium de Playwright quedó instalado en la caché del usuario.
- El build muestra avisos no bloqueantes de Node 22.11 (`punycode`/JSON modules) procedentes del toolchain de Wrangler y un intento de logger fuera del sandbox; los artefactos se generan y el proceso termina correctamente.

## 2026-10-09 — Research funcional

- Se completó desk research en `docs/RESEARCH.md` sobre Notion, Rise, H5P, Miro/FigJam, Figma widgets, PhET, GeoGebra, Quarto, WCAG/ATAG, LTI y xAPI/cmi5.
- Se mantiene el núcleo del MVP: estructura semántica, cinco widgets confiables, estudio y publicación web. Colaboración, LMS, analítica, IA y exportación multiformato siguen fuera del MVP.
- Se recomienda reforzar el MVP con preview responsive real, accesibilidad guiada, validación antes de publicar, revisión optimista y operaciones reversibles.
- Cuatro propuestas requieren validación antes del esquema del Hito 2: papelera, undo de sesión, duplicación y retirada reversible de publicaciones. Aún no se consideran decisiones arquitectónicas adoptadas.
- El principal diferencial propuesto es preservar significado entre autoría, exploración, práctica y distintos dispositivos/formatos, no competir por lienzo libre ni cantidad de widgets.

## 2026-10-09 — Identidad y jerarquía de autoría

- Decisión del usuario: la identidad de KnowCanvas se basa en una cuenta Google.
- Se adopta Google OpenID Connect en la aplicación con Authorization Code + PKCE, sesión opaca revocable y usuario estable por `(issuer, sub)`. El email no es clave primaria y no se solicitarán APIs de Google en el MVP.
- Cada proyecto tiene un único propietario. Múltiples usuarios pueden tener bibliotecas separadas, pero compartir y colaborar siguen fuera del MVP.
- Cloudflare Access puede cerrar una beta como capa adicional, pero no sustituye la identidad ni la autorización de KnowCanvas.
- Modelo mental inspirado en Notion: biblioteca → proyecto/libro → carpetas → lienzos. Internamente se conservan `Project`, nodo `container` y nodo `canvas`; el cambio es de lenguaje y experiencia, no un modelo de páginas arbitrarias.
- La beta podrá limitarse mediante allowlist/dominio configurado en servidor. La arquitectura base admite cualquier cuenta Google válida.

## 2026-10-10 — Reutilización de Tramas

- El usuario confirma que es autor del proyecto local Tramas y autoriza reutilizar sus desarrollos al máximo.
- Se reutilizarán capacidades y patrones, no secretos, datos ni el modelo genealógico.
- Prioridades: editor Markdown/rico, fototeca y carga de imágenes, importación/exportación, navegación por teclado y patrones responsive.
- Primera extracción completada: `RichText` versionado, composición semántica inicial y guardado optimista en D1 mediante revisión del lienzo.
- El almacenamiento multimedia de KnowCanvas tendrá una interfaz propia; R2 es la opción base y Google Drive podrá añadirse después como proveedor opcional.

## 2026-10-10 — Diagramas con Excalidraw

- Se adopta `@excalidraw/excalidraw` como implementación del widget `Diagram`, conservando el aviso MIT en `THIRD_PARTY_NOTICES.md`.
- Se fija Excalidraw 0.17.6 y React 18.3.1: la versión 0.18.1 compatible con React 19 introducía dependencias transitivas con avisos altos; la combinación seleccionada queda con cero vulnerabilidades según `npm audit`.
- Excalidraw se carga mediante `lazy()` en un chunk separado; no aumenta el JavaScript inicial del editor.
- La escena se conserva como JSON abierto y versionado. Colaboración en tiempo real queda fuera del MVP.

## 2026-10-10 — Lienzo espacial de autoría

- Decisión del usuario: en edición, cada widget funciona como una ventana movible y redimensionable.
- Seleccionar una ventana activa el inspector derecho, siguiendo el patrón de selección + propiedades de Tramas.
- El `frame` espacial se persiste por widget. No se reutiliza como layout de estudio: estudio y publicación siguen un flujo adaptable para preservar legibilidad y accesibilidad.

## 2026-10-12 — Modelo de composición v2

- Tras contrastar Notion, Tiptap, Miro, Excalidraw y tldraw, se decide evolucionar el lienzo a un almacén normalizado `rootIds + objects` con identidad estable y relaciones padre/slot.
- D1 continúa guardando snapshots JSON completos durante el MVP. La lectura acepta v1 y v2; la siguiente escritura migra automáticamente a v2 y eleva `schema_version`.
- El editor opera directamente sobre la composición v2; el formato v1 queda limitado a la frontera de lectura histórica.
- `parentId`, `slotId` y `order` forman la base de contenedores. Se validan claves/IDs, raíces, padres, tipo de contenedor y ciclos.
- Siguiente decisión implementativa: documento enriquecido JSON como fuente canónica; Markdown quedará para importación, exportación y vista de código.
- RichText v2 usa un árbol JSON de bloques y marcas; tablas inline se guardan semánticamente y Markdown se convierte solo en los límites del editor.
- Table v2 asigna un ID estable a cada celda. Los hijos usan `parentId`, `slotId`, `order` y un `frame` relativo; pueden colocarse con una acción accesible o soltarse sobre una celda y devolverse al lienzo.
- Los widgets nuevos se distribuyen en una cuadrícula amplia para evitar solapamientos con la barra flotante y entre sí.
- Insertar un widget activa un modo explícito de colocación: una previsualización de su tamaño sigue el cursor, un clic confirma y `Esc` cancela. El elemento queda seleccionado; la edición interna continúa requiriendo doble clic para mantener separados selección, colocación y edición.
- Un clic simple en espacio vacío selecciona el lienzo y abre el inspector con la biblioteca de widgets. En móvil, el inspector se cierra al escoger un widget para dejar visible el modo de colocación.
- La barra inferior del explorador ofrece creación de lienzo, creación de carpeta y eliminación confirmada del nodo activo. El mismo menú de nodo se abre tanto desde el botón de opciones como con clic derecho.
- Las acciones de creación de la barra son contextuales: crean dentro del nodo activo y, si no hay uno, en la raíz. Tras crear un lienzo se selecciona el `canvasId` devuelto por la API, sin depender del orden de la respuesta refrescada.
- La gestión de enlaces modifica directamente las marcas del documento RichText v2; no depende de reemplazos textuales de Markdown. El inspector permite cambiar texto/URL y quitar el enlace.
- Los objetos RichText sin contenido se eliminan al abandonar la edición y también se purgan al cargar un lienzo para limpiar residuos históricos invisibles.
- Pegar una imagen binaria reutiliza `prepareImage` y `POST /api/resources`: nunca persiste `data:` URLs. El contexto decide el resultado (nodo embebido dentro de RichText o widget Image sobre el lienzo); el binario queda en el Drive del usuario y la composición conserva únicamente `resourceId` y la URL autorizada del recurso.
- La tipografía inline se persiste como marca `textStyle` allowlisted (`color`, `fontFamily`, `fontSize`), no como HTML arbitrario. El renderer de autoría, estudio y exportación interpreta la misma marca; subrayado y tachado también son marcas explícitas.
- Pestañas usa un contrato propio v1 con `title` e `items` ricos, en lugar de añadir un modo visual al acordeón. Comparte RichText, pero mantiene semántica `tablist/tab/tabpanel`, navegación con flechas y límites de 1–12 paneles.
- Tarjetas reversibles usa un contrato v1 con 1–30 tarjetas y documentos RichText independientes para anverso y reverso. El giro es una acción explícita —no depende de hover ni animación 3D— y al cambiar de tarjeta siempre vuelve al anverso.
- Línea temporal usa una lista ordenada semántica de 1–30 hitos. `date` es una etiqueta editorial libre —admite años, periodos o fases— y no se fuerza a ISO; título y contenido mantienen campos separados para jerarquía y accesibilidad.
- Imagen interactiva persiste una imagen de recurso/URL y hasta 30 puntos con coordenadas porcentuales, título y RichText. La escala del widget no altera su posición relativa; el punto activo es estado efímero del lector.
- Quiz incorpora `selectionMode` con valor predeterminado `single` para compatibilidad. En modo `multiple`, la corrección compara el conjunto exacto de IDs seleccionados con todas las opciones correctas; el orden de selección no afecta al resultado.
- La integración de IA usa BYOK por usuario. D1 conserva únicamente AES-GCM con IV aleatorio y los cuatro últimos caracteres; la clave maestra vive como secreto `USER_SECRET_ENCRYPTION_KEY` del Worker. Guardar valida la credencial con OpenAI y ninguna lectura de cuenta devuelve el secreto.
- Perfil y conexión BYOK usan un único diálogo global accesible desde biblioteca, autoría y estudio autenticado. La interfaz denomina la operación “conectar OpenAI”, explica privacidad y facturación, y conserva “API key” como detalle técnico secundario.
- Una credencial OpenAI configurada no muestra por defecto el campo de sustitución. El autor debe pulsar “Cambiar clave”; el campo usa `autocomplete=new-password` y exclusiones de gestores comunes para evitar reemplazos accidentales por autocompletado.
- La IA propondrá operaciones tipadas sobre la composición y requerirá aprobación explícita antes de escribir. No se aceptará HTML, JavaScript ni una composición completa sin validación Zod y soporte de undo.
- La primera propuesta de IA admite únicamente `richText` y `quiz`, con un máximo de ocho widgets. Responses API usa Structured Outputs, `store: false` y una salida que vuelve a validarse con Zod en el Worker. Aplicar agrupa todos los widgets en una sola mutación del historial.
- El asistente no ocupa la topbar ni usa modal: una burbuja de 58 px abre un panel flotante derecho no modal. El patrón conserva el lienzo como contexto, gestiona foco de entrada/retorno y se transforma en hoja casi completa en móvil.
- Los errores de generación no exponen el cuerpo de OpenAI al navegador. Se traducen a causas accionables allowlisted (credencial, saldo, límite y modelo) y el registro conserva únicamente estado HTTP, código y `x-request-id` para diagnóstico.
- Structured Outputs discrimina `richText` y `quiz` mediante `enum` de un único valor. OpenAI rechazó en producción los discriminadores `const` con `invalid_json_schema`; el contrato Zod posterior continúa siendo la validación definitiva.
- El chat conserva su historial como estado efímero por lienzo: cerrar y reabrir no lo borra, pero cambiar de lienzo inicia otro contexto. Aún no se envían turnos anteriores a OpenAI ni se persisten en D1; eso pertenece a conversación multivuelta futura.
- Cada propuesta conserva su selección de widgets y estado pendiente/aplicado/descartado. Aplicar filtra la propuesta antes de entregarla al canvas y mantiene una única entrada en el historial de deshacer.
- La IA puede proponer los 12 widgets existentes. El contrato de propuesta usa contenido editorial simplificado y el cliente lo convierte a los contratos persistentes, genera IDs y documentos RichText; Excalidraw se crea vacío y Mermaid es la opción generativa preferente.
- El layout de IA es una cuadrícula lógica de 12 columnas con fila, columna, span y altura. El aplicador calcula la altura máxima de cada fila, evita solapamientos verticales y mantiene toda la inserción como una mutación reversible.
- Las imágenes web nunca se hotlinkean al aplicar: `POST /api/resources/import` acepta solo HTTPS público, limita redirecciones, MIME y 10 MB, y guarda el binario en el Drive del usuario antes de crear Image o Hotspots.
- El JSON Schema de propuestas se deriva de Zod y se normaliza al subconjunto de Structured Outputs: elimina `$schema` y `format: uri`, convierte literales `const` en `enum` y uniones `oneOf` en `anyOf`. La validación Zod posterior sigue aplicando las restricciones completas.
- Image y Hotspots incluyen una `imageQuery` de respaldo. La importación prueba primero la URL directa propuesta y, si no produce un archivo válido, consulta Wikimedia Commons, filtra MIME/tamaño y descarga el primer resultado compatible antes de subirlo a Drive.
- Un conjunto seleccionado se representa como un único objeto mediante el rectángulo envolvente de todos sus marcos. Los widgets internos conservan su estado `data-selected` para interacción y accesibilidad, pero no dibujan contornos individuales. La barra contextual se posiciona respecto a ese rectángulo y limita su ancho al grupo para no invadir el inspector.
- Los gestos espaciales son mutuamente excluyentes: al iniciar el arrastre de un conjunto se cancelan los manejadores individuales del elemento bajo el puntero, se captura el puntero para el grupo y se aplica un único delta común a todos sus marcos.
- Los límites del lienzo se aplican al delta común del conjunto usando el mínimo `x/y` de sus marcos originales. Nunca se limita cada miembro por separado, porque eso deformaría el grupo cuando uno alcance un borde antes que los demás.
- La UI de grupos sigue un patrón Figma/Miro/Canva: píldora contextual mínima sobre el contorno y operaciones bajo `Más`. El inspector no duplica herramientas operativas: describe composición, agrupación y geometría. Clic derecho reutiliza el mismo menú y la navegación padre/hijo usa doble clic/`Escape`.
- Desagrupar no equivale a deseleccionar: elimina el `groupId`, pero conserva los mismos IDs como selección múltiple temporal para mantener la continuidad de la tarea.
- La evolución visual adopta “interfaz neutral, contenido expresivo”: el chrome permanece claro y compacto; los widgets usan temas semánticos por tipo. Los valores predeterminados proceden de `defaultWidgetAppearance`, se reutilizan en render e inspector y solo se persisten cuando el autor los modifica.
- Los skins se modelan como `ProjectSettings.theme`, separados de `viewerTemplate`: Minimal, Editorial, Aula, Naturaleza y Nocturno. Afectan a Estudio y exportación HTML/SCORM, nunca al chrome de autoría ni al contenido persistido de cada widget. Proyectos históricos reciben `minimal` mediante el schema.
- Image conserva el ajuste del recurso en `data.fit`: `contain` muestra la imagen completa y es el valor compatible para datos históricos; `cover` rellena el marco recortando; `fill` estira al marco. El contenedor de imagen nunca usa scroll interno y exportación interpreta el mismo valor.
- El inspector de widgets usa un contrato transversal: Contenido contiene datos y edición enriquecida; Apariencia contiene variaciones visuales, estilo común y geometría; Comportamiento contiene únicamente interacción real y bloqueo. Las operaciones de organización no se duplican allí. Los controles específicos deben aparecer en la categoría semántica correspondiente —por ejemplo, encaje de Image en Apariencia y `allowMultiple` de Accordion en Comportamiento— y todo widget nuevo debe completar explícitamente esta matriz.
- El catálogo inicial contiene dos semillas independientes por usuario: “Explorando la célula” demuestra un caso educativo y “Conoce KnowCanvas” funciona como onboarding editable de cinco páginas. Cada una tiene `seed_key` y versión propios; actualizar una semilla nunca reconstruye ni duplica la otra. El tour de producto usa tema Aula y diez tipos de widget para explicar la herramienta mediante sus propios componentes.
