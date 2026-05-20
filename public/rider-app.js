// RIDER CALC — PedidosYa Guatemala
// Vanilla JS app logic, called from React component after mount

const FIXED = 1.00;

// Common Guatemala restaurants pre-loaded for autocomplete
const DEFAULT_RESTAURANTS = [
  "McDonald's", "Burger King", "Pollo Campero", "Domino's Pizza", "Pizza Hut",
  "Little Caesars", "Subway", "KFC", "Wendy's", "Taco Bell",
  "Papa John's", "Starbucks", "Dunkin'", "Cinnabon", "Church's Chicken",
  "Popeyes", "Carl's Jr", "IHOP Guatemala", "Denny's", "Applebee's",
  "TGI Fridays", "Chili's", "Smashburger", "Five Guys", "Shake Shack",
  "Telepizza", "Archie's", "Manzana Verde", "Panda Express", "Buffalo Wild Wings"
];

let multiplier = 1.30, rainOn = false, entregaCount = 1;
let orders = [], allOrders = [], currentTab = 'calc', quickMult = 1.30;
let times = {aceptar:null,llegue:null,recogi:null,entregu:null};
let restaurants = [];
let autoMultOn = false, schedules = [];
let autoMultInterval = null;
let cfg = {meta:0, base:0, gasPrice:32, kmGalon:40, mant:15, otros:0};
let reportText = '';
let deferredInstallPrompt = null;

// ============================================================
// PWA INSTALL
// ============================================================
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredInstallPrompt = e;
  const banner = document.getElementById('installBanner');
  if (banner) banner.classList.add('visible');
});

window.triggerInstall = function() {
  if (!deferredInstallPrompt) {
    alert('Para instalar: abrí Chrome → menú ⋮ → "Agregar a pantalla de inicio"');
    return;
  }
  deferredInstallPrompt.prompt();
  deferredInstallPrompt.userChoice.then(() => {
    deferredInstallPrompt = null;
    const banner = document.getElementById('installBanner');
    if (banner) banner.classList.remove('visible');
  });
};

window.dismissInstall = function() {
  const banner = document.getElementById('installBanner');
  if (banner) banner.classList.remove('visible');
};

// ============================================================
// RESTORE TIMES UI
// ============================================================
function restoreTimesUI(){
  const saved = loadTimes();
  ['aceptar','llegue','recogi','entregu'].forEach(type => {
    if(saved[type]){
      const cap = type.charAt(0).toUpperCase() + type.slice(1);
      const timeEl = document.getElementById('time'+cap);
      const btnEl = document.getElementById('btn'+cap);
      if(timeEl) timeEl.textContent = saved[type];
      if(btnEl) btnEl.classList.add('set');
      const [h,m] = saved[type].split(':').map(Number);
      const d = new Date(); d.setHours(h,m,0,0);
      times[type] = d;
    }
  });
}

// ============================================================
// INIT
// ============================================================
window.initRiderApp = function(){
  const now = new Date();
  const dateBadge = document.getElementById('dateBadge');
  if(dateBadge) dateBadge.textContent =
    now.toLocaleDateString('es-GT',{weekday:'short',day:'numeric',month:'short'});
  try{
    const a = localStorage.getItem('riderAllOrders');
    if(a) allOrders = JSON.parse(a);
    const r = localStorage.getItem('riderRestaurants');
    if(r) restaurants = JSON.parse(r);
    // Merge with default restaurants
    DEFAULT_RESTAURANTS.forEach(r => { if(!restaurants.includes(r)) restaurants.push(r); });
    const c = localStorage.getItem('riderConfig');
    if(c) cfg = {...cfg,...JSON.parse(c)};
    const s = localStorage.getItem('riderSchedules');
    if(s) schedules = JSON.parse(s);
    const au = localStorage.getItem('riderAutoMult');
    if(au) autoMultOn = JSON.parse(au);
  }catch(e){}
  const today = new Date().toDateString();
  orders = allOrders.filter(o => new Date(o.ts).toDateString() === today);
  addEntrega(true);
  restoreTimesUI();
  setMult(1.30);
  buildQuickPresets();
  updateHeader();
  renderHistory();
  if(autoMultOn) startAutoMult();
  loadConfigUI();

  // Service worker registration
  if('serviceWorker' in navigator){
    navigator.serviceWorker.register('/sw.js').catch(()=>{});
  }
};

// ============================================================
// MULTIPLICADOR
// ============================================================
window.changeMult = function(d){
  multiplier = Math.max(1.00, parseFloat((multiplier + d).toFixed(2)));
  const el = document.getElementById('multDisplay');
  if(el) el.value = multiplier.toFixed(2);
  updateMultDisplay(); updateResult();
};
window.setMult = function(v){ setMult(v); };
function setMult(v){
  multiplier = v;
  const el = document.getElementById('multDisplay');
  if(el) el.value = v.toFixed(2);
  document.querySelectorAll('.preset-btn').forEach(b => b.classList.toggle('active', parseFloat(b.textContent) === v));
  updateMultDisplay(); updateResult();
}
window.onMultInput = function(){
  const el = document.getElementById('multDisplay');
  const v = parseFloat(el.value);
  if(!isNaN(v) && v >= 1.00){
    multiplier = parseFloat(v.toFixed(2));
    document.querySelectorAll('.preset-btn').forEach(b => b.classList.toggle('active', parseFloat(b.textContent) === multiplier));
    updateMultDisplay(); updateResult();
  }
};
window.onMultBlur = function(){
  const el = document.getElementById('multDisplay');
  if(!el.value || parseFloat(el.value) < 1) el.value = multiplier.toFixed(2);
};
function updateMultDisplay(){
  const rainEl = document.getElementById('rainExtra');
  const rain = rainOn ? (parseFloat(rainEl ? rainEl.value : '0')||0) : 0;
  const el = document.getElementById('multEffective');
  if(el) el.textContent = rain > 0 ? `🌧️ Total: ${parseFloat((multiplier+rain).toFixed(2))}x` : '';
}
function getEffMult(){
  const rainEl = document.getElementById('rainExtra');
  const rain = rainOn ? (parseFloat(rainEl ? rainEl.value : '0')||0) : 0;
  return parseFloat((multiplier + rain).toFixed(2));
}
window.toggleRain = function(){
  rainOn = !rainOn;
  const sw = document.getElementById('rainSwitch');
  const inp = document.getElementById('rainInput');
  if(sw) sw.classList.toggle('on', rainOn);
  if(inp) inp.classList.toggle('visible', rainOn);
  updateMultDisplay(); updateResult();
};

// ============================================================
// AUTO MULTIPLICADOR POR HORARIO
// ============================================================
window.toggleAutoMult = function(){
  autoMultOn = !autoMultOn;
  const sw = document.getElementById('autoMultSwitch');
  const row = document.getElementById('autoToggleRow');
  if(sw) sw.classList.toggle('on', autoMultOn);
  if(row) row.classList.toggle('active-auto', autoMultOn);
  try{localStorage.setItem('riderAutoMult', JSON.stringify(autoMultOn));}catch(e){}
  if(autoMultOn){ startAutoMult(); }
  else{
    clearInterval(autoMultInterval);
    const badge = document.getElementById('autoMultBadge');
    if(badge) badge.style.display='none';
  }
};
function startAutoMult(){
  applyAutoMult();
  autoMultInterval = setInterval(applyAutoMult, 60000);
}
function applyAutoMult(){
  if(!autoMultOn || schedules.length === 0) return;
  const now = new Date();
  const nowMins = now.getHours()*60 + now.getMinutes();
  const sorted = [...schedules].sort((a,b) => timeToMins(a.time) - timeToMins(b.time));
  let active = null;
  for(let s of sorted){
    if(timeToMins(s.time) <= nowMins) active = s;
  }
  if(active){
    const v = parseFloat(active.mult);
    if(v >= 1.00){
      setMult(v);
      const badge = document.getElementById('autoMultBadge');
      if(badge) badge.style.display='inline-block';
    }
  }
}
window.addScheduleItem = function(time='', mult='1.30'){
  const div = document.createElement('div');
  div.className = 'schedule-item';
  const id = Date.now();
  div.id = 'sch_'+id;
  div.innerHTML = `
    <input type="time" value="${time}" onchange="saveConfig()">
    <span class="sch-arrow">→</span>
    <input type="number" value="${mult}" step="0.05" min="1" max="9.99" onchange="saveConfig()">
    <span class="sch-x-label">x</span>
    <button class="del-sch" onclick="document.getElementById('sch_${id}').remove();saveConfig()">✕</button>`;
  const list = document.getElementById('scheduleList');
  if(list) list.appendChild(div);
};
function getSchedules(){
  const items = document.querySelectorAll('.schedule-item');
  return Array.from(items).map(item => {
    const inputs = item.querySelectorAll('input');
    return {time: inputs[0].value, mult: inputs[1].value};
  }).filter(s => s.time && s.mult);
}

