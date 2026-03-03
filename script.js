
// ======== SERVICE WORKER ========
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function() {
    navigator.serviceWorker.register('/gymapp/sw.js').catch(function(e) {
      console.log('SW registration failed:', e);
    });
  });
}

// ======== DATI ========
let data = { settings: { restTime: 90, lastSetTime: 60, defaultSets: 3, defaultReps: 10 }, days: [], progress: [] };

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
      data.progress.forEach(function(p) {
        if (p.weightKg !== undefined && p.bodyWeightKg === undefined) {
          p.bodyWeightKg = p.weightKg; delete p.weightKg;
        }
      });
      saveData();
    } catch(e) {
      data = { settings: { restTime: 90, lastSetTime: 60, defaultSets: 3, defaultReps: 10 }, days: [], progress: [] };
      saveData();
    }
  }
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
  if (hasActiveTimers()) {
    if (!confirm('Hai dei timer attivi. Vuoi cambiare scheda lo stesso?')) return;
    Object.keys(activeTimers).forEach(function(k) { clearInterval(activeTimers[k]); delete activeTimers[k]; });
    Object.keys(dayTimers).forEach(function(k) { clearInterval(dayTimers[k]); delete dayTimers[k]; });
  }
  const buttons = document.querySelectorAll('.navbar button');
  buttons.forEach(function(btn) { btn.classList.remove('active'); });
  switch(tab) {
    case 'allenamento': showWorkout(); buttons[0].classList.add('active'); break;
    case 'giorni':      showManageDays(); buttons[1].classList.add('active'); break;
    case 'impostazioni':showSettings(); buttons[2].classList.add('active'); break;
    case 'progressi':   showProgress(); buttons[3].classList.add('active'); break;
  }
}

// ======== WORKOUT VIEW ========
function showWorkout() {
  const main = document.getElementById('mainContent');

  // Streak
  let streak = 0;
  if (data.progress && data.progress.length > 0) {
    const today = new Date(); today.setHours(0,0,0,0);
    const dates = [...new Set(data.progress.map(function(p) {
      const parts = p.date.split('/');
      return new Date(parts[2]+'-'+parts[1]+'-'+parts[0]).getTime();
    }))].sort(function(a,b){return b-a;});
    let check = new Date(today);
    for (let d = 0; d < dates.length; d++) {
      if (dates[d] === check.getTime()) { streak++; check.setDate(check.getDate()-1); }
      else if (d === 0 && dates[0] < today.getTime()) break;
      else break;
    }
  }
  const streakHTML = streak > 0
    ? '<div class="streak-badge">🔥 ' + streak + ' giorno' + (streak > 1 ? 'i' : '') + ' di fila!</div>'
    : '';

  main.innerHTML = '<h2>Allenamento</h2>' + streakHTML;

  if (!data.days || data.days.length === 0) {
    const empty = document.createElement('p');
    empty.textContent = 'Nessun giorno creato. Vai in Gestione Giorni/Esercizi.';
    main.appendChild(empty);
    return;
  }

  data.days.forEach(function(day, dayIndex) {
    const div = document.createElement('div');
    div.className = 'card';
    div.innerHTML = '<h3>' + day.name + '</h3>';
    const btn = document.createElement('button');
    btn.textContent = '▶ Inizia';
    btn.onclick = function() { startDay(dayIndex); };
    div.appendChild(btn);
    main.appendChild(div);
  });
}

