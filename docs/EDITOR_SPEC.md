# Especificación de la experiencia de edición

Estado: aprobada como dirección de producto el 2026-10-11. Este documento es el contrato vivo para implementar el editor paso a paso. Los estados `[ ]`, `[~]` y `[x]` indican pendiente, en curso y terminado.

## Principios

- La autoría es espacial: cada widget es una unidad de contenido movible y redimensionable.
- La metáfora espacial no añade “cromo” permanente: en reposo el widget es solo contenido; contorno, asas y acciones aparecen únicamente al seleccionarlo.
- Seleccionar, mover y editar contenido son acciones diferentes para evitar modificaciones accidentales.
- El contenido, su posición de autoría y su representación en estudio/publicación permanecen separados.
- Toda operación de arrastre tendrá alternativa mediante teclado o panel de propiedades.
- El editor debe sentirse inmediato: cambios locales optimistas, autoguardado visible y recuperación clara.

## Selección y edición interna

- [x] La interacción usa tres estados excluyentes: `canvas` muestra selección y acciones espaciales; `object` edita el contenido y conserva únicamente contorno y asas de tamaño; `tool` muestra menú, diálogo o herramienta sin marcadores del lienzo ni del objeto.
- [x] El menú de contenido se abre al seleccionar texto, al seleccionar imágenes o tablas internas y mediante clic derecho dentro del editor.
- [x] Clic en el fondo deselecciona cualquier widget y muestra las propiedades del lienzo.
- [x] Clic en un widget reemplaza cualquier selección anterior, lo lleva visualmente al frente y abre su inspector; la selección se confirma en `pointerdown` para responder sin retraso.
- [x] Un clic no modifica el contenido del widget.
- [x] Doble clic o `Enter` entra en edición interna.
- [x] `Escape` retrocede un nivel: cierra la herramienta, sale de la edición interna manteniendo la selección y, desde selección de canvas, deselecciona.
- [~] Texto muestra cursor y formato; diagrama abre Excalidraw. Pendiente activar controles internos específicos de imagen.

## Barra contextual del widget

- [x] Aparece sobre el widget seleccionado.
- [x] Incluye asa de arrastre, duplicar, capas, bloquear y eliminar.
- [ ] El menú `•••` contiene las acciones secundarias.
- [x] Desaparece al deseleccionar y no forma parte del contenido publicado.

## Movimiento

- [x] El widget se mueve desde un asa independiente del contenido.
- [x] Se muestran guías al alinear bordes o centros con otros widgets.
- [x] `Shift` restringe el movimiento al eje dominante.
- [x] Las flechas desplazan 1 px; `Shift + flecha` desplaza 10 px.
- [x] El panel permite introducir las coordenadas sin arrastrar.

## Redimensionado

- [x] Los widgets de texto crecen automáticamente con el contenido y no muestran scroll en modo automático. Un redimensionado manual posterior fija sus dimensiones y habilita el desbordamiento interno.
- [x] Un widget de texto puede insertar imágenes desde la biblioteca o una URL en la posición del cursor; la imagen forma parte del documento rico y de su cálculo de altura.

- [x] El widget seleccionado ofrece controles de redimensionado.
- [x] Hay ocho asas en bordes y esquinas: mantienen un punto visual de 12 px, un objetivo de puntero de 24 px y la captura del arrastre aunque el cursor salga del widget.
- [x] El redimensionado se representa localmente durante el gesto y se confirma como una sola operación al soltar, evitando rerenders e historial por cada píxel.
- [x] `Shift` conserva la proporción al redimensionar desde una esquina.
- [ ] Cada tipo de widget define un tamaño mínimo apropiado.
- [ ] Acciones rápidas: ancho automático, medio y completo.
- [x] El panel permite introducir ancho y alto sin arrastrar.

## Inserción

- [x] El botón `+` abre un catálogo buscable de widgets y `/` abre comandos contextuales de texto.
- [x] Pulsar un espacio vacío del lienzo crea allí un bloque de texto vacío, entra en edición y coloca el cursor.
- [x] Si el usuario abandona ese bloque sin contenido, se elimina; al abrir un lienzo también se purgan residuos de texto vacío guardados anteriormente.
- [~] Los widgets del catálogo usan una posición escalonada; los bloques creados desde el lienzo aparecen junto al cursor.
- [x] El bloque de texto seleccionado muestra a su izquierda un `+` y un asa de movimiento inspirados en Notion.
- [x] El `+` lateral abre un menú contextual de texto, imagen y diagrama.
- [x] Arrastrar imágenes al lienzo las optimiza, guarda en la biblioteca y crea el widget.
- [~] Pegar una URL en el fondo abre el flujo de imagen con la dirección precargada; pendiente ofrecer enlace y otros recursos.

