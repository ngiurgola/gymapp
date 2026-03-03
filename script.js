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

  const box = document.createElement('div');
  box.className = 'modal-box';

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
}

// ======== TIMERS ========
let activeTimers = {};
let dayTimers = {};
let dayElapsed = {};

// ======== INIT ========
loadData();
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
      case 'impostazioni':showSettings(); buttons[2].classList.add('active'); break;
      case 'progressi':   showProgress(); buttons[3].classList.add('active'); break;
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
    const h3 = document.createElement('h3');
    h3.textContent = day.name;
    div.appendChild(h3);
    const btn = document.createElement('button');
    btn.textContent = 'Inizia';
    btn.onclick = function() { startDay(dayIndex); };
    div.appendChild(btn);
    main.appendChild(div);
  });
}

// ======== START DAY ========
function startDay(dayIndex) {
  const day = data.days[dayIndex];
  const main = document.getElementById('mainContent');
  main.innerHTML = '';

  const backBtn = document.createElement('button');
  backBtn.className = 'btn-back';
  backBtn.textContent = '← Indietro';
  backBtn.onclick = showWorkout;
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

    let inner = '<strong>' + ex.name + '</strong>' + weightHistory +
      '<div class="weight-row">Peso <input type="number" id="weight_' + dayIndex + '_' + exIndex + '" value="' + (ex.weight||0) + '" oninput="updateWeight(' + dayIndex + ',' + exIndex + ',this.value)"> kg</div>';

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

function startTimer(dayIndex, exIndex, setIndex, totalSeconds) {
  const key = dayIndex + '_' + exIndex + '_' + setIndex;
  if (activeTimers[key]) return;
  const el = document.getElementById('timerCounter_' + key);
  if (el && el.dataset.done === 'true') return;
  let remaining = totalSeconds;
  if (el) el.classList.add('timer-running');
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
  cancelBtn.onclick = function() { startDay(dayIndex); };
  main.appendChild(cancelBtn);
}

function confirmSaveSession(entry) {
  data.progress.push(entry);
  saveData();
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
  modalConfirm('Eliminare la scheda "' + data.days[i].name + '"?', function() {
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
  title.textContent = 'Nuovo Esercizio';
  main.appendChild(title);
  const card = document.createElement('div');
  card.className = 'card form-card';
  card.innerHTML =
    '<label>Nome</label><input type="text" id="exName" placeholder="es. Panca piana"><br>' +
    '<label>Serie</label><input type="number" id="exSets" value="' + defSets + '" min="1"><br>' +
    '<label>Ripetizioni</label><input type="number" id="exReps" value="' + defReps + '" min="1"><br>' +
    '<label>Peso (kg)</label><input type="number" id="exWeight" value="0" min="0">';
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
  card.innerHTML =
    '<label>Nome</label><input type="text" id="exName" value="' + ex.name + '"><br>' +
    '<label>Serie</label><input type="number" id="exSets" value="' + ex.sets + '" min="1"><br>' +
    '<label>Ripetizioni</label><input type="number" id="exReps" value="' + ex.reps + '" min="1"><br>' +
    '<label>Peso (kg)</label><input type="number" id="exWeight" value="' + (ex.weight||0) + '" min="0">';
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
  const reps  = parseInt(document.getElementById('exReps').value) || 10;
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
function showSettings() {
  const main = document.getElementById('mainContent');
  main.innerHTML = '';

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

  // Sezione dati
  const h2data = document.createElement('h2');
  h2data.style.marginTop = '32px';
  h2data.textContent = 'Dati';
  main.appendChild(h2data);

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

  // Inserimento manuale
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
const _dayColorCache = {};
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

  // Stats
  const totalSessions = data.progress.length;
  const totalSeconds = data.progress.reduce(function(acc, p) { return acc + (p.durationSeconds||0); }, 0);
  const avgSeconds = Math.round(totalSeconds / totalSessions);
  const statsDiv = document.createElement('div');
  statsDiv.className = 'stats-bar';
  statsDiv.innerHTML =
    '<div class="stat-item"><span class="stat-value">' + totalSessions + '</span><span class="stat-label">Sessioni</span></div>' +
    '<div class="stat-item"><span class="stat-value">' + formatTime(avgSeconds) + '</span><span class="stat-label">Media</span></div>' +
    '<div class="stat-item"><span class="stat-value">' + formatTime(totalSeconds) + '</span><span class="stat-label">Tot. tempo</span></div>';
  main.appendChild(statsDiv);

  // Grafico peso
  const weightEntries = data.progress.filter(function(p) { return p.bodyWeightKg != null; });
  if (weightEntries.length >= 2) {
    const chartDiv = document.createElement('div');
    chartDiv.className = 'card weight-chart-card';
    chartDiv.innerHTML = '<h3>📈 Andamento peso corporeo</h3>' + buildWeightChart(weightEntries);
    main.appendChild(chartDiv);
  }

  // Filtro scheda
  const days = [...new Set(data.progress.map(function(p) { return p.dayName; }))];
  const filterDiv = document.createElement('div');
  filterDiv.className = 'filter-bar';
  let opts = '<option value="all">Tutte le schede</option>';
  days.forEach(function(d) { opts += '<option value="' + d + '">' + d + '</option>'; });
  filterDiv.innerHTML = '<label>Scheda:</label><select id="filterDay" onchange="renderProgressList(this.value)">' + opts + '</select>';
  main.appendChild(filterDiv);

  const listContainer = document.createElement('div');
  listContainer.className = 'progress-list';
  listContainer.id = 'progressList';
  main.appendChild(listContainer);

  renderProgressList('all');
}

function renderProgressList(filter) {
  const container = document.getElementById('progressList');
  if (!container) return;
  container.innerHTML = '';

  let filtered = data.progress.map(function(p, i) { return { p: p, i: i }; }).reverse();
  if (filter !== 'all') filtered = filtered.filter(function(obj) { return obj.p.dayName === filter; });

  if (filtered.length === 0) {
    container.innerHTML = '<p>Nessuna sessione per questo filtro.</p>';
    return;
  }

  // Raggruppa per data
  const groups = {};
  filtered.forEach(function(obj) {
    if (!groups[obj.p.date]) groups[obj.p.date] = [];
    groups[obj.p.date].push(obj);
  });

  // Fragment per performance
  const frag = document.createDocumentFragment();

  Object.keys(groups).forEach(function(dateKey) {
    const dh = document.createElement('div');
    dh.className = 'date-header';
    dh.textContent = '📅 ' + dateKey;
    frag.appendChild(dh);

    groups[dateKey].forEach(function(obj) {
      const p = obj.p;
      const i = obj.i;
      const color = getDayColor(p.dayName);
      const trend = (p.bodyWeightKg != null) ? getBodyWeightTrend(data.progress, i) : '';

      const div = document.createElement('div');
      div.className = 'card progress-card';
      div.style.borderLeft = '4px solid ' + color;

      // Header riga
      const header = document.createElement('div');
      header.className = 'progress-card-header';
      const badge = document.createElement('span');
      badge.className = 'progress-day-badge';
      badge.style.cssText = 'background:' + color + '22;color:' + color;
      badge.textContent = p.dayName;
      const delBtn = document.createElement('button');
      delBtn.className = 'btn-delete-single';
      delBtn.textContent = '🗑';
      delBtn.onclick = function() { deleteSession(i); };
      header.appendChild(badge);
      header.appendChild(delBtn);
      div.appendChild(header);

      // Dettagli
      const details = document.createElement('div');
      details.className = 'progress-details';
      details.innerHTML =
        '<span>⏱ ' + formatTime(p.durationSeconds||0) + '</span>' +
        (p.bodyWeightKg != null ? '<span>⚖️ ' + p.bodyWeightKg + ' kg ' + trend + '</span>' : '') +
        '<span>🕐 ' + p.time + '</span>';
      div.appendChild(details);

      // Dettaglio esercizi (collassabile)
      if (p.exercises && p.exercises.length > 0) {
        const exToggle = document.createElement('button');
        exToggle.className = 'btn-ex-toggle';
        exToggle.textContent = '📋 Esercizi (' + p.exercises.length + ')';
        const exList = document.createElement('div');
        exList.className = 'ex-detail-list';
        exList.style.display = 'none';
        p.exercises.forEach(function(ex) {
          const row = document.createElement('div');
          row.className = 'ex-detail-row';
          row.textContent = ex.name + ' — ' + ex.sets + ' × ' + ex.reps + (ex.weight ? ' @ ' + ex.weight + ' kg' : '');
          exList.appendChild(row);
        });
        exToggle.onclick = function() {
          const open = exList.style.display !== 'none';
          exList.style.display = open ? 'none' : 'block';
          exToggle.textContent = (open ? '📋' : '📂') + ' Esercizi (' + p.exercises.length + ')';
        };
        div.appendChild(exToggle);
        div.appendChild(exList);
      }

      if (p.note) {
        const noteDiv = document.createElement('div');
        noteDiv.className = 'progress-note';
        noteDiv.textContent = '💬 ' + p.note;
        div.appendChild(noteDiv);
      }

      frag.appendChild(div);
    });
  });

  container.appendChild(frag);
}

function deleteSession(i) {
  modalConfirm('Eliminare questa sessione?', function() {
    data.progress.splice(i, 1);
    saveData();
    showToast('Sessione eliminata.', 'error');
    showProgress();
  });
}
