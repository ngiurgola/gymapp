var _dayColorCache = {};

// ======== TEMI GLOBALI ========
var THEMES_DATA = [
  { id:'crimson', name:'Crimson', desc:'Rosso fuoco — default',  accent:'#e63946', accentRgb:'230,57,70',  bg:'#080808', bgGradient:'radial-gradient(ellipse 80% 40% at 50% -10%, rgba(230,57,70,0.12) 0%, transparent 70%)',  preview:['#080808','#e63946','#141414'], cardBg:'linear-gradient(145deg,#141414,#111)',   cardBorder:'rgba(255,255,255,0.06)' },
  { id:'ocean',   name:'Ocean',   desc:'Blu notte profondo',     accent:'#4cc9f0', accentRgb:'76,201,240', bg:'#060a12', bgGradient:'radial-gradient(ellipse 80% 40% at 50% -10%, rgba(76,201,240,0.1) 0%, transparent 70%)',   preview:['#060a12','#4cc9f0','#0d1220'], cardBg:'linear-gradient(145deg,#0d1220,#0a0e18)', cardBorder:'rgba(76,201,240,0.08)' },
  { id:'forest',  name:'Forest',  desc:'Verde scuro naturale',   accent:'#2ecc71', accentRgb:'46,204,113', bg:'#060c08', bgGradient:'radial-gradient(ellipse 80% 40% at 50% -10%, rgba(46,204,113,0.1) 0%, transparent 70%)',  preview:['#060c08','#2ecc71','#0d150f'], cardBg:'linear-gradient(145deg,#0d150f,#0a120c)', cardBorder:'rgba(46,204,113,0.08)' },
  { id:'galaxy',  name:'Galaxy',  desc:'Viola cosmico',          accent:'#9b59b6', accentRgb:'155,89,182', bg:'#08060c', bgGradient:'radial-gradient(ellipse 80% 40% at 50% -10%, rgba(155,89,182,0.12) 0%, transparent 70%)', preview:['#08060c','#9b59b6','#110d18'], cardBg:'linear-gradient(145deg,#110d18,#0e0a14)', cardBorder:'rgba(155,89,182,0.08)' },
  { id:'gold',    name:'Gold',    desc:'Oro elegante',           accent:'#f1c40f', accentRgb:'241,196,15', bg:'#0c0b06', bgGradient:'radial-gradient(ellipse 80% 40% at 50% -10%, rgba(241,196,15,0.1) 0%, transparent 70%)',  preview:['#0c0b06','#f1c40f','#151300'], cardBg:'linear-gradient(145deg,#151300,#110f00)',  cardBorder:'rgba(241,196,15,0.08)' },
];

// ======== BADGE ========
var BADGES = [
  { id:'first',    icon:'🎉', name:'Prima sessione',      desc:'Hai completato il tuo primo allenamento!',       check: function(p) { return p.length >= 1; } },
  { id:'s5',       icon:'⚡', name:'5 sessioni',           desc:'5 allenamenti completati!',                      check: function(p) { return p.length >= 5; } },
  { id:'s10',      icon:'💪', name:'10 sessioni',          desc:'10 allenamenti completati!',                     check: function(p) { return p.length >= 10; } },
  { id:'s25',      icon:'🏅', name:'25 sessioni',          desc:'25 allenamenti completati!',                     check: function(p) { return p.length >= 25; } },
  { id:'s50',      icon:'🏆', name:'50 sessioni',          desc:'50 allenamenti completati!',                     check: function(p) { return p.length >= 50; } },
  { id:'streak7',  icon:'🔥', name:'Streak 7 giorni',     desc:'7 allenamenti consecutivi!',                     check: function(p) { return calcStreak() >= 7; } },
  { id:'streak14', icon:'🌟', name:'Streak 14 giorni',    desc:'14 allenamenti consecutivi, sei una macchina!',  check: function(p) { return calcStreak() >= 14; } },
  { id:'variety',  icon:'🎯', name:'Allenatore completo', desc:'Hai allenato almeno 3 schede diverse!',          check: function(p) { return new Set(p.map(function(x){ return x.dayName; })).size >= 3; } },
];

// Helper: converte 'dd/mm/yyyy' in Date
function parseDate(str) {
  var p = str.split('/');
  return new Date(p[2] + '-' + p[1] + '-' + p[0]);
}

// ======== SERVICE WORKER ========
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function() {
    navigator.serviceWorker.register('/gymapp/sw.js').catch(function(e) {
      console.log('SW registration failed:', e);
    });
  });
}

// ======== DATI ========
let data = {
  settings: { restTime: 90, lastSetTime: 60, defaultSets: 3, defaultReps: 10 },
  days: [],
  progress: []
};

function saveData() { localStorage.setItem('gymAppData', JSON.stringify(data)); }

function loadData() {
  const stored = localStorage.getItem('gymAppData');
  if (stored) {
    try {
      data = JSON.parse(stored);
      if (!data.progress) data.progress = [];
      if (!data.settings) data.settings = { restTime: 90, lastSetTime: 60, defaultSets: 3, defaultReps: 10 };
      if (!data.settings.restTime) data.settings.restTime = 90;
      if (!data.settings.lastSetTime) data.settings.lastSetTime = 60;
      if (!data.settings.defaultSets) data.settings.defaultSets = 3;
      if (!data.settings.defaultReps) data.settings.defaultReps = 10;
      // migrazione vecchio campo weightKg -> bodyWeightKg
      data.progress.forEach(function(p) {
        if (p.weightKg !== undefined && p.bodyWeightKg === undefined) {
          p.bodyWeightKg = p.weightKg;
          delete p.weightKg;
        }
      });
      saveData();
    } catch(e) {
      data = { settings: { restTime: 90, lastSetTime: 60, defaultSets: 3, defaultReps: 10 }, days: [], progress: [] };
      saveData();
    }
  }
}

// ======== MODAL (sostituisce confirm/prompt nativi) ========
function showModal(opts) {
  // opts: { title, message, inputs: [{id, label, type, value, placeholder}], buttons: [{label, class, value}], onClose }
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.65);display:flex;align-items:center;justify-content:center;z-index:9999;';

  const box = document.createElement('div');
  box.className = 'modal-box';
  box.style.cssText = 'background:#1e1e2e;border:1px solid rgba(255,255,255,0.12);border-radius:16px;padding:24px 20px;width:90%;max-width:360px;box-shadow:0 8px 32px rgba(0,0,0,0.5);';

  if (opts.title) {
    const h = document.createElement('h3');
    h.textContent = opts.title;
    box.appendChild(h);
  }
  if (opts.message) {
    const p = document.createElement('p');
    p.className = 'modal-message';
    p.textContent = opts.message;
    box.appendChild(p);
  }

  const inputRefs = {};
  if (opts.inputs && opts.inputs.length > 0) {
    opts.inputs.forEach(function(inp) {
      const lbl = document.createElement('label');
      lbl.textContent = inp.label;
      lbl.className = 'modal-label';
      box.appendChild(lbl);
      const el = document.createElement('input');
      el.type = inp.type || 'text';
      el.id = inp.id;
      el.value = inp.value !== undefined ? inp.value : '';
      if (inp.placeholder) el.placeholder = inp.placeholder;
      if (inp.min !== undefined) el.min = inp.min;
      if (inp.step !== undefined) el.step = inp.step;
      el.className = 'modal-input';
      box.appendChild(el);
      inputRefs[inp.id] = el;
    });
  }

  const btnRow = document.createElement('div');
  btnRow.className = 'modal-btn-row';
  opts.buttons.forEach(function(btn) {
    const b = document.createElement('button');
    b.textContent = btn.label;
    b.className = btn.cls || 'btn-modal-confirm';
    b.onclick = function() {
      document.body.removeChild(overlay);
      const vals = {};
      Object.keys(inputRefs).forEach(function(k) { vals[k] = inputRefs[k].value; });
      opts.onClose(btn.value, vals);
    };
    btnRow.appendChild(b);
  });
  box.appendChild(btnRow);
  overlay.appendChild(box);
  document.body.appendChild(overlay);

  // focus primo input
  if (opts.inputs && opts.inputs.length > 0) {
    setTimeout(function() { inputRefs[opts.inputs[0].id].focus(); }, 50);
  }
}

function modalConfirm(message, onConfirm) {
  showModal({
    message: message,
    buttons: [
      { label: 'Annulla', cls: 'btn-modal-cancel', value: 'no' },
      { label: 'Conferma', cls: 'btn-modal-confirm', value: 'yes' }
    ],
    onClose: function(val) { if (val === 'yes') onConfirm(); }
  });
}

// ======== TOAST ========
function showToast(msg, type) {
  if (!type) type = 'success';
  const old = document.getElementById('toast');
  if (old) old.remove();
  const t = document.createElement('div');
  t.id = 'toast';
  t.className = 'toast toast-' + type;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(function() { t.classList.add('toast-show'); }, 10);
  setTimeout(function() { t.classList.remove('toast-show'); setTimeout(function() { t.remove(); }, 400); }, 2800);
}

// ======== SUONO ========
function playBeep() {
  try { const a = new Audio('sounds/beep.mp3'); a.play().catch(function(){}); } catch(e) {}
  if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
}

// ======== TIMERS ========
let activeTimers = {};
let dayTimers = {};
let dayElapsed = {};
let sessionActive = false;
let wakeLock = null;

async function requestWakeLock() {
  if ('wakeLock' in navigator) {
    try { wakeLock = await navigator.wakeLock.request('screen'); } catch(e) {}
  }
}
function releaseWakeLock() {
  if (wakeLock) { wakeLock.release().catch(function(){}); wakeLock = null; }
}
document.addEventListener('visibilitychange', function() {
  if (document.visibilityState === 'visible' && sessionActive) requestWakeLock();
});
window.addEventListener('beforeunload', function(e) {
  if (sessionActive || Object.keys(activeTimers).length > 0 || Object.keys(dayTimers).length > 0) {
    e.preventDefault(); e.returnValue = '';
  }
});

// ======== INIT ========
loadData();

// Applica tema salvato all'avvio
(function() {
  const savedId = localStorage.getItem('gymThemeId') || 'crimson';
  const t = THEMES_DATA.find(function(x){ return x.id === savedId; }) || THEMES_DATA[0];
  applyTheme(t);
})();

// Icone navbar
(function() {
  const labels = [
    { icon: '🏋️', text: 'Allenamento' },
    { icon: '📋', text: 'Schede' },
    { icon: '📊', text: 'Progressi' },
    { icon: '⚙️', text: 'Impostazioni' }
  ];
  const btns = document.querySelectorAll('.navbar button');
  btns.forEach(function(btn, i) {
    if (labels[i]) {
      btn.innerHTML = `<span class="nav-icon">${labels[i].icon}</span><span class="nav-label">${labels[i].text}</span>`;
    }
  });
})();

showTab('allenamento');

// ======== NAV ========
function hasActiveTimers() {
  return Object.keys(activeTimers).length > 0 || Object.keys(dayTimers).length > 0;
}

function showTab(tab) {
  function doSwitch() {
    Object.keys(activeTimers).forEach(function(k) { clearInterval(activeTimers[k]); delete activeTimers[k]; });
    Object.keys(dayTimers).forEach(function(k) { clearInterval(dayTimers[k]); delete dayTimers[k]; });
    const buttons = document.querySelectorAll('.navbar button');
    buttons.forEach(function(btn) { btn.classList.remove('active'); });
    switch(tab) {
      case 'allenamento': showWorkout(); buttons[0].classList.add('active'); break;
      case 'giorni':      showManageDays(); buttons[1].classList.add('active'); break;
      case 'progressi':   showProgress(); buttons[2].classList.add('active'); break;
      case 'impostazioni':showSettings(); buttons[3].classList.add('active'); break;
    }
  }
  if (hasActiveTimers()) {
    modalConfirm('Hai dei timer attivi. Vuoi cambiare scheda lo stesso?', doSwitch);
  } else {
    doSwitch();
  }
}

// ======== WORKOUT VIEW ========
function calcStreak() {
  if (!data.progress || data.progress.length === 0) return 0;
  const today = new Date(); today.setHours(0,0,0,0);
  const dayMs = 86400000;
  const uniqueDays = [...new Set(data.progress.map(function(p) {
    const parts = p.date.split('/');
    return new Date(parts[2]+'-'+parts[1]+'-'+parts[0]).setHours(0,0,0,0);
  }))].sort(function(a,b){return b-a;});

  // Streak conta da oggi o da ieri (se oggi non ancora allenato)
  let streak = 0;
  let check = today.getTime();
  if (uniqueDays[0] < check) check = check - dayMs; // inizia da ieri se oggi assente
  for (let i = 0; i < uniqueDays.length; i++) {
    if (uniqueDays[i] === check) { streak++; check -= dayMs; }
    else if (uniqueDays[i] < check) break;
  }
  return streak;
}

function showWorkout() {
  const main = document.getElementById('mainContent');
  const streak = calcStreak();
  main.innerHTML = '';

  const title = document.createElement('h2');
  title.textContent = 'Allenamento';
  main.appendChild(title);

  if (streak > 0) {
    const sb = document.createElement('div');
    sb.className = 'streak-badge';
    sb.textContent = '🔥 ' + streak + ' giorno' + (streak > 1 ? 'i' : '') + ' di fila!';
    main.appendChild(sb);
  }

  if (!data.days || data.days.length === 0) {
    const empty = document.createElement('p');
    empty.textContent = 'Nessun giorno creato. Vai in Gestione Giorni/Esercizi.';
    main.appendChild(empty);
    return;
  }

  data.days.forEach(function(day, dayIndex) {
    const div = document.createElement('div');
    div.className = 'card';
    const dayColor = getDayColor(day.name);
    div.style.borderLeft = '4px solid ' + dayColor;
    const h3 = document.createElement('h3');
    h3.textContent = day.name;
    h3.style.color = dayColor;
    div.appendChild(h3);

    // Info sessioni
    const sessions = data.progress ? data.progress.filter(function(p){ return p.dayName === day.name; }) : [];
    if (sessions.length > 0) {
      const last = sessions[sessions.length - 1];
      const lastParts = last.date.split('/');
      const lastDate = new Date(lastParts[2]+'-'+lastParts[1]+'-'+lastParts[0]);
      const diffDays = Math.floor((new Date() - lastDate) / 86400000);
      const diffStr = diffDays === 0 ? 'oggi' : diffDays === 1 ? 'ieri' : diffDays + ' giorni fa';
      const info = document.createElement('div');
      info.style.cssText = 'font-size:0.72rem;color:#888;margin-bottom:8px;';
      info.innerHTML = '<span style="color:#aaa">'+sessions.length+' sessioni</span> &nbsp;·&nbsp; ultima: <span style="color:#aaa">'+diffStr+'</span>';
      div.appendChild(info);
    }

    const btn = document.createElement('button');
    btn.textContent = 'Inizia';
    btn.onclick = function() { startDay(dayIndex); };
    div.appendChild(btn);
    main.appendChild(div);
  });
}

