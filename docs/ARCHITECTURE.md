# Arquitectura

> Actualización 2026-10-26: la unión discriminada de widgets incluye `accordion` v2. Su contrato persistente es independiente del renderer React y se exporta a HTML semántico mediante `details/summary`, siguiendo el mismo límite autoría → estudio → publicación que Quiz y Navegación.

`accordion` evoluciona a v2 para almacenar cada cuerpo como `RichTextNode`. La frontera de lectura transforma v1 mediante `markdownToDocument`; título y rótulos permanecen strings estructurales. Este patrón será el contrato compartido de los siguientes widgets educativos. RichText admite marcas tipográficas allowlisted (`textStyle`) para color, familia y tamaño sin almacenar ni ejecutar HTML de autor.

`tabs` nace como contrato v1 independiente aunque reutiliza el patrón `title + items + RichTextNode`. La separación conserva la intención semántica y permite que acordeón y pestañas evolucionen con comportamientos accesibles distintos sin condicionales de presentación persistidos.

`flashcards` conserva anverso y reverso como documentos RichText separados. La posición y la cara visible son estado efímero del lector; no se guardan en la composición. La exportación implementa su propio runtime seguro sin ejecutar código proporcionado por el autor.

`timeline` persiste una secuencia ordenada de hitos con `date`, `title` y `RichTextNode`. La fecha permanece como rótulo editorial validado y no como instante técnico, ya que el dominio educativo incluye eras, rangos y fases no representables por una fecha ISO única.

`hotspots` persiste una referencia de imagen y una colección de puntos con coordenadas porcentuales, rótulo y `RichTextNode`. El punto seleccionado no forma parte del documento. El exportador incorpora los recursos privados y reconstruye la interacción mediante un runtime limitado, sin ejecutar código de autor.

Quiz conserva un único contrato de opciones y añade `selectionMode: single | multiple` con lectura predeterminada `single`. La evaluación compara IDs, no rótulos: en respuesta múltiple exige igualdad exacta de conjuntos. React y el exportador implementan esta misma regla sin persistir el estado de respuesta.

## Resumen

Las credenciales OpenAI aportadas por el usuario se aíslan en `openai_credentials`. El Worker cifra y descifra mediante Web Crypto AES-GCM y un secreto de entorno independiente; el cliente solo maneja la clave durante el envío inicial y después recibe `configured`, `lastFour` y `updatedAt`. Las llamadas futuras a Responses API se harán exclusivamente desde el Worker.

`POST /api/ai/proposals` usa Responses API con `store: false`, búsqueda web y un JSON Schema cerrado que cubre los trece widgets y un layout lógico. El resultado se valida de nuevo como `AiProposal` y solo puede contener operaciones allowlisted. La previsualización es inerte; al aprobar, el cliente transforma la propuesta a contratos canónicos y realiza una única mutación de composición compatible con undo.

KnowCanvas es un monolito modular TypeScript desplegable como un único Cloudflare Worker con recursos estáticos. React/Vite construye la SPA; el Worker atiende `/api/*`; D1 será la fuente de verdad. Esta forma reduce coordinación operativa y conserva límites internos que permiten extraer piezas solo si aparece una necesidad real.

```text
Navegador (React SPA)
  ├─ acceso Google / biblioteca / editor / estudio / publicación
  └─ cliente HTTP tipado
             │ /api/*
Cloudflare Worker
  ├─ OIDC Google, sesión y middleware de autorización
  ├─ router HTTP
  ├─ servicios de aplicación
  ├─ dominio puro
  └─ repositorios D1 ── Cloudflare D1
                         └─ R2 (futuro, multimedia)
```

## Stack

