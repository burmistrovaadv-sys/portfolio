/* =========================================================
   Ленивые видео.

   Раньше все ролики стояли с autoplay + preload, и браузер начинал
   тянуть их сразу при открытии страницы: на главной это три файла
   и 12,5 МБ параллельно, причём два из трёх лежат далеко внизу и
   до них могут вообще не долистать.

   Теперь в разметке preload="none" и никакого autoplay — файл не
   качается, пока не понадобится. Этот скрипт включает ролик, когда
   он подъезжает к экрану, и ставит на паузу, когда уходит.
   ========================================================= */

/* =========================================================
   Горизонтальная лента флоу: стрелки по бокам.

   Лента и без скрипта листается пальцем и колесом — стрелки
   только для мыши. Поэтому в разметке они стоят с hidden, и
   если скрипт не выполнился, пользователь не видит мёртвых
   кнопок.
   ========================================================= */
(function(){
  document.querySelectorAll('[data-scroller]').forEach(function(wrap){
    var lane = wrap.querySelector('.flows');
    var prev = wrap.querySelector('.flows-arrow.prev');
    var next = wrap.querySelector('.flows-arrow.next');
    if(!lane || !prev || !next) return;

    /* шаг прокрутки — ширина первого кадра с отступом: лента всегда
       встаёт на границу ролика, а не на случайный пиксель */
    function step(){
      var first = lane.querySelector('video');
      if(!first) return lane.clientWidth * 0.8;
      var gap = parseFloat(getComputedStyle(lane).columnGap) || 0;
      return first.getBoundingClientRect().width + gap;
    }

    /* 2px допуска: при дробном зуме scrollLeft не добирает до максимума
       ровно и стрелка «вперёд» зависала бы активной в самом конце */
    function sync(){
      var max = lane.scrollWidth - lane.clientWidth;
      var fits = max <= 2;
      prev.hidden = fits || lane.scrollLeft <= 2;
      next.hidden = fits || lane.scrollLeft >= max - 2;
    }

    prev.addEventListener('click', function(){ lane.scrollBy({ left: -step(), behavior: 'smooth' }); });
    next.addEventListener('click', function(){ lane.scrollBy({ left:  step(), behavior: 'smooth' }); });
    lane.addEventListener('scroll', sync, { passive: true });
    window.addEventListener('resize', sync);
    sync();

    /* высота кадров зависит от vw, но ширина — от пропорции, которую
       браузер уточняет после загрузки метаданных; пересчитываем тогда же */
    lane.querySelectorAll('video').forEach(function(v){
      v.addEventListener('loadedmetadata', sync);
    });
  });
})();

(function(){
  var vids = document.querySelectorAll('video[data-lazy]');
  if(!vids.length) return;

  function start(v){
    if(v.preload !== 'auto') v.preload = 'auto';
    var p = v.play();
    /* play() отдаёт промис и реджектится, если браузер решил не пускать
       автозапуск — глушим, иначе в консоли сыплются необработанные ошибки */
    if(p && p.catch) p.catch(function(){});
  }

  /* старые браузеры без IntersectionObserver — просто включаем всё */
  if(!('IntersectionObserver' in window)){
    Array.prototype.forEach.call(vids, start);
    return;
  }

  /* 300px запаса, чтобы ролик успел подгрузиться до появления в кадре */
  var io = new IntersectionObserver(function(entries){
    entries.forEach(function(e){
      var v = e.target;
      if(e.isIntersecting) start(v);
      else if(!v.paused) v.pause();
    });
  }, { rootMargin: '300px 0px' });

  Array.prototype.forEach.call(vids, function(v){ io.observe(v); });
})();
