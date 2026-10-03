# CRM Dinero a Favor · /panel

Este panel usa Firebase Authentication y Firestore; se publica en **www.dineroafavor.cl/panel/** dentro del mismo GitHub Pages que la web comercial.

## ÚNICO PASO OBLIGATORIO ANTES DE ENTRAR

1. Abre https://console.firebase.google.com/project/dinero-a-favor-crm/settings/general con la cuenta de Carolina.
2. Baja a **Tus apps → Dinero a Favor - CRM Web → Config** y copia `apiKey` y `appId`.
3. Pégalos, **conservando las comillas**, en `panel/config.js`. `projectId` y `authDomain` ya están configurados. NO publiques una clave privada, una contraseña ni un archivo de cuenta de servicio.
4. Sube el proyecto completo a la raíz de `zenix-tv/dineroafavor-web` en GitHub. Abre `https://www.dineroafavor.cl/panel/`.
5. Entra con el correo y contraseña creados en Firebase Authentication para Carolina.

## Reglas de Firestore

Las reglas actualmente autorizan al UID de Carolina a leer y escribir en `leads` y `clientes`; las demás colecciones quedan cerradas. **No reemplaces las reglas por otras abiertas.** El panel no utiliza acceso anónimo.

## Cómo usarlo

- Resumen comercial, fichas y estados, notas, fechas de seguimiento, WhatsApp y correo.
- Puedes importar solicitudes de Formspree manualmente desde CSV. Evita reimportar el mismo archivo: el panel compara nombre de correo y teléfono para omitir duplicados básicos.
- Exporta CSV solamente para copias controladas; estos archivos contienen datos personales.
- Si aparecen datos de prueba, elimínalos en Firestore o márcalos como descartados.

## Formspree sigue igual

**No cambiamos `index.html` ni `script.js`.** La web sigue enviando a `https://formspree.io/f/xzezlnvd`; Carolina sigue recibiendo las notificaciones por correo. La importación CSV es funcional, pero **no es sincronización automática**.

El webhook automático nativo de Formspree requiere plan Professional o Business. La sincronización gratis requeriría configurar una integración aparte con verificación antispam y backend seguro; no está incluida ni activada por este ZIP. No abras escrituras públicas a Firestore para evitar esta limitación.

**Seguridad**: compartir el HTML de `/panel` en un repositorio público no significa que los datos sean públicos. Firebase Authentication más reglas de Firestore controlan el acceso. Recomendado habilitar MFA en la cuenta administrativa cuando el flujo lo soporte.
