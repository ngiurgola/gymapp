import { data, saveData } from './data.js';
import { showModal } from './modal.js';
import { showToast } from './toast.js';
import { timerState, requestWakeLock, releaseWakeLock } from './timers.js';
import { calcStreak, formatTime, getDayColor } from './utils.js';
import { EXERCISE_DB } from './exercise-db.js';

function exitSession() {
  timerState.sessionActive = false;
  releaseWakeLock();
  history.back();
  window.showHome();
}

function confirmExit() {
  showModal({
    title: 'Abbandonare l\'allenamento?',
    message: 'Hai un allenamento in corso. Vuoi davvero uscire? I dati non salvati andranno persi.',
    buttons: [
      { label: 'Rimani',    cls: 'btn-modal-cancel',  value: 'stay' },
      { label: 'Abbandona', cls: 'btn-modal-confirm', value: 'exit' }
    ],
    onClose: function(val) { if (val === 'exit') exitSession(); }
  });
}

window.addEventListener('popstate', function() {
  if (!timerState.sessionActive) return;
  history.pushState({ gymSession: true }, '');
  confirmExit();
});

export function showWorkout() {
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

export function startDay(dayIndex) {
  const day = data.days[dayIndex];
  const main = document.getElementById('mainContent');
  main.innerHTML = '';

  const backBtn = document.createElement('button');
  backBtn.className = 'btn-back';
  backBtn.textContent = '← Indietro';
  main.appendChild(backBtn);

  const title = document.createElement('h2');
  title.textContent = day.name;
  main.appendChild(title);

  if (!day.exercises || day.exercises.length === 0) {
    backBtn.onclick = function() { window.showHome(); };
    const empty = document.createElement('p');
    empty.textContent = 'Nessun esercizio per questo giorno.';
    main.appendChild(empty);
    const addExBtn = document.createElement('button');
    addExBtn.textContent = 'Aggiungi esercizio';
    addExBtn.onclick = function() { window.addExercise(dayIndex); };
    main.appendChild(addExBtn);
    return;
  }

  if (!timerState.sessionActive) {
    history.pushState({ gymSession: true }, '');
  }
  timerState.sessionActive = true;
  requestWakeLock();

  backBtn.onclick = confirmExit;

  const timerDiv = document.createElement('div');
  timerDiv.className = 'day-general-timer';
  timerDiv.innerHTML =
    '<label>Durata allenamento</label>' +
    '<span id="dayTimer_' + dayIndex + '">0:00</span>' +
    '<button onclick="startDayTimer(' + dayIndex + ')">Start</button>' +
    '<button onclick="stopDayTimer(' + dayIndex + ')">Stop</button>' +
    '<button onclick="resetDayTimer(' + dayIndex + ')">Reset</button>';
  main.appendChild(timerDiv);
  timerState.dayElapsed[dayIndex] = timerState.dayElapsed[dayIndex] || 0;

  const grid = document.createElement('div');
  grid.className = 'exercises-grid';
  main.appendChild(grid);

  day.exercises.forEach(function(ex, exIndex) {
    const div = document.createElement('div');
    div.className = 'exercise-card';

    let weightHistory = '';
    if (data.progress && data.progress.length > 0) {
      const history = data.progress
        .filter(function(p) { return p.dayName === day.name && p.bodyWeightKg != null; })
        .slice(-3).reverse()
        .map(function(p) { return p.date + ': <b>' + p.bodyWeightKg + ' kg</b>'; });
      if (history.length > 0) weightHistory = '<div class="weight-history">' + history.join(' &nbsp;|&nbsp; ') + '</div>';
    }

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

  const saveBtn = document.createElement('button');
  saveBtn.textContent = '💾 Salva sessione';
  saveBtn.style.width = '100%';
  saveBtn.style.marginTop = '20px';
  saveBtn.onclick = function() { saveSession(dayIndex); };
  main.appendChild(saveBtn);
}

export function adjustWeight(dayIndex, exIndex, delta) {
  const inp = document.getElementById('weight_' + dayIndex + '_' + exIndex);
  if (!inp) return;
  const newVal = Math.max(0, Math.round(((parseFloat(inp.value)||0) + delta) * 10) / 10);
  inp.value = newVal;
  updateWeight(dayIndex, exIndex, newVal);
}

export function updateWeight(dayIndex, exIndex, value) {
  data.days[dayIndex].exercises[exIndex].weight = parseFloat(value) || 0;
  saveData();
}

export function saveSession(dayIndex) {
  const day = data.days[dayIndex];
  const duration = timerState.dayElapsed[dayIndex] || 0;

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

export function showSessionSummary(entry, day, dayIndex) {
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
  cancelBtn.onclick = function() { timerState.sessionActive = true; startDay(dayIndex); };
  main.appendChild(cancelBtn);
}

export function confirmSaveSession(entry) {
  timerState.sessionActive = false;
  releaseWakeLock();
  history.back();
  data.progress.push(entry);
  saveData();
  showToast('Sessione salvata!');
  window.showHome();
}
