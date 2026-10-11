// Mobile navigation keeps the same grading state across all three screens.
(() => {
  const titles = { scan: 'Chấm bài', setup: 'Đáp án & thang điểm', results: 'Kết quả chấm' };
  const buttons = [...document.querySelectorAll('.mobile-nav button')];
  const empty = document.getElementById('mobileEmpty');
  function refresh() {
    empty.hidden = document.body.dataset.mobileView !== 'results' || !document.getElementById('batchPanel').classList.contains('hidden');
  }
  function select(view) {
    document.body.dataset.mobileView = view;
    buttons.forEach(button => {
      if (button.dataset.view === view) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    });
    document.querySelector('.brand small').textContent = matchMedia('(max-width: 600px)').matches ? titles[view] : 'Phiếu trả lời trắc nghiệm';
    refresh();
    if (matchMedia('(max-width: 600px)').matches) window.scrollTo({ top: 0, behavior: 'instant' });
  }
  buttons.forEach(button => button.addEventListener('click', () => select(button.dataset.view)));
  ['file', 'cameraFile'].forEach(id => document.getElementById(id).addEventListener('change', () => select('scan')));
  new MutationObserver(refresh).observe(document.getElementById('batchPanel'), { attributes: true, attributeFilter: ['class'] });
  matchMedia('(max-width: 600px)').addEventListener('change', () => select(document.body.dataset.mobileView));
  select('scan');
})();