- React 19, Vite 6 y plugin oficial `@cloudflare/vite-plugin`. Vite 6 es la línea más reciente compatible con el Node 22.11 disponible; el plugin oficial admite Vite 6–8.
- Tailwind CSS 4 como motor de estilos, con tokens y componentes propios.
- Lucide para iconografía; Zod para contratos y validación.
- Cloudflare Workers, D1 y migraciones Wrangler; Google Drive guarda los binarios creados por cada usuario.
- Vitest, Playwright, ESLint y Prettier.

La configuración sigue el patrón oficial React SPA + API: el Worker se ejecuta primero en `/api/*` y los recursos usan fallback SPA. No se añade un framework HTTP en la fundación: un router pequeño será suficiente hasta demostrar lo contrario.

## Capas y estructura objetivo

```text
src/
  client/                 interfaz React
    components/ features/ pages/ styles/
  config/                 marca y configuración no secreta
  domain/                 entidades, invariantes, errores
  application/            casos de uso y puertos
  infrastructure/         D1, repositorios, serialización
  shared/                 contratos sin dependencia de UI
  widgets/                registro e implementaciones confiables
  worker/                 entrada HTTP y adaptadores
tests/
  unit/ integration/ e2e/
migrations/               SQL versionado (Hito 2)
```

Las dependencias apuntan hacia el dominio: `worker/client → application → domain`. Infraestructura implementa puertos de aplicación. El cliente comparte esquemas de transporte, no accede a repositorios.

## Modelo de dominio y datos previsto

- `users(id, google_issuer, google_subject, email, display_name, avatar_url, created_at, updated_at, last_login_at)`
- `sessions(id, user_id, token_hash, expires_at, created_at, last_seen_at)`
- `projects(id, owner_user_id, name, description, metadata_json, settings_json, created_at, updated_at, revision)`
- `nodes(id, project_id, parent_id, kind, title, position, canvas_id, created_at, updated_at)`
- `canvases(id, title, description, composition_json, metadata_json, schema_version, revision)`
- `widgets(id, canvas_id, type, schema_version, position, config_json, data_json, presentation_json)`
- `publications(id, project_id, slug, version, snapshot_json, created_at)`

`users` identifica una cuenta Google por la pareja única `(google_issuer, google_subject)`; el email es información de perfil mutable y no una clave. Las sesiones guardan únicamente el hash SHA-256 de un token aleatorio. Cada consulta de autoría filtra por `owner_user_id`; conocer un ID no concede acceso.

En el dominio, un `Project` se presenta como proyecto/libro y es la raíz del árbol. Los nodos `container` se presentan como carpetas y los `canvas` como lienzos. Claves foráneas, restricciones de tipo, índices por propietario/padre/proyecto y transacciones protegerán consistencia. `revision` permitirá control optimista. El movimiento valida propiedad, existencia, tipo, proyecto, ciclos y destino, y recalcula el orden de hermanos en una transacción. Los JSON se validan al entrar y salir de persistencia.

## Contrato HTTP previsto

Respuestas de éxito: `{ data, meta? }`. Errores: `{ error: { code, message, details?, requestId? } }`. Fechas ISO 8601 y IDs opacos. Todas las mutaciones requieren contenido JSON válido y, cuando proceda, una revisión esperada.

```text
GET    /api/health
GET    /api/auth/google/start
GET    /api/auth/google/callback
POST   /api/auth/logout
GET    /api/me
GET    /api/projects
POST   /api/projects
GET    /api/projects/:projectId
PATCH  /api/projects/:projectId
DELETE /api/projects/:projectId
POST   /api/projects/:projectId/nodes
PATCH  /api/nodes/:nodeId
POST   /api/nodes/:nodeId/move
DELETE /api/nodes/:nodeId
GET    /api/canvases/:canvasId
PUT    /api/canvases/:canvasId
POST   /api/projects/:projectId/publications
GET    /api/publications/:slug
```

El único contrato implementado en Hito 1 es `GET /api/health`. El resto se concretará y probará en sus hitos.

## Identidad y sesión