// ======== START DAY ========
function startDay(dayIndex) {
  const day = data.days[dayIndex];
  const main = document.getElementById('mainContent');
  main.innerHTML = '<button class="btn-back" onclick="showWorkout()">← Indietro</button><h2>' + day.name + '</h2>';

  if (!day.exercises || day.exercises.length === 0) {
    const empty = document.createElement('p');
    empty.textContent = 'Nessun esercizio per questo giorno.';
    main.appendChild(empty);
    const addExBtn = document.createElement('button');
    addExBtn.textContent = '➕ Aggiungi esercizio';
    addExBtn.onclick = function() { addExercise(dayIndex); };
    main.appendChild(addExBtn);
    return;
  }

  // Timer generale giorno
  const timerDiv = document.createElement('div');
  timerDiv.className = 'day-general-timer';
  timerDiv.innerHTML =
    '<label>⏱ Durata allenamento</label>' +
    '<span id="dayTimer_' + dayIndex + '">0:00</span>' +
    '<button onclick="startDayTimer(' + dayIndex + ')">▶ Start</button>' +
    '<button onclick="stopDayTimer(' + dayIndex + ')">⏹ Stop</button>' +
    '<button onclick="resetDayTimer(' + dayIndex + ')">↺ Reset</button>';
  main.appendChild(timerDiv);
  dayElapsed[dayIndex] = 0;

  // Griglia esercizi 2 colonne
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
        .map(function(p) { return p.date + ': ' + p.bodyWeightKg + ' kg'; });
      if (history.length > 0) {
        weightHistory = '<div class="weight-history">⚖️ ' + history.join(' | ') + '</div>';
      }
    }

    let inner = '<strong>' + ex.name + '</strong>' + weightHistory +
      '<div class="weight-row">Peso: <input type="number" id="weight_' + dayIndex + '_' + exIndex + '" value="' + (ex.weight || 0) + '" ' +
      'oninput="updateWeight(' + dayIndex + ', ' + exIndex + ', this.value)"> kg</div>';

    for (let s = 0; s < ex.sets; s++) {
      const isLast = (s === ex.sets - 1);
      const restTime = isLast ? data.settings.lastSetTime : data.settings.restTime;
      inner +=
        '<div class="counter-card">' +
        '<label>S' + (s+1) + '</label>' +
        '<span id="timerCounter_' + dayIndex + '_' + exIndex + '_' + s + '">' + formatTime(restTime) + '</span>' +
        '<button onclick="startTimer(' + dayIndex + ',' + exIndex + ',' + s + ',' + restTime + ')">▶</button>' +
        '<button onclick="stopTimer(\'' + dayIndex + '_' + exIndex + '_' + s + '\')">⏹</button>' +
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
  el.classList.add('timer-running');
  activeTimers[key] = setInterval(function() {
    remaining--;
    if (el) el.textContent = formatTime(remaining);
    if (remaining <= 0) {
      clearInterval(activeTimers[key]);
      delete activeTimers[key];
      if (el) {
        el.textContent = '✅';
        el.classList.remove('timer-running');
        el.dataset.done = 'true';
      }
      playBeep();
      if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
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
  dayTimers[dayIndex] = setInterval(function() {
    dayElapsed[dayIndex] = (dayElapsed[dayIndex] || 0) + 1;
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

  const weightStr = prompt('Peso corporeo oggi (kg):', '');
  if (weightStr === null) return;
  const weight = parseFloat(weightStr.replace(',', '.'));
  if (weightStr.trim() !== '' && isNaN(weight)) {
    showToast('❌ Peso non valido.', 'error'); return;
  }
  const bodyWeight = weightStr.trim() === '' ? null : weight;
  const noteInput = prompt('Nota opzionale (lascia vuoto per saltare):', '');
  const note = (noteInput !== null) ? noteInput.trim() : '';

  const now = new Date();
  const entry = {
    date: now.toLocaleDateString('it-IT'),
    time: now.toLocaleTimeString('it-IT'),
    dayName: day.name,
    durationSeconds: duration,
    bodyWeightKg: bodyWeight,
    note: note
  };
  showSessionSummary(entry, day, dayIndex);
}

function showSessionSummary(entry, day, dayIndex) {
  const main = document.getElementById('mainContent');
  const mins = Math.floor(entry.durationSeconds / 60);
  const secs = entry.durationSeconds % 60;

  let exHTML = '';
  if (day.exercises && day.exercises.length > 0) {
    day.exercises.forEach(function(ex) {
      exHTML += '<div class="summary-exercise"><span>' + ex.name + '</span>' +
        '<span>' + ex.sets + ' serie' + (ex.weight ? ' · ' + ex.weight + ' kg' : '') + '</span></div>';
    });
  }

  const entryJSON = encodeURIComponent(JSON.stringify(entry));

  main.innerHTML =
    '<div class="session-summary">' +
      '<div class="summary-icon">🏆</div>' +
      '<h2>Allenamento completato!</h2>' +
      '<div class="summary-card">' +
        '<div class="summary-row"><span>📅 Data</span><span>' + entry.date + ' ' + entry.time + '</span></div>' +
        '<div class="summary-row"><span>💪 Scheda</span><span>' + entry.dayName + '</span></div>' +
        '<div class="summary-row"><span>⏱ Durata</span><span>' + mins + 'm ' + secs + 's</span></div>' +
        '<div class="summary-row"><span>⚖️ Peso</span><span>' + (entry.bodyWeightKg != null ? entry.bodyWeightKg + ' kg' : '—') + '</span></div>' +
        (entry.note ? '<div class="summary-row"><span>📝 Nota</span><span>' + entry.note + '</span></div>' : '') +
      '</div>' +
      '<div class="summary-exercises">' + exHTML + '</div>' +
      '<button class="btn-confirm-save" onclick="confirmSaveSession(decodeURIComponent(\'' + entryJSON + '\'))">✅ Salva sessione</button>' +
    '</div>';

  main.querySelector('.btn-confirm-save').insertAdjacentHTML('afterend',
    '<button class="btn-back" onclick="" style="margin-top:12px;display:block">✖ Annulla</button>');
  main.querySelectorAll('.btn-back')[0].onclick = function() { startDay(dayIndex); };
}

function confirmSaveSession(entryStr) {
  const entry = JSON.parse(entryStr);
  data.progress.push(entry);
  saveData();
  showToast('✅ Sessione salvata!');
  showWorkout();
}

// ======== GESTIONE GIORNI ========
function showManageDays() {
  const main = document.getElementById('mainContent');
  main.innerHTML = '<h2>Gestione Giorni</h2>';

  const addBtn = document.createElement('button');
  addBtn.textContent = '➕ Aggiungi scheda';
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
    div.innerHTML = '<h3>' + day.name + '</h3>' +
      '<span style="font-size:0.78rem;color:#555">' + (day.exercises ? day.exercises.length : 0) + ' esercizi</span>';

    const btnEdit = document.createElement('button');
    btnEdit.textContent = '✏️ Modifica';
    btnEdit.onclick = function() { editDay(i); };

    const btnDel = document.createElement('button');
    btnDel.textContent = '🗑 Elimina';
    btnDel.onclick = function() { deleteDay(i); };

    const btnDup = document.createElement('button');
    btnDup.textContent = '📋 Duplica';
    btnDup.onclick = function() { duplicateDay(i); };

    const btnEx = document.createElement('button');
    btnEx.textContent = '💪 Esercizi';
    btnEx.onclick = function() { manageExercises(i); };

    div.appendChild(btnEdit);
    div.appendChild(btnDel);
    div.appendChild(btnDup);
    div.appendChild(btnEx);
    main.appendChild(div);
  });
}

function showAddDay() {
  const main = document.getElementById('mainContent');
  main.innerHTML =
    '<button class="btn-back" onclick="showManageDays()">← Indietro</button>' +
    '<h2>Nuova Scheda</h2>' +
    '<div class="card form-card"><label>Nome scheda</label>' +
    '<input type="text" id="newDayName" placeholder="es. Giorno A - Petto"></div>' +
    '<button onclick="saveNewDay()">💾 Salva</button>';
}

function saveNewDay() {
  const name = document.getElementById('newDayName').value.trim();
  if (!name) { showToast('❌ Inserisci un nome.', 'error'); return; }
  data.days.push({ name: name, exercises: [] });
  saveData();
  showToast('✅ Scheda creata!');
  showManageDays();
}

function editDay(i) {
  const main = document.getElementById('mainContent');
  main.innerHTML =
    '<button class="btn-back" onclick="showManageDays()">← Indietro</button>' +
    '<h2>Modifica Scheda</h2>' +
    '<div class="card form-card"><label>Nome scheda</label>' +
    '<input type="text" id="editDayName" value="' + data.days[i].name + '"></div>' +
    '<button onclick="saveEditDay(' + i + ')">💾 Salva</button>';
}

function saveEditDay(i) {
  const name = document.getElementById('editDayName').value.trim();
  if (!name) { showToast('❌ Inserisci un nome.', 'error'); return; }
  data.days[i].name = name;
  saveData();
  showToast('✅ Scheda aggiornata!');
  showManageDays();
}

function deleteDay(i) {
  if (!confirm('Eliminare la scheda "' + data.days[i].name + '"?')) return;
  data.days.splice(i, 1);
  saveData();
  showToast('🗑 Scheda eliminata.', 'error');
  showManageDays();
}

function duplicateDay(i) {
  const copy = JSON.parse(JSON.stringify(data.days[i]));
  copy.name = copy.name + ' (copia)';
  data.days.push(copy);
  saveData();
  showToast('📋 Scheda duplicata!');
  showManageDays();
}

// ======== GESTIONE ESERCIZI ========
function manageExercises(dayIndex) {
  const day = data.days[dayIndex];
  const main = document.getElementById('mainContent');
  main.innerHTML =
    '<button class="btn-back" onclick="showManageDays()">← Indietro</button>' +
    '<h2>' + day.name + '</h2>';

  const addBtn = document.createElement('button');
  addBtn.textContent = '➕ Aggiungi esercizio';
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
    div.innerHTML =
      '<strong>' + ex.name + '</strong>' +
      '<span style="font-size:0.82rem;color:#7070a0">' + ex.sets + ' serie · ' + ex.reps + ' rip · ' + (ex.weight || 0) + ' kg</span>';

    const btnUp = document.createElement('button');
    btnUp.textContent = '↑';
    btnUp.title = 'Sposta su';
    btnUp.disabled = exIndex === 0;
    btnUp.onclick = function() { moveExercise(dayIndex, exIndex, -1); };

    const btnDown = document.createElement('button');
    btnDown.textContent = '↓';
    btnDown.title = 'Sposta giù';
    btnDown.disabled = exIndex === day.exercises.length - 1;
    btnDown.onclick = function() { moveExercise(dayIndex, exIndex, 1); };

    const btnEdit = document.createElement('button');
    btnEdit.textContent = '✏️ Modifica';
    btnEdit.onclick = function() { editExercise(dayIndex, exIndex); };

    const btnDel = document.createElement('button');
    btnDel.textContent = '🗑 Elimina';
    btnDel.onclick = function() { deleteExercise(dayIndex, exIndex); };

    div.appendChild(btnUp);
    div.appendChild(btnDown);
    div.appendChild(btnEdit);
    div.appendChild(btnDel);
    main.appendChild(div);
  });
}

function addExercise(dayIndex) {
  const main = document.getElementById('mainContent');
  const defSets = data.settings.defaultSets || 3;
  const defReps = data.settings.defaultReps || 10;
  main.innerHTML =
    '<button class="btn-back" onclick="manageExercises(' + dayIndex + ')">← Indietro</button>' +
    '<h2>Nuovo Esercizio</h2>' +
    '<div class="card form-card">' +
    '<label>Nome</label><input type="text" id="exName" placeholder="es. Panca piana"><br>' +
    '<label>Serie</label><input type="number" id="exSets" value="' + defSets + '" min="1"><br>' +
    '<label>Ripetizioni</label><input type="number" id="exReps" value="' + defReps + '" min="1"><br>' +
    '<label>Peso (kg)</label><input type="number" id="exWeight" value="0" min="0">' +
    '</div>' +
    '<button onclick="saveExercise(' + dayIndex + ', -1)">💾 Salva</button>';
}

function editExercise(dayIndex, exIndex) {
  const ex = data.days[dayIndex].exercises[exIndex];
  const main = document.getElementById('mainContent');
  main.innerHTML =
    '<button class="btn-back" onclick="manageExercises(' + dayIndex + ')">← Indietro</button>' +
    '<h2>Modifica Esercizio</h2>' +
    '<div class="card form-card">' +
    '<label>Nome</label><input type="text" id="exName" value="' + ex.name + '"><br>' +
    '<label>Serie</label><input type="number" id="exSets" value="' + ex.sets + '" min="1"><br>' +
    '<label>Ripetizioni</label><input type="number" id="exReps" value="' + ex.reps + '" min="1"><br>' +
    '<label>Peso (kg)</label><input type="number" id="exWeight" value="' + (ex.weight || 0) + '" min="0">' +
    '</div>' +
    '<button onclick="saveExercise(' + dayIndex + ', ' + exIndex + ')">💾 Salva</button>';
}

function saveExercise(dayIndex, exIndex) {
  const name = document.getElementById('exName').value.trim();
  if (!name) { showToast('❌ Inserisci un nome.', 'error'); return; }
  const sets = parseInt(document.getElementById('exSets').value) || 3;
  const reps = parseInt(document.getElementById('exReps').value) || 10;
  const weight = parseFloat(document.getElementById('exWeight').value) || 0;
  const ex = { name: name, sets: sets, reps: reps, weight: weight };
  if (exIndex === -1) {
    data.days[dayIndex].exercises.push(ex);
  } else {
    data.days[dayIndex].exercises[exIndex] = ex;
  }
  saveData();
  showToast('✅ Esercizio salvato!');
  manageExercises(dayIndex);
}

function deleteExercise(dayIndex, exIndex) {
  if (!confirm('Eliminare "' + data.days[dayIndex].exercises[exIndex].name + '"?')) return;
  data.days[dayIndex].exercises.splice(exIndex, 1);
  saveData();
  showToast('🗑 Esercizio eliminato.', 'error');
  manageExercises(dayIndex);
}

function moveExercise(dayIndex, exIndex, direction) {
  const exercises = data.days[dayIndex].exercises;
  const newIndex = exIndex + direction;
  if (newIndex < 0 || newIndex >= exercises.length) return;
  const temp = exercises[exIndex];
  exercises[exIndex] = exercises[newIndex];
  exercises[newIndex] = temp;
  saveData();
  manageExercises(dayIndex);
}

// ======== IMPOSTAZIONI ========
function showSettings() {
  const main = document.getElementById('mainContent');
  main.innerHTML =
    '<h2>Impostazioni</h2>' +
    '<div class="card form-card">' +
    '<label>Recupero tra serie (sec)</label><input type="number" id="restTimeInput" value="' + data.settings.restTime + '"><br>' +
    '<label>Recupero ultima serie (sec)</label><input type="number" id="lastSetTimeInput" value="' + data.settings.lastSetTime + '"><br>' +
    '<label>Serie di default</label><input type="number" id="defaultSetsInput" value="' + (data.settings.defaultSets || 3) + '"><br>' +
    '<label>Ripetizioni di default</label><input type="number" id="defaultRepsInput" value="' + (data.settings.defaultReps || 10) + '">' +
    '</div>' +
    '<button onclick="saveSettings()">💾 Salva impostazioni</button>' +
    '<h2 style="margin-top:32px">Dati</h2>' +
    '<div class="card settings-data-card">' +
      '<p class="settings-desc">Esporta tutti i tuoi dati come backup JSON o importa un backup precedente.</p>' +
      '<div class="settings-data-btns">' +
        '<button onclick="exportData()" class="btn-export">📥 Esporta backup</button>' +
        '<label class="btn-import">📤 Importa backup<input type="file" accept=".json" onchange="importData(event)" style="display:none"></label>' +
      '</div>' +
    '</div>' +
    '<div class="card settings-data-card">' +
      '<p class="settings-desc">Cancella tutti i dati dell\'app (schede, esercizi e progressi).</p>' +
      '<button onclick="resetAllData()" class="btn-danger">🗑 Reset completo</button>' +
    '</div>';
}

function saveSettings() {
  data.settings.restTime = parseInt(document.getElementById('restTimeInput').value) || 90;
  data.settings.lastSetTime = parseInt(document.getElementById('lastSetTimeInput').value) || 60;
  data.settings.defaultSets = parseInt(document.getElementById('defaultSetsInput').value) || 3;
  data.settings.defaultReps = parseInt(document.getElementById('defaultRepsInput').value) || 10;
  saveData();
  showToast('✅ Impostazioni salvate!');
}

function exportData() {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'gymapp-backup-' + new Date().toLocaleDateString('it-IT').replace(/\//g,'-') + '.json';
  a.click();
  URL.revokeObjectURL(url);
  showToast('📥 Backup esportato!');
}

function importData(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const imported = JSON.parse(e.target.result);
      if (!imported.days || !imported.settings) { showToast('❌ File non valido.', 'error'); return; }
      if (!confirm('Importando sovrascriverai i dati attuali. Continuare?')) return;
      data = imported;
      if (!data.progress) data.progress = [];
      saveData();
      showToast('📤 Dati importati!');
      showSettings();
    } catch(e) { showToast('❌ Errore nel file.', 'error'); }
  };
  reader.readAsText(file);
}

