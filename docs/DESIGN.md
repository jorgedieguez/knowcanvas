# Sistema de diseño e interacción

La identidad visual sigue [`brand-guidelines.md`](./brand-guidelines.md). El producto adopta el logotipo horizontal azul-violeta y su paleta, manteniendo el chrome de autoría neutral para que el contenido conserve protagonismo. Azul identifica acción y selección; violeta queda asociado principalmente a IA y creatividad; amarillo y verde son acentos funcionales.

> Actualización 2026-10-26: los bloques educativos desplegables se editan en Propiedades y permanecen inertes en autoría. En Estudiar usan botones con `aria-expanded`/`aria-controls`, objetivos de 48 px, foco nativo y movimiento desactivable.

El editor enriquecido tiene dos presentaciones coherentes: menú contextual sobre selección cuando se edita directamente en el lienzo y barra persistente cuando se edita desde Propiedades. Ambas usan los mismos comandos y documento; la barra fija ofrece bloque, encabezado, énfasis, subrayado, tachado, enlace, lista, cita, código, tabla, imagen, limpiar formato y vista Markdown.

## Dirección

KnowCanvas debe sentirse como una herramienta profesional de conocimiento: sobria, blanca, rápida de leer y más cercana a un espacio de trabajo moderno que a un LMS corporativo. La interfaz no compite con el contenido; lo estructura. Se adopta y adapta el sistema de diseño facilitado por el usuario: blanco primero, una sola voz tipográfica, bordes mínimos, acciones claras y componentes reutilizables.

Desde la revisión del 2026-10-31 se aplica el principio **interfaz neutral, contenido expresivo**. El shell conserva superficies claras y silenciosas; los widgets ganan identidad semántica, profundidad y color por familia. El objetivo no es decorar el editor, sino mejorar reconocimiento, jerarquía y calidad percibida sin distraer de la autoría.

## Layout

- Inicio/biblioteca: lista ligera de proyectos/libros del usuario y acción de creación.
- Barra superior: identidad de marca/proyecto, estado de guardado, modos, publicación y menú de cuenta Google.
- Explorador izquierdo: 258 px base, árbol, búsqueda y creación.
- Centro: barra contextual y documento fluido, no superficie de coordenadas.
- Propiedades derecho: 288 px base, contexto y controles del elemento seleccionado.
- Bajo 820 px, el centro ocupa todo el ancho y paneles laterales se abren como drawers. Autoría avanzada podrá pedir tablet; estudio debe funcionar desde 320 px.

## Tokens

Los tokens canónicos viven en `src/client/ui-system.css`:

- fondo global `#f5f5f7`; superficie `#fff`; superficie secundaria `#f9f9fb`; hover `#f0f0f2`;
- texto `#1d1d1f`; secundario `#5f5f66`; líneas `#d9d9de` y `#eaeaee`;
- acción principal `#1d1d1f`; selección/foco `#0066cc` sobre `#eaf3ff`;
- éxito `#248a3d`, aviso `#a05a00` y destructivo `#b42318`;
- espaciado basado en 4/8 px; radios 6, 10, 14 y 18 px;
- sombras reservadas a popovers y diálogos, nunca como jerarquía de tarjetas ordinarias;
- elevación suave para widgets interactivos (`soft`) y elevación de respuesta en hover (`raised`), sin desplazar geometría;
- acentos semánticos: índigo para contenido/navegación, teal para imagen, violeta para diagramas/pestañas, coral para evaluación, rosa para memorización y ámbar para secuencias;
- z-index, movimiento y elevación disponen de tokens semánticos.

La fuente única prioriza el sistema de cada plataforma: `-apple-system`, `BlinkMacSystemFont`, `SF Pro Text`, `Segoe UI`, `Inter`, `Helvetica Neue`, `Arial`, `sans-serif`. No se carga una fuente remota ni se usa serif en la interfaz. El cuerpo UI parte de 14 px en escritorio; formularios y cuerpo móvil usan al menos 16 px para evitar zoom involuntario. Los skins futuros solo podrán cambiar tokens, no estructura ni jerarquía.

