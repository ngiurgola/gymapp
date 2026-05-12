export function showModal(opts) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.65);display:flex;align-items:center;justify-content:center;z-index:9999;';

  const box = document.createElement('div');
  box.className = 'modal-box';
  box.style.cssText = 'background:#1e1e2e;border:1px solid rgba(255,255,255,0.12);border-radius:16px;padding:24px 20px;width:90%;max-width:360px;box-shadow:0 8px 32px rgba(0,0,0,0.5);';

  if (opts.title) {
    const h = document.createElement('h3');
    h.textContent = opts.title;
    box.appendChild(h);
  }
  if (opts.message) {
    const p = document.createElement('p');
    p.className = 'modal-message';
    p.textContent = opts.message;
    box.appendChild(p);
  }

  const inputRefs = {};
  if (opts.inputs && opts.inputs.length > 0) {
    opts.inputs.forEach(function(inp) {
      const lbl = document.createElement('label');
      lbl.textContent = inp.label;
      lbl.className = 'modal-label';
      box.appendChild(lbl);
      let el;
      if (inp.type === 'select') {
        el = document.createElement('select');
        el.id = inp.id;
        el.className = 'modal-input';
        (inp.options || []).forEach(function(opt) {
          const o = document.createElement('option');
          o.value = opt.value !== undefined ? String(opt.value) : String(opt);
          o.textContent = opt.label || String(opt);
          el.appendChild(o);
        });
        if (inp.value !== undefined) el.value = String(inp.value);
      } else {
        el = document.createElement('input');
        el.type = inp.type || 'text';
        el.id = inp.id;
        el.value = inp.value !== undefined ? inp.value : '';
        if (inp.placeholder) el.placeholder = inp.placeholder;
        if (inp.min !== undefined) el.min = inp.min;
        if (inp.step !== undefined) el.step = inp.step;
        el.className = 'modal-input';
      }
      box.appendChild(el);
      inputRefs[inp.id] = el;
    });
  }

  const btnRow = document.createElement('div');
  btnRow.className = 'modal-btn-row';
  opts.buttons.forEach(function(btn) {
    const b = document.createElement('button');
    b.textContent = btn.label;
    b.className = btn.cls || 'btn-modal-confirm';
    b.onclick = function() {
      document.body.removeChild(overlay);
      const vals = {};
      Object.keys(inputRefs).forEach(function(k) { vals[k] = inputRefs[k].value; });
      opts.onClose(btn.value, vals);
    };
    btnRow.appendChild(b);
  });
  box.appendChild(btnRow);
  overlay.appendChild(box);
  document.body.appendChild(overlay);

  if (opts.inputs && opts.inputs.length > 0) {
    setTimeout(function() { inputRefs[opts.inputs[0].id].focus(); }, 50);
  }
}

export function modalConfirm(message, onConfirm) {
  showModal({
    message: message,
    buttons: [
      { label: 'Annulla', cls: 'btn-modal-cancel', value: 'no' },
      { label: 'Conferma', cls: 'btn-modal-confirm', value: 'yes' }
    ],
    onClose: function(val) { if (val === 'yes') onConfirm(); }
  });
}
