import {initializeApp} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js';
import {getAuth,onAuthStateChanged,signInWithEmailAndPassword,signOut,setPersistence,browserLocalPersistence} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js';
import {getFirestore,collection,onSnapshot,addDoc,doc,updateDoc,serverTimestamp,Timestamp,writeBatch} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';
import {firebaseConfig,allowedUserId} from './config.js';
const $=id=>document.getElementById(id), statuses={nuevo:'Nuevo',contactado:'Contactado',evaluacion:'En evaluación',gestion:'En gestión',finalizado:'Finalizado',descartado:'Descartado'};
let db,auth,unsubscribe=null,leads=[],section='inicio',pendingImport=[];
const show=(id)=>{['startup','setup','auth','app'].forEach(x=>$(x).hidden=x!==id);};
const sanitize=s=>String(s??'').normalize('NFKC').replace(/[\u0000-\u001f\u007f]/g,'').trim();
const digits=s=>String(s||'').replace(/\D/g,'');
function normalizePhone(v){let n=digits(v);if(n.length===11&&n.startsWith('569'))return '+'+n;if(n.length===9&&n.startsWith('9'))return '+56'+n;if(n.length===8)return '+569'+n;return ''}
function timeOf(t){try{if(!t)return 0;if(typeof t.toMillis==='function')return t.toMillis();if(typeof t.toDate==='function')return t.toDate().getTime();const d=new Date(t);return isNaN(d.getTime())?0:d.getTime()}catch{return 0}}
function displayDate(t,withTime=false){const ms=timeOf(t);return ms?new Intl.DateTimeFormat('es-CL',{dateStyle:'medium',...(withTime?{timeStyle:'short'}:{})}).format(new Date(ms)):'—'}
function element(tag,className,text){let n=document.createElement(tag);if(className)n.className=className;if(text!=null)n.textContent=String(text);return n}
function alertMessage(msg,error=false){let a=$('alert');a.textContent=msg;a.classList.toggle('fail',error);a.hidden=false;clearTimeout(alertMessage.timeout);alertMessage.timeout=setTimeout(()=>a.hidden=true,6500)}
function optionText(value){return statuses[value]||sanitize(value)||'Nuevo'}
function statusChip(value){return element('span','badge '+(statuses[value]?value:'nuevo'),optionText(value))}
function leadName(l){return [l.nombre,l.apellido].map(sanitize).filter(Boolean).join(' ')||'Sin nombre'}
function clearChildren(n){n.replaceChildren()}
function switchView(view){section=view;document.querySelectorAll('.view').forEach(e=>e.hidden=e.id!=='view-'+view);document.querySelectorAll('[data-view]').forEach(e=>e.classList.toggle('active',e.dataset.view===view));$('section-name').textContent={inicio:'Resumen comercial',leads:'Solicitudes',seguimiento:'Seguimientos',importar:'Importar solicitudes'}[view];$('sidebar').classList.remove('open');if(view==='leads')renderTable();if(view==='seguimiento')renderFollowups();if(view==='importar')renderImportPreview();}
document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>switchView(b.dataset.view)));
document.querySelectorAll('[data-goto]').forEach(b=>b.addEventListener('click',()=>switchView(b.dataset.goto)));
$('menu-toggle').onclick=()=>$('sidebar').classList.toggle('open');
if(firebaseConfig.apiKey.startsWith('PEGAR_')||firebaseConfig.appId.startsWith('PEGAR_')){show('setup')}
else{
  try{
    const app=initializeApp(firebaseConfig);auth=getAuth(app);db=getFirestore(app);
    setPersistence(auth,browserLocalPersistence).catch(()=>{});
    onAuthStateChanged(auth,user=>{
      if(unsubscribe){unsubscribe();unsubscribe=null}
      if(!user){leads=[];show('auth');return}
      if(user.uid!==allowedUserId){signOut(auth);show('auth');$('login-error').textContent='Esta cuenta no está autorizada para acceder al CRM.';return}
      show('app');$('login-error').textContent='';
      unsubscribe=onSnapshot(collection(db,'leads'),snap=>{
        leads=snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>timeOf(b.fecha_creacion)-timeOf(a.fecha_creacion));
        renderAll();
      },err=>alertMessage('No se pudieron cargar los contactos. Revisa los permisos de Firestore. '+err.code,true));
    },()=>show('auth'));
  }catch(e){show('setup');$('setup').querySelector('p').textContent='No se pudo inicializar Firebase. Comprueba panel/config.js y publica la configuración correcta.'}
}
$('login-form').addEventListener('submit',async e=>{
 e.preventDefault();const btn=$('login-btn');btn.disabled=true;$('login-error').textContent='';
 try{await signInWithEmailAndPassword(auth,$('login-email').value.trim(),$('login-password').value)}
 catch(err){$('login-error').textContent=err.code==='auth/invalid-credential'?'Correo o contraseña incorrectos.':'No se pudo iniciar sesión. Comprueba tu conexión e inténtalo nuevamente.'}
 finally{btn.disabled=false;$('login-password').value=''}
});
$('logout').onclick=()=>signOut(auth);
function renderAll(){
 $('side-count').textContent=leads.filter(l=>(l.estado||'nuevo')==='nuevo').length;
 $('metric-total').textContent=leads.length;
 $('metric-new').textContent=leads.filter(l=>(l.estado||'nuevo')==='nuevo').length;
 $('metric-work').textContent=leads.filter(l=>['contactado','evaluacion','gestion'].includes(l.estado)).length;
 $('metric-done').textContent=leads.filter(l=>l.estado==='finalizado').length;
 renderRecent();renderUpcoming();if(section==='leads')renderTable();if(section==='seguimiento')renderFollowups();
}
function makeRecent(l){const row=element('div','recent-item'),initial=element('div','client-icon',leadName(l).slice(0,1).toUpperCase()),info=element('div','recent-info'),title=element('strong','',leadName(l)),sub=element('small','',`${l.tipo_credito||'Crédito'} · ${l.institucion||'Institución por confirmar'}`),button=element('button','', 'Ver ficha →');button.onclick=()=>openLead(l);info.append(title,sub);row.append(initial,info,statusChip(l.estado||'nuevo'),button);return row}
function renderRecent(){const el=$('recent-list');clearChildren(el);leads.slice(0,5).forEach(l=>el.append(makeRecent(l)));if(!leads.length)el.append(element('p','empty','Todavía no hay solicitudes registradas.'))}
function followups(){return leads.filter(l=>timeOf(l.proximo_contacto)>0&&!['finalizado','descartado'].includes(l.estado)).sort((a,b)=>timeOf(a.proximo_contacto)-timeOf(b.proximo_contacto))}
function makeFollow(l){const row=element('div','follow-row'),left=element('div'),ico=element('div','client-icon',leadName(l).slice(0,1).toUpperCase()),info=element('div'),name=element('strong','',leadName(l)),sub=element('small','',`${optionText(l.estado)} · ${l.institucion||'Por confirmar'}`),right=element('div');info.append(name,sub);left.append(ico,info);right.append(element('span','follow-date',displayDate(l.proximo_contacto,true)));const btn=element('button','tiny-btn','Abrir');btn.onclick=()=>openLead(l);right.append(btn);row.append(left,right);return row}
function renderUpcoming(){const el=$('upcoming-list');clearChildren(el);followups().slice(0,4).forEach(l=>el.append(makeFollow(l)));if(!el.children.length)el.append(element('p','empty','Sin seguimientos programados.'))}
function renderFollowups(){const el=$('follow-list');clearChildren(el);followups().forEach(l=>el.append(makeFollow(l)));if(!el.children.length)el.append(element('p','empty','Aún no hay seguimientos programados.'))}
function renderTable(){const q=$('search').value.trim().toLocaleLowerCase('es-CL'),st=$('status-filter').value,cr=$('credit-filter').value;
const filtered=leads.filter(l=>(!q||[l.nombre,l.apellido,l.telefono,l.email,l.institucion].join(' ').toLocaleLowerCase('es-CL').includes(q))&&(!st||(l.estado||'nuevo')===st)&&(!cr||l.tipo_credito===cr));const el=$('lead-rows');clearChildren(el);
filtered.forEach(l=>{const tr=document.createElement('tr'),c1=document.createElement('td'),name=element('strong','',leadName(l)),phone=element('small','',l.telefono||'Sin teléfono');c1.append(name,phone);tr.append(c1,element('td','',l.tipo_credito||'—'),element('td','',l.institucion||'—'));
let stCell=element('td');stCell.append(statusChip(l.estado||'nuevo'));tr.append(stCell,element('td','',displayDate(l.fecha_creacion)));let action=element('td'),b=element('button','tiny-btn','Abrir ficha →');b.onclick=()=>openLead(l);action.append(b);tr.append(action);el.append(tr)});
if(!filtered.length){const tr=document.createElement('tr'),td=element('td','empty','No hay contactos para estos filtros.');td.colSpan=6;tr.append(td);el.append(tr)}$('results-count').textContent=`${filtered.length} de ${leads.length} solicitudes`}
['search','status-filter','credit-filter'].forEach(id=>$(id).addEventListener('input',renderTable));
const editor=$('lead-modal');
function cleanInputs(){ $('lead-editor').reset();$('edit-id').value='';$('edit-status').value='nuevo';$('edit-origin').value='manual';$('contact-tools').hidden=true;$('history').hidden=true;$('save-error').textContent=''}
function openLead(l){cleanInputs();$('modal-title').textContent=l?'Ficha de '+leadName(l):'Nuevo contacto';if(l){
 const map={'edit-id':'id','edit-name':'nombre','edit-last':'apellido','edit-phone':'telefono','edit-email':'email','edit-credit':'tipo_credito','edit-bank':'institucion','edit-status':'estado','edit-origin':'origen','edit-message':'mensaje','edit-notes':'notas'};
 Object.entries(map).forEach(([id,key])=>$(id).value=l[key]||'');$('edit-status').value=l.estado||'nuevo';$('edit-next').value=timeOf(l.proximo_contacto)?new Date(timeOf(l.proximo_contacto)-new Date().getTimezoneOffset()*60000).toISOString().slice(0,16):'';$('edit-amount').value=l.monto_estimado??'';
 const wa=normalizePhone(l.telefono);$('contact-tools').hidden=!wa&&!l.email;if(wa){$('contact-wa').hidden=false;$('contact-wa').href='https://wa.me/'+wa.slice(1)+'?text='+encodeURIComponent('Hola, soy Carolina de Dinero a Favor. Me comunico respecto de tu solicitud de evaluación.')}else $('contact-wa').hidden=true;
 if(l.email){$('contact-mail').hidden=false;$('contact-mail').href='mailto:'+encodeURIComponent(l.email)}else $('contact-mail').hidden=true;
 if(l.historial?.length){$('history').hidden=false;const container=$('history-list');clearChildren(container);[...l.historial].reverse().slice(0,6).forEach(h=>container.append(element('p','',`${displayDate(h.fecha,true)} · ${sanitize(h.texto)}`)))}
 }editor.showModal()}
