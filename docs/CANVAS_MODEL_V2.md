# Plan de migración del modelo de lienzo v2

Estado: núcleo implementado el 2026-10-12.

## Objetivo

Sustituir progresivamente la composición heredada `sections → columns → widgets` por un almacén de objetos espaciales indexado por ID. El modelo debe admitir contenido estructurado, contenedores, coordenadas relativas, migraciones y futura colaboración sin perder lienzos existentes.

## Contrato persistido

```json
{
  "version": 2,
  "rootIds": ["widget-1", "table-1"],
  "objects": {
    "widget-1": {
      "id": "widget-1",
      "type": "richText",
      "schemaVersion": 2,
      "parentId": null,
      "slotId": null,
      "order": 0,
      "frame": { "x": 40, "y": 60, "width": 520, "height": 340, "z": 0 },
      "data": {
        "document": {
          "type": "doc",
          "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "Contenido" }] }]
        }
      }
    }
  }
}
```

`parentId` identifica el objeto contenedor. `slotId` identifica una celda o región dentro de ese contenedor. Los objetos raíz tienen ambos campos a `null`. `groupId` es opcional y relaciona objetos que deben seleccionarse y transformarse conjuntamente sin cambiar su jerarquía ni coordenadas. La clave de `objects` debe coincidir con el `id` del objeto.

## Invariantes

- Todos los `rootIds` existen, son únicos y apuntan a objetos sin padre.
- Todo objeto sin padre aparece en `rootIds`.
- Un objeto contenido tiene `parentId` y `slotId`.
- En la primera versión, solo una tabla puede actuar como contenedor.
- No se admiten padres inexistentes ni ciclos.
- Los objetos conservan identidad y contenido al entrar o salir de un contenedor.
- Agrupar no crea un contenedor ni altera `parentId`, `slotId` u orden de lectura; solo asigna un `groupId` compartido. Desagrupar elimina esa relación.
- Las coordenadas raíz son del lienzo; las coordenadas contenidas serán relativas al contenedor.

## Estado de las fases

1. **Persistencia normalizada — terminada.** D1 guarda v2; la lectura admite snapshots v1, v2 inicial y v2 actual.
2. **Documento enriquecido — terminado.** RichText guarda un árbol JSON de bloques, tablas, texto y marcas; Markdown es conversión de interfaz/importación/exportación.
3. **Contenedores — núcleo terminado.** Las celdas tienen ID estable; un widget puede entrar y salir de ellas conservando identidad y coordenadas relativas.
4. **Editor nativo v2 — terminado.** El cliente opera directamente sobre `rootIds` y `objects`; `sections/columns` solo existen en el lector histórico.
5. **Escrituras incrementales — diferida.** Los snapshots completos siguen siendo adecuados para el MVP; parches e historial persistente se evaluarán antes de colaboración simultánea.

## Compatibilidad

La lectura detecta la versión. Los documentos v1 se validan y migran en memoria; RichText Markdown se transforma a documento JSON y las celdas de tabla reciben IDs deterministas. La siguiente escritura persiste el snapshot v2 y actualiza `schema_version` de D1. No existe ya adaptación inversa a `sections/columns`.