## Componentes y patrones

- Botón primario negro: una acción principal por contexto; secundario gris; destructivo rojo explícito. La acción contextual de alta podrá usar el botón cuadrado verde de 40 px con `+` y nombre accesible.
- Los controles compartidos usan 36 px en escritorio y objetivos mínimos de 44 px en pantallas táctiles. El icono conserva 16–18 px dentro de un área activa mayor.
- Iconos Lucide de trazo coherente y siempre acompañados de etiqueta o nombre accesible.
- Biblioteca: cada proyecto/libro es una unidad navegable; evitar dashboard LMS y métricas decorativas.
- La biblioteca separa “Mis libros” de “Comunidad”. Cada libro comunica autor y permiso efectivo: privado, público de lectura o colaborativo; el color nunca es el único indicador.
- Un libro público de lectura entra directamente en Estudiar y no muestra acciones de autoría. Un colaborador puede editar contenido, pero las propiedades y permisos permanecen informativos y reservados al autor.
- Árbol inspirado conceptualmente en Notion: el libro es la raíz, las carpetas pueden anidarse y los lienzos son hojas. Usa sangría, expansión independiente, rename contextual, foco/selección diferenciados y destino de arrastre visible.
- El nombre del libro es un nodo raíz seleccionable, no un acceso para salir. Al seleccionarlo, el centro muestra una vista general de páginas en miniatura y el inspector cambia a propiedades del proyecto. Volver a la biblioteca es una acción separada en la cabecera del explorador.
- Lienzo: secciones y columnas adaptables; selección dibuja borde/toolbar sin alterar contenido.
- Propiedades: secciones progresivas; controles cambian según selección conservando posición predecible.
- Las propiedades del proyecto se guardan automáticamente 700 ms después del último cambio válido. El inspector no añade un botón de guardado redundante y mantiene una región estable con los estados pendiente, guardando, guardado o error.
- **Publicar** es el punto único de salida del libro. Abre un diálogo con publicación web, HTML ZIP y SCORM 1.2 ZIP; las acciones sustituyen su etiqueta por un estado de preparación durante el proceso. Propiedades se reserva para configurar el libro.
- Tarjetas solo cuando agrupen una unidad navegable clara; para datos densos, listas de 44–64 px y separadores finos.
- Inspector: barra compacta, contexto, pestañas coherentes cuando sean necesarias y propiedades con patrón de tabla.
- El contexto del inspector hereda el acento semántico del widget seleccionado mediante icono, línea lateral y fondo tonal; las herramientas conservan iconos coloreados por familia.
- Estados vacíos: explicación breve, siguiente acción real y sin contenido ficticio.
- Guardado: `Guardando…`, `Guardado`, `Sin conexión` o `Error`; nunca comunicar éxito anticipado.
- El estado de guardado es una única región `status` anunciable; términos de infraestructura como D1, base local o versión de esquema no aparecen en la interfaz normal.
- Feedback: inline para validación, toast solo para eventos globales y diálogo para confirmaciones.
- Cuenta: avatar Google abre un menú compacto con identidad, biblioteca y cerrar sesión; no se usa la foto como sustituto del nombre accesible.

## Edición

Click selecciona; doble click solo entra en edición cuando sea convencional. Reordenación ofrece arrastre y alternativa por teclado/menú. Los cambios editables no deben perderse al cambiar selección. Deshacer/rehacer se evaluará antes de operaciones complejas. Controles no implementados aparecen deshabilitados con explicación, no simulan éxito.

La especificación operativa y su estado de implementación viven en [`EDITOR_SPEC.md`](EDITOR_SPEC.md). En caso de discrepancia sobre la interacción del editor, ese documento prevalece sobre descripciones antiguas de hitos.

