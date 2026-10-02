// Formspree endpoint created for Carolina.
// Formulario activado después de la aprobación comunicada por Carolina.
const FORMSPREE_ENDPOINT = 'https://formspree.io/f/xzezlnvd';
const FORM_SUBMISSIONS_ENABLED = true;
document.querySelector('#year').textContent = new Date().getFullYear();
const form = document.querySelector('#lead-form');
const statusBox = document.querySelector('#form-status');
const demoNote = document.querySelector('#demo-note');
const formView = document.querySelector('#form-view');
const successView = document.querySelector('#success-view');

// Prefijo fijo +56 9; la persona solo escribe los ocho dígitos restantes.
const phoneInput = document.querySelector('#telefono-local');
const phoneHidden = document.querySelector('#telefono-completo');
const phoneError = document.querySelector('#telefono-error');
const phoneField = document.querySelector('.phone-field');
function phoneDigits(value) {
  let digits = value.replace(/\D/g, '');
  // Permitir pegar +56 9 XXXX XXXX o 9 XXXX XXXX sin duplicar el prefijo.
  if (digits.length === 11 && digits.startsWith('569')) digits = digits.slice(3);
  else if (digits.length === 9 && digits.startsWith('9')) digits = digits.slice(1);
  return digits;
}
function phoneMessage(digits) {
  if (!digits.length) return 'Ingresa tu número de celular.';
  if (digits.length < 8) return 'Faltan ' + (8 - digits.length) + ' dígito' + (8 - digits.length === 1 ? '' : 's') + '. Tu número debe tener 8 dígitos después de +56 9.';
  if (digits.length > 8) return 'Sobran ' + (digits.length - 8) + ' dígito' + (digits.length - 8 === 1 ? '' : 's') + '. Escribe solo los 8 dígitos después de +56 9.';
  return '';
}
function validatePhone(showError = false) {
  const digits = phoneDigits(phoneInput.value);
  const message = phoneMessage(digits);
  phoneHidden.value = message ? '' : '+569' + digits;
  phoneInput.setCustomValidity(message);
  if (showError || phoneField.classList.contains('is-invalid')) {
    phoneError.textContent = message;
    phoneField.classList.toggle('is-invalid', Boolean(message));
  }
  return !message;
}
phoneInput.addEventListener('input', () => {
  const digits = phoneDigits(phoneInput.value);
  phoneInput.value = digits.length > 4 ? digits.slice(0, 4) + ' ' + digits.slice(4) : digits;
  validatePhone(digits.length >= 8);
});
phoneInput.addEventListener('blur', () => validatePhone(Boolean(phoneInput.value)));
phoneInput.addEventListener('invalid', () => validatePhone(true));

if (FORM_SUBMISSIONS_ENABLED && FORMSPREE_ENDPOINT) demoNote?.remove();

form.addEventListener('submit', async event => {
  event.preventDefault();
  const phoneValid = validatePhone(true);
  if (!form.reportValidity() || !phoneValid) {
    if (!phoneValid) phoneInput.focus();
    return;
  }
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
    phoneError.textContent = '';
    phoneField.classList.remove('is-invalid');
    phoneInput.setCustomValidity('');
    // Mostrar agradecimiento únicamente tras la confirmación real de Formspree.
    statusBox.textContent = '';
    formView.hidden = true;
    successView.hidden = false;
    successView.focus({preventScroll:true});
    successView.scrollIntoView({behavior:'smooth', block:'center'});
  } catch(error) {
    statusBox.textContent = 'No se pudo enviar. Inténtalo otra vez o escríbenos directamente por WhatsApp.';
  } finally { button.disabled = false; }
});
