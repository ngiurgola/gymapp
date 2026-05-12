import { data, saveData } from './data.js';
import { modalConfirm } from './modal.js';
import { showToast } from './toast.js';

export function showManageDays() {
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
    btnEx.onclick = function() { window.manageExercises(i); };

    div.appendChild(upBtn);
    div.appendChild(downBtn);
    div.appendChild(btnEdit);
    div.appendChild(btnDel);
    div.appendChild(btnDup);
    div.appendChild(btnEx);
    main.appendChild(div);
  });
}

export function moveDay(index, dir) {
  const newIndex = index + dir;
  if (newIndex < 0 || newIndex >= data.days.length) return;
  const tmp = data.days[index];
  data.days[index] = data.days[newIndex];
  data.days[newIndex] = tmp;
  saveData();
  showManageDays();
}

export function showAddDay() {
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

export function saveNewDay() {
  const name = document.getElementById('newDayName').value.trim();
  if (!name) { showToast('Inserisci un nome.', 'error'); return; }
  data.days.push({ name: name, exercises: [] });
  saveData();
  showToast('Scheda creata!');
  showManageDays();
}

export function editDay(i) {
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

export function saveEditDay(i) {
  const name = document.getElementById('editDayName').value.trim();
  if (!name) { showToast('Inserisci un nome.', 'error'); return; }
  data.days[i].name = name;
  saveData();
  showToast('Scheda aggiornata!');
  showManageDays();
}

export function deleteDay(i) {
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

export function duplicateDay(i) {
  const copy = JSON.parse(JSON.stringify(data.days[i]));
  copy.name = copy.name + ' (copia)';
  data.days.push(copy);
  saveData();
  showToast('Scheda duplicata!');
  showManageDays();
}