## Responsive y tacto

Las columnas se apilan según contenido, no por ancho fijo del lienzo. Objetivos táctiles principales de al menos 44 px en estudio. Hover nunca es el único acceso a una acción. Drawers laterales bloquean/gestionan foco cuando se conviertan en diálogos completos.

## Accesibilidad

## Modo estudio

El estudio es una superficie de lectura, no una variante deshabilitada del editor. Oculta inspector, asas, estado de guardado y acciones de autoría. El árbol del libro define una secuencia estable en profundidad y cada hoja conserva su contenido semántico adaptable, sin reutilizar las coordenadas espaciales de edición.

- **Árbol + hoja:** índice persistente y hoja activa; adecuado para explorar libros no lineales.
- **Lectura:** columna centrada, anterior/siguiente y progreso; es el ritmo recomendado para texto largo.
- **Revista:** rejilla visual de dos columnas que vuelve a una columna en anchos estrechos; texto largo y tablas ocupan todo el ancho.
- **Presentación:** superficie amplia, título dominante y mínima distracción para exposición o aula.

Todas las variantes ofrecen navegación anterior/siguiente con etiquetas reales, progreso numérico y atajos `←`/`→` o `Page Up`/`Page Down` cuando el foco no está en un control interactivo. En móvil, el índice es un panel temporal y los layouts nunca producen scroll horizontal.

Los widgets interactivos conservan altura intrínseca en Estudio: al responder un Quiz, desplegar un acordeón o cambiar contenido, la hoja crece y la región central mantiene el desplazamiento. El recorte de autoría no se reutiliza en el visor.

La plantilla predeterminada se configura en las propiedades del nodo raíz junto al nombre y la descripción. El cambio se guarda automáticamente y comunica su estado; cambiar de layout dentro de Estudiar sirve como previsualización y no modifica silenciosamente la propiedad persistida.

### Temas de libro

El tema es una propiedad del proyecto independiente del layout. Cambia la identidad del contenido en Estudiar y en HTML/SCORM, pero no altera el chrome estable del editor ni los datos de los widgets.

- **Minimal:** blanco y neutral con acento índigo; valor predeterminado y fallback histórico.
- **Editorial:** papel cálido, tinta oscura y voz tipográfica serif para lectura larga.
- **Aula:** azules claros y jerarquía nítida para material didáctico.
- **Naturaleza:** verdes sobrios y superficies orgánicas sin perder contraste.
- **Nocturno:** fondo oscuro, papel elevado y acento azul claro; declara `color-scheme: dark`.

El selector ofrece nombre y muestras de color, por lo que la elección no depende solo del color. Todos los temas comparten estructura, orden DOM, objetivos táctiles y estados accesibles. Un tema nunca sobrescribe una personalización explícita de un widget.

## Accesibilidad

- jerarquía de encabezados y regiones con nombres;
- foco visible, orden DOM lógico y atajos documentados;
- texto alternativo obligatorio para imágenes educativas o marcado decorativo explícito;
- gráficos/diagramas con descripción equivalente;
- quizzes anuncian feedback sin depender del color;
- simulaciones permiten entradas numéricas y pausa, además de controles visuales;
- movimiento reducido respetado.

## Estado del Hito 1

El shell implementa la dirección visual y los tres paneles sobre la capa canónica `ui-system.css`. El contenido central es una presentación honesta de la arquitectura; la biblioteca y acciones futuras están deshabilitadas y etiquetadas. Los patrones finales de drag-and-drop, formularios, modales y publicación se definirán al implementarlos sin romper este contrato visual.

## Migración visual de 2026-10-18

La primera fase de la auditoría `UI_AUDIT.md` está aplicada a elementos compartidos: tipografía, paleta semántica, espaciado, radios, elevación, botones, formularios, navegación, shell, biblioteca e inspector. `ui-system.css` continúa actuando como capa canónica sobre estilos históricos mientras se migran por familias; no se deben añadir nuevos colores, serif o sombras directas a `styles.css`.