KnowCanvas usará Google OpenID Connect con Authorization Code Flow y PKCE en el Worker. La solicitud usará `openid email profile`, `state` contra CSRF y `nonce` contra replay. El callback intercambiará el código en servidor, validará firma, `iss`, `aud`, expiración y `nonce` del ID token, y creará o actualizará el usuario.

El navegador recibirá una cookie de sesión opaca `HttpOnly`, `Secure`, `SameSite=Lax` y con duración limitada. D1 conservará solo su hash; cerrar sesión revoca la fila. Las mutaciones comprobarán sesión, origen y propiedad. `GOOGLE_CLIENT_SECRET` y la clave/secretos necesarios se almacenarán como secretos de Wrangler, nunca en `VITE_*` ni en el repositorio.

Por defecto la arquitectura admite cualquier cuenta Google válida. Un allowlist de emails o dominio, configurado en servidor, podrá cerrar una beta sin cambiar el modelo. Cloudflare Access puede añadirse como perímetro operativo, pero no sustituye la identidad ni la autorización de producto.

## Sistema de widgets

`Diagram` integra el paquete oficial `@excalidraw/excalidraw` como dependencia cliente cargada dinámicamente. La escena abierta (`elements`, `appState`, `files`) forma parte de los datos versionados del widget; Excalidraw no sustituye el lienzo semántico de KnowCanvas. El paquete pesado queda fuera del bundle inicial y solo se descarga cuando el usuario abre o estudia un diagrama.

`Pele` es un segundo tipo de diagrama orientado a autoría textual. Persiste Mermaid como fuente abierta (`source`, `caption`) y genera SVG en cliente mediante `pele/lazy`; los tipos de diagrama se dividen en chunks y se descargan al utilizarlos. La frontera de render limita entrada y salida y deshabilita enlaces e imágenes externas. Pele complementa a Excalidraw: texto reproducible para diagramas estructurados frente a escena libre para dibujo visual.

Cada widget puede incluir un `frame` de autoría (`x`, `y`, `width`, `height`, `z`). Estas coordenadas gobiernan únicamente el editor espacial. El modo estudio y las publicaciones presentan los widgets en flujo semántico adaptable, por lo que posición de autoría y representación de consumo continúan desacopladas.

Un `WidgetDefinition<TSchema>` registrará `type`, nombre, categoría, versión, esquema Zod, valores iniciales, renderizador, configurador, capacidades y representación estática opcional. Las instancias solo guardan datos serializables. El núcleo consulta el registro y nunca contiene ramas específicas de tipos. Las migraciones transforman versiones conocidas; un tipo desconocido se conserva y muestra como no compatible sin destruir datos.

Los widgets incluidos son código confiable. No se evalúan scripts, HTML sin sanear ni módulos suministrados por autores.

`sorting` v1 es el motor compartido de Clasificar, Ordenar y Relacionar. Persiste modo, instrucciones, elementos, destinos y solución mediante IDs estables; la respuesta del alumno es estado efímero del visor. React y HTML/SCORM implementan el mismo contrato con controles de clic y teclado. Un futuro drag-and-drop solo podrá actuar como acelerador y deberá conservar estas alternativas accesibles.

`navigation` v1 mantiene compatibilidad con el botón histórico y añade presentaciones declarativas `index` y `bar`. Ambas persisten una instantánea ordenada de páginas mediante IDs de lienzo y etiquetas editoriales; el inspector permite resincronizarla con el árbol sin acoplar el widget al renderer. Autoría desactiva los destinos, mientras Estudio y exportación resuelven enlaces internos sobre el mismo recorrido.

La composición persistida v2 es un almacén de objetos indexado por ID con `rootIds`, `parentId`, `slotId`, `order` y un `groupId` opcional para transformaciones conjuntas sin introducir contenedores ficticios. Sustituye la envoltura heredada de secciones/columnas y permite que una tabla mueva hijos con coordenadas relativas sin duplicar instancias. El editor y la API trabajan directamente con v2; la frontera de lectura acepta v1 y versiones tempranas de v2 y las migra. RichText y Table usan `schemaVersion: 2`. Las invariantes y la secuencia están documentadas en `CANVAS_MODEL_V2.md`.

