# PRD — KnowCanvas

## Visión y propósito

KnowCanvas permite crear, organizar, explorar y publicar experiencias interactivas de conocimiento. Su unidad central no es una página física sino un **lienzo semántico** que combina contenido estructurado, composición adaptable e interacción. Su lema configurable es “Build knowledge experiences.”

El producto evita tres modelos: no es un PowerPoint web basado en coordenadas, no es un LMS centrado en administración y no es un editor WYSIWYG que confunda contenido con representación.

## Usuarios y casos de uso

- **Autor educativo identificado con Google:** accede a su biblioteca, estructura una materia, compone lienzos, configura widgets y publica una versión estable.
- **Experto o divulgador:** convierte conocimiento complejo en una experiencia navegable y visual.
- **Estudiante:** recorre el árbol, consulta explicaciones, manipula modelos y recibe feedback de actividades.
- **Administrador del espacio de autoría (MVP):** protege el único entorno de edición y mantiene el despliegue.

## Modelo conceptual

- **Biblioteca:** colección privada de proyectos pertenecientes al usuario autenticado.
- **Proyecto o libro:** contenedor raíz de una experiencia y su configuración. `Project` es el término técnico; la interfaz puede presentarlo como “libro” cuando ayude al modelo mental.
- **Árbol:** jerarquía ordenada de carpetas y lienzos; organiza navegación, no representa un grafo de conocimiento.
- **Carpeta:** nodo contenedor que agrupa carpetas o lienzos.
- **Lienzo:** nodo hoja y unidad semántica con composición y widgets; nunca contiene nodos hijos.
- **Widget:** instancia versionada, validada y confiable con datos, configuración y presentación.
- **Publicación:** captura inmutable de un proyecto que no cambia cuando se edita el borrador.

La estructura, el contenido, la composición visual, el comportamiento y el formato de publicación son capas independientes.

## Alcance del MVP

1. Iniciar y cerrar sesión con una cuenta Google.
2. Crear y recuperar los proyectos/libros propiedad del usuario mediante API y D1.
3. Crear, renombrar, eliminar, ordenar y mover carpetas y lienzos válidos del árbol.
4. Componer lienzos mediante ventanas movibles y redimensionables sobre un espacio de autoría; derivar una lectura adaptable para estudio y publicación.
5. Añadir, configurar, eliminar y reordenar widgets RichText, Image, Diagram, Quiz e Interactive.
6. Ejecutar una simulación de péndulo basada en longitud y gravedad.
7. Navegar una experiencia en modo estudio sin controles de edición.
8. Publicar una instantánea web navegable con URL de lectura.
9. Incluir el proyecto demostrativo “Explorando la célula”.
10. Descargar el libro como lector HTML portable o paquete SCORM 1.2 importable en un LMS.

## Requisitos funcionales

- Autenticación Google mediante OpenID Connect y sesión propia segura.
- Cada proyecto pertenece a un usuario; ningún endpoint de autoría accede a proyectos ajenos.
- La identidad externa se vincula por emisor y `sub` estable de Google, no por dirección de email.
- IDs estables, orden explícito y prevención de ciclos o descendencia inválida.
- Validación Zod tanto en frontera HTTP como en datos de widgets.
- Estados visibles de guardado, error, carga y vacío.
- Selección explícita de widgets y panel contextual de propiedades con posición y tamaño.
- confirmación antes de borrados destructivos y protección ante escrituras inconsistentes.
- versión de esquema para widgets y publicaciones.
- navegación táctil y por teclado en estudio.
- fallback explícito cuando un formato no soporte un widget.
- exportación ZIP autocontenida con la plantilla del visor, imágenes privadas embebidas y manifiesto SCORM válido cuando corresponda.

## Propuestas del research pendientes de validación

El desk research de `RESEARCH.md` recomienda cuatro ajustes al MVP que todavía no se consideran alcance aprobado:

1. papelera básica y restauración mediante borrado lógico;
2. deshacer/rehacer durante la sesión, dejando el historial persistente para P1;
3. duplicación de lienzos, secciones y widgets;
4. retirada reversible de una URL publicada sin borrar su snapshot inmutable.

También recomienda que preview responsive, accesibilidad guiada, validación previa a publicar y alternativas sin drag-and-drop formen parte de los criterios de calidad del MVP. Estas capacidades concretan requisitos existentes y deberán convertirse en criterios verificables al aceptar las cuatro decisiones anteriores.

## Requisitos no funcionales

- TypeScript estricto de extremo a extremo; ejecución compatible con Workers.
- Interfaz accesible WCAG 2.2 AA como objetivo: teclado, foco visible, semántica, contraste y movimiento reducido.
- Diseño responsive: autoría optimizada para escritorio/tableta y estudio también para móvil.
- Pruebas unitarias para dominio, integración para API/D1 y E2E para flujos críticos.
- Migraciones versionadas, errores observables y ausencia de secretos en el repositorio.
- Rendimiento inicial: carga ágil en conexiones modernas y división de código cuando aporte valor medible.

## Criterios de aceptación

Un autor puede autenticarse con Google, acceder únicamente a su biblioteca, crear un proyecto/libro, construir su árbol de carpetas y lienzos, componer/configurar widgets, reordenar, guardar, cerrar y recuperar, estudiar, interactuar, publicar y abrir la publicación sin entrar al editor. Los datos sobreviven mediante D1; una publicación no cambia al modificar el borrador. Los flujos críticos tienen pruebas automatizadas y el despliegue documentado funciona en Cloudflare.

## Futuro, fuera del MVP

- colaboración multiusuario, permisos granulares y analítica educativa avanzada;
- grafo de conocimiento y referencias cruzadas completas;
- IA generativa o tutoría, independiente de proveedor y con aislamiento;
- exportadores PDF y EPUB;
- marketplace o ejecución de widgets arbitrarios de terceros;
- R2 hasta que exista una necesidad real de archivos multimedia.

## Exclusiones explícitas

No se ejecutará JavaScript arbitrario del usuario, no se inferirá aprendizaje por mera finalización, no se usarán coordenadas absolutas como modelo principal y no se abrirán endpoints de escritura en producción sin autenticación. Google solo aporta identidad en el MVP: no se solicitará acceso a Drive, Calendar, Gmail ni otros datos de la cuenta. Tener múltiples usuarios no implica colaboración, uso compartido o edición simultánea.
