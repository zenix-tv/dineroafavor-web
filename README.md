# Dinero a Favor — V9 · Formulario activado

## Integración
- Endpoint Formspree: https://formspree.io/f/xzezlnvd
- Recepción activada en `script.js` (`FORM_SUBMISSIONS_ENABLED = true`).
- Responsable informado en la política: Insurex Corredores de Seguros SpA. Contacto: carolina.tobar@grupoinsurex.cl.
- No se ha enviado una solicitud real durante la preparación del proyecto. Tras publicar, hacer una prueba autorizada y verificar tanto el panel de Formspree como el correo.
- Carolina/Insurex debe mantener un procedimiento efectivo de eliminación de envíos y correos al terminar su finalidad, según la política publicada. Revisar el uso de Formspree y los tratamientos internacionales bajo las reglas aplicables.

## Publicación
1. Descomprime el ZIP. Sube los archivos y carpeta `assets` a la raíz del repositorio `zenix-tv/dineroafavor-web` (no el ZIP).
2. Conserva la configuración de GitHub Pages y DNS actual.
3. Prueba con datos ficticios propios (consentimiento marcado). Confirma la recepción en Formspree y en el email de Carolina.
4. Configura en Formspree la restricción del dominio al sitio publicado si está disponible en el plan.


## V10 — campo WhatsApp simplificado
El campo muestra +56 9 como prefijo fijo y solicita únicamente los 8 dígitos restantes. Valida números incompletos o demasiado largos y envía el número normalizado como +569XXXXXXXX a Formspree. También admite pegar un número chileno completo. El diseño de la portada permanece sin cambios.


## V11 · Confirmación premium de envío
Después de que Formspree responda correctamente, el formulario se sustituye por una pantalla de agradecimiento adaptada a móvil. Ante un fallo de envío, se conserva el formulario con los datos escritos y aparece un mensaje para reintentar. El plazo de 24 horas hábiles en la confirmación debe cumplirse operativamente por el equipo de atención.


## V12 · Panel comercial en /panel
- Panel privado responsive para Carolina, conectado a Authentication y Firestore.
- `panel/config.js` requiere completar apiKey y appId de la aplicación web de Firebase.
- Mantiene la web y el correo de Formspree sin cambios.
- Permite importar CSV de Formspree mientras no exista webhook disponible.
- Consulta `panel/README.md` para las instrucciones de activación.