## Persistencia y consistencia

`projects.access_level` define `private`, `public_read` o `public_edit`. Las lecturas aceptan al propietario o un libro público; las mutaciones de contenido aceptan al propietario o `public_edit`; las propiedades, permisos y eliminación siempre exigen propiedad. Estas reglas viven en los repositorios del Worker y la UI solo refleja la capacidad efectiva (`isOwner`, `canEdit`).

Los recursos binarios se almacenan en el Google Drive del usuario con el alcance mínimo `drive.file`; KnowCanvas solo puede gestionar archivos que él mismo haya creado. D1 conserva metadatos, propiedad y el identificador opaco de Drive. El navegador nunca recibe tokens ni una URL pública: el Worker autoriza cada lectura y sirve el contenido mediante `/api/resources/:id/content`. Para un libro público, valida que la composición referencia el recurso y usa la credencial del propietario del archivo, nunca la del visitante. Las composiciones solo conservan el ID estable y la URL interna. `POST /api/resources/import` incorpora imágenes web propuestas por IA: exige HTTPS público, sigue como máximo tres redirecciones, permite una lista cerrada de MIME y aplica el límite común de 10 MB antes de crear el archivo en Drive. Cuando la URL no es un binario descargable, usa la consulta de respaldo contra la API pública de Wikimedia Commons y aplica los mismos límites al resultado.

El refresh token de Drive se cifra con AES-GCM mediante `GOOGLE_TOKEN_ENCRYPTION_KEY` antes de almacenarse en D1. La aplicación renueva tokens de acceso en el Worker y no los expone al cliente.

D1 es la fuente de verdad. El cliente mantiene estado de edición y envía cambios explícitos/debounced; `localStorage` puede guardar preferencias no críticas, nunca el proyecto. Las operaciones multi-entidad usan `batch`/transacciones compatibles con D1. Las publicaciones almacenan una instantánea validada e inmutable para desacoplar lectura y borrador.

El libro de demostración usa `projects.seed_key` y una versión en `metadata_json`. Una versión nueva reemplaza únicamente el contenido del proyecto semilla de cada usuario una sola vez; nunca afecta proyectos creados por el usuario ni vuelve a sobrescribir el ejemplo mientras la versión no cambie.

## Seguridad

- validación estricta, límites de tamaño, CORS cerrado al origen y cabeceras seguras;
- consultas parametrizadas y mensajes de error sin detalles internos;
- OpenID Connect con mínimos scopes; no se almacenan tokens de acceso/refresh porque el MVP no llama APIs de Google;
- sesión opaca revocable, cookie segura, protección CSRF/origen y rotación tras autenticación;
- autorización por propietario en todos los repositorios y casos de uso, no solo en la UI;
- separación de endpoints públicos de lectura y endpoints protegidos de autoría;
- secretos exclusivamente mediante bindings/secrets de Cloudflare;
- futura carga multimedia con tipos permitidos, límites, nombres opacos y entrega segura desde R2.

## Publicación

La distribución web inicial usa un enlace vivo `/read/:projectId`. El cliente consulta `GET /api/public/projects/:projectId`, disponible sin sesión únicamente cuando el libro no es privado, y fuerza `isOwner=false` y `canEdit=false`. Esta ruta no sustituye los futuros snapshots: muestra el último borrador guardado y deja de funcionar al volver el libro a privado.

Las URLs de recursos conservan el proxy `/api/resources/:resourceId/content`. Para una solicitud anónima, el Worker verifica estructuralmente que la composición de un proyecto público contiene ese `resourceId`; después lee el archivo privado de Drive con la credencial del autor. No se cambia la visibilidad del fichero en Google Drive.

