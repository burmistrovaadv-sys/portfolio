/* Подсветка активного пункта в оглавлении кейса.
   Скрипт ничего не рисует и ничего не скрывает: если он не загрузится,
   страница читается полностью, просто без подсветки. */
(function () {
  var links = document.querySelectorAll('.case-nav a[href^="#"]');
  if (!links.length || !('IntersectionObserver' in window)) return;

  var map = {};
  var sections = [];

  for (var i = 0; i < links.length; i++) {
    var id = links[i].getAttribute('href').slice(1);
    var el = document.getElementById(id);
    if (!el) continue;
    map[id] = links[i];
    sections.push(el);
  }
  if (!sections.length) return;

  function setActive(id) {
    for (var key in map) {
      if (Object.prototype.hasOwnProperty.call(map, key)) {
        map[key].classList.toggle('is-active', key === id);
      }
    }
  }

  // Активной считается секция, пересекающая середину экрана.
  var io = new IntersectionObserver(function (entries) {
    for (var i = 0; i < entries.length; i++) {
      if (entries[i].isIntersecting) setActive(entries[i].target.id);
    }
  }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });

  for (var j = 0; j < sections.length; j++) io.observe(sections[j]);
})();