## Texto enriquecido

- [x] El contenido se guarda como árbol JSON versionado; Markdown es una vista portable y editable, pero no la fuente de verdad para bloques con identidad y propiedades.
- [x] La edición normal es visual y enriquecida. La fuente Markdown solo aparece cuando el usuario solicita `Ver código`.
- [x] Seleccionar contenido abre un menú vertical contextual compacto inspirado en Notion: tipo de bloque y acciones de formato disponibles; no muestra funciones inactivas ni existe una barra fija en el widget. Las opciones adicionales de KnowCanvas quedan agrupadas bajo `Más opciones`.
- [x] El menú de texto se renderiza como una capa global fuera del DOM del widget; no altera sus dimensiones ni queda recortado por él. El widget representa un fragmento autónomo de contenido rico, no la interfaz completa del editor.
- [x] Los comandos `/` insertan encabezados, listas, citas, enlaces, tablas e imágenes.
- [x] Los enlaces se crean y editan en un panel unido al menú contextual, con URL o página interna; una selección sin enlace siempre abre el campo vacío y no hereda el vínculo anterior.
- [ ] Pegar imágenes las incorpora a la biblioteca de recursos.
- [x] Una imagen es un nodo de primera clase con ID estable dentro del flujo; tiene selección propia, redimensionado proporcional, alineación, texto alternativo y pie editables desde el inspector.
- [ ] Una tabla de contenido puede insertarse dentro del flujo del texto y admite filas, columnas, encabezados y edición por teclado.
- [x] Las imágenes y tablas internas se mueven con el widget de contenido y forman parte de su orden de lectura.
- [x] Padre e hijo no muestran controles de transformación simultáneamente: al seleccionar una imagen interna desaparecen las asas del contenedor; `Escape` vuelve del hijo al ámbito del contenido.
- [x] Las imágenes de biblioteca conservan sus URL relativas y siguen visibles en edición, lectura y publicación.

## Contenedores y tablas de maquetación

- [x] El catálogo del lienzo incluye un widget `Tabla` independiente de las tablas de contenido del editor de texto.
- [x] La tabla de lienzo funciona como contenedor de maquetación: cada celda puede alojar uno o varios widgets.
- [x] Los widgets contenidos conservan su tipo y propiedades; su posición se expresa respecto a la celda, no respecto al lienzo.
- [ ] Mover, redimensionar, duplicar, bloquear o eliminar la tabla afecta al conjunto de forma coherente.
- [~] Un widget puede colocarse o soltarse dentro de una celda y sacarse al lienzo sin perder contenido; pendiente moverlo directamente entre celdas y pulir el gesto táctil.
- [ ] Filas y columnas se pueden añadir, eliminar y redimensionar; eliminar una celda con contenido exige elegir un destino o confirmar el borrado.
- [ ] La tabla ofrece separación, relleno, fondo, bordes y alineación sin mostrar cromo permanente cuando no está seleccionada.
- [ ] El orden de lectura se almacena por filas y celdas y sirve como fallback adaptable para estudio, móvil y publicación.
- [x] No se permite que un contenedor se contenga a sí mismo ni crear ciclos de contenedores.
- [x] La primera versión de interfaz admite un nivel de tabla; el anidamiento de tablas queda reservado hasta validar la experiencia.

## Panel de propiedades

- [x] El contenido cambia según la selección.
- [x] Muestra tipo, versión, posición, tamaño y metadatos específicos.
- [x] Se organiza en `Contenido`, `Diseño` y `Comportamiento`.
- [x] `Contenido` previsualiza el texto enriquecido sin exponer Markdown y edita los metadatos de imagen; el diagrama deriva a Excalidraw.
- [~] `Diseño` edita posición, tamaño y muestra profundidad; añadirá fondo, borde y alineación.
- [~] `Comportamiento` permite bloquear; pendiente configurar estudio, visibilidad e interacción.
- [ ] Los cambios se reflejan inmediatamente y participan en deshacer/rehacer.