function resetAllData() {
  if (!confirm('Sei sicuro? Cancellerai TUTTI i dati.')) return;
  data = { settings: { restTime: 90, lastSetTime: 60, defaultSets: 3, defaultReps: 10 }, days: [], progress: [] };
  saveData();
  showToast('🗑 Dati resettati.', 'error');
  showSettings();
}

// ======== PROGRESSI ========
function getDayColor(dayName) {
  const colors = ['#e63946','#4cc9f0','#2ecc71','#f39c12','#9b59b6','#e67e22','#1abc9c'];
  let hash = 0;
  for (let i = 0; i < dayName.length; i++) hash = dayName.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
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
  if (diff > 0) return '<span class="trend-up">▲ +' + diff + ' kg</span>';
  if (diff < 0) return '<span class="trend-down">▼ ' + diff + ' kg</span>';
  return '<span class="trend-equal">= stabile</span>';
}

function buildWeightChart() {
  const entries = data.progress.filter(function(p) { return p.bodyWeightKg != null; });
  if (entries.length < 2) return '<p>Registra almeno 2 sessioni con peso per vedere il grafico.</p>';
  const W = 320, H = 110, PAD = 30;
  const weights = entries.map(function(p) { return p.bodyWeightKg; });
  const minW = Math.min.apply(null, weights) - 1;
  const maxW = Math.max.apply(null, weights) + 1;
  function xi(i) { return PAD + (i / (entries.length - 1)) * (W - PAD * 2); }
  function yi(v) { return H - PAD - ((v - minW) / (maxW - minW)) * (H - PAD * 2); }
  let polyline = entries.map(function(p,i) { return xi(i)+','+yi(p.bodyWeightKg); }).join(' ');
  let dots = entries.map(function(p,i) {
    return '<circle cx="'+xi(i)+'" cy="'+yi(p.bodyWeightKg)+'" r="3.5" fill="#4cc9f0"><title>'+p.date+': '+p.bodyWeightKg+' kg</title></circle>';
  }).join('');
  const fl = '<text x="'+xi(0)+'" y="'+(yi(weights[0])-8)+'" fill="#4cc9f0" font-size="9" text-anchor="middle">'+weights[0]+'</text>';
  const ll = '<text x="'+xi(entries.length-1)+'" y="'+(yi(weights[weights.length-1])-8)+'" fill="#4cc9f0" font-size="9" text-anchor="middle">'+weights[weights.length-1]+'</text>';
  return '<svg viewBox="0 0 '+W+' '+H+'" style="width:100%;overflow:visible">'+
    '<polyline points="'+polyline+'" fill="none" stroke="#4cc9f0" stroke-width="2" stroke-linejoin="round"/>'+
    dots + fl + ll + '</svg>';
}