// ======== START DAY ========
function startDay(dayIndex) {
  sessionActive = true;
  requestWakeLock();
  const day = data.days[dayIndex];
  const main = document.getElementById('mainContent');
  main.innerHTML = '';

  const backBtn = document.createElement('button');
  backBtn.className = 'btn-back';
  backBtn.textContent = '← Indietro';
  backBtn.onclick = function(){ sessionActive = false; releaseWakeLock(); showWorkout(); };
  main.appendChild(backBtn);

  const title = document.createElement('h2');
  title.textContent = day.name;
  main.appendChild(title);

  if (!day.exercises || day.exercises.length === 0) {
    const empty = document.createElement('p');
    empty.textContent = 'Nessun esercizio per questo giorno.';
    main.appendChild(empty);
    const addExBtn = document.createElement('button');
    addExBtn.textContent = 'Aggiungi esercizio';
    addExBtn.onclick = function() { addExercise(dayIndex); };
    main.appendChild(addExBtn);
    return;
  }

  // Timer generale giorno
  const timerDiv = document.createElement('div');
  timerDiv.className = 'day-general-timer';
  timerDiv.innerHTML =
    '<label>Durata allenamento</label>' +
    '<span id="dayTimer_' + dayIndex + '">0:00</span>' +
    '<button onclick="startDayTimer(' + dayIndex + ')">Start</button>' +
    '<button onclick="stopDayTimer(' + dayIndex + ')">Stop</button>' +
    '<button onclick="resetDayTimer(' + dayIndex + ')">Reset</button>';
  main.appendChild(timerDiv);
  dayElapsed[dayIndex] = dayElapsed[dayIndex] || 0;

  // Griglia esercizi
  const grid = document.createElement('div');
  grid.className = 'exercises-grid';
  main.appendChild(grid);

  day.exercises.forEach(function(ex, exIndex) {
    const div = document.createElement('div');
    div.className = 'exercise-card';

    // Storico peso corporeo ultime 3 sessioni
    let weightHistory = '';
    if (data.progress && data.progress.length > 0) {
      const history = data.progress
        .filter(function(p) { return p.dayName === day.name && p.bodyWeightKg != null; })
        .slice(-3).reverse()
        .map(function(p) { return p.date + ': <b>' + p.bodyWeightKg + ' kg</b>'; });
      if (history.length > 0) weightHistory = '<div class="weight-history">' + history.join(' &nbsp;|&nbsp; ') + '</div>';
    }

    // Info button - cerca nel DB
    const dbEntry = EXERCISE_DB.find(function(e){ return e.name === ex.name; });
    const infoBtn = dbEntry ? '<button onclick="showExerciseInfo(this)" data-exname="' + ex.name.replace(/"/g,"&quot;") + '" style="background:none;border:1px solid rgba(255,255,255,0.15);border-radius:50%;width:22px;height:22px;color:#aaa;font-size:0.65rem;font-weight:700;padding:0;min-width:unset;display:inline-flex;align-items:center;justify-content:center;margin-left:6px;vertical-align:middle;">i</button>' : '';

    const repsLabel = ex.reps === 'max'
      ? '<div style="font-size:0.75rem;color:#f39c12;font-weight:700;margin-bottom:6px;">🔥 ' + ex.sets + ' serie al massimo</div>'
      : '<div style="font-size:0.75rem;color:#aaa;margin-bottom:6px;">' + ex.sets + ' serie × ' + ex.reps + ' rip</div>';

    let inner = '<strong>' + ex.name + infoBtn + '</strong>' + repsLabel + weightHistory +
      '<div class="weight-row">' +
        '<button class="btn-weight-adj" onclick="adjustWeight(' + dayIndex + ',' + exIndex + ',-1)">-1</button>' +
        '<input type="number" id="weight_' + dayIndex + '_' + exIndex + '" value="' + (ex.weight||0) + '" oninput="updateWeight(' + dayIndex + ',' + exIndex + ',this.value)" min="0" step="0.5">' +
        '<button class="btn-weight-adj" onclick="adjustWeight(' + dayIndex + ',' + exIndex + ',1)">+1</button>' +
        '<span style="color:#444;font-size:0.75rem"> kg</span>' +
        '</div>';

    for (let s = 0; s < ex.sets; s++) {
      const isLast = s === ex.sets - 1;
      const restTime = isLast ? data.settings.lastSetTime : data.settings.restTime;
      inner += '<div class="counter-card">' +
        '<label>S' + (s+1) + '</label>' +
        '<span id="timerCounter_' + dayIndex + '_' + exIndex + '_' + s + '">' + formatTime(restTime) + '</span>' +
        '<button onclick="startTimer(' + dayIndex + ',' + exIndex + ',' + s + ',' + restTime + ')">▶</button>' +
        '<button onclick="stopTimer(\'' + dayIndex + '_' + exIndex + '_' + s + '\')">⏸</button>' +
        '<button onclick="resetTimer(\'' + dayIndex + '_' + exIndex + '_' + s + '\',' + restTime + ')">↺</button>' +
        '</div>';
    }
    div.innerHTML = inner;
    grid.appendChild(div);
  });

  // Bottone salva sessione
  const saveBtn = document.createElement('button');
  saveBtn.textContent = '💾 Salva sessione';
  saveBtn.style.width = '100%';
  saveBtn.style.marginTop = '20px';
  saveBtn.onclick = function() { saveSession(dayIndex); };
  main.appendChild(saveBtn);
}

// ======== TIMERS ========
function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m + ':' + (s < 10 ? '0' : '') + s;
}

function showRestOverlay(seconds, label) {
  var existing = document.getElementById('restOverlay');
  if (existing) existing.remove();
  var overlay = document.createElement('div');
  overlay.id = 'restOverlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.92);z-index:9990;display:flex;flex-direction:column;align-items:center;justify-content:center;touch-action:manipulation;';
  var remaining = seconds;
  function render() {
    overlay.innerHTML =
      '<div style="font-size:0.8rem;color:#888;text-transform:uppercase;letter-spacing:2px;margin-bottom:16px;">' + (label || 'Recupero') + '</div>' +
      '<div style="font-size:5rem;font-weight:900;color:var(--accent);font-variant-numeric:tabular-nums;text-shadow:0 0 40px rgba(var(--accent-rgb),0.5);">' + remaining + '</div>' +
      '<div style="color:#555;font-size:0.8rem;margin-top:16px;">Tocca per chiudere</div>';
  }
  render();
  var iv = setInterval(function() {
    remaining--;
    var el = overlay.querySelector('div:nth-child(2)');
    if (el) el.textContent = remaining;
    if (remaining <= 0) {
      clearInterval(iv);
      overlay.remove();
      playBeep();
    }
  }, 1000);
  overlay.addEventListener('click', function() { clearInterval(iv); overlay.remove(); });
  document.body.appendChild(overlay);
}

function startTimer(dayIndex, exIndex, setIndex, totalSeconds) {
  const key = dayIndex + '_' + exIndex + '_' + setIndex;
  if (activeTimers[key]) return;
  const el = document.getElementById('timerCounter_' + key);
  if (el && el.dataset.done === 'true') return;
  let remaining = totalSeconds;
  if (el) el.classList.add('timer-running');
  showRestOverlay(totalSeconds, 'Recupero serie');
  activeTimers[key] = setInterval(function() {
    remaining--;
    if (el) el.textContent = formatTime(remaining);
    if (remaining <= 0) {
      clearInterval(activeTimers[key]); delete activeTimers[key];
      if (el) { el.textContent = '✓'; el.classList.remove('timer-running'); el.dataset.done = 'true'; }
      playBeep();
    }
  }, 1000);
}

function stopTimer(key) {
  if (activeTimers[key]) { clearInterval(activeTimers[key]); delete activeTimers[key]; }
  const el = document.getElementById('timerCounter_' + key);
  if (el) el.classList.remove('timer-running');
}

function resetTimer(key, totalSeconds) {
  stopTimer(key);
  const el = document.getElementById('timerCounter_' + key);
  if (el) { el.textContent = formatTime(totalSeconds); el.dataset.done = 'false'; }
}

function startDayTimer(dayIndex) {
  if (dayTimers[dayIndex]) return;
  const el = document.getElementById('dayTimer_' + dayIndex);
  if (el) el.classList.add('day-timer-running');
  dayElapsed[dayIndex] = dayElapsed[dayIndex] || 0;
  dayTimers[dayIndex] = setInterval(function() {
    dayElapsed[dayIndex]++;
    const el2 = document.getElementById('dayTimer_' + dayIndex);
    if (el2) el2.textContent = formatTime(dayElapsed[dayIndex]);
  }, 1000);
}

function stopDayTimer(dayIndex) {
  if (dayTimers[dayIndex]) { clearInterval(dayTimers[dayIndex]); delete dayTimers[dayIndex]; }
  const el = document.getElementById('dayTimer_' + dayIndex);
  if (el) el.classList.remove('day-timer-running');
}

function resetDayTimer(dayIndex) {
  stopDayTimer(dayIndex);
  dayElapsed[dayIndex] = 0;
  const el = document.getElementById('dayTimer_' + dayIndex);
  if (el) { el.textContent = '0:00'; el.classList.remove('day-timer-running'); }
}

function adjustWeight(dayIndex, exIndex, delta) {
  const inp = document.getElementById('weight_' + dayIndex + '_' + exIndex);
  if (!inp) return;
  const newVal = Math.max(0, Math.round(((parseFloat(inp.value)||0) + delta) * 10) / 10);
  inp.value = newVal;
  updateWeight(dayIndex, exIndex, newVal);
}

function updateWeight(dayIndex, exIndex, value) {
  data.days[dayIndex].exercises[exIndex].weight = parseFloat(value) || 0;
  saveData();
}

// ======== SALVA SESSIONE ========
function saveSession(dayIndex) {
  const day = data.days[dayIndex];
  const duration = dayElapsed[dayIndex] || 0;

  function proceedWithDuration(finalDuration) {
    showModal({
      title: 'Salva sessione',
      inputs: [
        { id: 'sw_weight', label: 'Peso corporeo oggi (kg, opzionale)', type: 'number', value: '', placeholder: 'es. 75.5', min: 0, step: 0.1 },
        { id: 'sw_note', label: 'Nota (opzionale)', type: 'text', value: '', placeholder: 'es. Ottimo allenamento' }
      ],
      buttons: [
        { label: 'Annulla', cls: 'btn-modal-cancel', value: 'cancel' },
        { label: '💾 Salva', cls: 'btn-modal-confirm', value: 'save' }
      ],
      onClose: function(val, vals) {
        if (val === 'cancel') return;
        const weightStr = vals['sw_weight'].trim();
        const weight = parseFloat(weightStr.replace(',', '.'));
        const bodyWeight = (weightStr !== '' && !isNaN(weight)) ? weight : null;
        const note = vals['sw_note'].trim();
        const now = new Date();
        const entry = {
          date: now.toLocaleDateString('it-IT'),
          time: now.toLocaleTimeString('it-IT'),
          dayName: day.name,
          durationSeconds: finalDuration,
          bodyWeightKg: bodyWeight,
          note: note,
          exercises: day.exercises ? day.exercises.map(function(ex) {
            return { name: ex.name, sets: ex.sets, reps: ex.reps, weight: ex.weight || 0 };
          }) : []
        };
        showSessionSummary(entry, day, dayIndex);
      }
    });
  }

  if (duration === 0) {
    showModal({
      title: 'Durata allenamento',
      message: 'Il timer non è stato avviato. Inserisci la durata manualmente:',
      inputs: [{ id: 'sw_dur', label: 'Durata (minuti)', type: 'number', value: '60', min: 0 }],
      buttons: [
        { label: 'Salta', cls: 'btn-modal-cancel', value: 'skip' },
        { label: 'Continua', cls: 'btn-modal-confirm', value: 'ok' }
      ],
      onClose: function(val, vals) {
        const mins = parseFloat(vals['sw_dur']);
        const finalDuration = (val === 'ok' && !isNaN(mins)) ? Math.round(mins * 60) : 0;
        proceedWithDuration(finalDuration);
      }
    });
  } else {
    proceedWithDuration(duration);
  }
}

function showSessionSummary(entry, day, dayIndex) {
  const main = document.getElementById('mainContent');
  const mins = Math.floor(entry.durationSeconds / 60);
  const secs = entry.durationSeconds % 60;

  let exHTML = '';
  if (entry.exercises && entry.exercises.length > 0) {
    entry.exercises.forEach(function(ex) {
      exHTML += '<div class="summary-exercise"><span>' + ex.name + '</span><span>' + ex.sets + ' serie' + (ex.weight ? ' · ' + ex.weight + ' kg' : '') + '</span></div>';
    });
  }

  main.innerHTML = '';
  const summaryDiv = document.createElement('div');
  summaryDiv.className = 'session-summary';
  summaryDiv.innerHTML =
    '<div class="summary-icon">🏋️</div>' +
    '<h2>Allenamento completato!</h2>' +
    '<div class="summary-card">' +
      '<div class="summary-row"><span>Data</span><span>' + entry.date + ' ' + entry.time + '</span></div>' +
      '<div class="summary-row"><span>Scheda</span><span>' + entry.dayName + '</span></div>' +
      '<div class="summary-row"><span>Durata</span><span>' + mins + 'm ' + secs + 's</span></div>' +
      '<div class="summary-row"><span>Peso</span><span>' + (entry.bodyWeightKg != null ? entry.bodyWeightKg + ' kg' : '—') + '</span></div>' +
      (entry.note ? '<div class="summary-row"><span>Nota</span><span>' + entry.note + '</span></div>' : '') +
    '</div>' +
    '<div class="summary-exercises">' + exHTML + '</div>';
  main.appendChild(summaryDiv);

  const saveBtn = document.createElement('button');
  saveBtn.className = 'btn-confirm-save';
  saveBtn.textContent = '✅ Salva sessione';
  saveBtn.onclick = function() { confirmSaveSession(entry); };
  main.appendChild(saveBtn);

  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'btn-back';
  cancelBtn.style.marginTop = '12px';
  cancelBtn.style.display = 'block';
  cancelBtn.textContent = 'Annulla';
  cancelBtn.onclick = function() { sessionActive = true; startDay(dayIndex); };
  main.appendChild(cancelBtn);
}

function confirmSaveSession(entry) {
  sessionActive = false;
  releaseWakeLock();
  data.progress.push(entry);
  saveData();
  checkBadges();
  showToast('Sessione salvata!');
  showWorkout();
}

