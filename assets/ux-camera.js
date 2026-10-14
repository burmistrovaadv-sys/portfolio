/* =========================================================
   Кинематографичная камера по записи экрана.

   Источник правды — сам ролик: это реальная запись работы с интерфейсом,
   мы её не перерисовываем. Сверху добавляются только три вещи:
   движение камеры (transform по видео), чипы и UX-выводы.

   Почему transform, а не перекодированное видео с зумами: исходник один,
   весит 1,3 МБ, а камеру можно править текстом и выключать для
   prefers-reduced-motion. Перерисовка идёт в композиторе, layout не трогаем.

   Раскадровка размечена по реальным таймкодам записи (детект смены кадра
   + просмотр кадров), поэтому чипы совпадают с настоящими кликами.
   ========================================================= */
(function () {
  'use strict';

  /* ---------------------------------------------------------
     Раскадровка Ozon «Портрет покупателя», 42,8 с.

     cam: t — секунда ролика, cx/cy — точка кадра (0..1), которую держим
     в центре, s — зум. Между ключами интерполяция с плавным разгоном.

     Камера намеренно стоит на месте, пока страница сама скроллится
     (3,0–4,3 / 13,2–15,9 / 21,0–22,0 / 34,6–37,8): если двигать кадр
     поверх скролла, зритель теряет ориентацию.
     --------------------------------------------------------- */
  var STORY = {
    ozon: {
      duration: 42.8,
      cam: [
        { t: 0.0,  cx: 0.50, cy: 0.50, s: 1.00 },
        { t: 2.0,  cx: 0.50, cy: 0.50, s: 1.00 },
        { t: 3.0,  cx: 0.50, cy: 0.42, s: 1.18 },
        { t: 4.4,  cx: 0.50, cy: 0.42, s: 1.18 },
        { t: 5.0,  cx: 0.17, cy: 0.78, s: 1.95 },  /* клик по диаграмме «Пол» — 5,19 */
        { t: 7.6,  cx: 0.17, cy: 0.78, s: 1.95 },
        { t: 8.4,  cx: 0.40, cy: 0.80, s: 1.95 },  /* клик по столбцу 25–34 — 8,59 */
        { t: 11.4, cx: 0.40, cy: 0.80, s: 1.95 },
        { t: 12.4, cx: 0.73, cy: 0.74, s: 1.85 },  /* выбор региона на карте — 12,64 */
        { t: 13.1, cx: 0.73, cy: 0.74, s: 1.85 },
        { t: 13.6, cx: 0.50, cy: 0.50, s: 1.10 },
        { t: 15.9, cx: 0.50, cy: 0.50, s: 1.10 },
        { t: 16.6, cx: 0.50, cy: 0.50, s: 1.00 },
        { t: 17.6, cx: 0.26, cy: 0.80, s: 1.80 },  /* клик по диапазону чека — 17,87 */
        { t: 19.0, cx: 0.26, cy: 0.80, s: 1.80 },
        { t: 19.4, cx: 0.58, cy: 0.78, s: 1.80 },  /* клик по категории «Палатки» — 19,54 */
        { t: 21.0, cx: 0.58, cy: 0.78, s: 1.80 },
        { t: 21.6, cx: 0.50, cy: 0.50, s: 1.00 },
        { t: 22.4, cx: 0.46, cy: 0.08, s: 1.70 },  /* закреплённая строка фильтров */
        { t: 23.9, cx: 0.46, cy: 0.08, s: 1.70 },
        { t: 24.6, cx: 0.68, cy: 0.88, s: 1.70 },  /* «Рекомендуемые действия» */
        { t: 27.0, cx: 0.68, cy: 0.88, s: 1.70 },
        { t: 28.2, cx: 0.22, cy: 0.88, s: 1.60 },  /* «Что мы знаем об этом сегменте» */
        { t: 31.5, cx: 0.22, cy: 0.88, s: 1.60 },
        { t: 32.5, cx: 0.50, cy: 0.78, s: 1.25 },
        { t: 34.4, cx: 0.50, cy: 0.78, s: 1.25 },
        { t: 35.2, cx: 0.50, cy: 0.50, s: 1.00 },
        { t: 38.0, cx: 0.50, cy: 0.50, s: 1.00 },
        { t: 38.8, cx: 0.30, cy: 0.15, s: 1.80 },  /* «Сегмент сохранён» */
        { t: 41.0, cx: 0.30, cy: 0.15, s: 1.80 },
        { t: 42.8, cx: 0.50, cy: 0.50, s: 1.05 }
      ],

      /* Чипы висят в углу, потому что камера всегда держит нужный элемент
         в центре кадра — углы гарантированно свободны. Сторона выбрана так,
         чтобы чип был на противоположной от курсора половине. */
      chips: [
        /* d=1.6, а не 2.6: следующий чип тоже в правом верхнем углу.
           Уход занимает ещё 0,5 с, поэтому чип должен погаснуть до 5,35 с —
           иначе два чипа секунду стоят в одной точке */
        { t: 3.2,  d: 1.6, at: 'tr', text: 'Размер сегмента — сразу' },
        { t: 5.35, d: 2.6, at: 'tr', text: 'Клик по диаграмме = фильтр' },
        { t: 8.75, d: 2.6, at: 'tr', text: 'Выбранное остаётся ярким' },
        { t: 12.8, d: 2.4, at: 'tl', text: 'Карта и список — один фильтр' },
        { t: 18.05,d: 2.4, at: 'tr', text: 'Срез по среднему чеку' },
        { t: 19.7, d: 2.3, at: 'tl', text: 'Интерес — тоже фильтр' },
        { t: 22.5, d: 2.6, at: 'br', text: 'Условия среза закреплены сверху' },
        { t: 24.8, d: 2.6, at: 'tl', text: 'Срез переходит в действие' },
        { t: 28.6, d: 2.6, at: 'tr', text: 'Срез объяснён словами' },
        { t: 39.0, d: 2.8, at: 'br', text: 'Сегмент сохранён' }
      ],

      /* Выводы — только то, что видно на записи. Ни цифр «стало лучше на N%»,
         ни результатов исследований: это концепт, метрик у него нет. */
      notes: [
        { t: 0.5,  d: 2.6, k: 'Задача',
          text: 'Разобрать сегмент брошенных корзин по срезам и довести его до конкретного действия.' },
        { t: 5.6,  d: 2.6, k: 'Взаимодействие',
          text: 'График сам работает фильтром: клик по доле «Женщины» сужает срез, отдельную панель фильтров открывать не нужно.' },
        { t: 9.0,  d: 2.4, k: 'Обратная связь',
          text: 'Невыбранные столбцы приглушаются, а не исчезают — видно и выбор, и то, от чего отказались.' },
        { t: 14.3, d: 2.4, k: 'Синхронизация',
          text: 'Регион выбирается и на карте, и в списке рядом: у двух представлений одно состояние.' },
        { t: 25.3, d: 2.8, k: 'Результат',
          text: 'Внизу страницы срез превращается в рекомендации — с уже подставленной аудиторией.' },
        { t: 29.4, d: 3.0, k: 'Объяснение',
          text: 'Панель «Что мы знаем об этом сегменте» пересказывает набранный срез словами, а не только процентами.' },
        { t: 39.4, d: 3.1, k: 'Итог',
          text: 'Пять кликов по графикам — от сегмента в 54 820 человек до сохранённого среза и предложенной кампании.' }
      ]
    }
  };

  /* плавный разгон и торможение — камера не дёргается на стыках сцен */
  function ease(p) {
    return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
  }

  /* Кадр не должен выезжать за край видео: при зуме s видно 1/s кадра,
     поэтому центр зажат в [0.5/s, 1-0.5/s]. Без этого по краям
     появлялись бы пустые полосы. */
  function clampCenter(c, s) {
    var half = 0.5 / s;
    if (half >= 0.5) return 0.5;
    return Math.min(Math.max(c, half), 1 - half);
  }

  function sampleCam(keys, t) {
    if (t <= keys[0].t) return keys[0];
    var last = keys[keys.length - 1];
    if (t >= last.t) return last;

    var i = 0;
    while (i < keys.length - 1 && keys[i + 1].t <= t) i++;

    var a = keys[i], b = keys[i + 1];
    var span = b.t - a.t;
    var p = span > 0 ? ease((t - a.t) / span) : 0;

    return {
      cx: a.cx + (b.cx - a.cx) * p,
      cy: a.cy + (b.cy - a.cy) * p,
      s:  a.s  + (b.s  - a.s)  * p
    };
  }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text) n.textContent = text;
    return n;
  }

  function init(root) {
    var story = STORY[root.getAttribute('data-ux')];
    if (!story) return;

    var video = root.querySelector('.ux__video');
    var layer = root.querySelector('.ux__layer');
    var bar   = root.querySelector('.ux__bar > i');
    var toggle= root.querySelector('.ux__toggle');
    if (!video || !layer) return;

    var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ---- разметка оверлеев строится из раскадровки, а не руками в HTML:
       так таймкоды и тексты лежат в одном месте и не разъезжаются ---- */
    var chipNodes = story.chips.map(function (c) {
      var n = el('span', 'ux__chip ux__chip--' + c.at, c.text);
      layer.appendChild(n);
      return n;
    });

    /* Выводы живут отдельно от слоя с чипами: на десктопе их кладёт поверх
       кадра CSS, а на телефоне (кадр ~296px) они уходят под видео —
       иначе три строки текста перекрывают половину записи. */
    var notesBox = root.querySelector('.ux__notes') || layer;
    var noteNodes = story.notes.map(function (n) {
      var box = el('figcaption', 'ux__note');
      box.appendChild(el('span', 'ux__note-k', n.k));
      box.appendChild(el('p', 'ux__note-t', n.text));
      notesBox.appendChild(box);
      return box;
    });

    /* метки сцен на прогрессе — видно, где в ролике живут ключевые клики */
    var marks = root.querySelector('.ux__marks');
    if (marks) {
      story.chips.forEach(function (c) {
        var m = el('i');
        m.style.left = (c.t / story.duration * 100).toFixed(2) + '%';
        marks.appendChild(m);
      });
    }

    var raf = 0;
    var lastOn = '';

    function render() {
      var t = video.currentTime;

      if (!reduced) {
        var c = sampleCam(story.cam, t);
        var cx = clampCenter(c.cx, c.s);
        var cy = clampCenter(c.cy, c.s);
        video.style.transform =
          'scale(' + c.s.toFixed(4) + ') translate(' +
          ((0.5 - cx) * 100).toFixed(3) + '%,' +
          ((0.5 - cy) * 100).toFixed(3) + '%)';
      }

      /* класс трогаем только при смене состояния: иначе каждый кадр
         дёргает пересчёт стилей на 17 узлах */
      var on = '';
      chipNodes.forEach(function (n, i) {
        var c = story.chips[i];
        var vis = t >= c.t && t < c.t + c.d;
        on += vis ? '1' : '0';
      });
      noteNodes.forEach(function (n, i) {
        var d = story.notes[i];
        var vis = t >= d.t && t < d.t + d.d;
        on += vis ? '1' : '0';
      });

      if (on !== lastOn) {
        chipNodes.forEach(function (n, i) {
          n.classList.toggle('is-on', on[i] === '1');
        });
        noteNodes.forEach(function (n, i) {
          n.classList.toggle('is-on', on[chipNodes.length + i] === '1');
        });
        lastOn = on;
      }

      if (bar) bar.style.transform = 'scaleX(' + (t / story.duration).toFixed(4) + ')';
    }

    function tick() {
      render();
      raf = requestAnimationFrame(tick);
    }
    function start() {
      if (!raf) raf = requestAnimationFrame(tick);
    }
    /* на паузе цикл не крутим, но один кадр дорисовываем:
       иначе оверлеи застывают в состоянии предыдущего кадра */
    function stop() {
      if (raf) { cancelAnimationFrame(raf); raf = 0; }
      render();
    }

    video.addEventListener('play', function () { root.classList.add('is-playing'); start(); });
    video.addEventListener('pause', function () { root.classList.remove('is-playing'); stop(); });
    video.addEventListener('ended', function () { root.classList.remove('is-playing'); stop(); });
    video.addEventListener('loadeddata', render);
    /* перемотка на паузе тоже должна перерисовать камеру и оверлеи */
    video.addEventListener('seeked', function () { if (!raf) render(); });

    if (toggle) {
      toggle.addEventListener('click', function () {
        if (video.paused) {
          if (video.ended || video.currentTime >= story.duration - 0.05) video.currentTime = 0;
          var p = video.play();
          if (p && p.catch) p.catch(function () {});
        } else {
          video.pause();
        }
      });
    }

    /* Грузим и запускаем, только когда блок подъезжает к экрану:
       2 МБ не должны качаться ради секции в самом низу страницы. */
    if (!('IntersectionObserver' in window)) {
      if (!reduced) { video.preload = 'auto'; var p0 = video.play(); if (p0 && p0.catch) p0.catch(function () {}); }
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          if (video.preload !== 'auto') video.preload = 'auto';
          if (reduced) return;                 /* при reduce ждём ручного запуска */
          var p = video.play();
          if (p && p.catch) p.catch(function () {});
        } else if (!video.paused) {
          video.pause();
        }
      });
    }, { rootMargin: '300px 0px', threshold: 0.01 });

    io.observe(root);
  }

  var roots = document.querySelectorAll('[data-ux]');
  Array.prototype.forEach.call(roots, init);
})();
