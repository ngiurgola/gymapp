import { loadData } from './data.js';
import { applyTheme } from './themes.js';
import { THEMES_DATA } from './themes.js';
import { showTab } from './nav.js';
import { startTimer, stopTimer, resetTimer, startDayTimer, stopDayTimer, resetDayTimer } from './timers.js';
import { showWorkout, startDay, adjustWeight, updateWeight } from './workout.js';
import { showHome } from './home.js';
import { showManageDays } from './days.js';
import { manageExercises, addExercise } from './exercises.js';
import { showSettings, exportData, importData, resetAllData } from './settings.js';
import { showProgress, renderProgressList } from './progress.js';
import { showExerciseInfo, showExerciseDB } from './exercise-db.js';

// ── Init ──────────────────────────────────────────────────────────
loadData();

(function() {
  const savedId = localStorage.getItem('gymThemeId') || 'crimson';
  const t = THEMES_DATA.find(function(x){ return x.id === savedId; }) || THEMES_DATA[0];
  applyTheme(t);
})();

(function() {
  const labels = [
    { icon: '🏠', text: 'Home' },
    { icon: '📋', text: 'Schede' },
    { icon: '📊', text: 'Progressi' },
    { icon: '⚙️', text: 'Impostazioni' }
  ];
  const btns = document.querySelectorAll('.navbar button');
  btns.forEach(function(btn, i) {
    if (labels[i]) {
      btn.innerHTML = `<span class="nav-icon">${labels[i].icon}</span><span class="nav-label">${labels[i].text}</span>`;
    }
  });
})();

showTab('allenamento');

// ── Service Worker ────────────────────────────────────────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function() {
    navigator.serviceWorker.register('./sw.js').catch(function(e) {
      console.log('SW registration failed:', e);
    });
  });
}

// ── Globals for inline HTML event handlers ────────────────────────
window.showTab          = showTab;
window.startTimer       = startTimer;
window.stopTimer        = stopTimer;
window.resetTimer       = resetTimer;
window.startDayTimer    = startDayTimer;
window.stopDayTimer     = stopDayTimer;
window.resetDayTimer    = resetDayTimer;
window.adjustWeight     = adjustWeight;
window.updateWeight     = updateWeight;
window.showExerciseInfo = showExerciseInfo;
window.showExerciseDB   = showExerciseDB;
window.exportData       = exportData;
window.importData       = importData;
window.resetAllData     = resetAllData;
window.renderProgressList = renderProgressList;
window.showManageDays   = showManageDays;
window.manageExercises  = manageExercises;
window.showSettings     = showSettings;
window.addExercise      = addExercise;
window.showWorkout      = showWorkout;
window.startDay         = startDay;
window.showHome         = showHome;
window.showProgress     = showProgress;