// ======== GESTIONE GIORNI ========
function showManageDays() {
  const main = document.getElementById('mainContent');
  main.innerHTML = '';

  const title = document.createElement('h2');
  title.textContent = 'Gestione Giorni';
  main.appendChild(title);

  const addBtn = document.createElement('button');
  addBtn.textContent = 'Aggiungi scheda';
  addBtn.onclick = showAddDay;
  main.appendChild(addBtn);

  if (!data.days || data.days.length === 0) {
    const empty = document.createElement('p');
    empty.textContent = 'Nessuna scheda creata.';
    main.appendChild(empty);
    return;
  }

  data.days.forEach(function(day, i) {
    const div = document.createElement('div');
    div.className = 'card';

    const h3 = document.createElement('h3');
    h3.textContent = day.name;
    div.appendChild(h3);

    const info = document.createElement('span');
    info.style.cssText = 'font-size:0.78rem;color:#555';
    info.textContent = (day.exercises ? day.exercises.length : 0) + ' esercizi';
    div.appendChild(info);

    // Bottoni riordina
    const upBtn = document.createElement('button');
    upBtn.textContent = '↑';
    upBtn.title = 'Sposta su';
    upBtn.disabled = i === 0;
    upBtn.onclick = function() { moveDay(i, -1); };

    const downBtn = document.createElement('button');
    downBtn.textContent = '↓';
    downBtn.title = 'Sposta giù';
    downBtn.disabled = i === data.days.length - 1;
    downBtn.onclick = function() { moveDay(i, 1); };

    const btnEdit = document.createElement('button');
    btnEdit.textContent = 'Modifica';
    btnEdit.onclick = function() { editDay(i); };

    const btnDel = document.createElement('button');
    btnDel.textContent = 'Elimina';
    btnDel.onclick = function() { deleteDay(i); };

    const btnDup = document.createElement('button');
    btnDup.textContent = 'Duplica';
    btnDup.onclick = function() { duplicateDay(i); };

    const btnEx = document.createElement('button');
    btnEx.textContent = 'Esercizi';
    btnEx.onclick = function() { manageExercises(i); };

    div.appendChild(upBtn);
    div.appendChild(downBtn);
    div.appendChild(btnEdit);
    div.appendChild(btnDel);
    div.appendChild(btnDup);
    div.appendChild(btnEx);
    main.appendChild(div);
  });
}

function moveDay(index, dir) {
  const newIndex = index + dir;
  if (newIndex < 0 || newIndex >= data.days.length) return;
  const tmp = data.days[index];
  data.days[index] = data.days[newIndex];
  data.days[newIndex] = tmp;
  saveData();
  showManageDays();
}

function showAddDay() {
  const main = document.getElementById('mainContent');
  main.innerHTML = '';
  const backBtn = document.createElement('button');
  backBtn.className = 'btn-back';
  backBtn.textContent = '← Indietro';
  backBtn.onclick = showManageDays;
  main.appendChild(backBtn);
  const title = document.createElement('h2');
  title.textContent = 'Nuova Scheda';
  main.appendChild(title);
  const card = document.createElement('div');
  card.className = 'card form-card';
  card.innerHTML = '<label>Nome scheda</label><input type="text" id="newDayName" placeholder="es. Giorno A - Petto">';
  main.appendChild(card);
  const saveBtn = document.createElement('button');
  saveBtn.textContent = 'Salva';
  saveBtn.onclick = saveNewDay;
  main.appendChild(saveBtn);
}

function saveNewDay() {
  const name = document.getElementById('newDayName').value.trim();
  if (!name) { showToast('Inserisci un nome.', 'error'); return; }
  data.days.push({ name: name, exercises: [] });
  saveData();
  showToast('Scheda creata!');
  showManageDays();
}

function editDay(i) {
  const main = document.getElementById('mainContent');
  main.innerHTML = '';
  const backBtn = document.createElement('button');
  backBtn.className = 'btn-back';
  backBtn.textContent = '← Indietro';
  backBtn.onclick = showManageDays;
  main.appendChild(backBtn);
  const title = document.createElement('h2');
  title.textContent = 'Modifica Scheda';
  main.appendChild(title);
  const card = document.createElement('div');
  card.className = 'card form-card';
  card.innerHTML = '<label>Nome scheda</label><input type="text" id="editDayName" value="' + data.days[i].name + '">';
  main.appendChild(card);
  const saveBtn = document.createElement('button');
  saveBtn.textContent = 'Salva';
  saveBtn.onclick = function() { saveEditDay(i); };
  main.appendChild(saveBtn);
}

function saveEditDay(i) {
  const name = document.getElementById('editDayName').value.trim();
  if (!name) { showToast('Inserisci un nome.', 'error'); return; }
  data.days[i].name = name;
  saveData();
  showToast('Scheda aggiornata!');
  showManageDays();
}

function deleteDay(i) {
  const day = data.days[i];
  const exCount = day.exercises ? day.exercises.length : 0;
  const msg = exCount > 0
    ? 'Eliminare "' + day.name + '"? Contiene ' + exCount + ' esercizi che verranno persi.'
    : 'Eliminare la scheda "' + day.name + '"?';
  modalConfirm(msg, function() {
    data.days.splice(i, 1);
    saveData();
    showToast('Scheda eliminata.', 'error');
    showManageDays();
  });
}

function duplicateDay(i) {
  const copy = JSON.parse(JSON.stringify(data.days[i]));
  copy.name = copy.name + ' (copia)';
  data.days.push(copy);
  saveData();
  showToast('Scheda duplicata!');
  showManageDays();
}

// ======== GESTIONE ESERCIZI ========
function manageExercises(dayIndex) {
  const day = data.days[dayIndex];
  const main = document.getElementById('mainContent');
  main.innerHTML = '';

  const backBtn = document.createElement('button');
  backBtn.className = 'btn-back';
  backBtn.textContent = '← Indietro';
  backBtn.onclick = showManageDays;
  main.appendChild(backBtn);

  const title = document.createElement('h2');
  title.textContent = day.name;
  main.appendChild(title);

  const addBtn = document.createElement('button');
  addBtn.textContent = 'Aggiungi esercizio';
  addBtn.onclick = function() { addExercise(dayIndex); };
  main.appendChild(addBtn);

  if (!day.exercises || day.exercises.length === 0) {
    const empty = document.createElement('p');
    empty.textContent = 'Nessun esercizio.';
    main.appendChild(empty);
    return;
  }

  day.exercises.forEach(function(ex, exIndex) {
    const div = document.createElement('div');
    div.className = 'exercise-card';

    const info = document.createElement('div');
    info.innerHTML = '<strong>' + ex.name + '</strong><span style="font-size:0.82rem;color:#7070a0"> · ' + ex.sets + ' serie · ' + ex.reps + ' rip · ' + (ex.weight||0) + ' kg</span>';
    div.appendChild(info);

    // Bottoni riordina
    const upBtn = document.createElement('button');
    upBtn.textContent = '↑';
    upBtn.disabled = exIndex === 0;
    upBtn.onclick = function() { moveExercise(dayIndex, exIndex, -1); };

    const downBtn = document.createElement('button');
    downBtn.textContent = '↓';
    downBtn.disabled = exIndex === day.exercises.length - 1;
    downBtn.onclick = function() { moveExercise(dayIndex, exIndex, 1); };

    const btnEdit = document.createElement('button');
    btnEdit.textContent = 'Modifica';
    btnEdit.onclick = function() { editExercise(dayIndex, exIndex); };

    const btnDel = document.createElement('button');
    btnDel.textContent = 'Elimina';
    btnDel.onclick = function() { deleteExercise(dayIndex, exIndex); };

    div.appendChild(upBtn);
    div.appendChild(downBtn);
    div.appendChild(btnEdit);
    div.appendChild(btnDel);
    main.appendChild(div);
  });
}

function moveExercise(dayIndex, exIndex, dir) {
  const exs = data.days[dayIndex].exercises;
  const newIndex = exIndex + dir;
  if (newIndex < 0 || newIndex >= exs.length) return;
  const tmp = exs[exIndex];
  exs[exIndex] = exs[newIndex];
  exs[newIndex] = tmp;
  saveData();
  manageExercises(dayIndex);
}

function addExercise(dayIndex) {
  const main = document.getElementById('mainContent');
  const defSets = data.settings.defaultSets || 3;
  const defReps = data.settings.defaultReps || 10;
  main.innerHTML = '';

  const backBtn = document.createElement('button');
  backBtn.className = 'btn-back';
  backBtn.textContent = '← Indietro';
  backBtn.onclick = function() { manageExercises(dayIndex); };
  main.appendChild(backBtn);

  const title = document.createElement('h2');
  title.textContent = 'Aggiungi Esercizio';
  main.appendChild(title);

  // --- Sezione selezione dal DB ---
  const dbCard = document.createElement('div');
  dbCard.className = 'card form-card';
  dbCard.style.marginBottom = '16px';

  const dbTitle = document.createElement('div');
  dbTitle.style.cssText = 'font-size:0.78rem;font-weight:700;color:#f39c12;margin-bottom:8px;letter-spacing:0.04em;';
  dbTitle.textContent = '📚 Scegli dal Database';
  dbCard.appendChild(dbTitle);

  // Filtro muscolo
  const filterRow = document.createElement('div');
  filterRow.style.cssText = 'display:flex;gap:8px;margin-bottom:8px;align-items:center;';
  const muscleSelect = document.createElement('select');
  muscleSelect.id = 'dbMuscleFilterAdd';
  muscleSelect.style.cssText = 'flex:1;padding:6px 8px;border-radius:8px;background:#2a2a3e;color:#fff;border:1px solid rgba(255,255,255,0.12);font-size:0.82rem;';
  let muscleOpts = '<option value="all">Tutti i muscoli</option>';
  MUSCLE_GROUPS.forEach(function(m) { muscleOpts += '<option value="'+m+'">'+m+'</option>'; });
  muscleSelect.innerHTML = muscleOpts;

  const searchInput = document.createElement('input');
  searchInput.type = 'text';
  searchInput.placeholder = '🔍 Cerca...';
  searchInput.id = 'dbSearchAdd';
  searchInput.style.cssText = 'flex:1;padding:6px 8px;border-radius:8px;background:#2a2a3e;color:#fff;border:1px solid rgba(255,255,255,0.12);font-size:0.82rem;';

  filterRow.appendChild(muscleSelect);
  filterRow.appendChild(searchInput);
  dbCard.appendChild(filterRow);

  // Lista esercizi DB
  const dbList = document.createElement('div');
  dbList.id = 'dbExListAdd';
  dbList.style.cssText = 'max-height:220px;overflow-y:auto;display:flex;flex-direction:column;gap:4px;';
  dbCard.appendChild(dbList);

  function renderDbList() {
    const filter = muscleSelect.value;
    const search = searchInput.value.toLowerCase();
    const filtered = EXERCISE_DB.filter(function(e) {
      return (filter === 'all' || e.muscle === filter) &&
             (!search || e.name.toLowerCase().includes(search));
    });
    dbList.innerHTML = '';
    if (filtered.length === 0) {
      dbList.innerHTML = '<p style="color:#666;font-size:0.8rem;">Nessun esercizio trovato.</p>';
      return;
    }
    filtered.forEach(function(ex) {
      const row = document.createElement('button');
      row.style.cssText = 'text-align:left;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:7px 10px;color:#fff;font-size:0.82rem;cursor:pointer;';
      row.innerHTML = '<strong>' + ex.name + '</strong> <span style="color:#888;font-size:0.75rem;">— ' + ex.muscle + '</span>';
      row.onclick = function() {
        document.getElementById('exName').value = ex.name;
        // Highlight selected
        dbList.querySelectorAll('button').forEach(function(b){ b.style.background = 'rgba(255,255,255,0.04)'; b.style.borderColor = 'rgba(255,255,255,0.08)'; });
        row.style.background = 'rgba(var(--accent-rgb),0.15)';
        row.style.borderColor = 'var(--accent)';
        document.getElementById('exName').focus();
      };
      dbList.appendChild(row);
    });
  }

  muscleSelect.onchange = renderDbList;
  searchInput.oninput = renderDbList;
  renderDbList();
  main.appendChild(dbCard);

  // --- Sezione form manuale ---
  const card = document.createElement('div');
  card.className = 'card form-card';
  card.innerHTML =
    '<label>Nome</label><input type="text" id="exName" placeholder="es. Panca piana"><br>' +
    '<label>Serie</label><input type="number" id="exSets" value="' + defSets + '" min="1"><br>' +
    '<div style="display:flex;align-items:center;gap:10px;margin-bottom:4px;">' +
    '<label style="margin-bottom:0">Ripetizioni</label>' +
    '<label style="display:flex;align-items:center;gap:5px;font-size:0.75rem;color:#aaa;text-transform:none;letter-spacing:0;font-weight:600;margin-bottom:0;">' +
    '<input type="checkbox" id="exMaxCheck"> MAX' +
    '</label></div>' +
    '<input type="number" id="exReps" value="' + defReps + '" min="1"><br>' +
    '<label>Peso (kg)</label><input type="number" id="exWeight" value="0" min="0">';
  // MAX checkbox toggle
  var maxChk = card.querySelector('#exMaxCheck');
  var repsInput = card.querySelector('#exReps');
  maxChk.onchange = function() {
    repsInput.disabled = maxChk.checked;
    repsInput.style.opacity = maxChk.checked ? '0.3' : '1';
  };
  main.appendChild(card);

  const saveBtn = document.createElement('button');
  saveBtn.textContent = 'Salva';
  saveBtn.onclick = function() { saveExercise(dayIndex, -1); };
  main.appendChild(saveBtn);
}

function editExercise(dayIndex, exIndex) {
  const ex = data.days[dayIndex].exercises[exIndex];
  const main = document.getElementById('mainContent');
  main.innerHTML = '';
  const backBtn = document.createElement('button');
  backBtn.className = 'btn-back';
  backBtn.textContent = '← Indietro';
  backBtn.onclick = function() { manageExercises(dayIndex); };
  main.appendChild(backBtn);
  const title = document.createElement('h2');
  title.textContent = 'Modifica Esercizio';
  main.appendChild(title);
  const card = document.createElement('div');
  card.className = 'card form-card';
  const isMax = ex.reps === 'max';
  card.innerHTML =
    '<label>Nome</label><input type="text" id="exName" value="' + ex.name + '"><br>' +
    '<label>Serie</label><input type="number" id="exSets" value="' + ex.sets + '" min="1"><br>' +
    '<div style="display:flex;align-items:center;gap:10px;margin-bottom:4px;">' +
    '<label style="margin-bottom:0">Ripetizioni</label>' +
    '<label style="display:flex;align-items:center;gap:5px;font-size:0.75rem;color:#aaa;text-transform:none;letter-spacing:0;font-weight:600;margin-bottom:0;">' +
    '<input type="checkbox" id="exMaxCheck"' + (isMax ? ' checked' : '') + '> MAX' +
    '</label></div>' +
    '<input type="number" id="exReps" value="' + (isMax ? 10 : ex.reps) + '" min="1"' + (isMax ? ' disabled style="opacity:0.3"' : '') + '><br>' +
    '<label>Peso (kg)</label><input type="number" id="exWeight" value="' + (ex.weight||0) + '" min="0">';
  var maxChkE = card.querySelector('#exMaxCheck');
  var repsInputE = card.querySelector('#exReps');
  maxChkE.onchange = function() {
    repsInputE.disabled = maxChkE.checked;
    repsInputE.style.opacity = maxChkE.checked ? '0.3' : '1';
  };
  main.appendChild(card);
  const saveBtn = document.createElement('button');
  saveBtn.textContent = 'Salva';
  saveBtn.onclick = function() { saveExercise(dayIndex, exIndex); };
  main.appendChild(saveBtn);
}