function buildActivityCalendar() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const monthName = now.toLocaleString('it-IT', { month: 'long', year: 'numeric' });

  // Sessioni del mese corrente
  const activeDays = new Set();
  data.progress.forEach(function(p) {
    if (!p.date) return;
    const parts = p.date.split('/');
    if (parts.length !== 3) return;
    const d = new Date(parts[2]+'-'+parts[1]+'-'+parts[0]);
    if (d.getFullYear() === year && d.getMonth() === month) {
      activeDays.add(parseInt(parts[0]));
    }
  });

  const firstDay = new Date(year, month, 1).getDay(); // 0=dom
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startOffset = (firstDay === 0) ? 6 : firstDay - 1; // Lun=0

  const dayLabels = ['L','M','M','G','V','S','D'];
  let html = '<div class="cal-month-label">' + monthName.charAt(0).toUpperCase() + monthName.slice(1) + '</div>';
  html += '<div class="cal-grid">';

  // Intestazioni
  dayLabels.forEach(function(l) {
    html += '<div class="cal-day-label">' + l + '</div>';
  });

  // Celle vuote iniziali
  for (let i = 0; i < startOffset; i++) {
    html += '<div class="cal-day cal-empty"></div>';
  }

  // Giorni
  const today = now.getDate();
  for (let d = 1; d <= daysInMonth; d++) {
    const isActive = activeDays.has(d);
    const isToday = d === today;
    let cls = 'cal-day';
    if (isActive) cls += ' cal-active';
    if (isToday) cls += ' cal-today';
    html += '<div class="' + cls + '">' + d + '</div>';
  }

  html += '</div>';
  return html;
}


