(function () {
  var s = document.currentScript;
  var headUrl   = (s && s.dataset.head)   || '/assets/_head.html';
  var headerUrl = (s && s.dataset.header) || '/partials/header.html';
  var footerUrl = (s && s.dataset.footer) || '';
  var noCache   = (s && s.dataset.nocache) === 'true';
  var ts = noCache ? ('?ts=' + Date.now()) : '';

  // HEAD: 통째로 교체(outerHTML) X → "삽입" O
  fetch(headUrl + ts)
    .then(r => r.ok ? r.text() : Promise.reject(r.status))
    .then(html => {
      var target = document.getElementById('site-head') || document.head;
      // head 태그는 유지하고, 내부에 삽입만 수행
      target.insertAdjacentHTML('beforeend', html);
    })
    .catch(err => console.error('head 로드 실패:', err));

  // HEADER
  fetch(headerUrl + ts)
    .then(r => r.ok ? r.text() : Promise.reject(r.status))
    .then(html => {
      var ph = document.getElementById('header');
      if (ph) ph.innerHTML = html;
    })
    .catch(() => {});

  // FOOTER (선택)
  if (footerUrl) {
    fetch(footerUrl + ts)
      .then(r => r.ok ? r.text() : Promise.reject(r.status))
      .then(html => {
        var ph = document.getElementById('footer');
        if (ph) ph.innerHTML = html;
      })
      .catch(() => {});
  }
})();