function saveExercise(dayIndex, exIndex) {
  const name = document.getElementById('exName').value.trim();
  if (!name) { showToast('Inserisci un nome.', 'error'); return; }
  const sets  = parseInt(document.getElementById('exSets').value) || 3;
  const isMax = document.getElementById('exMaxCheck') && document.getElementById('exMaxCheck').checked;
  const reps  = isMax ? 'max' : (parseInt(document.getElementById('exReps').value) || 10);
  const weight = parseFloat(document.getElementById('exWeight').value) || 0;
  const ex = { name: name, sets: sets, reps: reps, weight: weight };
  if (exIndex === -1) data.days[dayIndex].exercises.push(ex);
  else data.days[dayIndex].exercises[exIndex] = ex;
  saveData();
  showToast('Esercizio salvato!');
  manageExercises(dayIndex);
}

function deleteExercise(dayIndex, exIndex) {
  modalConfirm('Eliminare "' + data.days[dayIndex].exercises[exIndex].name + '"?', function() {
    data.days[dayIndex].exercises.splice(exIndex, 1);
    saveData();
    showToast('Esercizio eliminato.', 'error');
    manageExercises(dayIndex);
  });
}

// ======== IMPOSTAZIONI ========

function applyTheme(theme) {
  document.documentElement.style.setProperty('--accent', theme.accent);
  document.documentElement.style.setProperty('--accent-rgb', theme.accentRgb);
  document.documentElement.style.setProperty('--bg', theme.bg);
  document.documentElement.style.setProperty('--bg-gradient', theme.bgGradient);
  document.documentElement.style.setProperty('--card-bg', theme.cardBg || 'linear-gradient(145deg,#141414,#111)');
  document.documentElement.style.setProperty('--card-border', theme.cardBorder || 'rgba(255,255,255,0.06)');
  document.body.style.backgroundColor = theme.bg;
  document.body.style.backgroundImage = theme.bgGradient;
  localStorage.setItem('gymAccentColor', theme.accent);
  localStorage.setItem('gymAccentRgb', theme.accentRgb);
}

function applyAccentColor(color, rgb) {
  document.documentElement.style.setProperty('--accent', color);
  document.documentElement.style.setProperty('--accent-rgb', rgb);
}
function showSettings() {
  const main = document.getElementById('mainContent');
  main.innerHTML = '';

  // --- IMPOSTAZIONI ---
  const title = document.createElement('h2');
  title.textContent = 'Impostazioni';
  main.appendChild(title);

  const card = document.createElement('div');
  card.className = 'card form-card';
  card.innerHTML =
    '<label>Recupero tra serie (sec)</label><input type="number" id="restTimeInput" value="' + data.settings.restTime + '"><br>' +
    '<label>Recupero ultima serie (sec)</label><input type="number" id="lastSetTimeInput" value="' + data.settings.lastSetTime + '"><br>' +
    '<label>Serie di default</label><input type="number" id="defaultSetsInput" value="' + (data.settings.defaultSets||3) + '"><br>' +
    '<label>Ripetizioni di default</label><input type="number" id="defaultRepsInput" value="' + (data.settings.defaultReps||10) + '">';
  main.appendChild(card);

  const saveBtn = document.createElement('button');
  saveBtn.textContent = 'Salva impostazioni';
  saveBtn.onclick = saveSettings;
  main.appendChild(saveBtn);

  // --- TEMA ---
  const h2color = document.createElement('h2');
  h2color.style.marginTop = '32px';
  h2color.textContent = 'Tema';
  main.appendChild(h2color);

  const THEMES = THEMES_DATA;

  const currentThemeId = localStorage.getItem('gymThemeId') || 'crimson';

  const cardTheme = document.createElement('div');
  cardTheme.className = 'card settings-data-card';
  const themeDesc = document.createElement('p');
  themeDesc.className = 'settings-desc';
  themeDesc.textContent = 'Scegli il tema visivo dell\'app.';
  cardTheme.appendChild(themeDesc);

  const themeGrid = document.createElement('div');
  themeGrid.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px;';

  THEMES.forEach(function(theme) {
    const btn = document.createElement('button');
    const isActive = currentThemeId === theme.id;
    btn.style.cssText = 'display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:12px;text-align:left;' +
      'background:' + (isActive ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)') + ';' +
      'border:1px solid ' + (isActive ? '#fff' : 'rgba(255,255,255,0.08)') + ';' +
      'cursor:pointer;transition:all 0.2s;width:100%;';

    // Preview cerchietti
    const preview = document.createElement('div');
    preview.style.cssText = 'display:flex;gap:3px;flex-shrink:0;';
    theme.preview.forEach(function(c) {
      const dot = document.createElement('div');
      dot.style.cssText = 'width:12px;height:12px;border-radius:50%;background:' + c + ';border:1px solid rgba(255,255,255,0.15);';
      preview.appendChild(dot);
    });

    const info = document.createElement('div');
    info.innerHTML = '<div style="font-size:0.78rem;font-weight:700;color:#fff;">' + theme.name + '</div>' +
      '<div style="font-size:0.67rem;color:#888;">' + theme.desc + '</div>';

    if (isActive) {
      const check = document.createElement('div');
      check.style.cssText = 'margin-left:auto;font-size:0.8rem;';
      check.textContent = '✓';
      info.appendChild(check);
    }

    btn.appendChild(preview);
    btn.appendChild(info);

    btn.onclick = function() {
      localStorage.setItem('gymThemeId', theme.id);
      applyTheme(theme);
      showToast('Tema ' + theme.name + ' applicato!');
      showSettings(); // refresh per aggiornare i bordi attivi
    };

    themeGrid.appendChild(btn);
  });

  cardTheme.appendChild(themeGrid);
  main.appendChild(cardTheme);

  // --- INSERIMENTO MANUALE ---
  const h2manual = document.createElement('h2');
  h2manual.style.marginTop = '32px';
  h2manual.textContent = 'Inserimento manuale';
  main.appendChild(h2manual);

  const cardManual = document.createElement('div');
  cardManual.className = 'card settings-data-card';
  cardManual.innerHTML = '<p class="settings-desc">Aggiungi una sessione passata manualmente.</p>';
  const manualBtn = document.createElement('button');
  manualBtn.textContent = '✏️ Inserisci sessione manuale';
  manualBtn.onclick = showManualEntry;
  cardManual.appendChild(manualBtn);
  main.appendChild(cardManual);

  // --- DATI ---
  const h2data = document.createElement('h2');
  h2data.style.marginTop = '32px';
  h2data.textContent = 'Dati';
  main.appendChild(h2data);

  const cardDB = document.createElement('div');
  cardDB.className = 'card settings-data-card';
  cardDB.innerHTML = '<p class="settings-desc">Sfoglia oltre 70 esercizi con consigli tecnici e aggiungili alle tue schede.</p>' +
    '<button onclick="showExerciseDB()" style="background:rgba(243,156,18,0.08);color:#f39c12;border:1px solid rgba(243,156,18,0.25);border-radius:10px;padding:8px 16px;font-size:0.75rem;font-weight:700;">📚 Apri Database Esercizi</button>';
  main.appendChild(cardDB);

  const cardData = document.createElement('div');
  cardData.className = 'card settings-data-card';
  cardData.innerHTML = '<p class="settings-desc">Esporta tutti i tuoi dati come backup JSON o importa un backup precedente.</p>' +
    '<div class="settings-data-btns">' +
    '<button onclick="exportData()" class="btn-export">Esporta backup</button>' +
    '<label class="btn-import">Importa backup<input type="file" accept=".json" onchange="importData(event)" style="display:none"></label>' +
    '</div>';
  main.appendChild(cardData);

  const cardReset = document.createElement('div');
  cardReset.className = 'card settings-data-card';
  cardReset.innerHTML = '<p class="settings-desc">Cancella tutti i dati dell\'app (schede, esercizi e progressi).</p>' +
    '<button onclick="resetAllData()" class="btn-danger">Reset completo</button>';
  main.appendChild(cardReset);
}


function saveSettings() {
  data.settings.restTime    = parseInt(document.getElementById('restTimeInput').value) || 90;
  data.settings.lastSetTime = parseInt(document.getElementById('lastSetTimeInput').value) || 60;
  data.settings.defaultSets = parseInt(document.getElementById('defaultSetsInput').value) || 3;
  data.settings.defaultReps = parseInt(document.getElementById('defaultRepsInput').value) || 10;
  saveData();
  showToast('Impostazioni salvate!');
}

function exportData() {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'gymapp-backup-' + new Date().toLocaleDateString('it-IT').replace(/\//g, '-') + '.json';
  a.click();
  URL.revokeObjectURL(url);
  showToast('Backup esportato!');
}

function importData(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const imported = JSON.parse(e.target.result);
      if (!imported.days || !imported.settings) { showToast('File non valido.', 'error'); return; }
      modalConfirm('Importando sovrascriverai i dati attuali. Continuare?', function() {
        data = imported;
        if (!data.progress) data.progress = [];
        saveData();
        showToast('Dati importati!');
        showSettings();
      });
    } catch(e) { showToast('Errore nel file.', 'error'); }
  };
  reader.readAsText(file);
}

function resetAllData() {
  modalConfirm('Sei sicuro? Cancellerai TUTTI i dati.', function() {
    data = { settings: { restTime: 90, lastSetTime: 60, defaultSets: 3, defaultReps: 10 }, days: [], progress: [] };
    saveData();
    showToast('Dati resettati.', 'error');
    showSettings();
  });
}

// ======== INSERIMENTO MANUALE ========
function showManualEntry() {
  const main = document.getElementById('mainContent');
  main.innerHTML = '';

  const backBtn = document.createElement('button');
  backBtn.className = 'btn-back';
  backBtn.textContent = '← Indietro';
  backBtn.onclick = showSettings;
  main.insertBefore(backBtn, main.firstChild);

  const title = document.createElement('h2');
  title.textContent = 'Inserimento manuale';
  main.appendChild(title);

  let dayOpts = '';
  if (data.days && data.days.length > 0) {
    data.days.forEach(function(d) { dayOpts += '<option value="' + d.name + '">' + d.name + '</option>'; });
  } else {
    dayOpts = '<option value="Allenamento">Allenamento</option>';
  }

  const now = new Date();
  const todayDate = now.toLocaleDateString('it-IT');
  const todayTime = now.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });

  const form = document.createElement('div');
  form.className = 'card form-card';
  form.innerHTML =
    '<label>Scheda</label><select id="manualDay">' + dayOpts + '</select><br>' +
    '<label>Data (gg/mm/aaaa)</label><input type="text" id="manualDate" value="' + todayDate + '"><br>' +
    '<label>Ora</label><input type="text" id="manualTime" value="' + todayTime + '"><br>' +
    '<label>Durata (minuti)</label><input type="number" id="manualDuration" value="60" min="0"><br>' +
    '<label>Peso corporeo (kg, opzionale)</label><input type="number" id="manualWeight" placeholder="es. 75.5" min="0" step="0.1"><br>' +
    '<label>Nota (opzionale)</label><input type="text" id="manualNote" placeholder="es. Ottimo allenamento">';
  main.appendChild(form);

  const saveBtn = document.createElement('button');
  saveBtn.textContent = '💾 Salva sessione';
  saveBtn.onclick = saveManualEntry;
  main.appendChild(saveBtn);
}

function saveManualEntry() {
  const dayName  = document.getElementById('manualDay').value;
  const dateStr  = document.getElementById('manualDate').value.trim();
  const timeStr  = document.getElementById('manualTime').value.trim();
  const durMins  = parseFloat(document.getElementById('manualDuration').value) || 0;
  const weightStr = document.getElementById('manualWeight').value.trim();
  const note     = document.getElementById('manualNote').value.trim();

  // Validazione data gg/mm/aaaa
  const dateParts = dateStr.split('/');
  if (dateParts.length !== 3 || dateParts[0].length < 1 || dateParts[2].length !== 4) {
    showToast('Data non valida (usa gg/mm/aaaa)', 'error'); return;
  }
  const weight = parseFloat(weightStr.replace(',', '.'));
  const bodyWeight = (weightStr !== '' && !isNaN(weight)) ? weight : null;

  const entry = {
    date: dateStr,
    time: timeStr,
    dayName: dayName,
    durationSeconds: Math.round(durMins * 60),
    bodyWeightKg: bodyWeight,
    note: note,
    exercises: []
  };
  data.progress.push(entry);
  saveData();
  showToast('Sessione inserita!');
  showSettings();
}

// ======== PROGRESSI ========
// Cache colori per dayName

function getDayColor(dayName) {
  if (_dayColorCache[dayName]) return _dayColorCache[dayName];
  const colors = ['#e63946','#4cc9f0','#2ecc71','#f39c12','#9b59b6','#e67e22','#1abc9c'];
  let hash = 0;
  for (let i = 0; i < dayName.length; i++) { hash = dayName.charCodeAt(i) + ((hash << 5) - hash); }
  _dayColorCache[dayName] = colors[Math.abs(hash) % colors.length];
  return _dayColorCache[dayName];
}

function getBodyWeightTrend(progress, currentIndex) {
  if (currentIndex === 0) return '';
  const current = progress[currentIndex].bodyWeightKg;
  let prev = null;
  for (let i = currentIndex - 1; i >= 0; i--) {
    if (progress[i].bodyWeightKg != null) { prev = progress[i].bodyWeightKg; break; }
  }
  if (prev === null || current === null) return '';
  const diff = (current - prev).toFixed(1);
  if (diff > 0) return '<span class="trend-up">+' + diff + ' kg</span>';
  if (diff < 0) return '<span class="trend-down">' + diff + ' kg</span>';
  return '<span class="trend-equal">stabile</span>';
}

