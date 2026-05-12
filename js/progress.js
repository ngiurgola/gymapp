import { data, saveData } from './data.js';
import { modalConfirm } from './modal.js';
import { showToast } from './toast.js';
import { parseDate, formatTime, getDayColor } from './utils.js';

export function showProgress() {
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

  const tabsDiv = document.createElement('div');
  tabsDiv.className = 'progress-subnav';
  tabsDiv.id = 'progressTabsBar';
  const tabs = [
    { id: 'sessioni', icon: '📝', label: 'Sessioni' },
    { id: 'peso',     icon: '⚖️', label: 'Peso' },
    { id: 'volume',   icon: '📦', label: 'Volume' },
    { id: 'carichi',  icon: '🏆', label: 'Carichi' },
    { id: 'mese',     icon: '📅', label: 'Mese' },
    { id: 'anno',     icon: '🗓️', label: 'Anno' }
  ];
  tabs.forEach(function(tab) {
    const btn = document.createElement('button');
    btn.dataset.tab = tab.id;
    btn.className = 'progress-subnav-btn';
    btn.onclick = function() { renderProgressTab(tab.id); };
    const iconSpan = document.createElement('span');
    iconSpan.textContent = tab.icon;
    const labelSpan = document.createElement('span');
    labelSpan.textContent = tab.label;
    btn.appendChild(iconSpan);
    btn.appendChild(labelSpan);
    tabsDiv.appendChild(btn);
  });
  main.appendChild(tabsDiv);

  const tabContent = document.createElement('div');
  tabContent.id = 'progressTabContent';
  main.appendChild(tabContent);

  renderProgressTab('sessioni');
}