// ============================================================
// RESTAURANTE AUTOCOMPLETE
// ============================================================
window.handleRestaurantInput = function(){
  const input = document.getElementById('restaurantInput');
  const val = input ? input.value.toLowerCase().trim() : '';
  const list = document.getElementById('autocompleteList');
  if(!list) return;
  if(!val){list.innerHTML='';return;}
  const matches = restaurants.filter(r => r.toLowerCase().includes(val)).slice(0, 8);
  if(matches.length === 0){list.innerHTML='';return;}
  list.innerHTML = matches.map(r => `<div class="autocomplete-item" onclick="selectRestaurant('${r.replace(/'/g,"\\'").replace(/"/g,'&quot;')}')">${r}</div>`).join('');
};
window.selectRestaurant = function(name){
  const input = document.getElementById('restaurantInput');
  const list = document.getElementById('autocompleteList');
  if(input) input.value = name;
  if(list) list.innerHTML = '';
};
function saveRestaurant(name){
  if(name && !restaurants.includes(name)){
    restaurants.push(name);
    try{localStorage.setItem('riderRestaurants', JSON.stringify(restaurants));}catch(e){}
  }
}
document.addEventListener('click', e => {
  const box = document.getElementById('restaurantBox');
  const list = document.getElementById('autocompleteList');
  if(box && list && !box.contains(e.target)) list.innerHTML = '';
});

// ============================================================
// ENTREGAS
// ============================================================
window.addEntrega = function(isInit){ addEntrega(isInit); };
function addEntrega(isInit=false){
  if(entregaCount >= 5) return;
  const idx = entregaCount;
  const div = document.createElement('div');
  div.className = 'entrega-row'; div.id = `entrega_${idx}`;
  div.innerHTML = `<div class="entrega-num">${idx}</div>
    <div class="entrega-input-wrap">
      <label>KM Entrega ${idx}</label>
      <input type="number" id="kmE_${idx}" placeholder="0.000" step="0.001" oninput="updateResult()">
    </div>
    ${idx>1?`<button class="remove-entrega" onclick="removeEntrega(${idx})">×</button>`:'<div style="width:30px"></div>'}`;
  const container = document.getElementById('entregasContainer');
  if(container) container.appendChild(div);
  entregaCount++;
  const addBtn = document.getElementById('addEntregaBtn');
  if(addBtn) addBtn.disabled = entregaCount >= 5;
  if(!isInit) setTimeout(() => {
    const el = document.getElementById(`kmE_${idx}`);
    if(el) el.focus();
  }, 100);
}
window.removeEntrega = function(idx){
  const el = document.getElementById(`entrega_${idx}`);
  if(el) el.remove();
  entregaCount--;
  const addBtn = document.getElementById('addEntregaBtn');
  if(addBtn) addBtn.disabled = false;
  updateResult();
};
function getKmEntregas(){
  let total = 0, count = 0;
  for(let i=1;i<6;i++){
    const el = document.getElementById(`kmE_${i}`);
    if(el){ total += parseFloat(el.value)||0; count++; }
  }
  return {total, count};
}

// ============================================================
// CÁLCULO
// ============================================================
function calcPedido(kmR, kmETotal, nEnt, prop, mult){
  const base = (FIXED + 1.00 + (2.50 * nEnt) + (kmR + kmETotal) * 1.50 + 0.50) * mult;
  return parseFloat((base + prop).toFixed(2));
}
function calcCostoPedido(kmR, kmETotal){
  const kmTotal = kmR + kmETotal;
  const costoGas = (cfg.gasPrice / cfg.kmGalon) * kmTotal;
  return parseFloat(costoGas.toFixed(2));
}
function calcCostoDia(){
  const km = orders.reduce((s,o) => s+o.kmR+o.kmETotal, 0);
  const costoGas = (cfg.gasPrice / cfg.kmGalon) * km;
  return parseFloat((costoGas + cfg.mant + cfg.otros).toFixed(2));
}

window.updateResult = function(){
  const kmREl = document.getElementById('kmRetiro');
  const propinaEl = document.getElementById('propina');
  const kmR = parseFloat(kmREl ? kmREl.value : '0') || 0;
  const {total: kmETotal, count: nEnt} = getKmEntregas();
  const prop = parseFloat(propinaEl ? propinaEl.value : '0') || 0;
  const mult = getEffMult();
  const total = calcPedido(kmR, kmETotal, nEnt, prop, mult);
  const costo = calcCostoPedido(kmR, kmETotal);
  const neta = parseFloat((total - costo).toFixed(2));

  const amountEl = document.getElementById('resultAmount');
  const breakdownEl = document.getElementById('resultBreakdown');
  const netaEl = document.getElementById('resultNeta');

  if(amountEl) amountEl.textContent = 'Q ' + total.toFixed(2);
  if(kmR > 0 || kmETotal > 0){
    const base = total - prop;
    const lines = [`Base × ${mult}x = Q${base.toFixed(2)}`];
    if(nEnt > 1) lines.push(`${nEnt} puntos de entrega`);
    if(prop > 0) lines.push(`+ Q${prop.toFixed(2)} propina`);
    if(breakdownEl) breakdownEl.innerHTML = lines.map(l=>`<span>${l}</span>`).join('');
    if(cfg.gasPrice > 0 && netaEl)
      netaEl.textContent = `⛽ Costo: Q${costo.toFixed(2)} · Neto: Q${neta.toFixed(2)}`;
    else if(netaEl) netaEl.textContent = '';
  } else {
    if(breakdownEl) breakdownEl.innerHTML = '';
    if(netaEl) netaEl.textContent = '';
  }
};

// ============================================================
// TIEMPO
// ============================================================
window.setTime = function(type){
  const now = new Date(); times[type] = now;
  const hm = now.toTimeString().slice(0,5);
  const cap = type.charAt(0).toUpperCase() + type.slice(1);
  const timeEl = document.getElementById('time'+cap);
  const btnEl = document.getElementById('btn'+cap);
  if(timeEl) timeEl.textContent = hm;
  if(btnEl) btnEl.classList.add('set');
  const saved = loadTimes();
  saved[type] = hm;
  saveTimes(saved);
};
function timeToMins(t){ if(!t) return null; const[h,m]=t.split(':').map(Number); return h*60+m; }
function calcTimings(o){
  const ta=timeToMins(o.tAceptar), tl=timeToMins(o.tLlegue), tr=timeToMins(o.tRecogi), te=timeToMins(o.tEntregu);
  return{
    irRestaurante: (ta!==null&&tl!==null) ? tl-ta : null,
    esperaRest: (tl!==null&&tr!==null) ? tr-tl : null,
    rutaEntrega: (tr!==null&&te!==null) ? te-tr : null,
    totalPedido: (ta!==null&&te!==null) ? te-ta : null
  };
}

// ============================================================
// AGREGAR PEDIDO
// ============================================================
window.addOrder = function(){
  const kmREl = document.getElementById('kmRetiro');
  const propinaEl = document.getElementById('propina');
  const restEl = document.getElementById('restaurantInput');
  const kmR = parseFloat(kmREl ? kmREl.value : '0') || 0;
  const {total: kmETotal, count: nEnt} = getKmEntregas();
  const prop = parseFloat(propinaEl ? propinaEl.value : '0') || 0;
  const restaurant = restEl ? restEl.value.trim() : '';
  if(kmR === 0 && kmETotal === 0){ alert('Ingresá al menos un km'); return; }
  const mult = getEffMult();
  const total = calcPedido(kmR, kmETotal, nEnt, prop, mult);
  const order = {
    id: Date.now(), kmR, kmETotal, nEnt, prop, mult, total, restaurant,
    ts: new Date().toISOString(),
    tAceptar: times.aceptar ? times.aceptar.toTimeString().slice(0,5) : null,
    tLlegue: times.llegue ? times.llegue.toTimeString().slice(0,5) : null,
    tRecogi: times.recogi ? times.recogi.toTimeString().slice(0,5) : null,
    tEntregu: times.entregu ? times.entregu.toTimeString().slice(0,5) : null,
  };
  if(restaurant) saveRestaurant(restaurant);
  allOrders.unshift(order);
  orders = allOrders.filter(o => new Date(o.ts).toDateString() === new Date().toDateString());
  saveOrders(); updateHeader(); renderHistory(); resetForm();
  if(currentTab==='stats'){updateWidgets();updateSemanaComparativa();}
};
function saveTimes(t){ try{localStorage.setItem("riderTimes_"+new Date().toDateString(),JSON.stringify(t));}catch(e){} }
function loadTimes(){ try{const t=localStorage.getItem("riderTimes_"+new Date().toDateString());return t?JSON.parse(t):{};}catch(e){return {};} }
function resetForm(){
  const els = ['kmRetiro','propina','restaurantInput'];
  els.forEach(id => { const el=document.getElementById(id); if(el) el.value=''; });
  for(let i=1;i<6;i++){ const el=document.getElementById(`kmE_${i}`); if(el) el.value=''; }
  for(let i=2;i<6;i++){ const el=document.getElementById(`entrega_${i}`); if(el) el.remove(); }
  entregaCount = 2;
  const addBtn = document.getElementById('addEntregaBtn');
  if(addBtn) addBtn.disabled = false;
  const amountEl = document.getElementById('resultAmount');
  if(amountEl) amountEl.textContent = 'Q 0.00';
  const breakdownEl = document.getElementById('resultBreakdown');
  if(breakdownEl) breakdownEl.innerHTML = '';
  const netaEl = document.getElementById('resultNeta');
  if(netaEl) netaEl.textContent = '';
  times = {aceptar:null,llegue:null,recogi:null,entregu:null};
  try{localStorage.removeItem('riderTimes_'+new Date().toDateString());}catch(e){}
  ['Aceptar','Llegue','Recogi','Entregu'].forEach(t => {
    const timeEl = document.getElementById('time'+t);
    const btnEl = document.getElementById('btn'+t);
    if(timeEl) timeEl.textContent = '--:--';
    if(btnEl) btnEl.classList.remove('set');
  });
}

