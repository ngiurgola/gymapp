import { data, saveData } from './data.js';
import { showModal, modalConfirm } from './modal.js';
import { showToast } from './toast.js';
import { THEMES_DATA, applyTheme } from './themes.js';

export function showSettings() {
  const main = document.getElementById('mainContent');
  main.innerHTML = '';

  const title = document.createElement('h2');
  title.textContent = 'Impostazioni';
  main.appendChild(title);

  const card = document.createElement('div');
  card.className = 'card form-card';
  const iStyle = 'width:100%;box-sizing:border-box;text-align:left;';
  card.innerHTML =
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px 16px;width:100%;">' +
      '<div><label>Recupero tra serie (sec)</label><input type="number" id="restTimeInput" value="' + data.settings.restTime + '" style="' + iStyle + '"></div>' +
      '<div><label>Recupero ultima serie (sec)</label><input type="number" id="lastSetTimeInput" value="' + data.settings.lastSetTime + '" style="' + iStyle + '"></div>' +
      '<div><label>Serie di default</label><input type="number" id="defaultSetsInput" value="' + (data.settings.defaultSets||3) + '" style="' + iStyle + '"></div>' +
      '<div><label>Ripetizioni di default</label><input type="number" id="defaultRepsInput" value="' + (data.settings.defaultReps||10) + '" style="' + iStyle + '"></div>' +
    '</div>';
  main.appendChild(card);

  const saveBtn = document.createElement('button');
  saveBtn.textContent = 'Salva impostazioni';
  saveBtn.onclick = saveSettings;
  main.appendChild(saveBtn);

  const h2color = document.createElement('h2');
  h2color.style.marginTop = '32px';
  h2color.textContent = 'Tema';
  main.appendChild(h2color);

  const currentThemeId = localStorage.getItem('gymThemeId') || 'crimson';
  const cardTheme = document.createElement('div');
  cardTheme.className = 'card settings-data-card';
  const themeDesc = document.createElement('p');
  themeDesc.className = 'settings-desc';
  themeDesc.textContent = "Scegli il tema visivo dell'app.";
  cardTheme.appendChild(themeDesc);

  const themeGrid = document.createElement('div');
  themeGrid.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px;';

  THEMES_DATA.forEach(function(theme) {
    const btn = document.createElement('button');
    const isActive = currentThemeId === theme.id;
    btn.style.cssText = 'display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:12px;text-align:left;' +
      'background:' + (isActive ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)') + ';' +
      'border:1px solid ' + (isActive ? '#fff' : 'rgba(255,255,255,0.08)') + ';' +
      'cursor:pointer;transition:all 0.2s;width:100%;';

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
      showSettings();
    };

    themeGrid.appendChild(btn);
  });

  cardTheme.appendChild(themeGrid);
  main.appendChild(cardTheme);

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

export function saveSettings() {
  data.settings.restTime    = parseInt(document.getElementById('restTimeInput').value) || 90;
  data.settings.lastSetTime = parseInt(document.getElementById('lastSetTimeInput').value) || 60;
  data.settings.defaultSets = parseInt(document.getElementById('defaultSetsInput').value) || 3;
  data.settings.defaultReps = parseInt(document.getElementById('defaultRepsInput').value) || 10;
  saveData();
  showToast('Impostazioni salvate!');
}

export function exportData() {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'gymapp-backup-' + new Date().toLocaleDateString('it-IT').replace(/\//g, '-') + '.json';
  a.click();
  URL.revokeObjectURL(url);
  showToast('Backup esportato!');
}

export function importData(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const imported = JSON.parse(e.target.result);
      if (!imported.days || !imported.settings) { showToast('File non valido.', 'error'); return; }
      modalConfirm('Importando sovrascriverai i dati attuali. Continuare?', function() {
        Object.keys(data).forEach(k => delete data[k]);
        Object.assign(data, imported);
        if (!data.progress) data.progress = [];
        saveData();
        showToast('Dati importati!');
        showSettings();
      });
    } catch(e) { showToast('Errore nel file.', 'error'); }
  };
  reader.readAsText(file);
}

export function resetAllData() {
  modalConfirm('Sei sicuro? Cancellerai TUTTI i dati.', function() {
    Object.keys(data).forEach(k => delete data[k]);
    Object.assign(data, { settings: { restTime: 90, lastSetTime: 60, defaultSets: 3, defaultReps: 10 }, days: [], progress: [] });
    saveData();
    showToast('Dati resettati.', 'error');
    showSettings();
  });
}

export function showManualEntry() {
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

export function saveManualEntry() {
  const dayName  = document.getElementById('manualDay').value;
  const dateStr  = document.getElementById('manualDate').value.trim();
  const timeStr  = document.getElementById('manualTime').value.trim();
  const durMins  = parseFloat(document.getElementById('manualDuration').value) || 0;
  const weightStr = document.getElementById('manualWeight').value.trim();
  const note     = document.getElementById('manualNote').value.trim();

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
