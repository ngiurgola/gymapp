import { data } from './data.js';

export function parseDate(str) {
  const p = str.split('/');
  return new Date(p[2] + '-' + p[1] + '-' + p[0]);
}

export function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m + ':' + (s < 10 ? '0' : '') + s;
}

export function calcStreak() {
  if (!data.progress || data.progress.length === 0) return 0;
  const today = new Date(); today.setHours(0,0,0,0);
  const dayMs = 86400000;
  const uniqueDays = [...new Set(data.progress.map(function(p) {
    const parts = p.date.split('/');
    return new Date(parts[2]+'-'+parts[1]+'-'+parts[0]).setHours(0,0,0,0);
  }))].sort(function(a,b){return b-a;});
  let streak = 0;
  let check = today.getTime();
  if (uniqueDays[0] < check) check = check - dayMs;
  for (let i = 0; i < uniqueDays.length; i++) {
    if (uniqueDays[i] === check) { streak++; check -= dayMs; }
    else if (uniqueDays[i] < check) break;
  }
  return streak;
}

// Cache colori per dayName
const _dayColorCache = {};
export function getDayColor(dayName) {
  if (_dayColorCache[dayName]) return _dayColorCache[dayName];
  const colors = ['#e63946','#4cc9f0','#2ecc71','#f39c12','#9b59b6','#e67e22','#1abc9c'];
  let hash = 0;
  for (let i = 0; i < dayName.length; i++) { hash = dayName.charCodeAt(i) + ((hash << 5) - hash); }
  _dayColorCache[dayName] = colors[Math.abs(hash) % colors.length];
  return _dayColorCache[dayName];
}