function buildWeightChart(entries) {
  if (entries.length < 2) return '<p>Registra almeno 2 sessioni con peso per vedere il grafico.</p>';
  const W = 340, H = 130, PAD = 36;
  const weights = entries.map(function(p) { return p.bodyWeightKg; });
  const minW = Math.min.apply(null, weights) - 1;
  const maxW = Math.max.apply(null, weights) + 1;
  const range = maxW - minW || 1;

  function xi(i) { return PAD + (i / (entries.length - 1)) * (W - PAD * 2); }
  function yi(v) { return H - PAD - ((v - minW) / range) * (H - PAD * 2); }

  // Griglia orizzontale
  const steps = 4;
  let grid = '';
  for (let s = 0; s <= steps; s++) {
    const v = minW + (range / steps) * s;
    const y = yi(v);
    grid += '<line x1="' + PAD + '" y1="' + y + '" x2="' + (W - PAD) + '" y2="' + y + '" stroke="#333" stroke-width="0.5"/>';
    grid += '<text x="' + (PAD - 4) + '" y="' + (y + 4) + '" fill="#888" font-size="8" text-anchor="end">' + v.toFixed(1) + '</text>';
  }

  // Labels asse X (date, ogni N)
  let xLabels = '';
  const step = Math.max(1, Math.floor(entries.length / 5));
  entries.forEach(function(p, i) {
    if (i % step === 0 || i === entries.length - 1) {
      const parts = p.date.split('/');
      xLabels += '<text x="' + xi(i) + '" y="' + (H - 4) + '" fill="#888" font-size="8" text-anchor="middle">' + parts[0] + '/' + parts[1] + '</text>';
    }
  });

  const polyline = entries.map(function(p, i) { return xi(i) + ',' + yi(p.bodyWeightKg); }).join(' ');
  const dots = entries.map(function(p, i) {
    return '<circle cx="' + xi(i) + '" cy="' + yi(p.bodyWeightKg) + '" r="3.5" fill="#4cc9f0"><title>' + p.date + ': ' + p.bodyWeightKg + ' kg</title></circle>';
  }).join('');

  return '<svg viewBox="0 0 ' + W + ' ' + H + '" style="width:100%;overflow:visible">' +
    grid + xLabels +
    '<polyline points="' + polyline + '" fill="none" stroke="#4cc9f0" stroke-width="2" stroke-linejoin="round"/>' +
    dots + '</svg>';
}



function checkBadges() {
  if (!data.progress) return;
  var earned = JSON.parse(localStorage.getItem('gymBadges') || '[]');
  var newBadges = [];
  BADGES.forEach(function(b) {
    if (!earned.includes(b.id) && b.check(data.progress)) {
      earned.push(b.id);
      newBadges.push(b);
    }
  });
  if (newBadges.length > 0) {
    localStorage.setItem('gymBadges', JSON.stringify(earned));
    newBadges.forEach(function(b) {
      setTimeout(function() {
        showToast(b.icon + ' Badge sbloccato: ' + b.name + '!');
      }, 800);
    });
  }
}

function showBadgesPanel(container) {
  var earned = JSON.parse(localStorage.getItem('gymBadges') || '[]');
  var card = document.createElement('div');
  card.className = 'card';
  card.style.marginTop = '12px';
  card.innerHTML = '<h3 style="font-size:0.78rem;color:#aaa;margin-bottom:12px;">🏅 BADGE</h3>';
  var grid = document.createElement('div');
  grid.style.cssText = 'display:grid;grid-template-columns:repeat(4,1fr);gap:8px;';
  BADGES.forEach(function(b) {
    var isEarned = earned.includes(b.id);
    var item = document.createElement('div');
    item.style.cssText = 'text-align:center;padding:8px 4px;border-radius:10px;background:' +
      (isEarned ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.02)') + ';' +
      'border:1px solid ' + (isEarned ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.04)') + ';' +
      'opacity:' + (isEarned ? '1' : '0.35') + ';cursor:' + (isEarned ? 'pointer' : 'default') + ';';
    item.innerHTML = '<div style="font-size:1.3rem;">' + b.icon + '</div>' +
      '<div style="font-size:0.6rem;color:#aaa;margin-top:3px;line-height:1.2;">' + b.name + '</div>';
    if (isEarned) {
      item.title = b.desc;
    }
    grid.appendChild(item);
  });
  card.appendChild(grid);
  container.appendChild(card);
}

function showProgress() {
  const main = document.getElementById('mainContent');
  main.innerHTML = '';

  const title = document.createElement('h2');
  title.textContent = 'Progressi';
  main.appendChild(title);

  if (!data.progress || data.progress.length === 0) {
    const empty = document.createElement('p');
    empty.textContent = 'Nessuna sessione salvata.';
    main.appendChild(empty);
    return;
  }

  // Stats bar
  const totalSessions = data.progress.length;
  const totalSeconds = data.progress.reduce((acc, p) => acc + (p.durationSeconds || 0), 0);
  const avgSeconds = Math.round(totalSeconds / totalSessions);
  const statsDiv = document.createElement('div');
  statsDiv.className = 'stats-bar';
  statsDiv.innerHTML = `
    <div class="stat-item"><span class="stat-value">${totalSessions}</span><span class="stat-label">Sessioni</span></div>
    <div class="stat-item"><span class="stat-value">${formatTime(avgSeconds)}</span><span class="stat-label">Media</span></div>
    <div class="stat-item"><span class="stat-value">${formatTime(totalSeconds)}</span><span class="stat-label">Tot. tempo</span></div>
  `;
  main.appendChild(statsDiv);

  checkBadges();
  showBadgesPanel(main);

  // Tab buttons
  const tabsDiv = document.createElement('div');
  tabsDiv.className = 'progress-tabs';
  tabsDiv.id = 'progressTabsBar';
  const tabs = [
    { id: 'sessioni', label: '📝 Sessioni' },
    { id: 'peso',     label: '⚖️ Peso' },
    { id: 'volume',   label: '📦 Volume' },
    { id: 'carichi',  label: '🏆 Carichi' },
    { id: 'mese',     label: '📅 Mese' },
    { id: 'anno',     label: '🗓️ Anno' }
  ];
  tabs.forEach(function(tab) {
    const btn = document.createElement('button');
    btn.textContent = tab.label;
    btn.dataset.tab = tab.id;
    btn.className = 'progress-tab-btn';
    btn.onclick = function() { renderProgressTab(tab.id); };
    tabsDiv.appendChild(btn);
  });
  main.appendChild(tabsDiv);

  const tabContent = document.createElement('div');
  tabContent.id = 'progressTabContent';
  main.appendChild(tabContent);

  renderProgressTab('sessioni');
}

function renderProgressTab(tabId) {
  // Highlight active tab
  const bar = document.getElementById('progressTabsBar');
  if (bar) {
    bar.querySelectorAll('.progress-tab-btn').forEach(function(btn) {
      btn.classList.toggle('active', btn.dataset.tab === tabId);
    });
  }
  const container = document.getElementById('progressTabContent');
  if (!container) return;
  container.innerHTML = '';

  if (tabId === 'sessioni') renderSessionsTab(container);
  else if (tabId === 'peso') renderWeightTab(container);
  else if (tabId === 'volume') renderVolumeTab(container);
  else if (tabId === 'carichi') renderCarichiTab(container);
  else if (tabId === 'mese') renderMeseTab(container);
  else if (tabId === 'anno') renderAnnoTab(container);
}

// --- TAB SESSIONI ---
function renderSessionsTab(container) {
  // Filtro scheda
  const days = [...new Set(data.progress.map(p => p.dayName))];
  const filterDiv = document.createElement('div');
  filterDiv.className = 'filter-bar';
  let opts = '<option value="all">Tutte le schede</option>';
  days.forEach(d => opts += `<option value="${d}">${d}</option>`);
  filterDiv.innerHTML = `<label>Scheda</label><select id="filterDay" onchange="renderProgressList(this.value)">${opts}</select>`;
  container.appendChild(filterDiv);

  const listContainer = document.createElement('div');
  listContainer.className = 'progress-list';
  listContainer.id = 'progressList';
  container.appendChild(listContainer);
  renderProgressList('all');
}

function renderProgressList(filter) {
  const container = document.getElementById('progressList');
  if (!container) return;
  container.innerHTML = '';

  let filtered = data.progress.map((p, i) => ({ p, i }));
  // Sort by real date descending
  filtered.sort(function(a, b) {
    const toTs = function(entry) {
      const parts = entry.p.date.split('/');
      const d = new Date(parts[2]+'-'+parts[1]+'-'+parts[0]);
      return d.getTime() + (entry.p.time ? entry.p.time.replace(':','') * 1 : 0);
    };
    return toTs(b) - toTs(a);
  });
  if (filter !== 'all') filtered = filtered.filter(obj => obj.p.dayName === filter);
  if (filtered.length === 0) { container.innerHTML = '<p>Nessuna sessione per questo filtro.</p>'; return; }

  const groups = {};
  filtered.forEach(obj => {
    if (!groups[obj.p.date]) groups[obj.p.date] = [];
    groups[obj.p.date].push(obj);
  });

  const frag = document.createDocumentFragment();
  Object.keys(groups).forEach(function(dateKey) {
    const dh = document.createElement('div');
    dh.className = 'date-header';
    dh.textContent = dateKey;
    frag.appendChild(dh);

    groups[dateKey].forEach(function(obj) {
      const p = obj.p, i = obj.i;
      const color = getDayColor(p.dayName);
      const trend = p.bodyWeightKg != null ? getBodyWeightTrend(data.progress, i) : '';
      const div = document.createElement('div');
      div.className = 'card progress-card';
      div.style.borderLeft = `4px solid ${color}`;

      const header = document.createElement('div');
      header.className = 'progress-card-header';
      const badge = document.createElement('span');
      badge.className = 'progress-day-badge';
      badge.style.cssText = `background:${color}22;color:${color};border-color:${color}`;
      badge.textContent = p.dayName;
      const delBtn = document.createElement('button');
      delBtn.className = 'btn-delete-single';
      delBtn.textContent = '🗑';
      delBtn.onclick = function() { deleteSession(i); };
      const dupBtn = document.createElement('button');
      dupBtn.className = 'btn-delete-single';
      dupBtn.textContent = '📋';
      dupBtn.title = 'Duplica pesi su nuova sessione';
      dupBtn.onclick = (function(session){ return function() { duplicateSessionWeights(session); }; })(p);
      header.appendChild(badge);
      header.appendChild(dupBtn);
      header.appendChild(delBtn);
      div.appendChild(header);

      const details = document.createElement('div');
      details.className = 'progress-details';
      details.innerHTML = `<span>${formatTime(p.durationSeconds || 0)}</span>${p.bodyWeightKg != null ? `<span>${p.bodyWeightKg} kg ${trend}</span>` : ''}<span>${p.time}</span>`;
      div.appendChild(details);

      if (p.exercises && p.exercises.length > 0) {
        const exToggle = document.createElement('button');
        exToggle.className = 'btn-ex-toggle';
        exToggle.textContent = `Esercizi (${p.exercises.length})`;
        const exList = document.createElement('div');
        exList.className = 'ex-detail-list';
        exList.style.display = 'none';
        p.exercises.forEach(ex => {
          const row = document.createElement('div');
          row.className = 'ex-detail-row';
          row.textContent = `${ex.name} — ${ex.sets}×${ex.reps}${ex.weight ? ' @ ' + ex.weight + ' kg' : ''}`;
          exList.appendChild(row);
        });
        exToggle.onclick = function() {
          const open = exList.style.display !== 'none';
          exList.style.display = open ? 'none' : 'block';
          exToggle.textContent = open ? `Esercizi (${p.exercises.length})` : `Nascondi esercizi`;
        };
        div.appendChild(exToggle);
        div.appendChild(exList);
      }
      if (p.note) {
        const noteDiv = document.createElement('div');
        noteDiv.className = 'progress-note';
        noteDiv.textContent = p.note;
        div.appendChild(noteDiv);
      }
      frag.appendChild(div);
    });
  });
  container.appendChild(frag);
}


function duplicateSessionWeights(session) {
  var day = data.days.find(function(d){ return d.name === session.dayName; });
  if (!day) { showToast('Scheda non trovata.', 'error'); return; }
  // Apply last session weights to day exercises
  if (session.exercises) {
    session.exercises.forEach(function(se) {
      var ex = day.exercises.find(function(e){ return e.name === se.name; });
      if (ex && se.weight != null) ex.weight = se.weight;
    });
    saveData();
    showToast('✅ Pesi copiati su ' + session.dayName + '!');
  }
}

function deleteSession(i) {
  modalConfirm('Eliminare questa sessione?', function() {
    data.progress.splice(i, 1);
    saveData();
    showToast('Sessione eliminata.', 'error');
    showProgress();
  });
}

// --- TAB PESO ---
function renderWeightTab(container) {
  const allWeightEntries = data.progress.filter(p => p.bodyWeightKg != null);
  if (allWeightEntries.length < 2) {
    container.innerHTML = '<p>Registra almeno 2 sessioni con peso corporeo per vedere il grafico.</p>';
    return;
  }

  // Filtro periodo
  const filterBar = document.createElement('div');
  filterBar.className = 'filter-bar';
  filterBar.style.marginBottom = '12px';
  filterBar.innerHTML = '<label>Periodo</label>' +
    '<select id="weightPeriodFilter">' +
    '<option value="30">Ultimi 30 giorni</option>' +
    '<option value="90">Ultimi 90 giorni</option>' +
    '<option value="all" selected>Tutto</option>' +
    '</select>';
  container.appendChild(filterBar);

  const chartContainer = document.createElement('div');
  container.appendChild(chartContainer);

  function renderWeightChart(period) {
    chartContainer.innerHTML = '';
    const now = new Date();
    const entries = allWeightEntries.filter(function(p) {
      if (period === 'all') return true;
      const d = parseDate(p.date);
      return (now - d) / 86400000 <= parseInt(period);
    });

    if (entries.length < 2) {
      chartContainer.innerHTML = '<p style="color:#888;font-size:0.82rem;padding:8px 0;">Nessun dato sufficiente per il periodo selezionato.</p>';
      return;
    }

    // Min/Max/Delta
    const weights = entries.map(function(p){ return p.bodyWeightKg; });
    const minW = Math.min.apply(null, weights);
    const maxW = Math.max.apply(null, weights);
    const delta = (entries[entries.length-1].bodyWeightKg - entries[0].bodyWeightKg).toFixed(1);
    const deltaColor = delta < 0 ? '#2ecc71' : delta > 0 ? '#e63946' : '#f39c12';
    const deltaStr = (delta > 0 ? '+' : '') + delta + ' kg';

    const statsRow = document.createElement('div');
    statsRow.style.cssText = 'display:flex;gap:8px;margin-bottom:12px;';
    [
      { label:'Min', val: minW + ' kg', color:'#2ecc71' },
      { label:'Max', val: maxW + ' kg', color:'#e63946' },
      { label:'Variazione', val: deltaStr, color: deltaColor },
    ].forEach(function(s) {
      const box = document.createElement('div');
      box.style.cssText = 'flex:1;text-align:center;background:rgba(255,255,255,0.04);border-radius:10px;padding:8px 4px;';
      box.innerHTML = '<div style="font-size:0.65rem;color:#888;margin-bottom:3px;">' + s.label + '</div>' +
        '<div style="font-size:0.9rem;font-weight:800;color:' + s.color + '">' + s.val + '</div>';
      statsRow.appendChild(box);
    });
    chartContainer.appendChild(statsRow);

    const card = document.createElement('div');
    card.className = 'card weight-chart-card';
    card.innerHTML = '<h3>Andamento peso corporeo</h3>' + buildWeightChart(entries);
    chartContainer.appendChild(card);

    // Tabella ultimi valori
    const table = document.createElement('div');
    table.style.cssText = 'margin-top:12px;font-size:0.82rem;';
    const recent = entries.slice(-10).reverse();
    recent.forEach(function(p) {
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid rgba(255,255,255,0.05)';
      row.innerHTML = '<span>' + p.date + '</span><span style="color:#4cc9f0;font-weight:700">' + p.bodyWeightKg + ' kg</span>';
      table.appendChild(row);
    });
    chartContainer.appendChild(table);
  }

  document.getElementById('weightPeriodFilter') && (document.getElementById('weightPeriodFilter').onchange = function() {
    renderWeightChart(this.value);
  });
  filterBar.querySelector('select').onchange = function() { renderWeightChart(this.value); };
  renderWeightChart('all');
}

