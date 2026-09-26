// DOM helpers shared by UI screens
export function el(tag, cls = '', html = '') {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html) e.innerHTML = html;
  return e;
}

export function button(label, { cls = '', small = false } = {}) {
  const b = el('button', `btn ${cls} ${small ? 'small' : ''}`.trim(), label);
  return b;
}
