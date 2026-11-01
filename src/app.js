import { plan as enginePlan, CROPS } from './engine.js';
import { forecast, geocode } from './weather.js';
import { UI, CROP_NAMES, STAGE_NAMES, SOIL_NAMES, fmtDate, actionText, blockerText, shareText, speechText } from './i18n.js';
import { answer } from './ask.js';

const state = {
  lang: localStorage.getItem('kc_lang') || (navigator.language.startsWith('hi') ? 'hi' : 'en'),
  place: null,
  crop: 'wheat',
  stage: 'sowing',
  soil: 'loam',
  lastIrr: 10,
  plan: null,
  source: null,
  fetchedAt: null,
};

let geocodeTimeout, speechUtterance;
const cropOrder = ['wheat', 'mustard', 'chickpea', 'potato', 'paddy', 'cotton', 'sugarcane', 'tomato'];

function applyLang() {
  document.documentElement.lang = state.lang;
  document.getElementById('lang').textContent = state.lang === 'en' ? 'हिंदी' : 'English';
  document.getElementById('title').textContent = UI[state.lang].title || 'KhetCast';
  document.getElementById('tagline').textContent = UI[state.lang].tagline || '';
  
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    el.textContent = UI[state.lang][key] || key;
  });
  
  document.querySelectorAll('[data-i18n-ph]').forEach(el => {
    const key = el.dataset.i18nPh;
    el.placeholder = UI[state.lang][key] || key;
  });
  
  const cropSel = document.getElementById('crop');
  const stageSel = document.getElementById('stage');
  const soilSel = document.getElementById('soil');
  const oldCrop = cropSel.value || state.crop;
  const oldStage = stageSel.value || state.stage;
  const oldSoil = soilSel.value || state.soil;
  
  cropSel.innerHTML = '';
  cropOrder.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c;
    opt.textContent = CROP_NAMES[state.lang][c] || c;
    cropSel.appendChild(opt);
  });
  cropSel.value = oldCrop;
  
  stageSel.innerHTML = '';
  CROPS[oldCrop].stages.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s.id;
    opt.textContent = STAGE_NAMES[state.lang][s.id] || s.id;
    stageSel.appendChild(opt);
  });
  stageSel.value = oldStage;
  
  soilSel.innerHTML = '';
  ['sandy', 'loam', 'clay'].forEach(s => {
    const opt = document.createElement('option');
    opt.value = s;
    opt.textContent = SOIL_NAMES[state.lang][s] || s;
    soilSel.appendChild(opt);
  });
  soilSel.value = oldSoil;
  
  if (state.plan) render();
}

function updateCropStages() {
  const crop = document.getElementById('crop').value;
  const stageSel = document.getElementById('stage');
  const oldStage = stageSel.value;
  stageSel.innerHTML = '';
  CROPS[crop].stages.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s.id;
    opt.textContent = STAGE_NAMES[state.lang][s.id] || s.id;
    stageSel.appendChild(opt);
  });
  stageSel.value = CROPS[crop].stages.some(s => s.id === oldStage) ? oldStage : CROPS[crop].stages[0].id;
}

function savePrefs() {
  localStorage.setItem('kc_prefs', JSON.stringify({
    place: state.place,
    crop: state.crop,
    stage: state.stage,
    soil: state.soil,
    lastIrr: state.lastIrr,
  }));
}

async function searchPlace() {
  const text = document.getElementById('place').value.trim();
  if (text.length < 3) {
    document.getElementById('placeList').innerHTML = '';
    return;
  }
  const results = await geocode(text);
  const list = document.getElementById('placeList');
  list.innerHTML = '';
  (results || []).slice(0, 6).forEach(r => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = `${r.name}, ${r.admin2 || ''}, ${r.admin1 || ''}`.replace(/,\s*,/g, ',').replace(/,\s*$/, '');
    btn.onclick = () => {
      state.place = { name: r.name, lat: r.lat, lon: r.lon };
      document.getElementById('place').value = r.name;
      list.innerHTML = '';
      savePrefs();
    };
    list.appendChild(btn);
  });
}

async function gpsLocation() {
  navigator.geolocation.getCurrentPosition(pos => {
    const { latitude: lat, longitude: lon } = pos.coords;
    const name = (state.lang === 'hi' ? 'मेरा खेत' : 'My field') + ` (${lat.toFixed(2)}, ${lon.toFixed(2)})`;
    state.place = { name, lat, lon };
    document.getElementById('place').value = name;
    document.getElementById('placeList').innerHTML = '';
    savePrefs();
  });
}

