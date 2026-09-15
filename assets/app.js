/* Появление блоков при прокрутке.
   Весь контент есть в HTML — скрипт только добавляет анимацию,
   поэтому при отключённом JS страница остаётся полностью читаемой. */
(function () {
  var items = document.querySelectorAll('.reveal');
  if (!items.length) return;

  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!('IntersectionObserver' in window) || reduced) {
    for (var i = 0; i < items.length; i++) items[i].classList.add('is-visible');
    return;
  }

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) {
        e.target.classList.add('is-visible');
        io.unobserve(e.target);
      }
    });
  }, { rootMargin: '0px 0px -10% 0px', threshold: 0.05 });

  items.forEach(function (el) { io.observe(el); });
})();