// ============================================================
// HEADER
// ============================================================
function updateHeader(){
  const earned = orders.reduce((s,o) => s+o.total, 0);
  const km = orders.reduce((s,o) => s+o.kmR+o.kmETotal, 0);
  const nEnt = orders.reduce((s,o) => s+o.nEnt, 0);
  const avg = orders.length > 0 ? earned/orders.length : 0;
  const costoDia = calcCostoDia();
  const neta = earned - costoDia;

  const set = (id, val) => { const el=document.getElementById(id); if(el) el.textContent=val; };
  set('totalDay', 'Q ' + (earned + (cfg.base||0)).toFixed(2));
  set('statPedidos', orders.length);
  set('statEntregas', nEnt);
  set('statKm', km.toFixed(1));
  set('statPromedio', 'Q'+avg.toFixed(0));
  set('statNeta', 'Q'+neta.toFixed(0));

  if(cfg.meta > 0){
    const pct = Math.min(100, (earned/cfg.meta)*100);
    const fillEl = document.getElementById('metaHeaderFill');
    if(fillEl) fillEl.style.width = pct+'%';
    const falta = cfg.meta - earned;
    const metaMini = document.getElementById('metaMini');
    if(metaMini){
      metaMini.style.display = 'block';
      if(falta <= 0){
        metaMini.textContent = '🔥 META COMPLETADA';
        metaMini.style.color = 'var(--green)';
      } else {
        metaMini.textContent = `Faltan Q${falta.toFixed(0)}`;
        metaMini.style.color = 'var(--yellow)';
      }
    }
  }
}

// ============================================================
// HISTORIAL
// ============================================================
function renderHistory(){ renderHistForDate(histViewDate); }

function renderDeadTimes(){
  const sorted = [...orders].sort((a,b) => new Date(a.ts)-new Date(b.ts));
  const dt = [];
  for(let i=1;i<sorted.length;i++){
    const prev=sorted[i-1], curr=sorted[i];
    if(prev.tEntregu && curr.tAceptar){
      const pe=timeToMins(prev.tEntregu), ca=timeToMins(curr.tAceptar);
      if(pe!==null && ca!==null && ca>pe) dt.push({from:prev.tEntregu,to:curr.tAceptar,mins:ca-pe});
    }
  }
  window._deadTimes = dt;
}

// ============================================================
// EDITAR
// ============================================================
window.openEdit = function(id){
  const o = orders.find(x => x.id===id); if(!o) return;
  const set = (elId, val) => { const el=document.getElementById(elId); if(el) el.value=val||''; };
  set('editOrderId', id);
  set('editRestaurant', o.restaurant);
  set('editKmR', o.kmR);
  set('editKmE', o.kmETotal);
  set('editMult', o.mult);
  set('editProp', o.prop);
  set('editTAceptar', o.tAceptar||'');
  set('editTLlegue', o.tLlegue||'');
  set('editTRecogi', o.tRecogi||'');
  set('editTEntregu', o.tEntregu||'');
  openModal('editModal');
};
window.saveEdit = function(){
  const idEl = document.getElementById('editOrderId');
  const id = parseInt(idEl ? idEl.value : '0');
  const idx = allOrders.findIndex(x => x.id===id); if(idx===-1) return;
  const get = (elId) => document.getElementById(elId);
  const kmR = parseFloat(get('editKmR').value)||0;
  const kmETotal = parseFloat(get('editKmE').value)||0;
  const mult = parseFloat(get('editMult').value)||1.30;
  const prop = parseFloat(get('editProp').value)||0;
  const restaurant = get('editRestaurant').value.trim();
  const total = calcPedido(kmR, kmETotal, allOrders[idx].nEnt, prop, mult);
  allOrders[idx] = {...allOrders[idx], kmR, kmETotal, mult, prop, restaurant, total,
    tAceptar: get('editTAceptar').value||null,
    tLlegue: get('editTLlegue').value||null,
    tRecogi: get('editTRecogi').value||null,
    tEntregu: get('editTEntregu').value||null,
  };
  if(restaurant) saveRestaurant(restaurant);
  orders = allOrders.filter(o => new Date(o.ts).toDateString() === new Date().toDateString());
  saveOrders(); updateHeader(); renderHistory(); closeModal('editModal');
};
window.deleteOrder = function(id){
  if(!confirm('¿Eliminar este pedido?')) return;
  allOrders = allOrders.filter(o => o.id!==id);
  orders = allOrders.filter(o => new Date(o.ts).toDateString() === new Date().toDateString());
  saveOrders(); updateHeader(); renderHistory();
  if(currentTab==='stats'){updateWidgets();updateSemanaComparativa();}
};

