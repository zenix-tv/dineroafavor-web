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

// V14: dos destinos independientes; nunca comunicar éxito total si uno falla.
const CRM_ENDPOINT = 'https://dineroafavor-api.mtobarziege.workers.dev/lead';
const TURNSTILE_SITE_KEY = '0x4AAAAAAFNB6-0tgMYLYTER';
let turnstileId = null;
let turnstileToken = '';
let currentSubmission = null;
let sending = false;

window.onTurnstileLoaded = () => {
  if (!window.turnstile) return;
  try {
    turnstileId = window.turnstile.render('#turnstile-widget', {
      sitekey: TURNSTILE_SITE_KEY,
      action: 'lead',
      theme: 'auto',
      callback: token => { turnstileToken = token; },
      'expired-callback': () => { turnstileToken = ''; },
      'error-callback': () => { turnstileToken = ''; }
    });
  } catch (err) {
    console.error('No fue posible mostrar la verificación de seguridad.');
  }
};
function resetTurnstile() {
  turnstileToken = '';
  if (window.turnstile && turnstileId !== null) {
    try { window.turnstile.reset(turnstileId); } catch (_) { /* Puede no haberse inicializado */ }
  }
}
function setStatus(text, kind = '') {
  statusBox.textContent = text;
  if (kind) statusBox.dataset.state = kind;
  else delete statusBox.dataset.state;
}
function payloadFromForm() {
  const fd = new FormData(form);
  return {
    nombre: String(fd.get('nombre') || '').trim(),
    apellido: String(fd.get('apellido') || '').trim(),
    telefono: String(fd.get('telefono') || ''),
    email: String(fd.get('email') || '').trim(),
    tipo_credito: String(fd.get('tipo_credito') || ''),
    institucion: String(fd.get('institucion') || '').trim(),
    mensaje: String(fd.get('mensaje') || '').trim(),
    consentimiento: fd.has('consentimiento')
  };
}
function showComplete() {
  form.reset();
  phoneError.textContent = '';
  phoneField.classList.remove('is-invalid');
  phoneInput.setCustomValidity('');
  resetTurnstile();
  currentSubmission = null;
  setStatus('');
  formView.hidden = true;
  successView.hidden = false;
  successView.focus({preventScroll: true});
  successView.scrollIntoView({behavior:'smooth', block:'center'});
}
function reportPartial() {
  const emailSent = currentSubmission.emailSent;
  const crmSaved = currentSubmission.crmSaved;
  if (emailSent && !crmSaved) {
    setStatus('Tu solicitud llegó por correo, pero todavía no pudimos registrarla en el panel. Pulsa «Solicitar evaluación» nuevamente para reintentar solo el registro en el CRM, o escríbenos por WhatsApp.', 'warning');
  } else if (!emailSent && crmSaved) {
    setStatus('Tu solicitud quedó registrada, pero no se pudo enviar el aviso por correo. Pulsa «Solicitar evaluación» nuevamente para reintentar únicamente el correo.', 'warning');
  } else {
    setStatus('No se pudo completar el envío. Comprueba tu conexión e inténtalo nuevamente o escríbenos por WhatsApp.', 'error');
  }
}
form.addEventListener('input', () => {
  // Un cambio en los datos inicia una solicitud nueva, salvo durante un envío.
  if (!sending && currentSubmission && (currentSubmission.crmSaved || currentSubmission.emailSent)) {
    currentSubmission = null;
  }
});
form.addEventListener('submit', async event => {
  event.preventDefault();
  if (sending) return;
  const phoneValid = validatePhone(true);
  if (!form.reportValidity() || !phoneValid) {
    if (!phoneValid) phoneInput.focus();
    return;
  }
  if (!FORM_SUBMISSIONS_ENABLED || !FORMSPREE_ENDPOINT) {
    setStatus('El formulario no está disponible. Escríbenos directamente por WhatsApp.', 'error');
    return;
  }
  const data = payloadFromForm();
  if (!currentSubmission) {
    currentSubmission = {id: crypto.randomUUID(), data, emailSent: false, crmSaved: false};
  }
  const state = currentSubmission;
  const button = form.querySelector('button[type="submit"]');
  button.disabled = true;
  sending = true;
  setStatus('Enviando tu solicitud…');
  // Mantener el canal Formspree operativo incluso cuando falla Turnstile o Firestore.
  const tasks = [];
  if (!state.emailSent) tasks.push((async () => {
    const fd = new FormData(form);
    fd.delete('cf-turnstile-response');
    fd.set('solicitud_id', state.id);
    const response = await fetch(FORMSPREE_ENDPOINT, {
      method:'POST', body:fd, headers:{Accept:'application/json'}
    });
    if (!response.ok) throw Error('Formspree '+response.status);
    state.emailSent = true;
  })());
  if (!state.crmSaved && turnstileToken) tasks.push((async () => {
    const response = await fetch(CRM_ENDPOINT, {
      method:'POST', headers:{'content-type':'application/json'},
      body:JSON.stringify({...state.data, solicitud_id:state.id, turnstile_token:turnstileToken})
    });
    if (!response.ok) throw Error('CRM '+response.status);
    const result = await response.json();
    if (!result.ok) throw Error('CRM respuesta incorrecta');
    state.crmSaved = true;
  })());
  try {
    const outcomes = await Promise.allSettled(tasks);
    outcomes.forEach(outcome => {if (outcome.status === 'rejected') console.warn('Entrega parcial de solicitud:', outcome.reason?.message || 'Error de red');});
    if (state.crmSaved && state.emailSent) showComplete();
    else { resetTurnstile(); reportPartial(); }
  } finally {
    sending = false;
    button.disabled = false;
  }
});