Las siguientes fases migrarán superficies flotantes accesibles, estados del editor y responsive avanzado sin mezclar esos cambios con esta base visual.

## Refinamiento visual de 2026-10-31

- Cada tipo de widget dispone de una apariencia predeterminada coherente y accesible. Los valores se muestran también en Propiedades y se materializan al editar, evitando saltos entre el estilo visual y el modelo persistido.
- Quiz, acordeón, pestañas, tarjetas reversibles, línea temporal, navegación e imagen interactiva incorporan superficies tonales, controles con jerarquía y profundidad sutil.
- Hover, selección y edición modifican borde/elevación sin alterar tamaño o posición. `prefers-reduced-motion` elimina las transiciones decorativas.
- El color nunca es el único indicador: títulos, estructura, iconos, bordes y estados ARIA siguen comunicando la función.
- El widget Imagen usa el marco completo sin barras de desplazamiento internas. Propiedades permite elegir “Ver completa” (`contain`), “Rellenar el marco” (`cover`) o “Estirar al marco” (`fill`); la elección es consistente en autoría, estudio y exportación.

### Inspector de widgets

El inspector sigue el modelo de herramientas de diseño: contexto estable, controles compactos y divulgación progresiva en tres categorías. No debe convertirse en una colección de acciones ni repetir la barra contextual.

- **Contenido:** edita la información propia del widget. RichText y los campos educativos usan el editor enriquecido; Imagen permite sustituir el recurso, describirlo y añadir pie; Diagram, Mermaid y Tabla muestran su estructura y remiten a la edición directa cuando esa superficie es más apropiada.
- **Apariencia:** comienza por el ajuste específico del tipo —variante de botón o encaje de imagen— y continúa con fondo, texto, acento, borde, radio, relleno y geometría. RichText permite recuperar altura automática después de un redimensionado manual.
- **Comportamiento:** solo muestra decisiones que afectan a la interacción: destino de Navegación, respuesta/reintento de Quiz, expansión de Acordeón y bloqueo común. Para tipos no interactivos comunica de forma breve su papel en Estudiar, sin inventar opciones vacías.

Los encabezados de sección y separadores agrupan controles relacionados; las etiquetas permanecen visibles y los campos conservan un mínimo de 36 px en escritorio. Cambiar de widget abre Contenido y mantiene el mismo orden mental. Las acciones destructivas u operativas —eliminar, duplicar, ordenar, agrupar— permanecen fuera de Propiedades.

### Biblioteca de widgets orientada a intención