// --- TAB VOLUME ---
function renderVolumeTab(container) {
  if (!data.progress || data.progress.length === 0) { container.innerHTML = '<p>Nessun dato.</p>'; return; }

  const volumeByDay = {};
  data.progress.forEach(p => {
    if (!p.exercises) return;
    const vol = p.exercises.reduce((acc, ex) => acc + (ex.sets * ex.reps * (ex.weight || 0)), 0);
    if (!volumeByDay[p.dayName]) volumeByDay[p.dayName] = 0;
    volumeByDay[p.dayName] += vol;
  });

  const card = document.createElement('div');
  card.className = 'card';
  card.innerHTML = '<h3>Volume totale per scheda (kg)</h3>';
  const sorted = Object.entries(volumeByDay).sort((a, b) => b[1] - a[1]);
  const maxVol = sorted.length ? sorted[0][1] : 1;
  sorted.forEach(([name, vol]) => {
    const pct = Math.round((vol / maxVol) * 100);
    const color = getDayColor(name);
    const row = document.createElement('div');
    row.style.cssText = 'margin-bottom:12px;';
    row.innerHTML = `
      <div style="display:flex;justify-content:space-between;font-size:0.82rem;margin-bottom:4px;">
        <span style="color:${color};font-weight:700">${name}</span>
        <span>${Math.round(vol).toLocaleString('it-IT')} kg</span>
      </div>
      <div style="background:rgba(255,255,255,0.07);border-radius:6px;height:8px;">
        <div style="background:${color};width:${pct}%;height:8px;border-radius:6px;"></div>
      </div>`;
    card.appendChild(row);
  });
  container.appendChild(card);

  // Confronto questa settimana vs precedente
  const now = new Date();
  const startOfWeek = new Date(now); startOfWeek.setHours(0,0,0,0);
  startOfWeek.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  const startOfPrevWeek = new Date(startOfWeek); startOfPrevWeek.setDate(startOfWeek.getDate() - 7);

  function getWeekVol(from, to) {
    return data.progress.filter(function(p) {
      const parts = p.date.split('/');
      const d = new Date(parts[2]+'-'+parts[1]+'-'+parts[0]);
      return d >= from && d < to;
    }).reduce(function(acc, p) {
      return acc + (p.exercises || []).reduce(function(a, ex){ return a + ex.sets * ex.reps * (ex.weight||0); }, 0);
    }, 0);
  }

  const thisVol = getWeekVol(startOfWeek, new Date(startOfWeek.getTime() + 7*86400000));
  const prevVol = getWeekVol(startOfPrevWeek, startOfWeek);

  const compareCard = document.createElement('div');
  compareCard.className = 'card';
  compareCard.style.marginTop = '12px';
  const diff = thisVol - prevVol;
  const diffStr = diff === 0 ? '= uguale' : (diff > 0 ? '▲ +' : '▼ ') + Math.abs(Math.round(diff)).toLocaleString('it-IT') + ' kg';
  const diffColor = diff > 0 ? '#2ecc71' : diff < 0 ? '#e63946' : '#f39c12';
  compareCard.innerHTML = '<h3 style="font-size:0.78rem;color:#aaa;margin-bottom:12px;">📊 Confronto settimane</h3>' +
    '<div style="display:flex;justify-content:space-between;align-items:center;gap:12px;">' +
    '<div style="text-align:center;flex:1"><div style="font-size:0.68rem;color:#888;margin-bottom:4px;">QUESTA SETTIMANA</div><div style="font-size:1.1rem;font-weight:900;color:#fff">'+ Math.round(thisVol).toLocaleString('it-IT') +' kg</div></div>' +
    '<div style="font-size:1rem;font-weight:800;color:'+diffColor+'">'+diffStr+'</div>' +
    '<div style="text-align:center;flex:1"><div style="font-size:0.68rem;color:#888;margin-bottom:4px;">SETTIMANA SCORSA</div><div style="font-size:1.1rem;font-weight:900;color:#fff">'+ Math.round(prevVol).toLocaleString('it-IT') +' kg</div></div>' +
    '</div>';
  container.appendChild(compareCard);
}

// --- TAB CARICHI ---
function renderCarichiTab(container) {
  const allExercises = [...new Set(
    data.progress.flatMap(p => (p.exercises || []).map(ex => ex.name))
  )].sort();

  if (allExercises.length === 0) { container.innerHTML = '<p>Nessun dato.</p>'; return; }

  const filterDiv = document.createElement('div');
  filterDiv.className = 'filter-bar';
  let opts = allExercises.map(n => `<option value="${n}">${n}</option>`).join('');
  filterDiv.innerHTML = `<label>Esercizio</label><select id="carichiExFilter">${opts}</select>`;
  container.appendChild(filterDiv);

  const chartDiv = document.createElement('div');
  chartDiv.id = 'carichiChart';
  container.appendChild(chartDiv);

  function renderCarichiChart() {
    const exName = document.getElementById('carichiExFilter').value;
    const points = data.progress
      .filter(p => p.exercises && p.exercises.some(ex => ex.name === exName))
      .map(p => {
        const ex = p.exercises.find(e => e.name === exName);
        return { date: p.date, weight: ex ? (ex.weight || 0) : 0 };
      });

    if (points.length < 2) {
      chartDiv.innerHTML = '<p style="margin-top:12px">Servono almeno 2 sessioni con questo esercizio.</p>';
      return;
    }
    const card = document.createElement('div');
    card.className = 'card weight-chart-card';
    // Best 1RM (Epley: w * (1 + reps/30))
    const bestSession = data.progress
      .filter(p => p.exercises && p.exercises.some(ex => ex.name === exName))
      .map(p => { const ex = p.exercises.find(e => e.name === exName); return ex; })
      .filter(ex => ex && ex.weight > 0 && ex.reps > 0)
      .reduce(function(best, ex) {
        const orm = ex.weight * (1 + ex.reps / 30);
        return orm > best ? orm : best;
      }, 0);
    const ormHtml = bestSession > 0
      ? '<div style="font-size:0.78rem;color:#f39c12;margin-bottom:10px;">🏆 1RM stimato (Epley): <strong style=\"color:#fff\">' + bestSession.toFixed(1) + ' kg</strong></div>'
      : '';
    card.innerHTML = `<h3>${exName}</h3>` + ormHtml + buildWeightChart(points.map(p => ({ date: p.date, bodyWeightKg: p.weight })));
    chartDiv.innerHTML = '';
    chartDiv.appendChild(card);
  }

  document.getElementById('carichiExFilter').onchange = renderCarichiChart;
  renderCarichiChart();
}

// --- TAB MESE ---
function renderMeseTab(container) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  // Map day number -> color (last session that day wins)
  const trainingDays = new Set();
  const trainingDayColors = {};
  data.progress.forEach(function(p) {
    const parts = p.date.split('/');
    const d = new Date(parts[2]+'-'+parts[1]+'-'+parts[0]);
    if (d.getFullYear() === year && d.getMonth() === month) {
      const dayNum = d.getDate();
      trainingDays.add(dayNum);
      trainingDayColors[dayNum] = getDayColor(p.dayName);
    }
  });

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = (new Date(year, month, 1).getDay() + 6) % 7; // Monday = 0

  const card = document.createElement('div');
  card.className = 'card';
  const monthNames = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];
  card.innerHTML = `<h3>${monthNames[month]} ${year}</h3>`;

  const cal = document.createElement('div');
  cal.style.cssText = 'display:grid;grid-template-columns:repeat(7,1fr);gap:4px;margin-top:8px;';

  ['L','M','M','G','V','S','D'].forEach(d => {
    const h = document.createElement('div');
    h.style.cssText = 'text-align:center;font-size:0.7rem;color:#666;padding:2px;';
    h.textContent = d;
    cal.appendChild(h);
  });

  for (let i = 0; i < firstDay; i++) {
    cal.appendChild(document.createElement('div'));
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const cell = document.createElement('div');
    const isToday = day === now.getDate();
    const isTrained = trainingDays.has(day);
    const trainColor = trainingDayColors[day] || '#e63946';
    const r = isTrained ? parseInt(trainColor.slice(1,3),16) : 0;
    const g = isTrained ? parseInt(trainColor.slice(3,5),16) : 0;
    const b = isTrained ? parseInt(trainColor.slice(5,7),16) : 0;
    cell.style.cssText = `text-align:center;padding:6px 2px;border-radius:6px;font-size:0.82rem;font-weight:${isToday?'800':'400'};
      background:${isTrained ? `rgba(${r},${g},${b},0.25)` : 'rgba(255,255,255,0.04)'};
      color:${isTrained ? trainColor : isToday ? '#fff' : '#777'};
      border:${isToday ? '1px solid rgba(255,255,255,0.3)' : '1px solid transparent'};`;
    cell.textContent = day;
    cal.appendChild(cell);
  }

  card.appendChild(cal);

  const legend = document.createElement('div');
  legend.style.cssText = 'margin-top:10px;font-size:0.75rem;color:#888;';
  legend.innerHTML = `● Allenato (colore = scheda) &nbsp; Sessioni questo mese: <strong style="color:#fff">${trainingDays.size}</strong>`;
  card.appendChild(legend);
  container.appendChild(card);
}

// --- TAB ANNO ---
function renderAnnoTab(container) {
  const now = new Date();
  const year = now.getFullYear();

  const trainingDates = new Set(
    data.progress
      .map(p => { const parts = p.date.split('/'); return `${parts[2]}-${parts[1]}-${parts[0]}`; })
      .filter(d => new Date(d).getFullYear() === year)
  );

  const card = document.createElement('div');
  card.className = 'card';
  card.innerHTML = `<h3>Heatmap ${year}</h3>`;

  const monthNames = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'];
  const grid = document.createElement('div');
  grid.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;margin-top:10px;';

  for (let m = 0; m < 12; m++) {
    const mDiv = document.createElement('div');
    mDiv.style.cssText = 'flex:1;min-width:70px;';
    const mLabel = document.createElement('div');
    mLabel.style.cssText = 'font-size:0.68rem;color:#666;margin-bottom:3px;text-align:center;';
    mLabel.textContent = monthNames[m];
    mDiv.appendChild(mLabel);

    const daysInMonth = new Date(year, m + 1, 0).getDate();
    const mGrid = document.createElement('div');
    mGrid.style.cssText = 'display:grid;grid-template-columns:repeat(7,1fr);gap:2px;';

    const firstDay = (new Date(year, m, 1).getDay() + 6) % 7;
    for (let i = 0; i < firstDay; i++) {
      mGrid.appendChild(document.createElement('div'));
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const trained = trainingDates.has(dateStr);
      const cell = document.createElement('div');
      cell.style.cssText = `width:8px;height:8px;border-radius:2px;background:${trained ? '#e63946' : 'rgba(255,255,255,0.06)'};`;
      mGrid.appendChild(cell);
    }
    mDiv.appendChild(mGrid);
    grid.appendChild(mDiv);
  }

  card.appendChild(grid);

  const totalTraining = trainingDates.size;
  const legend = document.createElement('div');
  legend.style.cssText = 'margin-top:10px;font-size:0.75rem;color:#888;';
  legend.innerHTML = `Sessioni nel ${year}: <strong style="color:#e63946">${totalTraining}</strong>`;
  card.appendChild(legend);
  container.appendChild(card);
}