`Publisher` recibirá un proyecto normalizado y producirá un `PublicationSnapshot`. El exportador web es el primero; futuros exportadores implementarán el mismo puerto y consultarán capacidades/fallbacks de widgets. La ruta de publicación lee la instantánea, nunca el borrador.

La exportación descargable vive inicialmente en cliente y consume exclusivamente el `ProjectDetail` validado y ya persistido. Un generador común produce un lector HTML autocontenido; el empaquetador ZIP, sin dependencias externas, lo entrega como HTML portable o le añade `imsmanifest.xml` y el adaptador de runtime para SCORM 1.2. Las imágenes privadas servidas desde Drive se descargan con la sesión del autor y se incrustan como `data:` antes de crear el paquete, de modo que el LMS no depende de la cuenta Google. El adaptador SCORM inicializa/finaliza la sesión, conserva `lesson_location` y marca completado al alcanzar la última página.

Los widgets declaran una representación exportable. Texto, imágenes, tablas, navegación y Quiz mantienen contenido e interacción; los hijos de una tabla se serializan dentro de su celda. Mermaid se prerenderiza como SVG mediante Pele y conserva su fuente como fallback legible; Excalidraw informa del contenido de la escena hasta disponer de un render SVG estático. Nunca se ejecuta HTML o JavaScript introducido por el autor.

## Despliegue

## Navegación de estudio

La secuencia de estudio se deriva de `nodes` mediante un recorrido en profundidad que respeta `position` entre hermanos. Las carpetas estructuran el recorrido pero no crean hojas; todo nodo `canvas`, aunque tenga descendientes, sí forma parte de la secuencia. Esta derivación vive en dominio y es independiente de React para poder reutilizarla en publicaciones y exportadores.

Los layouts de estudio son presentaciones efímeras de una misma composición y no alteran D1. `outline`, `reader`, `magazine` y `presentation` cambian navegación y disposición responsive, nunca el contenido ni las coordenadas de autoría persistidas.

`projects.settings_json` se valida como `ProjectSettings` y conserva `viewerTemplate` y `theme`. Los proyectos anteriores reciben `outline` y `minimal` al leer ajustes incompletos. La actualización usa la revisión optimista del proyecto. Estudio consume estos ajustes desde el detalle cargado y HTML/SCORM los incrustan en el documento exportado; el visor exportado nunca consulta el borrador vivo.

## Despliegue

`vite build` produce cliente y Worker mediante el plugin oficial. `wrangler deploy` despliega el artefacto. Se requieren una base D1 creada, su `database_id`, migraciones aplicadas y protección de autoría antes de producción. Preview/local usan estado aislado de Wrangler.

El primer entorno remoto vive en `knowcanvas.jorge-dieguez.workers.dev` y usa `knowcanvas-db` en WEUR. La fototeca depende de Google Drive API y de una autorización `drive.file` vigente para cada usuario.

## Decisiones y alternativas

- **SPA + Worker frente a SSR:** el editor es una aplicación privada e interactiva; SSR no compensa todavía. Una publicación podría prerenderizarse en el futuro.
- **SQL y repositorios explícitos frente a ORM:** se prefiere menor superficie y control de D1; revisar si crece el modelo.
- **Monolito modular frente a microservicios:** menos despliegues y contratos remotos; los límites internos cubren el MVP.
- **Bloques/secciones frente a lienzo absoluto:** preserva semántica, responsive y exportabilidad.
- **OIDC Google en la aplicación frente a Cloudflare Access como identidad:** la aplicación necesita un sujeto estable para propiedad y futura colaboración. Access puede restringir el despliegue, pero no sustituye el modelo de usuario.
- **Proyecto técnico, libro como modelo mental:** se conserva `Project` en contratos y base de datos; la interfaz comunica una biblioteca de libros, carpetas y lienzos para reducir ambigüedad al autor.