- El primer nivel responde a lo que el autor quiere conseguir: **Contenido**, **Visualizar y explicar**, **Explorar e interactuar**, **Practicar y evaluar**, y **Diseño y navegación**. Los nombres técnicos o motores compartidos no forman la navegación principal.
- Cada bloque muestra nombre, finalidad breve e icono consistente antes de insertarse. La búsqueda incluye sinónimos, finalidad y formato para que consultas como “proceso”, “memoria” o “evaluación” encuentren la herramienta adecuada.
- Insertar conserva el modo de colocación existente y crea un ejemplo funcional; nunca deja un objeto vacío que obligue al autor a comprender primero su configuración.
- El catálogo visible puede crecer mediante variantes respaldadas por motores compartidos. La interfaz no debe sugerir treinta implementaciones independientes cuando varias opciones comparten datos y comportamiento.
- Las variantes se eligen en la previsualización y modifican la instancia inicial, no solo su rótulo: configuración, contenido y comportamiento deben corresponder a la opción anunciada. Cambiar de variante no inserta nada hasta activar el widget y colocarlo.
- Las transformaciones viven en Contenido del widget de origen, describen el resultado antes de ejecutarse y sustituyen el mismo objeto para conservar geometría y orden. Deben formar una única operación de Deshacer; no crean copias silenciosas ni eliminan contenido sin una representación equivalente en el destino.
- Los widgets basados en paneles muestran **Cambiar presentación** antes de sus campos extensos. Acordeón, Pestañas, Tarjetas y Proceso son presentaciones alternativas del contenido: la conversión preserva título y cuerpos, genera rótulos editables cuando el destino los requiere y explica que puede deshacerse.
- Una intención visible no implica un motor nuevo. **Proceso paso a paso** se presenta como entrada propia y crea un Timeline configurado con pasos; **Comparación** crea una Table de tres columnas con criterios y dos alternativas. El rótulo de colocación conserva la intención elegida, aunque la persistencia reutilice el contrato común.
- “Crear con IA” es una entrada orientada a objetivos dentro de esta misma arquitectura, no una biblioteca paralela. Sus accesos Explicar, Visualizar, Practicar, Evaluar y Transformar preparan una petición editable en el copiloto; primero propone widgets y composición, y solo una confirmación explícita modifica el lienzo.
- **Clasificar**, **Ordenar** y **Relacionar** se presentan como actividades distintas, pero comparten un motor. Ordenar ofrece controles subir/bajar; Clasificar y Relacionar usan selección seguida de destino. Todos los controles son nativos, tienen foco visible y objetivos táctiles suficientes: arrastrar podrá acelerar la interacción, pero nunca será obligatorio.
- Los componentes colocables de navegación comparten lenguaje y contrato. El **botón** representa una acción puntual; el **menú/índice** muestra un recorrido explícito y marca la página actual; la **barra** mantiene anterior, contexto y siguiente en posiciones predecibles. En autoría son previsualizaciones inertes; en Estudio y exportación son enlaces semánticos con foco visible y adaptación móvil.

### Acceso y biblioteca

- Acceso, biblioteca y workspace usan la misma tipografía de sistema, paleta neutral y escala de radios; no se introduce una segunda identidad editorial para las pantallas de entrada.
- La biblioteca reserva el botón oscuro para `Nuevo libro`. Abrir un libro se expresa mediante tarjetas planas con hover y foco discretos, no mediante portadas de colores como elemento dominante.
- Configuración personal concentra integraciones privadas. Las credenciales se introducen en campos de contraseña, nunca se vuelven a mostrar y se representan después mediante estado, últimos cuatro caracteres y acciones explícitas de sustitución o eliminación.
- El asistente de IA se descubre mediante una burbuja fija en la esquina inferior derecha. Al activarla abre un panel lateral flotante no modal, conserva visible y operable el lienzo y lleva el foco al mensaje. `Escape` o cerrar devuelve el foco a la burbuja. En móvil el panel ocupa casi todo el viewport respetando safe areas.
- Generar nunca modifica contenido: primero presenta resumen, tipo y extracto de cada widget; “Añadir al lienzo” es la única acción de escritura y debe poder deshacerse como una unidad.
- El panel conserva el historial de usuario, respuestas, propuestas aplicadas y descartadas mientras se permanece en el mismo lienzo, incluso si se cierra y vuelve a abrir. `Enter` envía y `Shift + Enter` crea una nueva línea.
- Durante la generación aparecen tres puntos animados en un bloque estable con estado anunciado; se desactiva un segundo envío y `prefers-reduced-motion` elimina el movimiento.
- Cada widget propuesto tiene selección independiente. Aplicar envía únicamente los seleccionados como una sola operación reversible; ninguna selección deja la acción deshabilitada.
- Confirmar una propuesta inicia colocación, no escritura inmediata: el panel se aparta, el conjunto conserva su layout en una previsualización azul y sigue el puntero hasta el clic. `Escape` cancela, el zoom se adapta a conjuntos grandes y, tras confirmar, la selección múltiple permite mover el grupo completo.
- Las propuestas pueden combinar todo el catálogo y describen una cuadrícula lógica de 12 columnas. KnowCanvas traduce filas, columnas y spans a geometría editable, usa la mayor altura de cada fila y conserva un orden de lectura estable; en estudio el contenido sigue siendo adaptable.
- Las imágenes encontradas en la web muestran descripción y atribución en la propuesta. Al aplicar se importan al Drive del usuario; el estado del botón comunica esta fase y un fallo no modifica el lienzo.
- En escritorio la colección admite tres columnas, pasa a dos por debajo de 900 px y a una por debajo de 620 px. El CTA ocupa el ancho disponible en móvil.
- Las fechas visibles se expresan también con semántica `time`; los títulos y descripciones admiten crecimiento controlado sin depender de una sola línea truncada.

