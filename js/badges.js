import { data } from './data.js';
import { showToast } from './toast.js';
import { calcStreak } from './utils.js';

export const BADGES = [
  { id:'first',    icon:'🎉', name:'Prima sessione',      desc:'Hai completato il tuo primo allenamento!',       check: function(p) { return p.length >= 1; } },
  { id:'s5',       icon:'⚡', name:'5 sessioni',           desc:'5 allenamenti completati!',                      check: function(p) { return p.length >= 5; } },
  { id:'s10',      icon:'💪', name:'10 sessioni',          desc:'10 allenamenti completati!',                     check: function(p) { return p.length >= 10; } },
  { id:'s25',      icon:'🏅', name:'25 sessioni',          desc:'25 allenamenti completati!',                     check: function(p) { return p.length >= 25; } },
  { id:'s50',      icon:'🏆', name:'50 sessioni',          desc:'50 allenamenti completati!',                     check: function(p) { return p.length >= 50; } },
  { id:'streak7',  icon:'🔥', name:'Streak 7 giorni',     desc:'7 allenamenti consecutivi!',                     check: function(p) { return calcStreak() >= 7; } },
  { id:'streak14', icon:'🌟', name:'Streak 14 giorni',    desc:'14 allenamenti consecutivi, sei una macchina!',  check: function(p) { return calcStreak() >= 14; } },
  { id:'variety',  icon:'🎯', name:'Allenatore completo', desc:'Hai allenato almeno 3 schede diverse!',          check: function(p) { return new Set(p.map(function(x){ return x.dayName; })).size >= 3; } },
];

export function checkBadges() {
  if (!data.progress) return;
  var earned = JSON.parse(localStorage.getItem('gymBadges') || '[]');
  var newBadges = [];
  BADGES.forEach(function(b) {
    if (!earned.includes(b.id) && b.check(data.progress)) {
      earned.push(b.id);
      newBadges.push(b);
    }
  });
  if (newBadges.length > 0) {
    localStorage.setItem('gymBadges', JSON.stringify(earned));
    newBadges.forEach(function(b) {
      setTimeout(function() {
        showToast(b.icon + ' Badge sbloccato: ' + b.name + '!');
      }, 800);
    });
  }
}

export function showBadgesPanel(container) {
  var earned = JSON.parse(localStorage.getItem('gymBadges') || '[]');
  var card = document.createElement('div');
  card.className = 'card';
  card.style.marginTop = '12px';
  card.innerHTML = '<h3 style="font-size:0.78rem;color:#aaa;margin-bottom:12px;">🏅 BADGE</h3>';
  var grid = document.createElement('div');
  grid.style.cssText = 'display:grid;grid-template-columns:repeat(4,1fr);gap:8px;';
  BADGES.forEach(function(b) {
    var isEarned = earned.includes(b.id);
    var item = document.createElement('div');
    item.style.cssText = 'text-align:center;padding:8px 4px;border-radius:10px;background:' +
      (isEarned ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.02)') + ';' +
      'border:1px solid ' + (isEarned ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.04)') + ';' +
      'opacity:' + (isEarned ? '1' : '0.35') + ';cursor:' + (isEarned ? 'pointer' : 'default') + ';';
    item.innerHTML = '<div style="font-size:1.3rem;">' + b.icon + '</div>' +
      '<div style="font-size:0.6rem;color:#aaa;margin-top:3px;line-height:1.2;">' + b.name + '</div>';
    if (isEarned) item.title = b.desc;
    grid.appendChild(item);
  });
  card.appendChild(grid);
  container.appendChild(card);
}
