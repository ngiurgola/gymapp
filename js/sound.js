export function playBeep() {
  try {
    const a = new Audio('sounds/beep.mp3');
    a.play().catch(function(){});
  } catch(e) {}
  if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
}
