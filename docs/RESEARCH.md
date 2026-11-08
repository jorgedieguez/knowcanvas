# Research funcional y de producto

Fecha: 2026-10-09  
Estado: desk research completado; las decisiones marcadas como **por validar** no modifican todavía la arquitectura.

Decisión posterior incorporada: identidad Google y modelo mental biblioteca → proyecto/libro → carpetas → lienzos.

## Objetivo y método

Este análisis contrasta KnowCanvas con herramientas de conocimiento, pizarras visuales, autoría educativa, simulación y publicación. Se han priorizado fuentes oficiales y estándares; no sustituye entrevistas o pruebas con usuarios reales.

Preguntas de investigación:

1. ¿Qué capacidades esperan los autores de una herramienta moderna?
2. ¿Qué hace que una experiencia sea educativa e interactiva, no solo visual?
3. ¿Qué necesita el modelo para no bloquear reutilización, accesibilidad o nuevos formatos?
4. ¿Qué debe entrar en el MVP y qué conviene aplazar?

## Hallazgos comparativos

| Referente     | Patrón relevante                                                                                         | Lección para KnowCanvas                                                                        | Copiar con cautela                                                      |
| ------------- | -------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Notion        | Bloques, duplicación, contenido sincronizado, papelera e historial restaurable                           | Los autores esperan operaciones reversibles y reutilización sin copiar manualmente             | Los bloques sincronizados introducen dependencia y permisos; no son MVP |
| Rise 360      | Lecciones por bloques responsive, plantillas, preview por dispositivo, quiz, publicación y accesibilidad | La composición fluida y la vista previa contextual validan la “opción B” de KnowCanvas         | Evitar convertir KnowCanvas en catálogo de cursos o LMS                 |
| H5P           | Tipos de contenido, importar/exportar, copiar partes y reutilizar interacciones                          | Un widget debe ser portable, versionado y declarar compatibilidad                              | Su ecosistema amplio también evidencia coste de migración y seguridad   |
| Miro/FigJam   | Marcos/secciones, plantillas, navegación y presentación; inspector contextual                            | Secciones semánticas y selección contextual funcionan mejor que coordenadas para este producto | No adoptar lienzo infinito como modelo central                          |
| Figma widgets | Registro, versiones manuales, permisos y riesgo explícito del código de terceros                         | La versión del esquema y el aislamiento no son opcionales para widgets externos                | No abrir marketplace ni ejecutar terceros durante el MVP                |
| PhET          | Exploración guiada, parámetros visibles y modelos multimodales                                           | Una simulación debe mostrar relaciones causales, unidades, reset y explicación                 | No medir aprendizaje solo por manipulación o tiempo de uso              |
| GeoGebra      | Herramientas dinámicas, recursos compartibles y tareas con feedback                                      | Interactividad reutilizable y feedback inmediato aportan valor educativo                       | No intentar construir un motor matemático generalista                   |
| Quarto        | Una fuente estructurada puede producir HTML, PDF, EPUB y otros formatos                                  | Contenido y salida deben seguir desacoplados; cada widget necesita capacidades/fallback        | No implementar todos los exportadores antes de estabilizar el modelo    |

### Evidencia destacada