let EXERCISE_DB = [
  { name:'Panca piana (bilanciere)', muscle:'Petto', secondary:'Tricipiti, Deltoidi anteriori', equipment:'Bilanciere', difficulty:'Intermedio', tips:'Tieni le scapole retratte e i piedi a terra. Abbassa il bilanciere controllato fino al petto.' },
  { name:'Panca inclinata (bilanciere)', muscle:'Petto', secondary:'Deltoidi anteriori, Tricipiti', equipment:'Bilanciere', difficulty:'Intermedio', tips:'Inclinazione 30-45°. Colpisce la parte alta del petto.' },
  { name:'Panca piana (manubri)', muscle:'Petto', secondary:'Tricipiti, Deltoidi', equipment:'Manubri', difficulty:'Intermedio', tips:'Maggiore range of motion rispetto al bilanciere. Tieni i polsi neutri.' },
  { name:'Croci con manubri', muscle:'Petto', secondary:'Deltoidi anteriori', equipment:'Manubri', difficulty:'Principiante', tips:'Leggera flessione dei gomiti fissa per tutta la ripetizione. Pensa a "abbracciare un albero".' },
  { name:'Dip (petto)', muscle:'Petto', secondary:'Tricipiti, Deltoidi', equipment:'Parallele', difficulty:'Intermedio', tips:'Inclinati leggermente in avanti per enfatizzare il petto.' },
  { name:'Push-up', muscle:'Petto', secondary:'Tricipiti, Core', equipment:'Corpo libero', difficulty:'Principiante', tips:'Corpo rigido come una tavola. Variante wide per più petto, stretta per tricipiti.' },
  { name:'Cable crossover', muscle:'Petto', secondary:'Deltoidi anteriori', equipment:'Cavi', difficulty:'Intermedio', tips:'Incrocia leggermente le mani a fine movimento per massima contrazione.' },
  { name:'Trazioni (Pull-up)', muscle:'Schiena', secondary:'Bicipiti, Core', equipment:'Sbarra', difficulty:'Avanzato', tips:'Inizia con le braccia completamente distese. Punta il petto verso la sbarra.' },
  { name:'Lat machine presa larga', muscle:'Schiena', secondary:'Bicipiti, Romboidi', equipment:'Macchina', difficulty:'Principiante', tips:'Abbassa il bilanciere fino al mento, non dietro la testa.' },
  { name:'Rematore con bilanciere', muscle:'Schiena', secondary:'Bicipiti, Trapezio', equipment:'Bilanciere', difficulty:'Intermedio', tips:'Schiena parallela al suolo, spingi i gomiti verso il soffitto.' },
  { name:'Rematore con manubrio (un braccio)', muscle:'Schiena', secondary:'Bicipiti, Core', equipment:'Manubri', difficulty:'Principiante', tips:'Appoggia il ginocchio sulla panca. Porta il gomito verso il soffitto, non di lato.' },
  { name:'Stacco da terra', muscle:'Schiena', secondary:'Glutei, Quadricipiti, Core', equipment:'Bilanciere', difficulty:'Avanzato', tips:'Schiena neutra, barre vicino alle gambe. Spingi il pavimento via da te.' },
  { name:'Facepull', muscle:'Schiena', secondary:'Deltoidi posteriori, Rotatori', equipment:'Cavi', difficulty:'Principiante', tips:'Tira verso il viso con i gomiti alti. Ottimo per la salute delle spalle.' },
  { name:'Pulley basso', muscle:'Schiena', secondary:'Bicipiti, Romboidi', equipment:'Cavi', difficulty:'Principiante', tips:"Tira verso l'ombelico, mantieni il busto fermo." },
  { name:'Lento avanti (bilanciere)', muscle:'Spalle', secondary:'Tricipiti, Trapezio', equipment:'Bilanciere', difficulty:'Intermedio', tips:"Non inarcare eccessivamente la schiena. Premi attivamente il core." },
  { name:'Lento avanti (manubri)', muscle:'Spalle', secondary:'Tricipiti, Trapezio', equipment:'Manubri', difficulty:'Principiante', tips:'Parti con i manubri ad altezza spalle, palme in avanti.' },
  { name:'Alzate laterali', muscle:'Spalle', secondary:'Trapezio', equipment:'Manubri', difficulty:'Principiante', tips:'Leggera flessione dei gomiti. Alzate fino a 90°, non oltre.' },
  { name:'Alzate frontali', muscle:'Spalle', secondary:'Deltoidi anteriori', equipment:'Manubri', difficulty:'Principiante', tips:'Alza un braccio alla volta o entrambi. Arriva ad altezza spalle.' },
  { name:'Alzate posteriori (reverse fly)', muscle:'Spalle', secondary:'Romboidi, Trapezio', equipment:'Manubri', difficulty:'Principiante', tips:'Busto piegato a 90°. Apri le braccia come ali.' },
  { name:'Arnold press', muscle:'Spalle', secondary:'Tricipiti, Deltoidi', equipment:'Manubri', difficulty:'Intermedio', tips:'Rotazione delle palme durante il movimento. Coinvolge tutto il deltoide.' },
  { name:'Curl bilanciere', muscle:'Bicipiti', secondary:'Avambracci', equipment:'Bilanciere', difficulty:'Principiante', tips:'Gomiti fermi ai fianchi. Non dondolare il busto.' },
  { name:'Curl manubri alternati', muscle:'Bicipiti', secondary:'Avambracci', equipment:'Manubri', difficulty:'Principiante', tips:'Ruota il polso durante la salita (supinazione) per massima attivazione.' },
  { name:'Curl martello', muscle:'Bicipiti', secondary:'Brachiale, Avambracci', equipment:'Manubri', difficulty:'Principiante', tips:'Presa neutra (pollice in alto). Colpisce il brachioradiale.' },
  { name:'Curl cavi bassi', muscle:'Bicipiti', secondary:'Avambracci', equipment:'Cavi', difficulty:'Principiante', tips:'Tensione costante durante tutto il movimento.' },
  { name:'Curl concentrato', muscle:'Bicipiti', secondary:'-', equipment:'Manubri', difficulty:'Principiante', tips:'Gomito appoggiato alla coscia. Massima concentrazione sul bicipite.' },
  { name:'French press (skullcrusher)', muscle:'Tricipiti', secondary:'Deltoidi', equipment:'Bilanciere', difficulty:'Intermedio', tips:'Gomiti puntati verso il soffitto. Abbassa alla fronte controllato.' },
  { name:'Dip (tricipiti)', muscle:'Tricipiti', secondary:'Petto, Deltoidi', equipment:'Parallele', difficulty:'Intermedio', tips:'Busto eretto per enfatizzare i tricipiti.' },
  { name:'Pushdown cavi (presa stretta)', muscle:'Tricipiti', secondary:'-', equipment:'Cavi', difficulty:'Principiante', tips:'Gomiti fermi ai fianchi. Estendi completamente le braccia.' },
  { name:'Overhead tricep extension', muscle:'Tricipiti', secondary:'-', equipment:'Manubri', difficulty:'Principiante', tips:'Porta il manubrio dietro la testa. Gomiti rivolti verso il soffitto.' },
  { name:'Kickback tricipiti', muscle:'Tricipiti', secondary:'-', equipment:'Manubri', difficulty:'Principiante', tips:'Braccio parallelo al pavimento. Estendi completamente il gomito.' },
  { name:'Squat (bilanciere)', muscle:'Gambe', secondary:'Glutei, Core', equipment:'Bilanciere', difficulty:'Avanzato', tips:'Scendi fino a quando le cosce sono parallele al suolo. Ginocchia in linea con le punte.' },
  { name:'Leg press', muscle:'Gambe', secondary:'Glutei', equipment:'Macchina', difficulty:'Principiante', tips:'Non bloccare completamente le ginocchia in estensione. Piedi alla larghezza delle spalle.' },
  { name:'Affondi (lunges)', muscle:'Gambe', secondary:'Glutei, Core', equipment:'Corpo libero / Manubri', difficulty:'Principiante', tips:'Ginocchio anteriore non oltre la punta del piede. Schiena dritta.' },
  { name:'Leg curl (sdraiato)', muscle:'Gambe', secondary:'Glutei', equipment:'Macchina', difficulty:'Principiante', tips:'Movimento lento e controllato. Isola i bicipiti femorali.' },
  { name:'Leg extension', muscle:'Gambe', secondary:'-', equipment:'Macchina', difficulty:'Principiante', tips:'Estendi completamente. Tieni la posizione 1 secondo in cima.' },
  { name:'Romanian deadlift', muscle:'Gambe', secondary:'Schiena bassa, Glutei', equipment:'Bilanciere', difficulty:'Intermedio', tips:'Schiena neutra, piega i fianchi non le ginocchia. Senti lo stretch nei femorali.' },
  { name:'Hip thrust', muscle:'Glutei', secondary:'Femorali, Core', equipment:'Bilanciere', difficulty:'Principiante', tips:'Spingi attraverso i talloni. Strizza i glutei in cima al movimento.' },
  { name:'Calf raise in piedi', muscle:'Polpacci', secondary:'-', equipment:'Macchina / Corpo libero', difficulty:'Principiante', tips:'Massima estensione in punta e massima discesa del tallone.' },
  { name:'Plank', muscle:'Core', secondary:'Spalle, Glutei', equipment:'Corpo libero', difficulty:'Principiante', tips:'Corpo in linea retta. Non alzare o abbassare i fianchi.' },
  { name:'Crunch', muscle:'Core', secondary:'-', equipment:'Corpo libero', difficulty:'Principiante', tips:"Solleva solo le scapole, non il collo. Contrai l'addome." },
  { name:'Russian twist', muscle:'Core', secondary:'Obliqui', equipment:'Corpo libero / Peso', difficulty:'Principiante', tips:'Piedi sollevati da terra per maggiore difficoltà.' },
  { name:'Leg raise', muscle:'Core', secondary:'Flessori anca', equipment:'Corpo libero', difficulty:'Principiante', tips:'Schiena ben aderente al suolo. Controlla la discesa.' },
  { name:'Ab wheel rollout', muscle:'Core', secondary:'Dorsali, Spalle', equipment:'Ruota addominali', difficulty:'Avanzato', tips:'Inizia con range ridotto. Mantieni il core contratto per tutto il movimento.' },
  { name:'Pallof press', muscle:'Core', secondary:'Obliqui, Spalle', equipment:'Cavi', difficulty:'Principiante', tips:'Resisti alla rotazione. Più sei lontano dal cavo, più è difficile.' },

  // --- PETTO aggiuntivi ---
  { name:'Panca declinata (bilanciere)', muscle:'Petto', secondary:'Tricipiti', equipment:'Bilanciere', difficulty:'Intermedio', tips:'Inclinazione negativa 15-30°. Colpisce la parte bassa del petto. Attento al collo.' },
  { name:'Pullover con manubrio', muscle:'Petto', secondary:'Schiena, Tricipiti', equipment:'Manubri', difficulty:'Intermedio', tips:'Tieni i gomiti leggermente flessi. Allunga bene nella fase di discesa.' },
  { name:'Chest press (macchina)', muscle:'Petto', secondary:'Tricipiti, Deltoidi', equipment:'Macchina', difficulty:'Principiante', tips:'Ottimo per isolare il petto in sicurezza. Regola il sedile ad altezza petto.' },

  // --- SCHIENA aggiuntivi ---
  { name:'Trazioni (Chin-up)', muscle:'Schiena', secondary:'Bicipiti', equipment:'Sbarra', difficulty:'Intermedio', tips:'Presa supina (palme verso di te). Coinvolge più i bicipiti rispetto al pull-up.' },
  { name:'T-bar row', muscle:'Schiena', secondary:'Bicipiti, Trapezio', equipment:'Bilanciere', difficulty:'Intermedio', tips:'Mantieni la schiena parallela al suolo. Stringi le scapole a fine movimento.' },
  { name:'Shrug (alzate spalle)', muscle:'Schiena', secondary:'Trapezio', equipment:'Manubri', difficulty:'Principiante', tips:'Alza le spalle verso le orecchie. Non ruotare. Mantieni il collo neutro.' },
  { name:'Iperextension (schiena)', muscle:'Schiena', secondary:'Glutei, Bicipiti femorali', equipment:'Panca apposita', difficulty:'Principiante', tips:'Non iperestendere la schiena in cima. Ottimo per il rinforzo lombare.' },
  { name:'Lat machine presa stretta', muscle:'Schiena', secondary:'Bicipiti', equipment:'Macchina', difficulty:'Principiante', tips:'Presa neutra ravvicinata. Tira verso il mento, gomiti lungo i fianchi.' },

  // --- SPALLE aggiuntivi ---
  { name:'Upright row', muscle:'Spalle', secondary:'Trapezio, Bicipiti', equipment:'Bilanciere', difficulty:'Intermedio', tips:'Tira verso il mento con i gomiti alti. Attenzione: può stressare la cuffia dei rotatori.' },
  { name:'Face pull con corda', muscle:'Spalle', secondary:'Romboidi, Rotatori', equipment:'Cavi', difficulty:'Principiante', tips:'Usa la corda, tira verso il viso aprendo i gomiti. Fondamentale per la salute delle spalle.' },
  { name:'Military press (in piedi)', muscle:'Spalle', secondary:'Tricipiti, Core', equipment:'Bilanciere', difficulty:'Avanzato', tips:'Spingi il bilanciere in linea retta sopra la testa. Attiva il core per proteggere la schiena.' },

  // --- BICIPITI aggiuntivi ---
  { name:'Curl su panca inclinata', muscle:'Bicipiti', secondary:'Avambracci', equipment:'Manubri', difficulty:'Intermedio', tips:'La posizione inclinata allunga il bicipite prima della contrazione. Massimo stretch.' },
  { name:'Curl EZ-bar', muscle:'Bicipiti', secondary:'Avambracci', equipment:'Bilanciere EZ', difficulty:'Principiante', tips:'La presa semi-prona riduce lo stress sui polsi rispetto al bilanciere dritto.' },
  { name:'Curl cavi alti (cable curl)', muscle:'Bicipiti', secondary:'Deltoidi anteriori', equipment:'Cavi', difficulty:'Principiante', tips:'Tieni i gomiti fissi ad altezza spalle. Tensione costante sul picco del bicipite.' },

  // --- TRICIPITI aggiuntivi ---
  { name:'Tricep pushdown (corda)', muscle:'Tricipiti', secondary:'-', equipment:'Cavi', difficulty:'Principiante', tips:'Usa la corda per aprire le mani in basso. Gomiti fissi ai fianchi, massima contrazione.' },
  { name:'Close grip bench press', muscle:'Tricipiti', secondary:'Petto, Deltoidi', equipment:'Bilanciere', difficulty:'Intermedio', tips:'Presa stretta (circa spalle). Abbassa il bilanciere sul basso petto, gomiti vicini al corpo.' },

  // --- GAMBE aggiuntivi ---
  { name:'Squat goblet', muscle:'Gambe', secondary:'Glutei, Core', equipment:'Manubri', difficulty:'Principiante', tips:'Tieni il manubrio al petto. Ottimo per imparare la meccanica dello squat.' },
  { name:'Hack squat (macchina)', muscle:'Gambe', secondary:'Glutei', equipment:'Macchina', difficulty:'Intermedio', tips:'Piedi posizionati in alto per più glutei, in basso per più quadricipiti.' },
  { name:'Bulgarian split squat', muscle:'Gambe', secondary:'Glutei, Core', equipment:'Manubri', difficulty:'Avanzato', tips:'Piede posteriore su una panca. Scendi in verticale, non in avanti. Ottimo per il monopodalico.' },
  { name:'Stacco sumo', muscle:'Gambe', secondary:'Glutei, Schiena, Ischiocrurali', equipment:'Bilanciere', difficulty:'Avanzato', tips:'Piedi larghi e punte verso fuori. Coinvolge di più i glutei e gli adduttori rispetto al classico.' },
  { name:'Leg press (piedi alti)', muscle:'Gambe', secondary:'Glutei', equipment:'Macchina', difficulty:'Principiante', tips:'Piedi nella parte alta della pedana per enfatizzare glutei e bicipiti femorali.' },
  { name:'Calf raise seduto', muscle:'Polpacci', secondary:'-', equipment:'Macchina', difficulty:'Principiante', tips:'Colpisce il soleo più del gastrocnemio. Ginocchia a 90°, range of motion completo.' },
  { name:'Adductor machine', muscle:'Gambe', secondary:'Adduttori', equipment:'Macchina', difficulty:'Principiante', tips:'Movimento lento e controllato. Ottimo per la stabilità dell\'anca.' },
  { name:'Abductor machine', muscle:'Gambe', secondary:'Glutei medi', equipment:'Macchina', difficulty:'Principiante', tips:'Allena i glutei medi, fondamentali per la stabilità del ginocchio.' },

  // --- GLUTEI aggiuntivi ---
  { name:'Hip thrust (manubrio)', muscle:'Glutei', secondary:'Ischiocrurali', equipment:'Manubri', difficulty:'Principiante', tips:'Spalle sulla panca, manubrio sull\'anca. Spingi verso il soffitto contraendo i glutei.' },
  { name:'Glute kickback (cavo)', muscle:'Glutei', secondary:'Ischiocrurali', equipment:'Cavi', difficulty:'Principiante', tips:'Ancora il cavo alla caviglia. Calcia indietro mantenendo il core stabile.' },
  { name:'Sumo squat (manubrio)', muscle:'Glutei', secondary:'Adduttori, Quadricipiti', equipment:'Manubri', difficulty:'Principiante', tips:'Piedi larghi, punte aperte. Tieni il manubrio verticale tra le gambe.' },

  // --- CORE aggiuntivi ---
  { name:'Crunch inverso', muscle:'Core', secondary:'-', equipment:'Corpo libero', difficulty:'Principiante', tips:'Porta le ginocchia verso il petto sollevando il bacino. Evita slanci.' },
  { name:'Mountain climber', muscle:'Core', secondary:'Spalle, Gambe', equipment:'Corpo libero', difficulty:'Principiante', tips:'Mantieni i fianchi bassi e il core attivo. Alterna rapidamente le gambe.' },
  { name:'Hollow body hold', muscle:'Core', secondary:'Spalle', equipment:'Corpo libero', difficulty:'Intermedio', tips:'Schiena piatta a terra, gambe e spalle sollevate. Tieni la posizione statica.' },
  { name:'Cable crunch', muscle:'Core', secondary:'-', equipment:'Cavi', difficulty:'Principiante', tips:'Inchinati verso il pavimento contraendo gli addominali, non piegando i fianchi.' },
  { name:'Side plank', muscle:'Core', secondary:'Glutei medi', equipment:'Corpo libero', difficulty:'Principiante', tips:'Corpo in linea retta di lato. Tieni i fianchi sollevati per tutto il tempo.' },
];

