// One local SVG sprite, shared by every action and navigation icon.
(function () {
  const namespace = 'http://www.w3.org/2000/svg';
  function label(element, text, icon = element.dataset.icon) {
    element.dataset.icon = icon;
    const svg = document.createElementNS(namespace, 'svg');
    svg.setAttribute('class', 'icon'); svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true'); svg.setAttribute('focusable', 'false');
    const use = document.createElementNS(namespace, 'use'); use.setAttribute('href', '#icon-' + icon); svg.appendChild(use);
    if (!text) { element.replaceChildren(svg); return; }
    const caption = document.createElement('span'); caption.className = 'action-label'; caption.textContent = text;
    element.replaceChildren(svg, caption);
  }
  document.querySelectorAll('[data-icon]').forEach(element => label(element, element.textContent.trim()));
  document.querySelectorAll('[data-file-for]').forEach(button => button.addEventListener('click', () => document.getElementById(button.dataset.fileFor).click()));
  function draw(context, name, x, y, size, color) {
    const symbol = document.getElementById('icon-' + name);
    if (!symbol) return;
    context.save(); context.translate(x, y); context.scale(size / 24, size / 24);
    context.strokeStyle = color; context.lineWidth = 2; context.lineCap = 'round'; context.lineJoin = 'round';
    for (const path of symbol.querySelectorAll('path')) context.stroke(new Path2D(path.getAttribute('d')));
    context.restore();
  }
  window.ChamTNIcons = { label, draw };
})();