function renderExerciseChart(exName) {
  const container = document.getElementById('exChartContent');
  if (!container) return;

  // Raccoglie i pesi dell'esercizio da tutte le sessioni salvate
  // Il peso esercizio viene salvato nell'oggetto day, non nella sessione
  // Usiamo il peso corporeo come proxy per ora, ma mostriamo le sessioni del giorno
  // In realtà mostriamo il peso dell'esercizio al momento del salvataggio
  const points = [];
  data.progress.forEach(function(p) {
    const day = data.days.find(function(d) { return d.name === p.dayName; });
    if (!day) return;
    const ex = day.exercises.find(function(e) { return e.name === exName; });
    if (!ex || ex.weight == null) return;
    points.push({ date: p.date, weight: ex.weight });
  });

  if (points.length === 0) {
    container.innerHTML = '<p style="font-size:0.78rem">Nessun dato disponibile per questo esercizio.</p>';
    return;
  }

  if (points.length === 1) {
    container.innerHTML = '<p style="font-size:0.78rem;color:#888">' + points[0].date + ': ' + points[0].weight + ' kg</p>';
    return;
  }

  const W = 320, H = 100, PAD = 30;
  const weights = points.map(function(p) { return p.weight; });
  const minW = Math.min.apply(null, weights) - 1;
  const maxW = Math.max.apply(null, weights) + 1;
  function xi(i) { return PAD + (i / (points.length - 1)) * (W - PAD * 2); }
  function yi(v) { return H - PAD - ((v - minW) / (maxW - minW)) * (H - PAD * 2); }
  let polyline = points.map(function(p,i) { return xi(i)+','+yi(p.weight); }).join(' ');
  let dots = points.map(function(p,i) {
    return '<circle cx="'+xi(i)+'" cy="'+yi(p.weight)+'" r="3.5" fill="#2ecc71"><title>'+p.date+': '+p.weight+' kg</title></circle>';
  }).join('');
  const fl = '<text x="'+xi(0)+'" y="'+(yi(weights[0])-8)+'" fill="#2ecc71" font-size="9" text-anchor="middle">'+weights[0]+'kg</text>';
  const ll = '<text x="'+xi(points.length-1)+'" y="'+(yi(weights[weights.length-1])-8)+'" fill="#2ecc71" font-size="9" text-anchor="middle">'+weights[weights.length-1]+'kg</text>';
  container.innerHTML = '<svg viewBox="0 0 '+W+' '+H+'" style="width:100%;overflow:visible">'+
    '<polyline points="'+polyline+'" fill="none" stroke="#2ecc71" stroke-width="2" stroke-linejoin="round"/>'+
    dots + fl + ll + '</svg>';
}


