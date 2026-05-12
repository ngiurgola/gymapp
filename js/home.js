import { data } from './data.js';
import { calcStreak, parseDate, getDayColor } from './utils.js';

function daysAgo(dateStr) {
  if (!dateStr) return null;
  const d = parseDate(dateStr);
  const today = new Date(); today.setHours(0,0,0,0); d.setHours(0,0,0,0);
  return Math.round((today - d) / 86400000);
}

function sessionVolume(s) {
  return (s.exercises||[]).reduce(function(sv, ex) {
    const sets = Array.isArray(ex.sets) ? ex.sets : [];
    return sv + sets.reduce(function(ss, set) {
      return ss + ((set.done !== false && (set.weight||0) > 0 && (set.reps||0) > 0) ? set.weight * set.reps : 0);
    }, 0);
  }, 0);
}

export function showHome() {
  const main = document.getElementById('mainContent');
  main.innerHTML = '';
  window.scrollTo(0,0);

  const progress = data.progress || [];
  const days     = data.days || [];

  // ── Streak ─────────────────────────────────────────────
  const streak = calcStreak();

  // ── Last session ───────────────────────────────────────
  const lastSession = progress.length > 0 ? progress[progress.length - 1] : null;

  // ── This week ──────────────────────────────────────────
  const now = new Date();
  const dow = now.getDay() === 0 ? 6 : now.getDay() - 1;
  const weekStart = new Date(now); weekStart.setDate(now.getDate() - dow); weekStart.setHours(0,0,0,0);
  const weekSessions = progress.filter(function(p) {
    const d = parseDate(p.date); d.setHours(0,0,0,0);
    return d >= weekStart;
  });
  const weekVolume = weekSessions.reduce(function(s, p) { return s + sessionVolume(p); }, 0);

  // ── Next suggested day ─────────────────────────────────
  let nextDay = days.length > 0 ? days[0] : null;
  if (lastSession && days.length > 0) {
    const li = days.findIndex(function(d) { return d.name === lastSession.dayName; });
    if (li >= 0) nextDay = days[(li + 1) % days.length];
  }

  // ── Recent PRs (last 14 days) ──────────────────────────
  const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 14); cutoff.setHours(0,0,0,0);
  const allTimeMax = {};
  progress.forEach(function(s) {
    const d = parseDate(s.date); d.setHours(0,0,0,0);
    if (d >= cutoff) return;
    (s.exercises||[]).forEach(function(ex) {
      const sets = Array.isArray(ex.sets) ? ex.sets : [];
      sets.forEach(function(set) {
        if ((set.weight||0) > 0 && (!allTimeMax[ex.name] || set.weight > allTimeMax[ex.name]))
          allTimeMax[ex.name] = set.weight;
      });
    });
  });
  const recentPRs = [];
  progress.slice().reverse().forEach(function(s) {
    const d = parseDate(s.date); d.setHours(0,0,0,0);
    if (d < cutoff) return;
    (s.exercises||[]).forEach(function(ex) {
      if (recentPRs.find(function(r) { return r.name === ex.name; })) return;
      const sets2 = Array.isArray(ex.sets) ? ex.sets : [];
      const maxW = sets2.reduce(function(m, set) { return (set.weight||0) > m ? set.weight : m; }, 0);
      if (!maxW) return;
      const prev = allTimeMax[ex.name] || 0;
      if (maxW > prev) {
        recentPRs.push({ name: ex.name, weight: maxW, prev: prev, ago: daysAgo(s.date) });
      }
    });
  });

  // ══ RENDER ════════════════════════════════════════════════

  // Streak card
  const streakCard = document.createElement('div');
  streakCard.className = 'card';
  streakCard.style.cssText = 'background:linear-gradient(135deg,rgba(var(--accent-rgb),0.18),rgba(var(--accent-rgb),0.05));border-color:rgba(var(--accent-rgb),0.3);text-align:center;padding:22px 16px;';
  if (streak > 0) {
    streakCard.innerHTML =
      '<div style="font-size:2.4rem;line-height:1;margin-bottom:6px;">🔥</div>' +
      '<div style="font-size:2rem;font-weight:900;color:var(--accent);line-height:1;">' + streak + '</div>' +
      '<div style="font-size:0.78rem;color:#aaa;margin-top:4px;">' + (streak === 1 ? 'giorno di streak' : 'giorni di streak') + '</div>';
  } else {
    streakCard.innerHTML =
      '<div style="font-size:2rem;line-height:1;margin-bottom:8px;">💪</div>' +
      '<div style="font-size:0.92rem;font-weight:700;color:#fff;">Pronto ad allenarti?</div>' +
      '<div style="font-size:0.72rem;color:#777;margin-top:4px;">Inizia una sessione per cominciare la streak</div>';
  }
  main.appendChild(streakCard);

  // Stats row
  const statsRow = document.createElement('div');
  statsRow.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px;';

  const lastCard = document.createElement('div');
  lastCard.className = 'card';
  lastCard.style.padding = '14px';
  if (lastSession) {
    const ago = daysAgo(lastSession.date);
    const agoStr = ago === 0 ? 'Oggi' : ago === 1 ? 'Ieri' : ago + ' gg fa';
    const dur = lastSession.durationSeconds ? Math.round(lastSession.durationSeconds / 60) + ' min' : '';
    lastCard.innerHTML =
      '<div style="font-size:0.62rem;color:#777;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">Ultimo allenamento</div>' +
      '<div style="font-size:0.85rem;font-weight:800;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + lastSession.dayName + '</div>' +
      '<div style="font-size:0.72rem;color:var(--accent);margin-top:3px;">' + agoStr + '</div>' +
      (dur ? '<div style="font-size:0.67rem;color:#777;margin-top:2px;">⏱ ' + dur + '</div>' : '');
  } else {
    lastCard.innerHTML =
      '<div style="font-size:0.62rem;color:#777;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">Ultimo allenamento</div>' +
      '<div style="font-size:0.78rem;color:#555;">Nessuna sessione</div>';
  }

  const weekCard = document.createElement('div');
  weekCard.className = 'card';
  weekCard.style.padding = '14px';
  const volStr = weekVolume >= 1000 ? (weekVolume / 1000).toFixed(1) + ' ton' : Math.round(weekVolume) + ' kg';
  weekCard.innerHTML =
    '<div style="font-size:0.62rem;color:#777;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">Questa settimana</div>' +
    '<div style="font-size:0.85rem;font-weight:800;color:#fff;">' + weekSessions.length + (weekSessions.length === 1 ? ' sessione' : ' sessioni') + '</div>' +
    (weekVolume > 0
      ? '<div style="font-size:0.72rem;color:var(--accent);margin-top:3px;">' + volStr + ' volume</div>'
      : '<div style="font-size:0.72rem;color:#555;margin-top:3px;">Nessun volume</div>');

  statsRow.appendChild(lastCard);
  statsRow.appendChild(weekCard);
  main.appendChild(statsRow);

  // Next day suggestion
  if (nextDay) {
    const nextCard = document.createElement('div');
    nextCard.className = 'card';
    nextCard.style.cssText = 'margin-top:10px;padding:14px 16px;display:flex;align-items:center;justify-content:space-between;gap:12px;border-color:rgba(var(--accent-rgb),0.25);';
    const col = getDayColor(nextDay.name);
    const nextInfo = document.createElement('div');
    nextInfo.style.cssText = 'min-width:0;';
    nextInfo.innerHTML =
      '<div style="font-size:0.62rem;color:#777;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Oggi tocca</div>' +
      '<div style="font-size:1rem;font-weight:800;color:' + col + ';white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + nextDay.name + '</div>' +
      '<div style="font-size:0.68rem;color:#888;margin-top:3px;">' + (nextDay.exercises||[]).length + ' esercizi</div>';
    const startBtn = document.createElement('button');
    startBtn.style.cssText = 'background:var(--accent);color:#000;border:none;border-radius:12px;padding:11px 22px;font-size:0.82rem;font-weight:800;white-space:nowrap;flex-shrink:0;';
    startBtn.textContent = '▶ Inizia';
    startBtn.onclick = function() {
      const idx = data.days.indexOf(nextDay);
      if (idx >= 0) window.startDay(idx);
    };
    nextCard.appendChild(nextInfo);
    nextCard.appendChild(startBtn);
    main.appendChild(nextCard);
  }

  // Recent PRs
  if (recentPRs.length > 0) {
    const h2 = document.createElement('h2');
    h2.textContent = '🏆 Record recenti';
    h2.style.marginTop = '24px';
    main.appendChild(h2);
    const prCard = document.createElement('div');
    prCard.className = 'card';
    prCard.style.padding = '0';
    recentPRs.slice(0, 4).forEach(function(pr, i) {
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:8px;padding:11px 14px;' + (i > 0 ? 'border-top:1px solid rgba(255,255,255,0.05);' : '');
      const left = document.createElement('div');
      left.style.cssText = 'min-width:0;';
      left.innerHTML =
        '<div style="font-size:0.78rem;font-weight:700;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + pr.name + '</div>' +
        '<div style="font-size:0.67rem;color:#777;">' + (pr.ago === 0 ? 'Oggi' : pr.ago === 1 ? 'Ieri' : pr.ago + ' giorni fa') + '</div>';
      const right = document.createElement('div');
      right.style.cssText = 'text-align:right;flex-shrink:0;';
      right.innerHTML =
        '<div style="font-size:0.9rem;font-weight:800;color:var(--accent);">' + pr.weight + ' kg</div>' +
        (pr.prev > 0
          ? '<div style="font-size:0.65rem;color:#2ecc71;">+' + (pr.weight - pr.prev).toFixed(1) + ' kg</div>'
          : '<div style="font-size:0.65rem;color:#2ecc71;">Nuovo!</div>');
      row.appendChild(left);
      row.appendChild(right);
      prCard.appendChild(row);
    });
    main.appendChild(prCard);
  }

  // All days
  const h2days = document.createElement('h2');
  h2days.style.marginTop = '24px';
  h2days.textContent = 'Allenamenti';
  main.appendChild(h2days);

  if (days.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'card';
    empty.innerHTML = '<p style="color:#888;text-align:center;margin:0;">Nessuna scheda. <a href="#" onclick="window.showTab(\'giorni\');return false;" style="color:var(--accent);">Creane una →</a></p>';
    main.appendChild(empty);
  } else {
    days.forEach(function(day, idx) {
      const col = getDayColor(day.name);
      const card = document.createElement('div');
      card.className = 'card';
      card.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 16px;margin-bottom:8px;cursor:pointer;border-left:4px solid ' + col + ';';
      card.onclick = function() { window.startDay(idx); };

      const lastTrained = progress.slice().reverse().find(function(p) { return p.dayName === day.name; });
      const agoText = lastTrained ? (function() { const a = daysAgo(lastTrained.date); return a === 0 ? 'Oggi' : a === 1 ? 'Ieri' : a + ' gg fa'; })() : 'Mai';
      const info = document.createElement('div');
      info.style.cssText = 'min-width:0;';
      info.innerHTML =
        '<div style="font-size:0.88rem;font-weight:800;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + day.name + '</div>' +
        '<div style="font-size:0.7rem;color:#888;margin-top:3px;">' + (day.exercises||[]).length + ' esercizi &nbsp;·&nbsp; ultima: ' + agoText + '</div>';

      const arrow = document.createElement('div');
      arrow.style.cssText = 'color:' + col + ';font-size:1.4rem;font-weight:300;flex-shrink:0;';
      arrow.textContent = '›';

      card.appendChild(info);
      card.appendChild(arrow);
      main.appendChild(card);
    });
  }
}