### Primitivas accesibles de overlay y pestañas

- Los diálogos se renderizan mediante portal en `document.body`, aíslan el fondo con `inert`, bloquean su scroll, contienen el foco, cierran con `Escape` y devuelven el foco al control de origen.
- En móvil, el selector de recursos se presenta como sheet inferior; Excalidraw conserva una superficie de pantalla completa. Ambos comparten el mismo contrato accesible.
- Las pestañas usan un único tab stop, relaciones `aria-controls`/`aria-labelledby` y navegación con flechas, `Home` y `End`.
- Los menús de acciones son no modales: enfocan el primer ítem, admiten flechas, `Home`/`End`, cierran con `Escape` y devuelven el foco al disparador.
- Los popovers de formulario son no modales: enfocan el campo principal, cierran con `Escape` y restauran el foco sin aplicar trap ni volver inerte el lienzo.
- Una barra de formato es `toolbar`, no `menu`; conserva sus controles como botones normales y se mantiene separada de los subpopovers, como el editor de enlaces.
- Al pegar una imagen binaria dentro de texto enriquecido, el editor mantiene la posición de inserción y muestra un estado discreto de carga o un error recuperable dentro de su propia superficie. No abre el selector de recursos ni expulsa al usuario de la edición.
- Al pegar sobre el lienzo, la misma entrada crea un widget de imagen mediante el flujo compartido de recursos; el contexto activo decide si la imagen queda embebida en contenido o como objeto espacial.
- La barra fija de texto ofrece familia, tamaño y color junto a los formatos semánticos. Las familias se limitan a una selección segura y disponible en todos los destinos; el formato aplicado debe verse igual en autoría, estudio y exportación.
- Pestañas presenta una fila horizontal desplazable y un único panel activo. En estudio usa semántica ARIA completa, flechas/Home/End y mantiene un indicador de selección visible que no depende solo del color.
- Tarjetas reversibles muestra una única tarjeta, progreso ordinal y controles explícitos para girar y navegar. Cambiar de tarjeta restablece el anverso; el reverso se diferencia también mediante rótulo, no solo por el fondo.
- Línea temporal usa una lista vertical, una guía discreta y marcadores con borde para mantener contraste. Fecha, título y contenido conservan una jerarquía estable; en móvil no cambia el orden de lectura ni introduce desplazamiento horizontal.
- Imagen interactiva mantiene los puntos anclados por porcentaje al escalar. Cada marcador tiene número, nombre accesible, contraste y objetivo táctil; seleccionar uno muestra una única explicación enriquecida debajo de la imagen. En autoría, el doble clic añade puntos sin abandonar la edición del widget.
- Quiz diferencia respuesta única y múltiple mediante controles nativos `radio` y `checkbox`. La leyenda accesible explica cuántas respuestas elegir y el botón de comprobación permanece desactivado hasta que exista una selección.

### Estados canónicos del editor