## Selección múltiple y organización

- [x] `Shift + clic` añade o retira widgets de la selección. Una selección múltiple no muestra acciones ni asas individuales; un clic sin modificador convierte el widget pulsado en la única selección y habilita entonces movimiento y redimensionado.
- [ ] Arrastrar sobre el fondo crea un rectángulo de selección.
- [ ] Una selección múltiple puede moverse, duplicarse, eliminarse y editar propiedades comunes.
- [x] Alinear izquierda, centro, derecha, arriba y abajo desde una única barra de selección múltiple.
- [x] Distribuir horizontal o verticalmente cuando hay tres o más widgets seleccionados.
- [ ] Ajuste opcional a cuadrícula y acción automática `Ordenar`.

## Capas y bloqueo

- [~] Traer al frente y enviar al fondo. Pendiente adelantar y atrasar un nivel.
- [ ] Lista opcional de capas en el inspector.
- [x] Bloquear evita mover, redimensionar o editar accidentalmente.
- [x] Desbloquear está disponible desde la barra contextual y el panel.

## Copiar, duplicar y eliminar

- [ ] `Cmd/Ctrl + D` duplica la selección.
- [ ] Copiar y pegar conserva contenido, tamaño y estilo.
- [ ] Se pueden copiar widgets entre lienzos del mismo libro.
- [x] Eliminar es inmediato para un widget individual; se añadirá deshacer antes de operaciones de mayor impacto.
- [~] Tras eliminar se puede deshacer desde la barra y el teclado; pendiente el aviso temporal contextual.

## Guardado e historial

- [~] Estados visibles: `Sin guardar`, `Guardando…`, `Guardado` y error.
- [x] Autoguardado con debounce después de contenido, posición, tamaño y operaciones de widgets.
- [x] Los cambios locales continúan mientras una escritura está en curso y disparan un guardado posterior.
- [ ] Los conflictos permiten recargar o conservar una copia de los cambios.
- [x] `Cmd/Ctrl + Z` y `Shift + Cmd/Ctrl + Z` cubren contenido y operaciones espaciales fuera de campos con historial nativo.
- [x] El historial de la sesión está limitado a 100 estados de deshacer y 100 de rehacer.

## Navegación del lienzo

- [x] En edición, el lienzo es una superficie continua sin límites visuales de página y ocupa toda el área de trabajo disponible.
- [x] La presentación centrada tipo documento se reserva para el modo Estudiar.
- [ ] Zoom mediante controles, rueda modificada y gesto de trackpad.
- [ ] Pan manteniendo `Espacio` y arrastrando.
- [ ] Acción `Encajar todo` calcula el área ocupada.
- [ ] Mini mapa solo cuando el tamaño del lienzo lo justifique.

## Estudio y publicación

- [x] Estudio elimina asas, selección e inspector de edición.
- [~] El contenido se presenta en flujo semántico adaptable.
- [ ] Escritorio podrá respetar una composición espacial cuando sea legible.
- [ ] Pantallas estrechas usarán orden de lectura vertical explícito.
- [ ] Cada widget define fallback estático y descripción accesible.

## Móvil y tableta

- [~] El inspector se abre como panel superpuesto en móvil.
- [ ] Móvil prioriza edición de contenido frente a colocación precisa.
- [ ] Mover y redimensionar requieren un modo explícito en pantallas táctiles.
- [ ] La experiencia espacial completa se optimiza para escritorio y tableta.

## Accesibilidad

- [ ] Selección, movimiento, redimensionado, capas y borrado funcionan sin arrastrar.
- [ ] El foco visible distingue selección de edición interna.
- [ ] Los cambios de guardado y las operaciones espaciales importantes se anuncian.
- [ ] El orden de lectura se almacena explícitamente y no depende de coordenadas.
- [ ] Se respeta movimiento reducido.

## Secuencia de implementación

1. Selección frente a edición interna, doble clic, `Enter` y `Escape`.
2. Barra flotante, duplicar, eliminar, bloquear y capas.
3. Inspector con pestañas y propiedades editables específicas.
4. Inserción mediante `+`, `/`, pegado y arrastre de archivos.
5. Autoguardado y deshacer/rehacer.
6. Movimiento y redimensionado avanzados con teclado y guías.
7. Selección múltiple, alineación y distribución.
8. Zoom, pan, encajar contenido y adaptación táctil.