- Notion registra versiones durante la edición, permite inspeccionar cambios y restaurar estados anteriores. Esto confirma que recuperabilidad e historial son expectativas de herramientas de autoría, aunque una implementación completa pueda esperar ([Notion: version history](https://www.notion.com/en-gb/help/duplicate-delete-and-restore-content)).
- Rise compone lecciones apilando bloques responsive, permite plantillas de bloques y preview en escritorio, tableta y móvil. También incorpora navegación por teclado, texto alternativo y captions en la experiencia publicada ([Rise 360: features](https://www.articulate.com/360/rise/all/), [preview](https://community.articulate.com/series/rise/articles/rise-user-guide-how-to-preview-a-course/)).
- H5P se define alrededor de tipos de contenido que se crean, comparten y reutilizan; permite exportar paquetes y copiar partes compatibles entre contenidos ([H5P author guide](https://h5p.org/documentation/for-authors), [reuse content](https://h5p.org/node/442225)).
- Figma no actualiza widgets automáticamente para proteger los datos existentes, muestra historial de versiones y advierte que widgets de terceros ejecutan código o iframes con acceso al documento. Esto respalda el registro confiable y las migraciones explícitas de KnowCanvas ([Figma widgets](https://help.figma.com/hc/en-us/articles/4410047809431-Use-widgets-in-files)).
- PhET diseña simulaciones multimodales capaces de expresar objetos, estados, relaciones y cambios por medios visuales, auditivos o táctiles; su material docente enfatiza exploración, objetivos y facilitación, no animación decorativa ([PhET inclusive design](https://phet.colorado.edu/en/inclusive-design), [teaching resources](https://phet.colorado.edu/en/teaching-resources/facilitatingActivities)).
- Quarto soporta HTML, PDF, Word y EPUB desde contenido estructurado, y permite contenido condicional según capacidades de formato. Confirma la necesidad de una capa de exportación y fallbacks por widget ([Quarto formats](https://quarto.org/docs/reference/formats/), [conditional content](https://quarto.org/docs/authoring/conditional.html)).

## Principios de producto derivados

1. **Autoría reversible.** Una herramienta creativa debe permitir deshacer acciones locales, recuperar eliminaciones y evitar sobrescrituras silenciosas.
2. **Preview real, no miniatura.** El autor debe probar navegación e interacción con tamaños representativos antes de publicar.
3. **Accesibilidad durante la creación.** KnowCanvas debe ayudar a producir contenido accesible, no limitarse a que su propia interfaz sea accesible. ATAG distingue precisamente interfaz de autoría accesible y soporte para crear contenido accesible ([W3C ATAG](https://www.w3.org/WAI/standards-guidelines/atag/)).
4. **Interactividad con propósito.** Los widgets deben declarar objetivo, estado, parámetros, feedback y alternativas, cuando aplique.
5. **Portabilidad progresiva.** El proyecto y los widgets necesitan esquemas versionados y serializables incluso antes de ofrecer importación/exportación.
6. **Publicación comprobable.** Publicar debe validar compatibilidad, accesibilidad básica y producir una versión inmutable identificable.
7. **Complejidad gradual.** Reutilización, colaboración, analítica y LMS aportan valor, pero no deben diluir el núcleo de crear–explorar–publicar.

## Capacidades recomendadas

### P0 — MVP

Estas capacidades refuerzan criterios ya existentes o cierran riesgos esenciales:

- árbol y lienzos con operaciones por teclado además de drag-and-drop;
- guardado real con `revision`, detección de conflicto y recuperación accionable;
- deshacer/rehacer durante la sesión para operaciones del árbol y composición;
- papelera o borrado recuperable para proyectos/nodos/lienzos;
- duplicar lienzo, sección y widget;
- preview de autoría en escritorio, tableta y móvil usando el mismo renderer de estudio;
- validación previa a publicar con errores y advertencias diferenciados;
- ayudas de accesibilidad: alt text o marca decorativa, estructura de encabezados, nombres de controles, contraste y alternativa a gestos;
- registro versionado de widgets, migración explícita y conservación de datos desconocidos;
- en simulaciones: unidades, límites válidos, reset, pausa si hay movimiento, explicación del modelo y representación no interactiva;
- en Quiz: feedback por opción, reintento configurable, estado anunciado y explicación de respuesta;
- listado de publicaciones con fecha/versión y posibilidad de retirar una URL sin borrar la instantánea.

### P1 — Primera evolución tras el MVP

- plantillas de proyecto, lienzo y sección;
- bloques reutilizables con copia independiente; sincronización compartida solo después de estudiar permisos y dependencias;
- archivo portable del proyecto (JSON validado + manifiesto; activos cuando exista R2);
- historial de versiones restaurable más allá del undo de sesión;
- enlace de revisión protegido y comentarios contextuales;
- comprobador de accesibilidad con resumen antes de publicar;
- biblioteca multimedia, captions y transcripciones;
- localización de contenido y etiquetas del visor;
- widgets adicionales: vídeo/audio, tabla, fórmula/código, cronología, hotspot, embed seguro y fuentes/citas;
- bancos de preguntas y más tipos de respuesta;
- referencias cruzadas entre lienzos sin reemplazar el árbol por un grafo.

### P2 — Expansión

- escenarios ramificados y reglas de navegación;
- colaboración multiusuario, roles y presencia;
- analítica educativa con consentimiento y propósito definido;
- LTI 1.3 para integrarse como herramienta en un LMS;
- xAPI/cmi5 para emitir evidencia de experiencias hacia un LRS;
- exportadores PDF/EPUB/HTML estático con informe de degradación;
- catálogo de widgets revisados y aislados;
- asistencia de IA con trazabilidad, revisión humana y proveedor intercambiable.

LTI permite que plataformas educativas integren herramientas remotas mediante un contrato estándar y seguro; xAPI representa eventos de aprendizaje como declaraciones almacenables en un LRS. Ambos son valiosos para integración futura, pero añaden identidad, privacidad, certificación y semántica que no corresponden al MVP ([1EdTech LTI 1.3](https://standards.1edtech.org/lti/guides/implementation_guide/implementation-guide), [ADL xAPI/cmi5](https://www.adlnet.gov/assets/uploads/cmi5%20Best%20Practices%20Guide%20-%20From%20Conception%20to%20Conformance.pdf)).

## Flujos objetivo

### Autor

```text
Crear/abrir proyecto
  → construir árbol
  → abrir lienzo
  → añadir sección/columnas/widgets
  → configurar contenido e interacción
  → preview y comprobaciones
  → resolver errores
  → publicar versión inmutable
  → copiar/retirar enlace
```

Puntos de seguridad: guardado visible en cada transición, confirmación recuperable para borrados, undo local y conflicto de revisión antes de sobrescribir.

### Estudiante

```text
Abrir publicación
  → comprender posición y objetivos
  → navegar o avanzar
  → leer/explorar/manipular
  → responder y recibir feedback
  → reintentar o continuar
```

El visor no muestra edición. La exploración no se presenta como evidencia de dominio y el progreso local no se confunde con evaluación.

### Publicación

```text
Borrador validado
  → resolver incompatibilidades obligatorias
  → crear snapshot + manifiesto de capacidades
  → asignar versión/URL
  → servir solo lectura
  → conservar borrador independiente
```

## Oportunidad de diferenciación

KnowCanvas no debería competir por tener más bloques que H5P o un lienzo más libre que Miro. Su propuesta más clara es:

> Crear experiencias de conocimiento estructuradas que puedan explicar, mostrar, dejar explorar y comprobar comprensión, conservando significado al cambiar de dispositivo o formato.

Cuatro patrones pueden hacer visible esa propuesta:

- **Explica:** texto, imagen, fuentes y relaciones.
- **Explora:** diagrama, datos y simulación manipulable.
- **Practica:** pregunta, reto y feedback.
- **Reflexiona:** observación, comparación o conclusión sin convertirla automáticamente en nota.

Estos patrones son plantillas semánticas futuras, no tipos rígidos de lienzo.

## Accesibilidad como capacidad de autoría

Objetivo: WCAG 2.2 AA para editor y publicación, junto con principios ATAG. WCAG 2.2 exige conformidad de la página completa, incluidas sus variaciones responsive ([WCAG 2.2](https://www.w3.org/TR/WCAG22/)).

Consecuencias funcionales:

- todos los movimientos por arrastre tienen alternativa sin arrastre;
- la vista de edición expone estructura programáticamente;
- preview conserva teclado y lectores de pantalla;
- los esquemas de widget incluyen los campos accesibles pertinentes;
- contenido no textual solicita alternativa o decisión decorativa explícita;
- el sistema avisa, ayuda a corregir y preserva la información accesible al publicar/exportar;
- simulaciones ofrecen controles textuales y estado comprensible además del gráfico.

## Decisiones de alcance por validar

Antes del Hito 2 conviene confirmar estas cuatro decisiones porque afectan datos o esfuerzo:

1. **Papelera MVP:** recomendada. Añadir `deleted_at` y restauración básica; evita pérdidas y es barata si se diseña ahora.
2. **Undo de sesión MVP:** recomendado. Historial granular persistente queda P1; el Hito 2 solo necesita comandos reversibles y control de revisión.
3. **Duplicación MVP:** recomendada para lienzos/widgets; plantillas y bloques sincronizados quedan P1.
4. **Publicación retirable:** recomendada. Una publicación es inmutable, pero su URL puede activarse/desactivarse sin borrar el snapshot.

## Riesgos y mitigaciones

| Riesgo                             | Consecuencia                                 | Mitigación                                                                    |
| ---------------------------------- | -------------------------------------------- | ----------------------------------------------------------------------------- |
| Demasiados widgets al principio    | Superficie inconsistente y difícil de probar | Mantener cinco tipos y exigir contrato común                                  |
| Editor y estudio divergen          | Preview engañoso y doble mantenimiento       | Compartir renderer; envolverlo con capacidades por modo                       |
| Autosave sobrescribe cambios       | Pérdida silenciosa                           | Revisión optimista, debounce observable y reintento explícito                 |
| Drag-and-drop como única vía       | Exclusión por teclado/tacto                  | Menús mover arriba/abajo/a… y patrones ARIA probados                          |
| Simulación decorativa o incorrecta | Daño pedagógico                              | Modelo documentado, unidades, límites y pruebas numéricas                     |
| Exportadores diseñados tarde       | Contenido atrapado en HTML                   | Capabilities/fallbacks desde el registro de widgets                           |
| Widgets de terceros prematuros     | Ejecución insegura y migraciones rotas       | Solo código confiable; aislamiento/revisión en fase futura                    |
| Analítica sin propósito            | Privacidad y métricas engañosas              | No recopilar en MVP; definir preguntas y consentimiento antes de instrumentar |

## Siguiente investigación con usuarios

El desk research no valida usabilidad ni disposición a adoptar el producto. Antes de ampliar el alcance se recomiendan cinco entrevistas con autores y tres tests sobre un prototipo funcional. Tareas a observar:

1. crear un árbol de cinco lienzos;
2. transformar contenido existente en una experiencia;
3. configurar una interacción y explicar qué aprendería el estudiante;
4. detectar y corregir un problema de accesibilidad;
5. publicar, modificar el borrador y distinguir ambas versiones.

Métricas cualitativas: comprensión del modelo árbol–lienzo–widget, confianza en guardado/publicación, errores de estructura, descubrimiento de preview y capacidad de anticipar la experiencia del estudiante.

## Fuentes principales

- [Notion: synced blocks](https://www.notion.com/help/synced-blocks) y [version history](https://www.notion.com/en-gb/help/duplicate-delete-and-restore-content)
- [Rise 360: características](https://www.articulate.com/360/rise/all/)
- [H5P: documentación de autor](https://h5p.org/documentation/for-authors) y [reutilización](https://h5p.org/node/442225)
- [Miro: frames](https://help.miro.com/hc/en-us/articles/360018261813-Frames)
- [Figma: widgets y seguridad](https://help.figma.com/hc/en-us/articles/4410047809431-Use-widgets-in-files)
- [PhET: diseño inclusivo](https://phet.colorado.edu/en/inclusive-design)
- [GeoGebra: plataforma y recursos](https://www.geogebra.org/about)
- [Quarto: formatos](https://quarto.org/docs/reference/formats/)
- [W3C: ATAG](https://www.w3.org/WAI/standards-guidelines/atag/) y [WCAG 2.2](https://www.w3.org/TR/WCAG22/)
- [1EdTech: LTI 1.3](https://standards.1edtech.org/lti/guides/implementation_guide/implementation-guide)
- [ADL: xAPI/cmi5](https://www.adlnet.gov/assets/uploads/cmi5%20Best%20Practices%20Guide%20-%20From%20Conception%20to%20Conformance.pdf)
