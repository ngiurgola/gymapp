import { formatTime } from './utils.js';
import { playBeep } from './sound.js';

export const timerState = {
  activeTimers: {},
  dayTimers: {},
  dayElapsed: {},
  sessionActive: false,
  wakeLock: null
};

export async function requestWakeLock() {
  if ('wakeLock' in navigator) {
    try { timerState.wakeLock = await navigator.wakeLock.request('screen'); } catch(e) {}
  }
}

export function releaseWakeLock() {
  if (timerState.wakeLock) {
    timerState.wakeLock.release().catch(function(){});
    timerState.wakeLock = null;
  }
}

export function hasActiveTimers() {
  return Object.keys(timerState.activeTimers).length > 0 || Object.keys(timerState.dayTimers).length > 0;
}

export function showRestOverlay(seconds, label) {
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

export function startTimer(dayIndex, exIndex, setIndex, totalSeconds) {
  const key = dayIndex + '_' + exIndex + '_' + setIndex;
  if (timerState.activeTimers[key]) return;
  const el = document.getElementById('timerCounter_' + key);
  if (el && el.dataset.done === 'true') return;
  let remaining = totalSeconds;
  if (el) el.classList.add('timer-running');
  showRestOverlay(totalSeconds, 'Recupero serie');
  timerState.activeTimers[key] = setInterval(function() {
    remaining--;
    if (el) el.textContent = formatTime(remaining);
    if (remaining <= 0) {
      clearInterval(timerState.activeTimers[key]);
      delete timerState.activeTimers[key];
      if (el) { el.textContent = '✓'; el.classList.remove('timer-running'); el.dataset.done = 'true'; }
      playBeep();
    }
  }, 1000);
}

export function stopTimer(key) {
  if (timerState.activeTimers[key]) { clearInterval(timerState.activeTimers[key]); delete timerState.activeTimers[key]; }
  const el = document.getElementById('timerCounter_' + key);
  if (el) el.classList.remove('timer-running');
}

export function resetTimer(key, totalSeconds) {
  stopTimer(key);
  const el = document.getElementById('timerCounter_' + key);
  if (el) { el.textContent = formatTime(totalSeconds); el.dataset.done = 'false'; }
}

export function startDayTimer(dayIndex) {
  if (timerState.dayTimers[dayIndex]) return;
  const el = document.getElementById('dayTimer_' + dayIndex);
  if (el) el.classList.add('day-timer-running');
  timerState.dayElapsed[dayIndex] = timerState.dayElapsed[dayIndex] || 0;
  timerState.dayTimers[dayIndex] = setInterval(function() {
    timerState.dayElapsed[dayIndex]++;
    const el2 = document.getElementById('dayTimer_' + dayIndex);
    if (el2) el2.textContent = formatTime(timerState.dayElapsed[dayIndex]);
  }, 1000);
}

export function stopDayTimer(dayIndex) {
  if (timerState.dayTimers[dayIndex]) { clearInterval(timerState.dayTimers[dayIndex]); delete timerState.dayTimers[dayIndex]; }
  const el = document.getElementById('dayTimer_' + dayIndex);
  if (el) el.classList.remove('day-timer-running');
}

export function resetDayTimer(dayIndex) {
  stopDayTimer(dayIndex);
  timerState.dayElapsed[dayIndex] = 0;
  const el = document.getElementById('dayTimer_' + dayIndex);
  if (el) { el.textContent = '0:00'; el.classList.remove('day-timer-running'); }
}

document.addEventListener('visibilitychange', function() {
  if (document.visibilityState === 'visible' && timerState.sessionActive) requestWakeLock();
});

window.addEventListener('beforeunload', function(e) {
  if (timerState.sessionActive || hasActiveTimers()) {
    e.preventDefault(); e.returnValue = '';
  }
});