async function submitSetup(e) {
  e.preventDefault();
  
  if (!state.place) {
    const text = document.getElementById('place').value.trim();
    const results = await geocode(text);
    if (!results || results.length === 0) {
      document.getElementById('status').textContent = UI[state.lang].noPlace;
      return;
    }
    const r = results[0];
    state.place = { name: r.name, lat: r.lat, lon: r.lon };
    document.getElementById('place').value = r.name;
  }
  
  state.crop = document.getElementById('crop').value;
  state.stage = document.getElementById('stage').value;
  state.soil = document.getElementById('soil').value;
  state.lastIrr = parseInt(document.getElementById('lastIrr').value) || 10;
  savePrefs();
  
  document.getElementById('status').textContent = UI[state.lang].loading;
  document.getElementById('go').disabled = true;
  
  try {
    const fw = await forecast(state.place.lat, state.place.lon);
    if (!fw.rows) throw new Error('No forecast');
    
    state.plan = enginePlan(fw.rows, {
      crop: state.crop,
      stage: state.stage,
      soil: state.soil,
      lastIrrigationDays: state.lastIrr,
    });
    state.source = fw.source;
    state.fetchedAt = fw.fetchedAt;
    
    localStorage.setItem('kc_last', JSON.stringify({
      plan: state.plan,
      place: state.place,
      source: state.source,
      fetchedAt: state.fetchedAt,
    }));
    
    document.getElementById('status').textContent = '';
    render();
  } catch (err) {
    console.warn('forecast failed', err, err.tried);
    {
      const saved = JSON.parse(localStorage.getItem('kc_last') || 'null');
      if (saved) {
        state.plan = saved.plan;
        state.place = saved.place;
        state.source = saved.source;
        state.fetchedAt = saved.fetchedAt;
        document.getElementById('status').textContent = UI[state.lang].offline;
        render();
      } else {
        document.getElementById('status').textContent = UI[state.lang].dataError;
      }
    }
  }
  document.getElementById('go').disabled = false;
}

function render() {
  const res = document.getElementById('result');
  res.hidden = false;
  
  const cropName = CROP_NAMES[state.lang][state.crop];
  const stageName = STAGE_NAMES[state.lang][state.stage];
  document.getElementById('placeName').textContent = `${state.place.name} · ${cropName} (${stageName})`;
  
  const fetchTime = new Date(state.fetchedAt).toLocaleTimeString(state.lang === 'en' ? 'en-IN' : 'hi-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' }) + ' IST';
  document.getElementById('source').textContent = `${UI[state.lang].source}: ${state.source} · ${fetchTime}`;
  
  const acts = document.getElementById('actions');
  acts.innerHTML = '';
  state.plan.actions.slice(0, 6).forEach(a => {
    const li = document.createElement('li');
    li.className = `act lvl-${a.level}`;
    const { title, why } = actionText(a, state.lang);
    const strong = document.createElement('strong');
    strong.textContent = title;
    const span = document.createElement('span');
    span.className = 'why';
    span.textContent = why;
    li.appendChild(strong);
    li.appendChild(span);
    acts.appendChild(li);
  });
  
  const tbody = document.querySelector('#weekTable tbody');
  tbody.innerHTML = '';
  state.plan.days.forEach(d => {
    const tr = document.createElement('tr');
    
    const tdDate = document.createElement('td');
    tdDate.textContent = fmtDate(d.date, state.lang);
    tr.appendChild(tdDate);
    
    const tdSpray = document.createElement('td');
    if (d.spray.best) {
      tdSpray.textContent = `${d.spray.best.start}–${d.spray.best.end}`;
      tdSpray.className = d.spray.best.level === 'caution' ? 'lvl-caution' : '';
    } else {
      const top = Object.entries(d.spray.blockers || {}).sort((a, b) => b[1] - a[1])[0];
      const blocker = top ? top[0] : 'night';
      tdSpray.textContent = blockerText(blocker, state.lang);
      tdSpray.className = 'lvl-stop';
    }
    tr.appendChild(tdSpray);
    
    const tdRain = document.createElement('td');
    tdRain.textContent = d.summary.rain.toFixed(1);
    tr.appendChild(tdRain);
    
    const tdTemp = document.createElement('td');
    tdTemp.textContent = `${d.summary.tmin} / ${d.summary.tmax}`;
    tr.appendChild(tdTemp);
    
    const tdWind = document.createElement('td');
    tdWind.textContent = d.summary.windMax;
    tr.appendChild(tdWind);
    
    const tdAlerts = document.createElement('td');
    if (d.hazards.length) {
      tdAlerts.textContent = d.hazards.map(h => actionText({ kind: 'hazard', ...h }, state.lang).title).join('; ');
    } else {
      tdAlerts.textContent = UI[state.lang].none;
    }
    tr.appendChild(tdAlerts);
    
    tbody.appendChild(tr);
  });
  
  const trace = document.getElementById('trace');
  trace.innerHTML = '';
  state.plan.trace.forEach(t => {
    const li = document.createElement('li');
    const code = document.createElement('code');
    code.textContent = t.step;
    li.appendChild(code);
    li.appendChild(document.createTextNode(' ' + t.detail));
    trace.appendChild(li);
  });
  
  document.getElementById('share').href = 'https://wa.me/?text=' + encodeURIComponent(shareText(state.plan, state.place.name, state.lang));
  document.getElementById('disclaimer').textContent = UI[state.lang].disclaimer;
  
  document.getElementById('result').scrollIntoView({ behavior: 'smooth' });
}

