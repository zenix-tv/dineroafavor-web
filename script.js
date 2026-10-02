// Paste your real Formspree form endpoint after creating an account.
// Example: https://formspree.io/f/xxxxxxxx  (do not put secret keys here)
const FORMSPREE_ENDPOINT = '';
document.querySelector('#year').textContent = new Date().getFullYear();
const form = document.querySelector('#lead-form');
const statusBox = document.querySelector('#form-status');
if (FORMSPREE_ENDPOINT) document.querySelector('#demo-note').remove();
form.addEventListener('submit', async event => {
  event.preventDefault();
  if (!form.reportValidity()) return;
  if (!FORMSPREE_ENDPOINT) {
    statusBox.textContent = 'Formulario de demostración: la página está lista, pero todavía debemos conectar la recepción de solicitudes.';
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
