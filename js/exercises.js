import { data, saveData } from './data.js';
import { modalConfirm } from './modal.js';
import { showToast } from './toast.js';
import { EXERCISE_DB, MUSCLE_GROUPS } from './exercise-db.js';

export function manageExercises(dayIndex) {
  const day = data.days[dayIndex];
  const main = document.getElementById('mainContent');
  main.innerHTML = '';

  const backBtn = document.createElement('button');
  backBtn.className = 'btn-back';
  backBtn.textContent = '← Indietro';
  backBtn.onclick = function() { window.showManageDays(); };
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

export function moveExercise(dayIndex, exIndex, dir) {
  const exs = data.days[dayIndex].exercises;
  const newIndex = exIndex + dir;
  if (newIndex < 0 || newIndex >= exs.length) return;
  const tmp = exs[exIndex];
  exs[exIndex] = exs[newIndex];
  exs[newIndex] = tmp;
  saveData();
  manageExercises(dayIndex);
}

export function addExercise(dayIndex) {
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

  const dbCard = document.createElement('div');
  dbCard.className = 'card form-card';
  dbCard.style.marginBottom = '16px';

  const dbTitle = document.createElement('div');
  dbTitle.style.cssText = 'font-size:0.78rem;font-weight:700;color:#f39c12;margin-bottom:8px;letter-spacing:0.04em;';
  dbTitle.textContent = '📚 Scegli dal Database';
  dbCard.appendChild(dbTitle);

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

export function editExercise(dayIndex, exIndex) {
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

export function saveExercise(dayIndex, exIndex) {
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

export function deleteExercise(dayIndex, exIndex) {
  modalConfirm('Eliminare "' + data.days[dayIndex].exercises[exIndex].name + '"?', function() {
    data.days[dayIndex].exercises.splice(exIndex, 1);
    saveData();
    showToast('Esercizio eliminato.', 'error');
    manageExercises(dayIndex);
  });
}