$('close-modal').onclick=()=>editor.close();$('cancel-edit').onclick=()=>editor.close();$('new-lead').onclick=()=>openLead(null);$('new-lead-main').onclick=()=>openLead(null);
$('lead-editor').addEventListener('submit',async e=>{e.preventDefault();$('save-error').textContent='';const btn=$('save-lead');btn.disabled=true;
try{const id=$('edit-id').value,existing=leads.find(l=>l.id===id),phRaw=$('edit-phone').value,ph=phRaw.trim()?normalizePhone(phRaw):'';if(phRaw.trim()&&!ph)throw new Error('El WhatsApp debe ser un número móvil chileno válido.');
const payload={nombre:sanitize($('edit-name').value),apellido:sanitize($('edit-last').value),telefono:ph,email:sanitize($('edit-email').value).toLowerCase(),tipo_credito:$('edit-credit').value,institucion:sanitize($('edit-bank').value),estado:$('edit-status').value,origen:$('edit-origin').value,mensaje:sanitize($('edit-message').value),notas:sanitize($('edit-notes').value),monto_estimado:$('edit-amount').value?Number($('edit-amount').value):null,proximo_contacto:$('edit-next').value?Timestamp.fromDate(new Date($('edit-next').value)):null,actualizado_en:serverTimestamp()};
if(!payload.nombre)throw new Error('El nombre es obligatorio.');
if(id){payload.historial=[...(existing?.historial||[]).slice(-35),{fecha:new Date().toISOString(),texto:`Actualización: ${optionText(payload.estado)}`}];await updateDoc(doc(db,'leads',id),payload)}
else{payload.fecha_creacion=serverTimestamp();payload.consentimiento=false;payload.historial=[{fecha:new Date().toISOString(),texto:'Creación manual en CRM'}];await addDoc(collection(db,'leads'),payload)}
editor.close();alertMessage('Contacto guardado correctamente.')}
catch(err){$('save-error').textContent=err.message||'No se pudo guardar. Revisa tu conexión.'}finally{btn.disabled=false}});
$('export-csv').onclick=()=>{if(!leads.length)return alertMessage('Todavía no hay contactos para exportar.');if(!confirm('Este archivo contendrá datos personales. Guárdalo únicamente en un lugar seguro. ¿Continuar?'))return;
const keys=['nombre','apellido','telefono','email','tipo_credito','institucion','estado','origen','mensaje','notas','monto_estimado','fecha_creacion'];const cell=v=>'"'+String(v??'').replace(/^[=+@\-\t\r]/,'\u0027$&').replace(/"/g,'""')+'"';const csv='\ufeff'+keys.join(';')+'\r\n'+leads.map(l=>keys.map(k=>cell(k==='fecha_creacion'?displayDate(l[k],true):l[k])).join(';')).join('\r\n');const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='dineroafavor-leads-'+new Date().toISOString().slice(0,10)+'.csv';a.click();URL.revokeObjectURL(url)};
// CSV: detects comma, semicolon or tab; handles Excel quoted fields and multi-line text.
function parseCsv(raw){raw=raw.replace(/^\ufeff/,'');const head=raw.slice(0,raw.indexOf('\n')<0?raw.length:raw.indexOf('\n'));const choices=[',',';','\t'];let delim=choices.map(c=>({c,n:head.split(c).length})).sort((a,b)=>b.n-a.n)[0].c;let out=[],row=[],value='',quote=false;for(let i=0;i<raw.length;i++){const c=raw[i];if(c==='"'){if(quote&&raw[i+1]==='"'){value+='"';i++}else quote=!quote}else if(c===delim&&!quote){row.push(value);value=''}else if((c==='\n'||c==='\r')&&!quote){if(c==='\r'&&raw[i+1]==='\n')i++;row.push(value);value='';if(row.some(x=>x.trim()))out.push(row);row=[]}else value+=c}row.push(value);if(row.some(x=>x.trim()))out.push(row);if(quote)throw new Error('El CSV contiene comillas sin cerrar.');return out}
function keyName(s){return String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'')}
function toLead(headers,row){const obj={};headers.forEach((h,i)=>obj[keyName(h)]=row[i]||'');const pick=(...names)=>{for(let n of names)if(obj[keyName(n)])return sanitize(obj[keyName(n)]);return ''};let first=pick('nombre','first name','firstname'),last=pick('apellido','last name','lastname');if(!first){const full=pick('name','nombre completo');const parts=full.split(' ');first=parts.shift()||'';last=parts.join(' ')}const ph=normalizePhone(pick('telefono','teléfono','whatsapp','phone','mobile'));
const email=pick('email','correo electronico','correo','e-mail');const credit=pick('tipo_credito','tipo de credito','credito','crédito');let date=pick('fecha_creacion','fecha','date','submitted at','submitted_at','timestamp','created at');const consent=pick('consentimiento','consent');return {nombre:first,apellido:last,telefono:ph,email,tipo_credito:/auto/i.test(credit)?'Automotriz':/consum/i.test(credit)?'Consumo':'',institucion:pick('institucion','institucion financiera','banco','bank'),mensaje:pick('mensaje','message','comments'),estado:'nuevo',origen:'formspree',consentimiento:/^(true|verdadero|si|sí|on|1)$/i.test(consent),fecha_creacion:date&&!isNaN(Date.parse(date))?Timestamp.fromDate(new Date(date)):null,notas:'',importado_en:serverTimestamp()}}
$('csv-file').addEventListener('change',async e=>{const file=e.target.files?.[0];if(!file)return;try{if(file.size>2e6)throw new Error('El archivo es demasiado grande: máximo 2 MB.');const rows=parseCsv(await file.text());if(rows.length<2)throw new Error('El archivo no contiene solicitudes.');const headers=rows[0];if(!headers.some(h=>['email','correo','nombre','name','telefono','whatsapp'].includes(keyName(h))))throw new Error('No reconozco las columnas. Comprueba que sea una exportación de Formspree.');pendingImport=rows.slice(1).map(r=>toLead(headers,r)).filter(l=>l.nombre&&(l.email||l.telefono)).slice(0,500);if(!pendingImport.length)throw new Error('No se encontraron filas con nombre y correo o teléfono.');renderImportPreview();$('import-status').textContent='Archivo cargado. Revisa la vista previa y confirma la importación.'}catch(err){pendingImport=[];renderImportPreview();$('import-status').textContent=err.message}});
function renderImportPreview(){const preview=$('import-preview');preview.hidden=!pendingImport.length;if(!pendingImport.length)return;$('preview-stats').textContent=`${pendingImport.length} solicitudes detectadas · comprueba los datos antes de guardar.`;let tb=$('preview-rows');clearChildren(tb);pendingImport.slice(0,6).forEach(l=>{const tr=document.createElement('tr');[leadName(l),l.telefono,l.tipo_credito].forEach(s=>tr.append(element('td','',s||'—')));tb.append(tr)})}
$('import-confirm').onclick=async()=>{if(!pendingImport.length)return;if(!confirm('¿Importar estas solicitudes al CRM? Los correos de Formspree seguirán funcionando.'))return;let btn=$('import-confirm');btn.disabled=true;try{const known=new Set(leads.map(l=>(l.email||'').toLowerCase()+'|'+digits(l.telefono)));let valid=pendingImport.filter(l=>{const key=(l.email||'').toLowerCase()+'|'+digits(l.telefono);if(known.has(key))return false;known.add(key);return true});let count=0;for(let start=0;start<valid.length;start+=350){const batch=writeBatch(db);valid.slice(start,start+350).forEach(l=>{const ref=doc(collection(db,'leads'));batch.set(ref,{...l,fecha_creacion:l.fecha_creacion||serverTimestamp(),historial:[{fecha:new Date().toISOString(),texto:'Importado desde CSV de Formspree'}]})});await batch.commit();count+=Math.min(350,valid.length-start)}$('import-status').textContent=`Importación completada: ${count} solicitudes. ${pendingImport.length-count} posibles duplicados omitidos.`;pendingImport=[];$('csv-file').value='';renderImportPreview();alertMessage('Solicitudes importadas correctamente.')}catch(err){$('import-status').textContent='No se pudo completar la importación: '+err.message}finally{btn.disabled=false}};