- `canvas`: ningún objeto activo; el lienzo admite selección y creación mediante doble clic en espacio vacío.
- `selection`: uno o varios widgets seleccionados; aparecen contorno, asas y acciones espaciales únicamente cuando corresponden.
- `object`: edición interna exclusiva del widget activo; los demás widgets no reciben hover, foco ni eventos de puntero.
- `tool`: un menú, popover, selector o diálogo está operando sobre el objeto; sus controles espaciales quedan ocultos hasta cerrar la herramienta.
- La prioridad es `tool > object > selection > canvas`. Salir con `Escape` retrocede un nivel y un clic en espacio vacío limpia inspector y selección espacial conjuntamente.
- Las flechas mueven el widget seleccionado; `Alt + flechas` modifica su tamaño. `Shift` usa pasos de 10 px y el inspector ofrece entrada numérica equivalente.
- El shell de autoría ocupa `100dvh`; el canvas, no la página, contiene el desplazamiento espacial.
- El zoom admite 50–200% en pasos de 10%, controles visibles y atajos `Ctrl/Cmd +` y `Ctrl/Cmd -`. `Ctrl/Cmd 0` encaja todos los objetos sin ampliar por encima del 100%.
- El paneo se realiza con `Espacio + arrastre`, botón central o las barras de desplazamiento. Los gestos nunca son la única vía y navegar por el lienzo no cambia la selección activa.
- Arrastrar desde espacio vacío dibuja un rectángulo de selección por intersección; funciona en las cuatro direcciones y transforma sus coordenadas según el zoom.
- La selección múltiple también se construye con `Shift + clic`. Se representa mediante un único contorno envolvente —sin repetir bordes por widget— para que el conjunto se perciba como una unidad espacial. Una píldora compacta anclada al contorno conserva solo arrastre, identidad (`Grupo` o recuento), `Agrupar/Desagrupar` y `Más`; nunca se divide en varias filas. Duplicar, eliminar, alinear y distribuir viven en el menú secundario, no en Propiedades. El inspector describe composición, posición y tamaño del conjunto sin mezclar propiedades con herramientas. El clic derecho abre el mismo menú; doble clic entra en un miembro y `Escape` vuelve al grupo. Agrupar es persistente: seleccionar un miembro recupera el conjunto completo; todas las operaciones forman una sola entrada de deshacer.
- Desagrupar elimina únicamente la relación persistente: todos los miembros permanecen seleccionados como conjunto temporal hasta que el usuario haga clic fuera o cambie explícitamente la selección.

### Widget Mermaid

- En reposo y estudio muestra únicamente el SVG adaptable y su pie opcional.
- El doble clic entra en edición dividida: código Mermaid monoespaciado a la izquierda y preview Pele a la derecha. En anchos estrechos ambas zonas podrán apilarse durante la fase responsive.
- Los errores aparecen junto al preview, conservan el código y no expulsan al usuario del modo de edición.

### Lectura pública

- El enlace `/read/:projectId` abre directamente el visor de estudio, sin pantalla de acceso, controles de edición, inspector ni acciones de publicación.
- La cabecera identifica el libro como “Solo lectura”; volver conduce a la portada de KnowCanvas.
- Publicar muestra la acción de copia y el enlace explícito solo cuando el libro ya es público; si es privado, dirige al autor a cambiar primero el acceso en Propiedades.

### Perfil y conexión de IA

- El avatar y nombre forman un acceso global estable en biblioteca, autoría y estudio cuando existe una sesión; en anchos compactos se conserva el avatar con nombre accesible.
- El diálogo combina identidad, cierre de sesión y conexión OpenAI sin convertir la configuración en navegación principal.
- La clave secreta admite mostrar/ocultar, ayuda persistente, estado conectado y error junto al campo. Nunca se vuelve a mostrar una clave guardada; solo sus cuatro últimos caracteres.
- Si ya existe conexión, el formulario de clave permanece plegado y solo se revela mediante “Cambiar clave”; cancelar descarta el valor escrito sin modificar la conexión vigente.
- El perfil usa una única superficie blanca elevada. Los bloques internos no repiten marcos: privacidad y estado se expresan con fondos semánticos suaves; solo el campo editable y las acciones conservan límites de control.
