import { timerState, hasActiveTimers } from './timers.js';
import { modalConfirm } from './modal.js';
import { showHome } from './home.js';
import { showManageDays } from './days.js';
import { showProgress } from './progress.js';
import { showSettings } from './settings.js';

export function showTab(tab) {
  function doSwitch() {
    Object.keys(timerState.activeTimers).forEach(function(k) {
      clearInterval(timerState.activeTimers[k]);
      delete timerState.activeTimers[k];
    });
    Object.keys(timerState.dayTimers).forEach(function(k) {
      clearInterval(timerState.dayTimers[k]);
      delete timerState.dayTimers[k];
    });
    const buttons = document.querySelectorAll('.navbar button');
    buttons.forEach(function(btn) { btn.classList.remove('active'); });
    switch(tab) {
      case 'allenamento':  showHome();        buttons[0].classList.add('active'); break;
      case 'giorni':       showManageDays();  buttons[1].classList.add('active'); break;
      case 'progressi':    showProgress();    buttons[2].classList.add('active'); break;
      case 'impostazioni': showSettings();    buttons[3].classList.add('active'); break;
    }
  }
  if (timerState.sessionActive) {
    modalConfirm('Hai un allenamento in corso. Vuoi davvero cambiare scheda? I dati non salvati andranno persi.', function() {
      timerState.sessionActive = false;
      history.back();
      doSwitch();
    });
  } else if (hasActiveTimers()) {
    modalConfirm('Hai dei timer attivi. Vuoi cambiare scheda lo stesso?', doSwitch);
  } else {
    doSwitch();
  }
}
