// Formspree endpoint created for Carolina.
// Keep live submission disabled until the privacy policy is completed and approved.
const FORMSPREE_ENDPOINT = 'https://formspree.io/f/xzezlnvd';
const FORM_SUBMISSIONS_ENABLED = false;
document.querySelector('#year').textContent = new Date().getFullYear();
const form = document.querySelector('#lead-form');
const statusBox = document.querySelector('#form-status');
const demoNote = document.querySelector('#demo-note');
if (FORM_SUBMISSIONS_ENABLED && FORMSPREE_ENDPOINT) demoNote?.remove();
else if (demoNote) demoNote.textContent = 'Próximamente: estamos terminando la habilitación segura del formulario. Por ahora, contáctanos por WhatsApp.';
form.addEventListener('submit', async event => {
  event.preventDefault();
  if (!form.reportValidity()) return;
  if (!FORM_SUBMISSIONS_ENABLED || !FORMSPREE_ENDPOINT) {
    statusBox.textContent = 'Estamos terminando de habilitar el formulario. Por ahora, escríbenos por WhatsApp.';
    return;
  }
  const button = form.querySelector('button[type="submit"]');
  button.disabled = true;
  statusBox.textContent = 'Enviando tu solicitud…';
  try {
    const response = await fetch(FORMSPREE_ENDPOINT, {method:'POST', body:new FormData(form), headers:{Accept:'application/json'}});
    if (!response.ok) throw new Error('No se pudo enviar');
    form.reset();
    statusBox.textContent = '¡Solicitud recibida! Te contactaremos para revisar tu caso.';
  } catch(error) {
    statusBox.textContent = 'No se pudo enviar. Inténtalo otra vez o escríbenos directamente por WhatsApp.';
  } finally { button.disabled = false; }
});
