export function showToast(msg, type) {
  if (!type) type = 'success';
  const old = document.getElementById('toast');
  if (old) old.remove();
  const t = document.createElement('div');
  t.id = 'toast';
  t.className = 'toast toast-' + type;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(function() { t.classList.add('toast-show'); }, 10);
  setTimeout(function() {
    t.classList.remove('toast-show');
    setTimeout(function() { t.remove(); }, 400);
  }, 2800);
}
