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