let MUSCLE_GROUPS = [...new Set(EXERCISE_DB.map(function(e){return e.muscle;}))];

// Carica esercizi personalizzati da localStorage
(function() {
  try {
    const customs = JSON.parse(localStorage.getItem('gymCustomExercises') || '[]');
    customs.forEach(function(ex) {
      if (!EXERCISE_DB.find(function(e){ return e.name === ex.name; })) {
        EXERCISE_DB.push(ex);
      }
    });
    MUSCLE_GROUPS.length = 0;
    [...new Set(EXERCISE_DB.map(function(e){ return e.muscle; }))].forEach(function(m){ MUSCLE_GROUPS.push(m); });
  } catch(e) {}
})();



function showExerciseInfo(btn) {
  const name = btn.getAttribute('data-exname');
  const ex = EXERCISE_DB.find(function(e){ return e.name === name; });
  if (!ex) return;
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.75);z-index:9998;display:flex;align-items:center;justify-content:center;padding:20px;';
  const box = document.createElement('div');
  box.style.cssText = 'background:#1a1a2e;border:1px solid rgba(255,255,255,0.12);border-radius:18px;padding:22px;max-width:360px;width:100%;';
  box.innerHTML =
    '<div style="font-size:1rem;font-weight:800;color:#fff;margin-bottom:4px;">' + ex.name + '</div>' +
    '<div style="font-size:0.72rem;color:var(--accent);font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:14px;">' + ex.muscle + (ex.secondary && ex.secondary !== '-' ? ' · ' + ex.secondary : '') + '</div>' +
    '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px;">' +
      '<span style="background:rgba(255,255,255,0.06);border-radius:8px;padding:4px 10px;font-size:0.72rem;color:#aaa;">🏋️ ' + ex.equipment + '</span>' +
      '<span style="background:rgba(255,255,255,0.06);border-radius:8px;padding:4px 10px;font-size:0.72rem;color:#aaa;">📊 ' + ex.difficulty + '</span>' +
    '</div>' +
    (ex.tips ? '<div style="font-size:0.8rem;color:#ccc;line-height:1.5;border-top:1px solid rgba(255,255,255,0.06);padding-top:12px;">' + ex.tips + '</div>' : '');
  const closeBtn = document.createElement('button');
  closeBtn.textContent = 'Chiudi';
  closeBtn.style.cssText = 'margin-top:16px;width:100%;background:rgba(255,255,255,0.06);color:#aaa;border:1px solid rgba(255,255,255,0.1);border-radius:10px;padding:10px;font-size:0.78rem;font-weight:700;';
  closeBtn.onclick = function() { overlay.remove(); };
  box.appendChild(closeBtn);
  overlay.appendChild(box);
  overlay.onclick = function(e){ if(e.target === overlay) overlay.remove(); };
  document.body.appendChild(overlay);
}

function showExerciseDB() {
  window.scrollTo(0,0);
  const main = document.getElementById('mainContent');
  main.innerHTML = '';
  const backBtn = document.createElement('button'); backBtn.className = 'btn-back'; backBtn.textContent = '← Indietro'; backBtn.onclick = showSettings; main.appendChild(backBtn);
  const title = document.createElement('h2'); title.textContent = 'Database Esercizi'; main.appendChild(title);

  const filterDiv = document.createElement('div'); filterDiv.className = 'filter-bar'; filterDiv.style.marginBottom = '12px';
  let opts = '<option value="all">Tutti i muscoli</option>';
  MUSCLE_GROUPS.forEach(function(m){ opts += '<option value="'+m+'">'+m+'</option>'; });
  filterDiv.innerHTML = '<label>Muscolo</label><select id="dbMuscleFilter">'+opts+'</select>';
  main.appendChild(filterDiv);

  const searchWrap = document.createElement('div'); searchWrap.style.marginBottom = '16px';
  searchWrap.innerHTML = '<input type="text" id="dbSearch" placeholder="🔍 Cerca esercizio..." style="width:100%">';
  main.appendChild(searchWrap);

  const listDiv = document.createElement('div'); listDiv.id = 'dbList'; main.appendChild(listDiv);

  const muscleColors = {'Petto':'#e63946','Schiena':'#4361ee','Spalle':'#f39c12','Bicipiti':'#2ecc71','Tricipiti':'#9b59b6','Gambe':'#4cc9f0','Glutei':'#e67e22','Polpacci':'#1abc9c','Core':'#e91e8c'};
  const diffColors = {'principiante':'#2ecc71','intermedio':'#f39c12','avanzato':'#e63946'};

  function renderDB() {
    const filter = document.getElementById('dbMuscleFilter').value;
    const search = document.getElementById('dbSearch').value.toLowerCase().trim();
    const filtered = EXERCISE_DB.filter(function(e){
      return (filter === 'all' || e.muscle === filter) &&
             (!search || e.name.toLowerCase().includes(search) || e.muscle.toLowerCase().includes(search) || e.equipment.toLowerCase().includes(search));
    });
    listDiv.innerHTML = '';
    if(filtered.length === 0){ listDiv.innerHTML = '<p>Nessun esercizio trovato.</p>'; return; }
    const frag = document.createDocumentFragment();
    filtered.forEach(function(ex) {
      const color = muscleColors[ex.muscle] || '#888';
      const diffColor = diffColors[ex.difficulty.toLowerCase()] || '#888';
      const card = document.createElement('div'); card.className = 'exercise-card';
      card.style.borderLeft = '3px solid ' + color;
      card.style.marginBottom = '10px';
      const nameEl = document.createElement('strong'); nameEl.textContent = ex.name; card.appendChild(nameEl);
      const metaDiv = document.createElement('div'); metaDiv.className = 'ex-meta-row'; metaDiv.style.marginBottom = '6px';
      metaDiv.innerHTML =
        '<span class="pr-badge" style="color:'+color+';background:'+color+'18;border-color:'+color+'33">'+ex.muscle+'</span>' +
        '<span class="orm-badge" style="color:#888;background:rgba(255,255,255,0.04);border-color:rgba(255,255,255,0.1)">'+ex.equipment+'</span>' +
        '<span class="pr-badge" style="color:'+diffColor+';background:'+diffColor+'18;border-color:'+diffColor+'33">'+ex.difficulty+'</span>';
      card.appendChild(metaDiv);
      if(ex.secondary && ex.secondary !== '-') {
        const sec = document.createElement('div'); sec.style.cssText = 'font-size:0.72rem;color:#444;margin-bottom:6px;';
        sec.textContent = 'Secondari: ' + ex.secondary; card.appendChild(sec);
      }
      const tips = document.createElement('div'); tips.style.cssText = 'font-size:0.76rem;color:#555;font-style:italic;margin-bottom:10px;line-height:1.5;';
      tips.textContent = '💡 ' + ex.tips; card.appendChild(tips);
      const addBtn = document.createElement('button');
      addBtn.style.cssText = 'background:rgba(46,204,113,0.08);color:#2ecc71;border:1px solid rgba(46,204,113,0.2);border-radius:10px;padding:6px 14px;font-size:0.72rem;font-weight:700;';
      addBtn.textContent = '+ Aggiungi a scheda';
      addBtn.onclick = (function(name){ return function(){ showAddToDay(name); }; })(ex.name);
      card.appendChild(addBtn);
      frag.appendChild(card);
    });
    listDiv.appendChild(frag);
  }

  document.getElementById('dbMuscleFilter').onchange = renderDB;
  document.getElementById('dbSearch').oninput = renderDB;
  renderDB();

  // Bottone aggiungi esercizio custom
  const addCustomBtn = document.createElement('button');
  addCustomBtn.style.cssText = 'margin-top:16px;width:100%;background:rgba(46,204,113,0.08);color:#2ecc71;border:1px solid rgba(46,204,113,0.2);border-radius:12px;padding:10px;font-size:0.78rem;font-weight:700;';
  addCustomBtn.textContent = '+ Aggiungi esercizio personalizzato';
  addCustomBtn.onclick = function() {
    addCustomBtn.style.display = 'none';
    customForm.style.display = 'flex';
  };
  main.appendChild(addCustomBtn);

  // Form aggiunta esercizio custom
  const customForm = document.createElement('div');
  customForm.className = 'card form-card';
  customForm.style.cssText = 'display:none;margin-top:12px;';
  const muscleOptions = MUSCLE_GROUPS.map(function(m){ return '<option value="'+m+'">'+m+'</option>'; }).join('');
  customForm.innerHTML =
    '<div style="font-size:0.78rem;font-weight:700;color:#2ecc71;margin-bottom:8px;">✏️ Nuovo esercizio</div>' +
    '<label>Nome</label><input type="text" id="customExName" placeholder="es. Curl manubri"><br>' +
    '<label>Muscolo principale</label>' +
    '<select id="customExMuscle" style="width:100%;margin-bottom:6px;">'+muscleOptions+'</select>' +
    '<label>Muscoli secondari (opzionale)</label><input type="text" id="customExSecondary" placeholder="es. Avambracci"><br>' +
    '<label>Attrezzatura</label><input type="text" id="customExEquip" placeholder="es. Manubri"><br>' +
    '<label>Difficoltà</label>' +
    '<select id="customExDiff" style="width:100%;margin-bottom:6px;"><option>Principiante</option><option>Intermedio</option><option>Avanzato</option></select>' +
    '<label>Consiglio tecnico (opzionale)</label><input type="text" id="customExTips" placeholder="es. Tieni i gomiti fermi">';

  const formBtns = document.createElement('div');
  formBtns.style.cssText = 'display:flex;gap:8px;margin-top:10px;width:100%;';
  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = 'Annulla';
  cancelBtn.style.cssText = 'flex:1;';
  cancelBtn.onclick = function() { customForm.style.display = 'none'; addCustomBtn.style.display = 'block'; };

  const saveCustomBtn = document.createElement('button');
  saveCustomBtn.textContent = 'Salva';
  saveCustomBtn.style.cssText = 'flex:1;background:rgba(46,204,113,0.12);color:#2ecc71;border-color:rgba(46,204,113,0.3);';
  saveCustomBtn.onclick = function() {
    const name = document.getElementById('customExName').value.trim();
    if (!name) { showToast('Inserisci un nome.', 'error'); return; }
    const newEx = {
      name: name,
      muscle: document.getElementById('customExMuscle').value,
      secondary: document.getElementById('customExSecondary').value.trim() || '-',
      equipment: document.getElementById('customExEquip').value.trim() || '-',
      difficulty: document.getElementById('customExDiff').value,
      tips: document.getElementById('customExTips').value.trim() || '',
      custom: true
    };
    EXERCISE_DB.push(newEx);
    MUSCLE_GROUPS.length = 0;
    [...new Set(EXERCISE_DB.map(function(e){ return e.muscle; }))].forEach(function(m){ MUSCLE_GROUPS.push(m); });
    // Salva custom in localStorage
    const customs = EXERCISE_DB.filter(function(e){ return e.custom; });
    localStorage.setItem('gymCustomExercises', JSON.stringify(customs));
    showToast('Esercizio aggiunto!');
    customForm.style.display = 'none';
    addCustomBtn.style.display = 'block';
    renderDB();
  };

  formBtns.appendChild(cancelBtn);
  formBtns.appendChild(saveCustomBtn);
  customForm.appendChild(formBtns);
  main.appendChild(customForm);
}

function showAddToDay(exName) {
  if(!data.days || data.days.length === 0){ showToast('Crea prima una scheda!','error'); return; }
  showModal({
    title: '+ Aggiungi a scheda',
    message: '"' + exName + '" — scegli la scheda di destinazione',
    inputs: [
      {id:'dbSets',   label:'Serie',       type:'number', value: data.settings.defaultSets||3,  min:1},
      {id:'dbReps',   label:'Ripetizioni', type:'number', value: data.settings.defaultReps||10, min:1},
      {id:'dbWeight', label:'Peso (kg)',   type:'number', value: 0, min:0, step:0.5},
      {id:'dbDay',    label:'Scheda (numero, 1-'+data.days.length+')', type:'number', value:1, min:1, step:1},
    ],
    buttons: [{label:'Annulla',cls:'btn-modal-cancel',value:'cancel'},{label:'Aggiungi',cls:'btn-modal-confirm',value:'add'}],
    onClose: function(val, vals) {
      if(val === 'cancel') return;
      const dayIdx = (parseInt(vals['dbDay'])||1) - 1;
      if(dayIdx < 0 || dayIdx >= data.days.length){ showToast('Numero scheda non valido.','error'); return; }
      data.days[dayIdx].exercises.push({
        name: exName,
        sets: parseInt(vals['dbSets'])||3,
        reps: parseInt(vals['dbReps'])||10,
        weight: parseFloat(String(vals['dbWeight']).replace(',','.'))||0,
      });
      saveData();
      showToast('"'+exName+'" aggiunto a '+data.days[dayIdx].name+'!');
    }
  });
}