// ============================================================
// STATS
// ============================================================
function updateStats(){
  if(orders.length === 0) return;
  const earned = orders.reduce((s,o) => s+o.total, 0);
  const km = orders.reduce((s,o) => s+o.kmR+o.kmETotal, 0);
  const pt = orders.reduce((s,o) => s+o.prop, 0);
  const nEnt = orders.reduce((s,o) => s+o.nEnt, 0);
  const costoDia = calcCostoDia();
  const neta = earned - costoDia;
  const costoKm = km > 0 ? costoDia/km : 0;
  const totals = orders.map(o=>o.total);
  const best=Math.max(...totals), worst=Math.min(...totals);
  const bO=orders.find(o=>o.total===best), wO=orders.find(o=>o.total===worst);

  const set = (id, val) => { const el=document.getElementById(id); if(el) el.textContent=val; };
  set('sTotal', 'Q '+earned.toFixed(2));
  set('sNeta', 'Q '+neta.toFixed(2));
  set('sPedidos', orders.length);
  set('sEntregas', nEnt);
  set('sKm', km.toFixed(1));
  set('sCostoKm', 'Q'+costoKm.toFixed(2));
  set('sQkm', km>0?(earned/km).toFixed(2):'0.00');
  set('sPropinas', 'Q '+pt.toFixed(2));

  if(cfg.meta > 0){
    const pct = Math.min(100,(earned/cfg.meta)*100);
    const falta = cfg.meta - earned;
    const sec = document.getElementById('metaBarSection');
    if(sec) sec.style.display = 'block';
    const card = document.getElementById('metaBarCard');
    if(card) card.innerHTML = `
      <div class="meta-bar-top">
        <div class="meta-bar-label">🎯 Meta diaria: Q${cfg.meta}</div>
        <div class="meta-bar-msg ${falta<=0?'done':'going'}">${falta<=0?'🔥 META COMPLETADA':'Faltan Q'+falta.toFixed(0)}</div>
      </div>
      <div class="meta-bar-track"><div class="meta-bar-fill" style="width:${pct}%"></div></div>
      <div class="meta-bar-nums"><span>Q0</span><span>${pct.toFixed(0)}%</span><span>Q${cfg.meta}</span></div>`;
  }

  if(cfg.gasPrice > 0){
    const netaCard = document.getElementById('netaCard');
    if(netaCard){
      netaCard.style.display = 'block';
      netaCard.innerHTML = `
        <div class="neta-row"><span class="nl">💰 Ganancia bruta</span><span class="nv green">Q ${earned.toFixed(2)}</span></div>
        <div class="neta-row"><span class="nl">⛽ Costo gasolina</span><span class="nv red">-Q ${((cfg.gasPrice/cfg.kmGalon)*km).toFixed(2)}</span></div>
        <div class="neta-row"><span class="nl">🔧 Mantenimiento</span><span class="nv red">-Q ${cfg.mant.toFixed(2)}</span></div>
        <div class="neta-row"><span class="nl">📦 Otros gastos</span><span class="nv red">-Q ${cfg.otros.toFixed(2)}</span></div>
        <div class="neta-row"><span class="nl" style="font-weight:700;color:var(--text)">✅ GANANCIA NETA</span><span class="nv ${neta>=0?'green':'red'}">Q ${neta.toFixed(2)}</span></div>`;
    }
  }

  const franjas = {};
  orders.forEach(o => {
    const h = new Date(o.ts).getHours();
    const key = `${h.toString().padStart(2,'0')}:00`;
    if(!franjas[key]) franjas[key] = {total:0,count:0};
    franjas[key].total += o.total;
    franjas[key].count++;
  });
  const sortedFranjas = Object.entries(franjas).sort((a,b)=>a[0].localeCompare(b[0]));
  const maxFranja = Math.max(...sortedFranjas.map(([,v])=>v.total),1);
  const horaEl = document.getElementById('horaStats');
  if(sortedFranjas.length > 0 && horaEl){
    horaEl.innerHTML = `
      <div class="ic-title">🕐 Ganancias por franja horaria</div>
      ${sortedFranjas.map(([hora,v])=>`
        <div class="hora-bar">
          <div class="hora-label">${hora}</div>
          <div class="hora-track"><div class="hora-fill" style="width:${(v.total/maxFranja*100).toFixed(0)}%"></div></div>
          <div class="hora-val">Q${v.total.toFixed(0)}</div>
        </div>`).join('')}
    `;
  }

  const timed = orders.filter(o => o.tAceptar && o.tEntregu);
  if(timed.length > 0){
    const timings = timed.map(o => calcTimings(o));
    const avg = arr => arr.length>0 ? (arr.reduce((a,b)=>a+b,0)/arr.length).toFixed(0) : '--';
    const irArr = timings.filter(t=>t.irRestaurante!==null).map(t=>t.irRestaurante);
    const espArr = timings.filter(t=>t.esperaRest!==null).map(t=>t.esperaRest);
    const rutArr = timings.filter(t=>t.rutaEntrega!==null).map(t=>t.rutaEntrega);
    const totArr = timings.filter(t=>t.totalPedido!==null).map(t=>t.totalPedido);
    const tbEl = document.getElementById('timeBreakdown');
    if(tbEl) tbEl.innerHTML = `
      <div class="ic-title">⏱️ Tiempos promedio del día</div>
      ${irArr.length>0?`<div class="ic-row"><span style="font-size:12px;color:var(--muted)">🏍️ Yendo al restaurante</span><span style="color:var(--yellow);font-family:'Bebas Neue';font-size:20px">${avg(irArr)} min</span></div>`:''}
      ${espArr.length>0?`<div class="ic-row"><span style="font-size:12px;color:var(--muted)">⏳ Esperando en restaurante</span><span style="color:var(--yellow);font-family:'Bebas Neue';font-size:20px">${avg(espArr)} min</span></div>`:''}
      ${rutArr.length>0?`<div class="ic-row"><span style="font-size:12px;color:var(--muted)">🛵 Entregando al cliente</span><span style="color:var(--yellow);font-family:'Bebas Neue';font-size:20px">${avg(rutArr)} min</span></div>`:''}
      ${totArr.length>0?`<div class="ic-row"><span style="font-size:12px;color:var(--muted)">📍 Total por pedido</span><span style="color:var(--yellow);font-family:'Bebas Neue';font-size:20px">${avg(totArr)} min</span></div>`:''}
      <div class="ic-row"><span style="font-size:12px;color:var(--muted)">💰 Q por hora trabajada</span><span style="color:var(--green);font-family:'Bebas Neue';font-size:20px">Q${totArr.length>0?(earned/(totArr.reduce((a,b)=>a+b,0)/60)).toFixed(0):'--'}</span></div>
    `;
  }

  const dt = window._deadTimes || [];
  if(dt.length > 0){
    const avgDead = dt.reduce((s,d)=>s+d.mins,0)/dt.length;
    const maxDead = Math.max(...dt.map(d=>d.mins));
    const totalDead = dt.reduce((s,d)=>s+d.mins,0);
    const dtEl = document.getElementById('deadTimeCard');
    if(dtEl) dtEl.innerHTML = `
      <div class="ic-title">💤 Tiempos muertos (${dt.length} pausas)</div>
      <div class="ic-row"><span style="font-size:12px;color:var(--muted)">Total tiempo muerto</span><span style="color:var(--accent);font-family:'Bebas Neue';font-size:20px">${totalDead} min</span></div>
      <div class="ic-row"><span style="font-size:12px;color:var(--muted)">Promedio por pausa</span><span style="color:var(--yellow);font-family:'Bebas Neue';font-size:20px">${avgDead.toFixed(0)} min</span></div>
      <div class="ic-row"><span style="font-size:12px;color:var(--muted)">Pausa más larga</span><span style="color:var(--accent);font-family:'Bebas Neue';font-size:20px">${maxDead} min</span></div>
    `;
  }

  const restOrders = orders.filter(o => o.restaurant && o.tLlegue && o.tRecogi);
  if(restOrders.length > 0){
    const restMap = {};
    restOrders.forEach(o => {
      const esp = timeToMins(o.tRecogi) - timeToMins(o.tLlegue);
      if(esp >= 0){
        if(!restMap[o.restaurant]) restMap[o.restaurant] = {total:0,count:0};
        restMap[o.restaurant].total += esp; restMap[o.restaurant].count++;
      }
    });
    const sorted = Object.entries(restMap).sort((a,b) => b[1].total/b[1].count - a[1].total/a[1].count);
    const rsEl = document.getElementById('restaurantStats');
    if(rsEl) rsEl.innerHTML = `
      <div class="ic-title">🏪 Restaurantes por tiempo de espera</div>
      ${sorted.map(([name,d],i)=>`
        <div class="ic-row">
          <span style="font-size:12px;color:var(--muted)">${i===0?'🔴':i===sorted.length-1?'🟢':'🟡'} ${name}</span>
          <div style="text-align:right"><span style="color:var(--yellow);font-family:'Bebas Neue';font-size:18px">${(d.total/d.count).toFixed(0)}min</span><div style="font-size:10px;color:var(--muted)">${d.count} visita${d.count>1?'s':''}</div></div>
        </div>`).join('')}`;
  }

  const bwEl = document.getElementById('bestWorst');
  if(bwEl) bwEl.innerHTML = `
    <div class="ic-title">🏆 Mejor vs Peor pedido</div>
    <div class="ic-row"><span class="ic-badge best">MEJOR</span><span style="font-size:11px;color:var(--muted)">${bO.kmR}+${bO.kmETotal}km · ${bO.mult}x · ${bO.nEnt}ent.</span><span style="color:var(--green);font-family:'Bebas Neue';font-size:20px">Q${best.toFixed(2)}</span></div>
    <div class="ic-row"><span class="ic-badge worst">PEOR</span><span style="font-size:11px;color:var(--muted)">${wO.kmR}+${wO.kmETotal}km · ${wO.mult}x · ${wO.nEnt}ent.</span><span style="color:var(--accent);font-family:'Bebas Neue';font-size:20px">Q${worst.toFixed(2)}</span></div>`;

  const today = new Date().toDateString();
  try{
    const todayOdo = JSON.parse(localStorage.getItem('riderOdo_'+today)||'null');
    if(todayOdo){
      const appKm = km;
      const diff = appKm - todayOdo;
      const qGanado = diff * 1.50 * multiplier;
      const odoStatEl = document.getElementById('odoStats');
      const odoContentEl = document.getElementById('odoStatsContent');
      if(odoStatEl) odoStatEl.style.display = 'block';
      if(odoContentEl) odoContentEl.innerHTML = `
        <div class="ic-row"><span style="font-size:12px;color:var(--muted)">KM app</span><span style="color:var(--blue);font-family:'Bebas Neue';font-size:20px">${appKm.toFixed(1)} km</span></div>
        <div class="ic-row"><span style="font-size:12px;color:var(--muted)">KM odómetro real</span><span style="color:var(--muted);font-family:'Bebas Neue';font-size:20px">${todayOdo.toFixed(1)} km</span></div>
        <div class="ic-row"><span style="font-size:12px;color:var(--muted)">KM ganados (atajos)</span><span style="color:var(--green);font-family:'Bebas Neue';font-size:20px">${diff.toFixed(1)} km</span></div>
        <div class="ic-row"><span style="font-size:12px;color:var(--muted)">Q extra generados</span><span style="color:var(--green);font-family:'Bebas Neue';font-size:20px">Q${qGanado.toFixed(2)}</span></div>`;
    }
  }catch(e){}
}

