# Política de seguridad

## Versiones soportadas

KnowCanvas está en desarrollo activo. Solo la rama principal y el despliegue más reciente reciben correcciones de seguridad.

## Comunicar una vulnerabilidad

No publiques vulnerabilidades, credenciales ni datos de usuarios en una incidencia pública. Usa la opción **Report a vulnerability** de la pestaña Security del repositorio e incluye el impacto, la versión afectada y una forma segura de reproducirla.

Se intentará confirmar la recepción en un plazo de 72 horas. La corrección y divulgación se coordinarán según gravedad y alcance.

## Alcance especialmente sensible

- OAuth de Google, sesiones y autorización por proyecto.
- Tokens de Google Drive cifrados.
- Claves BYOK de OpenAI cifradas.
- Proxy de recursos privados.
- Importación de URLs remotas y prevención de SSRF.
- Exportaciones HTML y SCORM.

Nunca incluyas secretos reales en informes, pruebas o pull requests.
