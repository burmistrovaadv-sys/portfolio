/* =========================================================
   Общий скрипт страниц кейсов (/send-flow, /crypto-directory).
   Три независимых блока: табы с макетами, лайтбокс, подсветка
   активного пункта бокового меню. Без зависимостей.
   ========================================================= */
(function(){
  var ZOOM_SVG = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">'
    + '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4.2-4.2M11 8v6M8 11h6"/></svg>';
  document.querySelectorAll('.zoom').forEach(function(z){ if(!z.innerHTML.trim()) z.innerHTML = ZOOM_SVG; });

  /* --- tabs --- */
  document.querySelectorAll('[data-media]').forEach(function(media){
    var btns  = media.querySelectorAll('.tabs button');
    var shots = media.querySelectorAll('.shot');
    btns.forEach(function(btn, i){
      btn.addEventListener('click', function(){
        btns.forEach(function(b, j){ b.setAttribute('aria-selected', j === i ? 'true' : 'false'); });
        shots.forEach(function(s, j){ s.classList.toggle('on', j === i); });
      });
    });
  });

  /* --- lightbox --- */
  var lb = document.getElementById('lb'),
      lbImg = document.getElementById('lbImg'),
      lbTitle = document.getElementById('lbTitle'),
      lbSize = document.getElementById('lbSize'),
      lbScroll = document.getElementById('lbScroll');
  if(!lb) return;

  function open(src, title){
    lbImg.src = src;
    lbImg.classList.remove('full');
    lbSize.textContent = '100%';
    lbTitle.textContent = title || '';
    lb.classList.add('on');
    lbScroll.scrollTop = 0;
    document.body.style.overflow = 'hidden';
  }
  function close(){
    lb.classList.remove('on');
    lbImg.src = '';
    document.body.style.overflow = '';
  }
  function toggleSize(){
    var full = lbImg.classList.toggle('full');
    lbSize.textContent = full ? 'Вписать' : '100%';
  }

  document.querySelectorAll('[data-src]').forEach(function(el){
    el.style.cursor = 'zoom-in';
    el.addEventListener('click', function(){ open(el.getAttribute('data-src'), el.getAttribute('data-title')); });
    el.addEventListener('keydown', function(e){
      if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); open(el.getAttribute('data-src'), el.getAttribute('data-title')); }
    });
  });

  document.getElementById('lbClose').addEventListener('click', close);
  lbSize.addEventListener('click', toggleSize);
  lbImg.addEventListener('click', toggleSize);
  lbScroll.addEventListener('click', function(e){ if(e.target === lbScroll) close(); });
  document.addEventListener('keydown', function(e){ if(e.key === 'Escape' && lb.classList.contains('on')) close(); });

  /* --- active nav item --- */
  var links = Array.prototype.slice.call(document.querySelectorAll('aside a[href^="#"]'));
  var secs  = links.map(function(a){ return document.querySelector(a.getAttribute('href')); });
  function pick(){
    var cur = 0;
    secs.forEach(function(s, i){ if(s && s.getBoundingClientRect().top <= 140) cur = i; });
    links.forEach(function(a, i){ a.classList.toggle('on', i === cur); });
  }
  window.addEventListener('scroll', pick, { passive: true });
  pick();
})();