// ============================================================
// GRÁFICA
// ============================================================
function renderCharts(){
  const days = getLast14Days();
  const labels = days.map(d => new Date(d).toLocaleDateString('es-GT',{weekday:'short'}));
  const ganancias = days.map(d => allOrders.filter(o=>new Date(o.ts).toDateString()===d).reduce((s,o)=>s+o.total,0));
  const pedidos = days.map(d => allOrders.filter(o=>new Date(o.ts).toDateString()===d).length);
  const entregas = days.map(d => allOrders.filter(o=>new Date(o.ts).toDateString()===d).reduce((s,o)=>s+o.nEnt,0));
  const tiempos = days.map(d => {
    const dayO = allOrders.filter(o=>new Date(o.ts).toDateString()===d&&o.tAceptar&&o.tEntregu);
    if(dayO.length===0) return 0;
    const tots = dayO.map(o=>calcTimings(o).totalPedido).filter(t=>t!==null);
    return tots.length>0 ? tots.reduce((a,b)=>a+b,0)/tots.length : 0;
  });
  const brutas = ganancias;
  const netas = days.map(d => {
    const dayO = allOrders.filter(o=>new Date(o.ts).toDateString()===d);
    const dayKm = dayO.reduce((s,o)=>s+o.kmR+o.kmETotal,0);
    const costo = (cfg.gasPrice/cfg.kmGalon)*dayKm + cfg.mant + cfg.otros;
    return Math.max(0, dayO.reduce((s,o)=>s+o.total,0) - costo);
  });

  drawBarChart('chartGanancias', labels, ganancias, '#00e676', 'Q');
  drawDualBarChart('chartPedidos', labels, pedidos, entregas, '#ff2d55', '#4da6ff', 'Pedidos', 'Entregas');
  drawBarChart('chartTiempo', labels, tiempos, '#ffb347', 'min');
  drawDualBarChart('chartNeta', labels, brutas, netas, '#ff6b35', '#00e676', 'Bruta', 'Neta');
}
function getLast14Days(){
  const days = [];
  for(let i=13;i>=0;i--){ const d=new Date(); d.setDate(d.getDate()-i); days.push(d.toDateString()); }
  return days;
}
function drawBarChart(canvasId, labels, data, color, unit){
  const canvas = document.getElementById(canvasId);
  if(!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.offsetWidth || 320; canvas.width = w;
  const h = parseInt(canvas.getAttribute('height'));
  const pad = {top:22,right:8,bottom:36,left:36};
  const cw = w-pad.left-pad.right, ch = h-pad.top-pad.bottom;
  const max = Math.max(...data, 1);
  ctx.clearRect(0,0,w,h); ctx.fillStyle='#181818'; ctx.fillRect(0,0,w,h);
  for(let i=0;i<=4;i++){
    const y=pad.top+ch*(1-i/4);
    ctx.strokeStyle='#2a2a2a'; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(pad.left,y); ctx.lineTo(pad.left+cw,y); ctx.stroke();
    ctx.fillStyle='#666'; ctx.font='9px DM Sans'; ctx.textAlign='right';
    const val = max*i/4;
    ctx.fillText((unit==='Q'?'Q':'')+val.toFixed(0)+(unit==='min'?'m':''), pad.left-3, y+3);
  }
  labels.forEach((l,i) => {
    const x = pad.left + cw*i/labels.length + cw/labels.length/2;
    const bw = Math.max(cw/labels.length*0.6, 4);
    const bh = data[i]/max*ch;
    const isToday = i === labels.length-1;
    ctx.fillStyle = isToday ? color : color+'66';
    ctx.beginPath();
    if(ctx.roundRect) ctx.roundRect(x-bw/2, pad.top+ch-bh, bw, bh, 3);
    else ctx.rect(x-bw/2, pad.top+ch-bh, bw, bh);
    ctx.fill();
    ctx.fillStyle='#666'; ctx.font='8px DM Sans'; ctx.textAlign='center';
    ctx.fillText(l, x, h-pad.bottom+12);
    if(data[i]>0){ ctx.fillStyle=color; ctx.font='bold 8px DM Sans'; ctx.fillText((unit==='Q'?'Q':'')+data[i].toFixed(0)+(unit==='min'?'m':''), x, pad.top+ch-bh-4); }
  });
}
function drawDualBarChart(canvasId, labels, data1, data2, color1, color2, lbl1, lbl2){
  const canvas = document.getElementById(canvasId);
  if(!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.offsetWidth || 320; canvas.width = w;
  const h = parseInt(canvas.getAttribute('height'));
  const pad = {top:22,right:8,bottom:36,left:36};
  const cw = w-pad.left-pad.right, ch = h-pad.top-pad.bottom;
  const max = Math.max(...data1,...data2, 1);
  ctx.clearRect(0,0,w,h); ctx.fillStyle='#181818'; ctx.fillRect(0,0,w,h);
  for(let i=0;i<=4;i++){
    const y=pad.top+ch*(1-i/4);
    ctx.strokeStyle='#2a2a2a'; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(pad.left,y); ctx.lineTo(pad.left+cw,y); ctx.stroke();
    ctx.fillStyle='#666'; ctx.font='9px DM Sans'; ctx.textAlign='right';
    ctx.fillText((max*i/4).toFixed(0), pad.left-3, y+3);
  }
  const bw = Math.max(cw/labels.length*0.28, 2);
  labels.forEach((l,i) => {
    const cx = pad.left + cw*i/labels.length + cw/labels.length/2;
    [data1[i],data2[i]].forEach((val,j) => {
      const x = cx + (j===0?-bw/2-1:bw/2+1) - bw/2;
      const bh = val/max*ch;
      const col = j===0?color1:color2;
      ctx.fillStyle = col+'99';
      ctx.fillRect(x, pad.top+ch-bh, bw, bh);
    });
    ctx.fillStyle='#666'; ctx.font='8px DM Sans'; ctx.textAlign='center';
    ctx.fillText(l, cx, h-pad.bottom+12);
  });
  ctx.fillStyle=color1; ctx.fillRect(pad.left, 4, 10, 7);
  ctx.fillStyle='#999'; ctx.font='9px DM Sans'; ctx.textAlign='left';
  ctx.fillText(lbl1, pad.left+13, 11);
  ctx.fillStyle=color2; ctx.fillRect(pad.left+60, 4, 10, 7);
  ctx.fillText(lbl2, pad.left+73, 11);
}

// ============================================================
// ODO & REPORTE
// ============================================================
window.openOdometer = function(){
  const appKm = orders.reduce((s,o)=>s+o.kmR+o.kmETotal,0);
  const el = document.getElementById('odoAppKm');
  if(el) el.textContent = appKm.toFixed(2);
  const diffCard = document.getElementById('odoDiffCard');
  if(diffCard) diffCard.style.display = 'none';
  const odoInput = document.getElementById('odoInput');
  if(odoInput) odoInput.value = '';
  openModal('odoModal');
};
window.updateOdoDiff = function(){
  const appKm = orders.reduce((s,o)=>s+o.kmR+o.kmETotal,0);
  const odoKm = parseFloat(document.getElementById('odoInput').value)||0;
  if(odoKm > 0){
    const diff = appKm - odoKm;
    const qGanado = diff * 1.50 * multiplier;
    const diffCard = document.getElementById('odoDiffCard');
    if(diffCard) diffCard.style.display = 'block';
    const diffKm = document.getElementById('odoDiffKm');
    if(diffKm) diffKm.textContent = diff.toFixed(2)+' km';
    const diffQ = document.getElementById('odoDiffQ');
    if(diffQ) diffQ.textContent = diff > 0 ? `💰 Q${qGanado.toFixed(2)} extra generados` : 'Sin diferencia';
  }
};
window.saveOdoAndReport = function(){
  const odoKm = parseFloat(document.getElementById('odoInput').value)||0;
  try{localStorage.setItem('riderOdo_'+new Date().toDateString(), JSON.stringify(odoKm));}catch(e){}
  closeModal('odoModal');
  showReport(odoKm);
};
function showReport(odoKm){
  const earned = orders.reduce((s,o)=>s+o.total,0);
  const km = orders.reduce((s,o)=>s+o.kmR+o.kmETotal,0);
  const pt = orders.reduce((s,o)=>s+o.prop,0);
  const nEnt = orders.reduce((s,o)=>s+o.nEnt,0);
  const costoDia = calcCostoDia();
  const neta = earned - costoDia;
  const dt = window._deadTimes || [];
  const totalDead = dt.reduce((s,d)=>s+d.mins,0);
  const timed = orders.filter(o=>o.tAceptar&&o.tEntregu);
  const timings = timed.map(o=>calcTimings(o));
  const avg = arr => arr.length>0?(arr.reduce((a,b)=>a+b,0)/arr.length).toFixed(0):'--';
  const irArr = timings.filter(t=>t.irRestaurante!==null).map(t=>t.irRestaurante);
  const espArr = timings.filter(t=>t.esperaRest!==null).map(t=>t.esperaRest);
  const rutArr = timings.filter(t=>t.rutaEntrega!==null).map(t=>t.rutaEntrega);
  const diff = odoKm>0 ? km-odoKm : null;
  const qGanado = diff!==null ? diff*1.50*multiplier : null;
  const date = new Date().toLocaleDateString('es-GT',{weekday:'long',day:'numeric',month:'long'});

  reportText = `🛵 RIDER CALC - ${date}\n\n💰 GANANCIAS\nTotal bruto: Q${earned.toFixed(2)}\nGanancia neta: Q${neta.toFixed(2)}\nPedidos: ${orders.length} | Entregas: ${nEnt}\nPromedio/pedido: Q${orders.length>0?(earned/orders.length).toFixed(2):'0'}\nPropinas: Q${pt.toFixed(2)}\n\n⛽ COSTOS\nCosto del día: Q${costoDia.toFixed(2)}\nKM recorridos: ${km.toFixed(1)}\n${diff!==null?`KM ganados atajos: ${diff.toFixed(1)} km\nQ extra: Q${qGanado.toFixed(2)}\n`:''}\n⏱️ TIEMPOS${irArr.length>0?`\nIr restaurante: ${avg(irArr)}min`:''}${espArr.length>0?`\nEspera: ${avg(espArr)}min`:''}${rutArr.length>0?`\nEntrega: ${avg(rutArr)}min`:''}${totalDead>0?`\nTiempo muerto: ${totalDead}min`:''}`;

  const rc = document.getElementById('reportContent');
  if(rc) rc.innerHTML = `
    <div class="report-section">
      <h3>💰 Ganancias</h3>
      <div class="report-row"><span>Total bruto</span><span class="rv green">Q ${earned.toFixed(2)}</span></div>
      <div class="report-row"><span>Ganancia neta</span><span class="rv yellow">Q ${neta.toFixed(2)}</span></div>
      <div class="report-row"><span>Pedidos / Entregas</span><span class="rv">${orders.length} / ${nEnt}</span></div>
      <div class="report-row"><span>Promedio/pedido</span><span class="rv green">Q ${orders.length>0?(earned/orders.length).toFixed(2):'0'}</span></div>
      <div class="report-row"><span>Propinas</span><span class="rv green">Q ${pt.toFixed(2)}</span></div>
    </div>
    <div class="report-section">
      <h3>⛽ Costos</h3>
      <div class="report-row"><span>Costo total del día</span><span class="rv" style="color:var(--accent)">Q ${costoDia.toFixed(2)}</span></div>
      <div class="report-row"><span>KM recorridos</span><span class="rv blue">${km.toFixed(2)} km</span></div>
      ${diff!==null?`<div class="report-row"><span>KM ganados (atajos)</span><span class="rv green">${diff.toFixed(2)} km</span></div>
      <div class="report-row"><span>Q extra por atajos</span><span class="rv green">Q ${qGanado.toFixed(2)}</span></div>`:''}
    </div>
    ${timed.length>0?`<div class="report-section">
      <h3>⏱️ Tiempos</h3>
      ${irArr.length>0?`<div class="report-row"><span>🏍️ Ir restaurante</span><span class="rv yellow">${avg(irArr)} min</span></div>`:''}
      ${espArr.length>0?`<div class="report-row"><span>⏳ Espera</span><span class="rv yellow">${avg(espArr)} min</span></div>`:''}
      ${rutArr.length>0?`<div class="report-row"><span>🛵 Entrega</span><span class="rv yellow">${avg(rutArr)} min</span></div>`:''}
      ${totalDead>0?`<div class="report-row"><span>💤 Tiempo muerto</span><span class="rv" style="color:var(--accent)">${totalDead} min</span></div>`:''}
    </div>`:''}
  `;
  openModal('reportModal');
}
window.shareReport = function(){
  if(navigator.share){
    navigator.share({ text: reportText }).catch(()=>{
      window.open(`https://wa.me/?text=${encodeURIComponent(reportText)}`,'_blank');
    });
  } else {
    window.open(`https://wa.me/?text=${encodeURIComponent(reportText)}`,'_blank');
  }
};

// ============================================================
// QUICK MODAL
// ============================================================
function buildQuickPresets(){
  const container = document.getElementById('quickPresets');
  if(!container) return;
  [1.00,1.10,1.20,1.25,1.30,1.50,2.00].forEach(p => {
    const b = document.createElement('button');
    b.className = 'qm-btn'+(p===quickMult?' active':'');
    b.textContent = p.toFixed(2)+'x';
    b.onclick = ()=>setQuickMult(p);
    container.appendChild(b);
  });
}
function setQuickMult(v){
  quickMult = v;
  document.querySelectorAll('.qm-btn').forEach(b=>b.classList.toggle('active',parseFloat(b.textContent)===v));
  updateQuick();
}
window.updateQuick = function(){
  const get = id => parseFloat((document.getElementById(id)||{value:'0'}).value)||0;
  const kmR=get('qKmR'), kmE=get('qKmE'), prop=get('qProp'), rain=get('qRain');
  const mult = parseFloat((quickMult+rain).toFixed(2));
  const el = document.getElementById('qResult');
  if(el) el.textContent = 'Q '+calcPedido(kmR,kmE,1,prop,mult).toFixed(2);
};
window.openQuick = function(){
  openModal('quickModal');
  setTimeout(()=>{ const el=document.getElementById('qKmR'); if(el) el.focus(); }, 300);
};
window.quickAdd = function(){
  const get = id => parseFloat((document.getElementById(id)||{value:'0'}).value)||0;
  const kmR=get('qKmR'), kmE=get('qKmE'), prop=get('qProp'), rain=get('qRain');
  if(kmR===0&&kmE===0){alert('Ingresá los km');return;}
  const mult = parseFloat((quickMult+rain).toFixed(2));
  const total = calcPedido(kmR,kmE,1,prop,mult);
  const o = {id:Date.now(),kmR,kmETotal:kmE,nEnt:1,prop,mult,total,restaurant:'',
    ts:new Date().toISOString(),tAceptar:null,tLlegue:null,tRecogi:null,tEntregu:null};
  allOrders.unshift(o);
  orders = allOrders.filter(o=>new Date(o.ts).toDateString()===new Date().toDateString());
  saveOrders(); updateHeader(); renderHistory();
  ['qKmR','qKmE','qProp','qRain'].forEach(id=>{
    const el=document.getElementById(id); if(el) el.value='';
  });
  const resEl = document.getElementById('qResult');
  if(resEl) resEl.textContent = 'Q 0.00';
  closeModal('quickModal');
};

// ============================================================
// CONFIG
// ============================================================
function loadConfigUI(){
  const set = (id, val) => { const el=document.getElementById(id); if(el) el.value=val||''; };
  set('cfgMeta', cfg.meta||'');
  set('cfgBase', cfg.base||'');
  set('cfgGasPrice', cfg.gasPrice||'');
  set('cfgKmGalon', cfg.kmGalon||'');
  set('cfgMant', cfg.mant||'');
  set('cfgOtros', cfg.otros||'');
  const sw = document.getElementById('autoMultSwitch');
  const row = document.getElementById('autoToggleRow');
  if(sw) sw.classList.toggle('on', autoMultOn);
  if(row) row.classList.toggle('active-auto', autoMultOn);
  const badge = document.getElementById('autoMultBadge');
  if(badge) badge.style.display = autoMultOn?'inline-block':'none';
  const list = document.getElementById('scheduleList');
  if(list) list.innerHTML = '';
  schedules.forEach(s => window.addScheduleItem(s.time, s.mult));
}
window.saveConfig = function(){
  const get = id => parseFloat((document.getElementById(id)||{value:'0'}).value)||0;
  cfg.meta = get('cfgMeta');
  cfg.base = get('cfgBase');
  cfg.gasPrice = get('cfgGasPrice') || 32;
  cfg.kmGalon = get('cfgKmGalon') || 40;
  cfg.mant = get('cfgMant');
  cfg.otros = get('cfgOtros');
  schedules = getSchedules();
  try{
    localStorage.setItem('riderConfig', JSON.stringify(cfg));
    localStorage.setItem('riderSchedules', JSON.stringify(schedules));
  }catch(e){}
  updateHeader();
  const btn = document.querySelector('.save-config-btn');
  if(btn){ const orig=btn.textContent; btn.textContent='✅ Guardado'; setTimeout(()=>btn.textContent=orig,1500); }
};

// ============================================================
// EXPORTAR
// ============================================================
window.exportCSV = function(){
  const today = new Date().toDateString();
  const todayOrders = allOrders.filter(o=>new Date(o.ts).toDateString()===today);
  const header = 'Pedido,Restaurante,KM Retiro,KM Entrega,Entregas,Multiplicador,Propina,Total,Hora,T.Acepté,T.Llegué,T.Recogí,T.Entregué\n';
  const rows = todayOrders.map((o,i)=>
    `${todayOrders.length-i},"${o.restaurant||''}",${o.kmR},${o.kmETotal},${o.nEnt},${o.mult},${o.prop},${o.total},${new Date(o.ts).toTimeString().slice(0,5)},${o.tAceptar||''},${o.tLlegue||''},${o.tRecogi||''},${o.tEntregu||''}`
  ).join('\n');
  downloadBlob(header + rows, `rider_${new Date().toISOString().slice(0,10)}.csv`, 'text/csv;charset=utf-8;');
};
window.exportTXT = function(){
  const today = new Date().toDateString();
  const todayOrders = allOrders.filter(o=>new Date(o.ts).toDateString()===today);
  const earned = todayOrders.reduce((s,o)=>s+o.total,0);
  const km = todayOrders.reduce((s,o)=>s+o.kmR+o.kmETotal,0);
  const pt = todayOrders.reduce((s,o)=>s+o.prop,0);
  const costoDia = calcCostoDia();
  const txt = `RIDER CALC - ${new Date().toLocaleDateString('es-GT')}\n${'='.repeat(30)}\nPedidos: ${todayOrders.length}\nKM total: ${km.toFixed(2)}\nGanancias brutas: Q${earned.toFixed(2)}\nPropinas: Q${pt.toFixed(2)}\nCostos: Q${costoDia.toFixed(2)}\nGanancia neta: Q${(earned-costoDia).toFixed(2)}\n${'='.repeat(30)}\nDETALLE:\n${todayOrders.map((o,i)=>`${todayOrders.length-i}. ${o.restaurant||'Sin rest.'} | ${o.kmR}+${o.kmETotal}km | ${o.mult}x | Q${o.total.toFixed(2)}`).join('\n')}`;
  downloadBlob(txt, `rider_${new Date().toISOString().slice(0,10)}.txt`, 'text/plain');
};
window.shareWhatsApp = function(){
  const today = new Date().toDateString();
  const todayOrders = allOrders.filter(o=>new Date(o.ts).toDateString()===today);
  const earned = todayOrders.reduce((s,o)=>s+o.total,0);
  const km = todayOrders.reduce((s,o)=>s+o.kmR+o.kmETotal,0);
  const pt = todayOrders.reduce((s,o)=>s+o.prop,0);
  const costoDia = calcCostoDia();
  const msg = `🛵 *RIDER CALC - ${new Date().toLocaleDateString('es-GT')}*\n\n💰 Bruto: *Q${earned.toFixed(2)}*\n✅ Neto: *Q${(earned-costoDia).toFixed(2)}*\n📦 Pedidos: ${todayOrders.length}\n🗺️ KM: ${km.toFixed(1)}\n💚 Propinas: Q${pt.toFixed(2)}\n⛽ Costos: Q${costoDia.toFixed(2)}`;
  window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`,'_blank');
};

// NEW: Backup / Restore
window.exportBackup = function(){
  const backup = {
    version: 1,
    exportDate: new Date().toISOString(),
    allOrders,
    restaurants: restaurants.filter(r => !DEFAULT_RESTAURANTS.includes(r)),
    config: cfg,
    schedules,
    record: JSON.parse(localStorage.getItem('riderRecord')||'null'),
  };
  downloadBlob(JSON.stringify(backup, null, 2), `rider_backup_${new Date().toISOString().slice(0,10)}.json`, 'application/json');
};
window.importBackup = function(){
  const input = document.createElement('input');
  input.type = 'file'; input.accept = '.json';
  input.onchange = (e) => {
    const file = e.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try{
        const data = JSON.parse(ev.target.result);
        if(!data.version || !Array.isArray(data.allOrders)) throw new Error('Formato inválido');
        if(!confirm(`¿Importar ${data.allOrders.length} pedidos? Esto reemplazará tus datos actuales.`)) return;
        allOrders = data.allOrders;
        if(data.restaurants) restaurants = [...DEFAULT_RESTAURANTS, ...data.restaurants.filter(r=>!DEFAULT_RESTAURANTS.includes(r))];
        if(data.config) cfg = {...cfg, ...data.config};
        if(data.schedules) schedules = data.schedules;
        if(data.record) try{localStorage.setItem('riderRecord', JSON.stringify(data.record));}catch(e){}
        saveOrders();
        try{localStorage.setItem('riderRestaurants', JSON.stringify(restaurants));}catch(e){}
        try{localStorage.setItem('riderConfig', JSON.stringify(cfg));}catch(e){}
        try{localStorage.setItem('riderSchedules', JSON.stringify(schedules));}catch(e){}
        orders = allOrders.filter(o => new Date(o.ts).toDateString() === new Date().toDateString());
        updateHeader(); renderHistory(); loadConfigUI();
        alert(`✅ Importados ${allOrders.length} pedidos correctamente.`);
      }catch(err){
        alert('❌ Error al importar: '+err.message);
      }
    };
    reader.readAsText(file);
  };
  input.click();
};

function downloadBlob(content, filename, type){
  const blob = new Blob([content], {type});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}

// ============================================================
// MODALS & UTILS
// ============================================================
function openModal(id){ const el=document.getElementById(id); if(el) el.classList.add('open'); }
function closeModal(id){
  const el=document.getElementById(id); if(el) el.classList.remove('open');
  if(id==='quickModal' && currentTab==='historial'){
    const fab=document.getElementById('fab'); if(fab) fab.classList.remove('hidden');
  }
}
window.closeModal = closeModal;
window.closeModalOutside = function(e,id){ if(e.target===document.getElementById(id)) closeModal(id); };
window.clearToday = function(){
  if(confirm('¿Limpiar pedidos de hoy?')){
    allOrders = allOrders.filter(o=>new Date(o.ts).toDateString()!==new Date().toDateString());
    orders=[]; saveOrders(); updateHeader(); renderHistory();
  }
};
function saveOrders(){ try{localStorage.setItem('riderAllOrders',JSON.stringify(allOrders));}catch(e){} }

window.switchTab = function(tab){
  currentTab = tab;
  document.querySelectorAll('.tab').forEach((t,i)=>t.classList.toggle('active',['calc','historial','stats','grafica','config'][i]===tab));
  document.querySelectorAll('.tab-content').forEach(c=>c.classList.remove('active'));
  const tabEl = document.getElementById('tab-'+tab);
  if(tabEl) tabEl.classList.add('active');
  const fab = document.getElementById('fab');
  if(fab) fab.classList.toggle('hidden', tab!=='historial');
  if(tab==='stats'){ renderDeadTimes(); updateStats(); updateWidgets(); updateSemanaComparativa(); }
  if(tab==='grafica') renderCharts();
  if(tab==='config') loadConfigUI();
};

// ============================================================
// HISTORIAL POR FECHA
// ============================================================
let histViewDate = new Date();

window.changeHistDate = function(delta){
  histViewDate = new Date(histViewDate);
  histViewDate.setDate(histViewDate.getDate() + delta);
  renderHistForDate(histViewDate);
};
window.goToToday = function(){
  histViewDate = new Date();
  renderHistForDate(histViewDate);
};
function renderHistForDate(date){
  const isToday = date.toDateString() === new Date().toDateString();
  const dateStr = date.toDateString();
  const label = document.getElementById('histDateLabel');
  const lastBtn = document.getElementById('lastDeliveryBtn');

  if(label){
    if(isToday){
      label.textContent = 'HOY';
      label.style.color = 'var(--accent)';
    } else {
      label.textContent = date.toLocaleDateString('es-GT',{weekday:'short',day:'numeric',month:'short'}).toUpperCase();
      label.style.color = 'var(--text)';
    }
  }
  if(lastBtn) lastBtn.style.display = isToday ? 'flex' : 'none';

  const dayOrders = allOrders.filter(o => new Date(o.ts).toDateString() === dateStr);
  const summary = document.getElementById('histDaySummary');

  if(summary){
    if(dayOrders.length > 0){
      const total = dayOrders.reduce((s,o)=>s+o.total,0);
      const km = dayOrders.reduce((s,o)=>s+o.kmR+o.kmETotal,0);
      const prop = dayOrders.reduce((s,o)=>s+o.prop,0);
      summary.innerHTML = `<div class="widget-card" style="margin-bottom:10px">
        <div class="widget-row"><span class="widget-label">💰 Total del día</span><span class="widget-val" style="color:var(--green)">Q ${total.toFixed(2)}</span></div>
        <div class="widget-row"><span class="widget-label">📦 Pedidos</span><span class="widget-val">${dayOrders.length}</span></div>
        <div class="widget-row"><span class="widget-label">🗺️ KM</span><span class="widget-val" style="color:var(--blue)">${km.toFixed(1)}</span></div>
        <div class="widget-row"><span class="widget-label">💚 Propinas</span><span class="widget-val" style="color:var(--green)">Q ${prop.toFixed(2)}</span></div>
      </div>`;
    } else {
      summary.innerHTML = '';
    }
  }

  const list = document.getElementById('historyList');
  if(!list) return;
  if(dayOrders.length === 0){
    list.innerHTML = '<div class="empty-state"><div class="es-icon">📭</div><div class="es-text">Sin pedidos este día</div></div>';
    return;
  }

  list.innerHTML = dayOrders.map((o,i) => {
    const t = new Date(o.ts).toTimeString().slice(0,5);
    const tipo = o.nEnt > 1 ? o.nEnt+' entregas' : '1 entrega';
    const tim = calcTimings(o);
    let timing = '';
    if(tim.totalPedido !== null){
      timing = '<div class="order-timing">';
      if(tim.irRestaurante!==null) timing += `🏍️<span>${tim.irRestaurante}m</span> `;
      if(tim.esperaRest!==null) timing += `⏳<span>${tim.esperaRest}m</span> `;
      if(tim.rutaEntrega!==null) timing += `🛵<span>${tim.rutaEntrega}m</span> `;
      timing += `📍<span>${tim.totalPedido}m</span></div>`;
    }
    const actions = isToday
      ? `<div class="order-actions"><button class="action-btn edit" onclick="openEdit(${o.id})">✏️ Editar</button><button class="action-btn del" onclick="deleteOrder(${o.id})">🗑️ Eliminar</button></div>`
      : '';
    return `<div class="order-card">
      <div class="order-main">
        <div class="order-num">${dayOrders.length-i}</div>
        <div class="order-details">
          ${o.restaurant?`<div class="order-restaurant">🏪 ${o.restaurant}</div>`:''}
          <div class="order-km">📍 ${o.kmR}km · 🏠 ${o.kmETotal}km</div>
          <div class="order-meta">
            <span class="order-mult">${o.mult}x</span>
            <span class="order-type">${tipo}</span>
            <span class="order-time">${t}</span>
          </div>${timing}
        </div>
        <div class="order-right">
          <div class="order-amount">Q${o.total.toFixed(2)}</div>
          ${o.prop>0?`<div class="order-propina">+Q${o.prop.toFixed(2)}</div>`:''}
        </div>
      </div>${actions}
    </div>`;
  }).join('');
}

// ============================================================
// WIDGET RESUMEN + PROYECCIÓN + RÉCORD
// ============================================================
function updateWidgets(){
  const earned = orders.reduce((s,o)=>s+o.total,0) + (cfg.base||0);
  const km = orders.reduce((s,o)=>s+o.kmR+o.kmETotal,0);
  const nEnt = orders.reduce((s,o)=>s+o.nEnt,0);
  const costoDia = calcCostoDia();
  const neta = earned - costoDia;
  const lastOrder = orders[0];

  const wr = document.getElementById('widgetResumen');
  if(wr) wr.innerHTML = `
    <div class="widget-row"><span class="widget-label">💰 Ganado hoy</span><span class="widget-val" style="color:var(--green)">Q ${earned.toFixed(2)}</span></div>
    <div class="widget-row"><span class="widget-label">✅ Neto real</span><span class="widget-val" style="color:var(--yellow)">Q ${neta.toFixed(2)}</span></div>
    <div class="widget-row"><span class="widget-label">📦 Pedidos / Entregas</span><span class="widget-val">${orders.length} / ${nEnt}</span></div>
    ${lastOrder?`<div class="widget-row"><span class="widget-label">🕐 Último pedido</span><span class="widget-val" style="font-size:16px">Q${lastOrder.total.toFixed(2)} · ${new Date(lastOrder.ts).toTimeString().slice(0,5)}</span></div>`:''}
  `;

  if(orders.length >= 2){
    const firstTs = new Date(orders[orders.length-1].ts);
    const lastTs = new Date(orders[0].ts);
    const minsPasados = Math.max(1, (lastTs - firstTs) / 60000);
    const qPorMin = earned / minsPasados;
    const now = new Date();
    const endOfDay = new Date(); endOfDay.setHours(23,59,0,0);
    const minsRestantes = (endOfDay - now) / 60000;
    const proyeccion = earned + (qPorMin * minsRestantes);
    const card = document.getElementById('proyeccionCard');
    if(card){
      card.style.display = 'block';
      card.innerHTML = `
        <div class="proyeccion-label">📈 Proyección al final del día</div>
        <div class="proyeccion-val">Q ${proyeccion.toFixed(0)}</div>
        <div class="proyeccion-sub">Basado en Q${qPorMin.toFixed(2)}/min · ${orders.length} pedidos</div>
      `;
    }
  }

  const recordData = getPersonalRecord();
  const recEl = document.getElementById('recordBadge');
  if(recEl){
    if(recordData){
      const isRecord = earned >= recordData.amount && orders.length > 0;
      recEl.innerHTML = `<div class="record-badge">
        <div class="rb-icon">${isRecord?'🏆':'🎯'}</div>
        <div class="rb-info">
          <div class="rb-label">${isRecord?'¡NUEVO RÉCORD!':'Récord personal'}</div>
          <div class="rb-val">Q ${recordData.amount.toFixed(2)}</div>
          <div class="rb-date">${recordData.date}</div>
        </div>
        ${earned > 0 ? `<div style="font-family:'Bebas Neue';font-size:14px;color:var(--muted)">${((earned/recordData.amount)*100).toFixed(0)}%</div>` : ''}
      </div>`;
      if(earned > recordData.amount && orders.length > 0) savePersonalRecord(earned);
    } else if(earned > 0) {
      savePersonalRecord(earned);
    }
  }
}

function getPersonalRecord(){
  try{ const r=localStorage.getItem('riderRecord'); return r?JSON.parse(r):null; }catch(e){ return null; }
}
function savePersonalRecord(amount){
  try{
    localStorage.setItem('riderRecord', JSON.stringify({
      amount,
      date: new Date().toLocaleDateString('es-GT',{weekday:'long',day:'numeric',month:'long'})
    }));
  }catch(e){}
}

// ============================================================
// SEMANA COMPARATIVA
// ============================================================
function updateSemanaComparativa(){
  const dias = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
  const today = new Date();
  const thisWeek = [], lastWeek = [];

  for(let i=0;i<7;i++){
    const d = new Date(today);
    const dayOfWeek = today.getDay();
    const diff = i - (dayOfWeek === 0 ? 6 : dayOfWeek - 1);
    d.setDate(today.getDate() + diff);
    const dStr = d.toDateString();
    const total = allOrders.filter(o=>new Date(o.ts).toDateString()===dStr).reduce((s,o)=>s+o.total,0);
    thisWeek.push({day: dias[d.getDay()], date: dStr, total, isToday: dStr===today.toDateString()});
  }

  for(let i=0;i<7;i++){
    const d = new Date(today);
    const dayOfWeek = today.getDay();
    const diff = i - (dayOfWeek === 0 ? 6 : dayOfWeek - 1) - 7;
    d.setDate(today.getDate() + diff);
    const dStr = d.toDateString();
    const total = allOrders.filter(o=>new Date(o.ts).toDateString()===dStr).reduce((s,o)=>s+o.total,0);
    lastWeek.push({total});
  }

  const maxVal = Math.max(...thisWeek.map(d=>d.total), ...lastWeek.map(d=>d.total), 1);
  const thisTotal = thisWeek.reduce((s,d)=>s+d.total,0);
  const lastTotal = lastWeek.reduce((s,d)=>s+d.total,0);
  const diff = thisTotal - lastTotal;

  const sc = document.getElementById('semanaContent');
  if(sc) sc.innerHTML = `
    <div style="display:flex;justify-content:space-between;margin-bottom:12px;font-size:12px">
      <span style="color:var(--muted)">Esta semana: <span style="color:var(--green);font-weight:700">Q${thisTotal.toFixed(0)}</span></span>
      <span style="color:var(--muted)">Anterior: <span style="color:var(--muted)">Q${lastTotal.toFixed(0)}</span></span>
      <span class="${diff>=0?'semana-vs up':'semana-vs down'}">${diff>=0?'▲':'▼'} Q${Math.abs(diff).toFixed(0)}</span>
    </div>
    ${thisWeek.map((d,i)=>`
      <div class="semana-row" ${d.isToday?'style="background:#1a0808;border-radius:8px;padding:5px 6px"':''}>
        <div class="semana-dia" style="${d.isToday?'color:var(--accent);font-weight:700':''}">${d.day}</div>
        <div class="semana-bar-wrap">
          <div class="semana-bar-fill" style="width:${d.total>0?(d.total/maxVal*100).toFixed(0):0}%"></div>
        </div>
        <div class="semana-val">${d.total>0?'Q'+d.total.toFixed(0):'-'}</div>
        <div class="semana-vs ${lastWeek[i].total>0?(d.total>=lastWeek[i].total?'up':'down'):''}">${lastWeek[i].total>0?(d.total>=lastWeek[i].total?'▲':'▼'):''}</div>
      </div>`).join('')}
  `;
}