document.getElementById('lang').addEventListener('click', () => {
  state.lang = state.lang === 'en' ? 'hi' : 'en';
  localStorage.setItem('kc_lang', state.lang);
  applyLang();
});

document.getElementById('place').addEventListener('input', () => {
  state.place = null; // typed a new place: forget the previous pick
  clearTimeout(geocodeTimeout);
  geocodeTimeout = setTimeout(searchPlace, 350);
});

document.getElementById('place').addEventListener('keypress', e => {
  if (e.key === 'Enter' && document.getElementById('placeList').children.length) {
    document.getElementById('placeList').children[0].click();
  }
});

document.getElementById('gps').addEventListener('click', gpsLocation);

document.getElementById('crop').addEventListener('change', () => { state.crop = document.getElementById('crop').value; updateCropStages(); });

document.getElementById('setup').addEventListener('submit', submitSetup);

document.getElementById('speak').addEventListener('click', () => {
  if (!state.plan) return;
  if (speechUtterance) {
    speechSynthesis.cancel();
    speechUtterance = null;
  } else {
    const utterance = new SpeechSynthesisUtterance(speechText(state.plan, state.place.name, state.lang));
    utterance.lang = state.lang === 'hi' ? 'hi-IN' : 'en-IN';
    utterance.rate = 0.95;
    const voices = speechSynthesis.getVoices();
    const prefix = state.lang === 'hi' ? 'hi' : 'en';
    const voice = voices.find(v => v.lang.startsWith(prefix)) || voices[0];
    if (voice) utterance.voice = voice;
    utterance.onend = () => { speechUtterance = null; };
    speechSynthesis.speak(utterance);
    speechUtterance = utterance;
  }
});

if (!('speechSynthesis' in window)) document.getElementById('speak').hidden = true;

document.getElementById('copy').addEventListener('click', async () => {
  if (!state.plan) return;
  await navigator.clipboard.writeText(shareText(state.plan, state.place.name, state.lang));
  const btn = document.getElementById('copy');
  const old = btn.textContent;
  btn.textContent = UI[state.lang].copied;
  setTimeout(() => { btn.textContent = old; }, 1500);
});

document.getElementById('askForm').addEventListener('submit', e => {
  e.preventDefault();
  if (!state.plan) return;
  const ans = answer(state.plan, document.getElementById('askInput').value, state.lang);
  const p = document.getElementById('askAnswer');
  p.textContent = ans.text;
  p.lang = ans.lang;
});

// ---- start-up: language, saved preferences, shareable URL, last plan ----
async function run() {
  document.getElementById('setup').requestSubmit();
}

(function init() {
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
  const prefs = JSON.parse(localStorage.getItem('kc_prefs') || 'null');
  if (prefs) Object.assign(state, { place: prefs.place || null, crop: prefs.crop || state.crop,
    stage: prefs.stage || state.stage, soil: prefs.soil || state.soil, lastIrr: prefs.lastIrr || state.lastIrr });
  const params = new URLSearchParams(window.location.search);
  if (params.has('lat') && params.has('lon')) {
    state.place = { name: params.get('name') || `${params.get('lat')}, ${params.get('lon')}`,
      lat: parseFloat(params.get('lat')), lon: parseFloat(params.get('lon')) };
  }
  if (params.get('crop') && CROPS[params.get('crop')]) state.crop = params.get('crop');
  if (params.get('stage')) state.stage = params.get('stage');
  if (params.get('lang') === 'hi' || params.get('lang') === 'en') state.lang = params.get('lang');
  if (!CROPS[state.crop].stages.some((s) => s.id === state.stage)) state.stage = CROPS[state.crop].stages[0].id;
  applyLang();
  document.getElementById('crop').value = state.crop;
  updateCropStages();
  document.getElementById('stage').value = state.stage;
  document.getElementById('soil').value = state.soil;
  document.getElementById('lastIrr').value = state.lastIrr;
  if (state.place) document.getElementById('place').value = state.place.name;
  if (params.get('auto') === '1' && state.place) { run(); return; }
  const saved = JSON.parse(localStorage.getItem('kc_last') || 'null');
  if (saved && saved.plan) {
    Object.assign(state, { plan: saved.plan, place: saved.place, source: saved.source, fetchedAt: saved.fetchedAt,
      crop: saved.plan.crop, stage: saved.plan.stage });
    render();
  }
})();

window.KhetCast = { state, run };