export function renderProgressTab(tabId) {
  const bar = document.getElementById('progressTabsBar');
  if (bar) {
    bar.querySelectorAll('.progress-subnav-btn').forEach(function(btn) {
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

function renderSessionsTab(container) {
  const now = new Date();
  const toISO = function(d) { return d.toISOString().slice(0, 10); };
  const default30 = new Date(now); default30.setDate(now.getDate() - 30);

  const days = [...new Set(data.progress.map(p => p.dayName))];
  let opts = '<option value="all">Tutte le schede</option>';
  days.forEach(d => opts += '<option value="' + d + '">' + d + '</option>');

  const filterRow1 = document.createElement('div');
  filterRow1.className = 'filter-bar';
  filterRow1.innerHTML = '<label>Scheda</label><select id="filterDay">' + opts + '</select>';
  container.appendChild(filterRow1);

  const filterRow2 = document.createElement('div');
  filterRow2.className = 'filter-bar';
  filterRow2.innerHTML =
    '<label>Dal</label><input type="date" id="sessFrom" value="' + toISO(default30) + '">' +
    '<label>Al</label><input type="date" id="sessTo"   value="' + toISO(now) + '">';
  container.appendChild(filterRow2);

  const listContainer = document.createElement('div');
  listContainer.className = 'progress-list';
  listContainer.id = 'progressList';
  container.appendChild(listContainer);

  function render() { renderProgressList(document.getElementById('filterDay').value); }
  filterRow1.querySelector('#filterDay').onchange = render;
  filterRow2.querySelector('#sessFrom').onchange  = render;
  filterRow2.querySelector('#sessTo').onchange    = render;
  renderProgressList('all');
}

export function renderProgressList(filter) {
  const container = document.getElementById('progressList');
  if (!container) return;
  container.innerHTML = '';

  const fromEl = document.getElementById('sessFrom');
  const toEl   = document.getElementById('sessTo');
  const from = fromEl && fromEl.value ? new Date(fromEl.value) : null;
  const to   = toEl   && toEl.value   ? new Date(toEl.value + 'T23:59:59') : null;

  let filtered = data.progress.map((p, i) => ({ p, i }));
  filtered.sort(function(a, b) {
    const toTs = function(entry) {
      const parts = entry.p.date.split('/');
      const d = new Date(parts[2]+'-'+parts[1]+'-'+parts[0]);
      if (entry.p.time) {
        const tp = entry.p.time.split(':');
        d.setHours(parseInt(tp[0]), parseInt(tp[1]));
      }
      return d.getTime();
    };
    return toTs(b) - toTs(a);
  });
  if (filter !== 'all') filtered = filtered.filter(obj => obj.p.dayName === filter);
  if (from || to) {
    filtered = filtered.filter(function(obj) {
      const parts = obj.p.date.split('/');
      const d = new Date(parts[2]+'-'+parts[1]+'-'+parts[0]);
      if (from && d < from) return false;
      if (to   && d > to)   return false;
      return true;
    });
  }
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

  const steps = 4;
  let grid = '';
  for (let s = 0; s <= steps; s++) {
    const v = minW + (range / steps) * s;
    const y = yi(v);
    grid += '<line x1="' + PAD + '" y1="' + y + '" x2="' + (W - PAD) + '" y2="' + y + '" stroke="#333" stroke-width="0.5"/>';
    grid += '<text x="' + (PAD - 4) + '" y="' + (y + 4) + '" fill="#888" font-size="8" text-anchor="end">' + v.toFixed(1) + '</text>';
  }

  let xLabels = '';
  let lastLabelX = -Infinity;
  const minGap = 30;
  entries.forEach(function(p, i) {
    const isFirst = i === 0;
    const isLast  = i === entries.length - 1;
    const x = xi(i);
    if ((isFirst || isLast || (x - lastLabelX >= minGap)) && (isLast ? x - lastLabelX >= minGap * 0.6 : true)) {
      const parts = p.date.split('/');
      xLabels += '<text x="' + x + '" y="' + (H - 4) + '" fill="#888" font-size="8" text-anchor="middle">' + parts[0] + '/' + parts[1] + '</text>';
      lastLabelX = x;
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

export function duplicateSessionWeights(session) {
  var day = data.days.find(function(d){ return d.name === session.dayName; });
  if (!day) { showToast('Scheda non trovata.', 'error'); return; }
  if (session.exercises) {
    session.exercises.forEach(function(se) {
      var ex = day.exercises.find(function(e){ return e.name === se.name; });
      if (ex && se.weight != null) ex.weight = se.weight;
    });
    saveData();
    showToast('✅ Pesi copiati su ' + session.dayName + '!');
  }
}

export function deleteSession(i) {
  modalConfirm('Eliminare questa sessione?', function() {
    data.progress.splice(i, 1);
    saveData();
    showToast('Sessione eliminata.', 'error');
    showProgress();
  });
}

function renderWeightTab(container) {
  const allWeightEntries = data.progress.filter(p => p.bodyWeightKg != null);
  if (allWeightEntries.length < 2) {
    container.innerHTML = '<p>Registra almeno 2 sessioni con peso corporeo per vedere il grafico.</p>';
    return;
  }

  const now = new Date();
  const toISO = function(d) { return d.toISOString().slice(0, 10); };
  const default30 = new Date(now); default30.setDate(now.getDate() - 30);

  const filterBar = document.createElement('div');
  filterBar.className = 'filter-bar';
  filterBar.style.cssText = 'margin-bottom:12px;display:flex;align-items:center;gap:8px;flex-wrap:wrap;';
  filterBar.innerHTML =
    '<label>Dal</label>' +
    '<input type="date" id="weightFrom" value="' + toISO(default30) + '">' +
    '<label>Al</label>' +
    '<input type="date" id="weightTo" value="' + toISO(now) + '">';
  container.appendChild(filterBar);

  const chartContainer = document.createElement('div');
  container.appendChild(chartContainer);

  function renderWeightChart() {
    chartContainer.innerHTML = '';
    const fromVal = document.getElementById('weightFrom').value;
    const toVal   = document.getElementById('weightTo').value;
    const from = fromVal ? new Date(fromVal) : null;
    const to   = toVal   ? new Date(toVal + 'T23:59:59') : null;

    const entries = allWeightEntries.filter(function(p) {
      const d = parseDate(p.date);
      if (from && d < from) return false;
      if (to   && d > to)   return false;
      return true;
    });

    if (entries.length < 2) {
      chartContainer.innerHTML = '<p style="color:#888;font-size:0.82rem;padding:8px 0;">Nessun dato sufficiente per il periodo selezionato.</p>';
      return;
    }

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

    const table = document.createElement('div');
    table.style.cssText = 'margin-top:12px;font-size:0.82rem;';
    entries.slice().reverse().forEach(function(p) {
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid rgba(255,255,255,0.05)';
      row.innerHTML = '<span>' + p.date + '</span><span style="color:#4cc9f0;font-weight:700">' + p.bodyWeightKg + ' kg</span>';
      table.appendChild(row);
    });
    chartContainer.appendChild(table);
  }

  filterBar.querySelector('#weightFrom').onchange = renderWeightChart;
  filterBar.querySelector('#weightTo').onchange = renderWeightChart;
  renderWeightChart();
}

function renderVolumeTab(container) {
  if (!data.progress || data.progress.length === 0) { container.innerHTML = '<p>Nessun dato.</p>'; return; }

  const now = new Date();
  const toISO = function(d) { return d.toISOString().slice(0, 10); };
  const default30 = new Date(now); default30.setDate(now.getDate() - 30);

  const filterBar = document.createElement('div');
  filterBar.className = 'filter-bar';
  filterBar.style.marginBottom = '16px';
  filterBar.innerHTML =
    '<label>Dal</label><input type="date" id="volFrom" value="' + toISO(default30) + '">' +
    '<label>Al</label><input type="date" id="volTo"   value="' + toISO(now) + '">';
  container.appendChild(filterBar);

  const barsContainer = document.createElement('div');
  container.appendChild(barsContainer);

  function renderBars() {
    barsContainer.innerHTML = '';
    const fromVal = document.getElementById('volFrom').value;
    const toVal   = document.getElementById('volTo').value;
    const from = fromVal ? new Date(fromVal) : null;
    const to   = toVal   ? new Date(toVal + 'T23:59:59') : null;

    const filtered = data.progress.filter(function(p) {
      const parts = p.date.split('/');
      const d = new Date(parts[2]+'-'+parts[1]+'-'+parts[0]);
      if (from && d < from) return false;
      if (to   && d > to)   return false;
      return true;
    });

    if (filtered.length === 0) {
      barsContainer.innerHTML = '<p style="color:#888;font-size:0.82rem;">Nessun dato per il periodo selezionato.</p>';
      return;
    }

    const volumeByDay = {};
    filtered.forEach(function(p) {
      if (!p.exercises) return;
      const vol = p.exercises.reduce(function(acc, ex){ return acc + ex.sets * (parseInt(ex.reps)||0) * (ex.weight||0); }, 0);
      if (!volumeByDay[p.dayName]) volumeByDay[p.dayName] = 0;
      volumeByDay[p.dayName] += vol;
    });

    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = '<h3 style="margin-bottom:16px;text-align:center;">Volume per scheda</h3>';
    const sorted = Object.entries(volumeByDay).sort((a, b) => b[1] - a[1]);
    const maxVol = sorted.length ? sorted[0][1] : 1;
    sorted.forEach(function([name, vol], idx) {
      const pct = Math.round((vol / maxVol) * 100);
      const color = getDayColor(name);
      const sessions = filtered.filter(function(p){ return p.dayName === name; }).length;
      const avgVol = sessions > 0 ? Math.round(vol / sessions) : 0;

      const row = document.createElement('div');
      row.style.cssText = 'margin-bottom:18px;';

      const header = document.createElement('div');
      header.style.cssText = 'display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:7px;';
      header.innerHTML =
        '<div>' +
          (idx === 0 ? '<span style="margin-right:4px;">🏆</span>' : '') +
          '<span style="color:' + color + ';font-weight:800;font-size:0.88rem;">' + name + '</span>' +
          '<span style="font-size:0.65rem;color:#555;margin-left:8px;">' + sessions + ' sess. · avg ' + avgVol.toLocaleString('it-IT') + ' kg</span>' +
        '</div>' +
        '<span style="font-size:0.88rem;font-weight:800;color:#fff;">' + Math.round(vol).toLocaleString('it-IT') + ' kg</span>';

      const barBg = document.createElement('div');
      barBg.style.cssText = 'background:rgba(255,255,255,0.07);border-radius:8px;height:12px;overflow:hidden;';
      const barFill = document.createElement('div');
      barFill.style.cssText = 'background:' + color + ';width:' + pct + '%;height:12px;border-radius:8px;box-shadow:0 0 8px ' + color + '55;';
      barBg.appendChild(barFill);

      row.appendChild(header);
      row.appendChild(barBg);
      card.appendChild(row);
    });
    barsContainer.appendChild(card);
  }

  filterBar.querySelector('#volFrom').onchange = renderBars;
  filterBar.querySelector('#volTo').onchange   = renderBars;
  renderBars();

  const startOfWeek = new Date(now); startOfWeek.setHours(0,0,0,0);
  startOfWeek.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  const startOfPrevWeek = new Date(startOfWeek); startOfPrevWeek.setDate(startOfWeek.getDate() - 7);

  function getWeekVol(from, to) {
    return data.progress.filter(function(p) {
      const parts = p.date.split('/');
      const d = new Date(parts[2]+'-'+parts[1]+'-'+parts[0]);
      return d >= from && d < to;
    }).reduce(function(acc, p) {
      return acc + (p.exercises || []).reduce(function(a, ex){ return a + ex.sets * (parseInt(ex.reps)||0) * (ex.weight||0); }, 0);
    }, 0);
  }

  const thisVol = getWeekVol(startOfWeek, new Date(startOfWeek.getTime() + 7*86400000));
  const prevVol = getWeekVol(startOfPrevWeek, startOfWeek);
  const diff = thisVol - prevVol;
  const diffColor = diff > 0 ? '#2ecc71' : diff < 0 ? '#e63946' : '#f39c12';
  const changePct = prevVol > 0 ? ((thisVol - prevVol) / prevVol * 100).toFixed(1) : null;
  const changeStr = changePct !== null ? (changePct > 0 ? '+' : '') + changePct + '%' : '—';
  const diffIcon = diff > 0 ? '▲' : diff < 0 ? '▼' : '=';

  const fmtDate = function(d) { return d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' }); };
  const weekEnd = new Date(startOfWeek.getTime() + 7*86400000 - 1);
  const prevWeekEnd = new Date(startOfWeek.getTime() - 1);
  const thisRange = fmtDate(startOfWeek) + ' – ' + fmtDate(weekEnd);
  const prevRange = fmtDate(startOfPrevWeek) + ' – ' + fmtDate(prevWeekEnd);
  const maxW = Math.max(thisVol, prevVol) || 1;
  const thisPct = Math.round((thisVol / maxW) * 100);
  const prevPct = Math.round((prevVol / maxW) * 100);

  const compareCard = document.createElement('div');
  compareCard.className = 'card';
  compareCard.style.marginTop = '12px';
  compareCard.innerHTML =
    '<h3 style="font-size:0.78rem;color:#aaa;margin-bottom:16px;text-transform:uppercase;letter-spacing:1px;text-align:center;">📊 Confronto settimane</h3>' +
    '<div style="display:grid;grid-template-columns:1fr auto 1fr;gap:10px;align-items:center;width:100%;">' +

    '<div style="background:rgba(255,255,255,0.04);border-radius:12px;padding:12px;text-align:center;">' +
      '<div style="font-size:0.6rem;color:#666;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">Questa settimana</div>' +
      '<div style="font-size:1.3rem;font-weight:900;color:#fff;line-height:1;">' + Math.round(thisVol).toLocaleString('it-IT') + '</div>' +
      '<div style="font-size:0.68rem;color:#888;margin:2px 0 8px;">kg</div>' +
      '<div style="font-size:0.62rem;color:#555;">' + thisRange + '</div>' +
      '<div style="background:rgba(255,255,255,0.07);border-radius:4px;height:5px;margin-top:8px;overflow:hidden;"><div style="background:#e63946;width:' + thisPct + '%;height:5px;border-radius:4px;"></div></div>' +
    '</div>' +

    '<div style="text-align:center;padding:0 4px;">' +
      '<div style="font-size:1.3rem;font-weight:900;color:' + diffColor + ';line-height:1;">' + diffIcon + '</div>' +
      '<div style="font-size:0.78rem;font-weight:800;color:' + diffColor + ';margin-top:2px;">' + changeStr + '</div>' +
    '</div>' +

    '<div style="background:rgba(255,255,255,0.04);border-radius:12px;padding:12px;text-align:center;">' +
      '<div style="font-size:0.6rem;color:#666;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">Settimana scorsa</div>' +
      '<div style="font-size:1.3rem;font-weight:900;color:#fff;line-height:1;">' + Math.round(prevVol).toLocaleString('it-IT') + '</div>' +
      '<div style="font-size:0.68rem;color:#888;margin:2px 0 8px;">kg</div>' +
      '<div style="font-size:0.62rem;color:#555;">' + prevRange + '</div>' +
      '<div style="background:rgba(255,255,255,0.07);border-radius:4px;height:5px;margin-top:8px;overflow:hidden;"><div style="background:#555;width:' + prevPct + '%;height:5px;border-radius:4px;"></div></div>' +
    '</div>' +

    '</div>';
  container.appendChild(compareCard);
}

function renderCarichiTab(container) {
  const allExercises = [...new Set(
    data.progress.flatMap(p => (p.exercises || []).map(ex => ex.name))
  )].sort();

  if (allExercises.length === 0) { container.innerHTML = '<p>Nessun dato.</p>'; return; }

  const now = new Date();
  const toISO = function(d) { return d.toISOString().slice(0, 10); };
  const default30 = new Date(now); default30.setDate(now.getDate() - 30);

  const filterDiv = document.createElement('div');
  filterDiv.className = 'filter-bar';
  filterDiv.style.flexWrap = 'wrap';
  let opts = allExercises.map(n => '<option value="' + n + '">' + n + '</option>').join('');
  filterDiv.innerHTML =
    '<label>Esercizio</label><select id="carichiExFilter">' + opts + '</select>' +
    '<label>Dal</label><input type="date" id="carichiFrom" value="' + toISO(default30) + '">' +
    '<label>Al</label><input type="date" id="carichiTo"   value="' + toISO(now) + '">';
  container.appendChild(filterDiv);

  const chartDiv = document.createElement('div');
  chartDiv.id = 'carichiChart';
  container.appendChild(chartDiv);

  function renderCarichiChart() {
    const exName  = document.getElementById('carichiExFilter').value;
    const fromVal = document.getElementById('carichiFrom').value;
    const toVal   = document.getElementById('carichiTo').value;
    const from = fromVal ? new Date(fromVal) : null;
    const to   = toVal   ? new Date(toVal + 'T23:59:59') : null;

    const inRange = data.progress.filter(function(p) {
      const parts = p.date.split('/');
      const d = new Date(parts[2]+'-'+parts[1]+'-'+parts[0]);
      if (from && d < from) return false;
      if (to   && d > to)   return false;
      return true;
    });

    const points = inRange
      .filter(p => p.exercises && p.exercises.some(ex => ex.name === exName))
      .map(p => {
        const ex = p.exercises.find(e => e.name === exName);
        return { date: p.date, weight: ex ? (ex.weight || 0) : 0 };
      });

    if (points.length < 2) {
      chartDiv.innerHTML = '<p style="margin-top:12px;color:#888;font-size:0.82rem;">Servono almeno 2 sessioni con questo esercizio nel periodo selezionato.</p>';
      return;
    }

    const bestSession = inRange
      .filter(p => p.exercises && p.exercises.some(ex => ex.name === exName))
      .map(p => p.exercises.find(e => e.name === exName))
      .filter(ex => ex && ex.weight > 0 && ex.reps > 0)
      .reduce(function(best, ex) {
        const orm = ex.weight * (1 + (parseInt(ex.reps)||0) / 30);
        return orm > best ? orm : best;
      }, 0);
    const ormHtml = bestSession > 0
      ? '<div style="font-size:0.78rem;color:#f39c12;margin-bottom:10px;">🏆 1RM stimato (Epley): <strong style="color:#fff">' + bestSession.toFixed(1) + ' kg</strong></div>'
      : '';

    const card = document.createElement('div');
    card.className = 'card weight-chart-card';
    card.innerHTML = '<h3>' + exName + '</h3>' + ormHtml + buildWeightChart(points.map(p => ({ date: p.date, bodyWeightKg: p.weight })));
    chartDiv.innerHTML = '';
    chartDiv.appendChild(card);
  }

  filterDiv.querySelector('#carichiExFilter').onchange = renderCarichiChart;
  filterDiv.querySelector('#carichiFrom').onchange     = renderCarichiChart;
  filterDiv.querySelector('#carichiTo').onchange       = renderCarichiChart;
  renderCarichiChart();
}

function renderMeseTab(container) {
  const now = new Date();
  const monthNames = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];

  const years = [...new Set(data.progress.map(function(p) { return p.date.split('/')[2]; }))].sort();
  if (!years.length) years.push(String(now.getFullYear()));

  const filterBar = document.createElement('div');
  filterBar.className = 'filter-bar';

  const yearLabel = document.createElement('label');
  yearLabel.textContent = 'Anno';
  const yearSel = document.createElement('select');
  yearSel.id = 'meseYearSel';
  years.forEach(function(y) {
    const opt = document.createElement('option');
    opt.value = y;
    opt.textContent = y;
    if (parseInt(y) === now.getFullYear()) opt.selected = true;
    yearSel.appendChild(opt);
  });

  const monthLabel = document.createElement('label');
  monthLabel.style.marginLeft = '12px';
  monthLabel.textContent = 'Mese';
  const monthSel = document.createElement('select');
  monthSel.id = 'meseMonthSel';
  monthNames.forEach(function(name, i) {
    const opt = document.createElement('option');
    opt.value = i;
    opt.textContent = name;
    if (i === now.getMonth()) opt.selected = true;
    monthSel.appendChild(opt);
  });

  filterBar.appendChild(yearLabel);
  filterBar.appendChild(yearSel);
  filterBar.appendChild(monthLabel);
  filterBar.appendChild(monthSel);
  container.appendChild(filterBar);

  const calContainer = document.createElement('div');
  container.appendChild(calContainer);

  function render() {
    const year = parseInt(yearSel.value);
    const month = parseInt(monthSel.value);
    calContainer.innerHTML = '';

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
    const firstDay = (new Date(year, month, 1).getDay() + 6) % 7;
    const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();

    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = '<h3 style="text-align:center">' + monthNames[month] + ' ' + year + '</h3>';

    const cal = document.createElement('div');
    cal.style.cssText = 'display:grid;grid-template-columns:repeat(7,1fr);gap:4px;margin-top:8px;max-width:280px;margin-left:auto;margin-right:auto;';

    ['L','M','M','G','V','S','D'].forEach(function(d) {
      const h = document.createElement('div');
      h.style.cssText = 'text-align:center;font-size:0.7rem;color:#666;padding:2px;';
      h.textContent = d;
      cal.appendChild(h);
    });

    for (let i = 0; i < firstDay; i++) { cal.appendChild(document.createElement('div')); }

    for (let day = 1; day <= daysInMonth; day++) {
      const cell = document.createElement('div');
      const isToday = isCurrentMonth && day === now.getDate();
      const isTrained = trainingDays.has(day);
      const trainColor = trainingDayColors[day] || '#e63946';
      const r = isTrained ? parseInt(trainColor.slice(1,3),16) : 0;
      const g = isTrained ? parseInt(trainColor.slice(3,5),16) : 0;
      const b = isTrained ? parseInt(trainColor.slice(5,7),16) : 0;
      cell.style.cssText = 'text-align:center;padding:6px 2px;border-radius:6px;font-size:0.82rem;font-weight:'+(isToday?'800':'400')+';' +
        'background:'+(isTrained ? 'rgba('+r+','+g+','+b+',0.25)' : 'rgba(255,255,255,0.04)')+';' +
        'color:'+(isTrained ? trainColor : isToday ? '#fff' : '#777')+';' +
        'border:'+(isToday ? '1px solid rgba(255,255,255,0.3)' : '1px solid transparent')+';';
      cell.textContent = day;
      cal.appendChild(cell);
    }

    card.appendChild(cal);
    calContainer.appendChild(card);
    const legend = document.createElement('div');
    legend.style.cssText = 'margin-top:8px;font-size:0.82rem;color:#aaa;text-align:center;';
    legend.innerHTML = 'Sessioni nel mese: <strong style="color:#fff">' + trainingDays.size + '</strong>';
    calContainer.appendChild(legend);
  }

  yearSel.onchange = render;
  monthSel.onchange = render;
  render();
}

function renderAnnoTab(container) {
  const now = new Date();
  const monthNames = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'];

  const years = [...new Set(data.progress.map(function(p) { return p.date.split('/')[2]; }))].sort();
  if (!years.length) years.push(String(now.getFullYear()));

  const filterBar = document.createElement('div');
  filterBar.className = 'filter-bar';
  const lbl = document.createElement('label');
  lbl.textContent = 'Anno';
  const yearSel = document.createElement('select');
  years.forEach(function(y) {
    const opt = document.createElement('option');
    opt.value = y;
    opt.textContent = y;
    if (parseInt(y) === now.getFullYear()) opt.selected = true;
    yearSel.appendChild(opt);
  });
  filterBar.appendChild(lbl);
  filterBar.appendChild(yearSel);
  container.appendChild(filterBar);

  const heatmapContainer = document.createElement('div');
  container.appendChild(heatmapContainer);

  function render() {
    const year = parseInt(yearSel.value);
    heatmapContainer.innerHTML = '';

    const trainingDates = new Set(
      data.progress
        .map(function(p) { const parts = p.date.split('/'); return parts[2]+'-'+parts[1]+'-'+parts[0]; })
        .filter(function(d) { return new Date(d).getFullYear() === year; })
    );

    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = '<h3 style="text-align:center;width:100%;">Heatmap ' + year + '</h3>';

    const grid = document.createElement('div');
    grid.style.cssText = 'display:grid;grid-template-columns:repeat(4,1fr);gap:10px 6px;margin-top:10px;width:100%;';

    for (let m = 0; m < 12; m++) {
      const mDiv = document.createElement('div');
      mDiv.style.cssText = 'display:flex;flex-direction:column;align-items:center;';
      const mLabel = document.createElement('div');
      mLabel.style.cssText = 'font-size:0.68rem;color:#666;margin-bottom:4px;text-align:center;';
      mLabel.textContent = monthNames[m];
      mDiv.appendChild(mLabel);

      const daysInMonth = new Date(year, m + 1, 0).getDate();
      const mGrid = document.createElement('div');
      mGrid.style.cssText = 'display:grid;grid-template-columns:repeat(7,10px);gap:2px;width:fit-content;';

      const firstDay = (new Date(year, m, 1).getDay() + 6) % 7;
      for (let i = 0; i < firstDay; i++) { mGrid.appendChild(document.createElement('div')); }
      for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = year+'-'+String(m+1).padStart(2,'0')+'-'+String(d).padStart(2,'0');
        const trained = trainingDates.has(dateStr);
        const cell = document.createElement('div');
        cell.style.cssText = 'width:10px;height:10px;border-radius:2px;background:'+(trained ? '#e63946' : 'rgba(255,255,255,0.06)')+';';
        mGrid.appendChild(cell);
      }
      mDiv.appendChild(mGrid);
      grid.appendChild(mDiv);
    }

    card.appendChild(grid);
    heatmapContainer.appendChild(card);
    const legend = document.createElement('div');
    legend.style.cssText = 'margin-top:8px;font-size:0.82rem;color:#aaa;text-align:center;';
    legend.innerHTML = 'Sessioni nel ' + year + ': <strong style="color:#e63946">' + trainingDates.size + '</strong>';
    heatmapContainer.appendChild(legend);
  }

  yearSel.onchange = render;
  render();
}