function showProgress() {
  const main = document.getElementById('mainContent');
  main.innerHTML = '<h2>Progressi</h2>';

  if (!data.progress || data.progress.length === 0) {
    main.innerHTML += '<p>Nessuna sessione salvata.</p>';
    return;
  }

  // Stats
  const totalSessions = data.progress.length;
  const totalSeconds = data.progress.reduce(function(acc,p) { return acc + (p.durationSeconds||0); }, 0);
  const statsDiv = document.createElement('div');
  statsDiv.className = 'stats-bar';
  statsDiv.innerHTML =
    '<div class="stat-item"><span class="stat-value">' + totalSessions + '</span><span class="stat-label">Sessioni</span></div>' +
    '<div class="stat-item"><span class="stat-value">' + formatTime(Math.round(totalSeconds/totalSessions)) + '</span><span class="stat-label">Media</span></div>' +
    '<div class="stat-item"><span class="stat-value">' + formatTime(totalSeconds) + '</span><span class="stat-label">Tot. tempo</span></div>';
  main.appendChild(statsDiv);

  // Calendario attività
  const calDiv = document.createElement('div');
  calDiv.className = 'card activity-calendar-card';
  calDiv.innerHTML = '<h3>📅 Attività mensile</h3>' + buildActivityCalendar();
  main.appendChild(calDiv);

  // Grafico peso
  if (data.progress.filter(function(p){return p.bodyWeightKg!=null;}).length >= 2) {
    const chartDiv = document.createElement('div');
    chartDiv.className = 'card weight-chart-card';
    chartDiv.innerHTML = '<h3>⚖️ Andamento peso corporeo</h3>' + buildWeightChart();
    main.appendChild(chartDiv);
  }

  // Storico pesi per esercizio
  const allExNames = [];
  data.days.forEach(function(d) {
    if (d.exercises) d.exercises.forEach(function(ex) {
      if (!allExNames.includes(ex.name)) allExNames.push(ex.name);
    });
  });

  if (allExNames.length > 0) {
    const exChartCard = document.createElement('div');
    exChartCard.className = 'card weight-chart-card';
    exChartCard.id = 'exChartCard';
    const exOpts = allExNames.map(function(n) {
      return '<option value="'+n+'">'+n+'</option>';
    }).join('');
    exChartCard.innerHTML =
      '<h3>🏋️ Storico peso per esercizio</h3>' +
      '<div class="filter-bar" style="margin-bottom:12px">' +
        '<select id="exChartSelect" onchange="renderExerciseChart(this.value)">' +
          exOpts +
        '</select>' +
      '</div>' +
      '<div id="exChartContent"></div>';
    main.appendChild(exChartCard);
    renderExerciseChart(allExNames[0]);
  }

  // Filtro
  const days = [...new Set(data.progress.map(function(p){return p.dayName;}))];
  const filterDiv = document.createElement('div');
  filterDiv.className = 'filter-bar';
  let opts = '<option value="all">Tutte le schede</option>';
  days.forEach(function(d) { opts += '<option value="'+d+'">'+d+'</option>'; });
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

  let filtered = data.progress.map(function(p,i){return {p:p,i:i};}).reverse();
  if (filter !== 'all') filtered = filtered.filter(function(obj){return obj.p.dayName===filter;});
  if (filtered.length === 0) { container.innerHTML = '<p>Nessuna sessione per questo filtro.</p>'; return; }

  const groups = {};
  filtered.forEach(function(obj) {
    if (!groups[obj.p.date]) groups[obj.p.date] = [];
    groups[obj.p.date].push(obj);
  });

  Object.keys(groups).forEach(function(dateKey) {
    const dh = document.createElement('div');
    dh.className = 'date-header';
    dh.textContent = '📅 ' + dateKey;
    container.appendChild(dh);

    groups[dateKey].forEach(function(obj) {
      const p = obj.p; const i = obj.i;
      const color = getDayColor(p.dayName);
      const trend = (p.bodyWeightKg != null) ? getBodyWeightTrend(data.progress, i) : '';
      const div = document.createElement('div');
      div.className = 'card progress-card';
      div.style.borderLeft = '4px solid ' + color;
      div.innerHTML =
        '<div class="progress-card-header">' +
          '<span class="progress-day-badge" style="background:' + color + '22;color:' + color + '">' + p.dayName + '</span>' +
          '<button class="btn-delete-single" onclick="deleteSession(' + i + ')">🗑</button>' +
        '</div>' +
        '<div class="progress-details">' +
          '<span>⏱ ' + formatTime(p.durationSeconds||0) + '</span>' +
          (p.bodyWeightKg != null ? '<span>⚖️ ' + p.bodyWeightKg + ' kg ' + trend + '</span>' : '') +
          '<span class="progress-time">' + (p.time||'') + '</span>' +
        '</div>' +
        (p.note ? '<div class="progress-note">📝 ' + p.note + '</div>' : '');
      container.appendChild(div);
    });
  });
}

function deleteSession(i) {
  if (!confirm('Eliminare questa sessione?')) return;
  data.progress.splice(i, 1);
  saveData();
  showToast('🗑 Sessione eliminata.', 'error');
  showProgress();
}
