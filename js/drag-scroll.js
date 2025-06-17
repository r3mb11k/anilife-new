// drag-scroll.js
// Простая утилита, позволяющая fтащить горизонтальный контейнер мышью/тачем.
// Использование: enableDragScroll(element, { fadeClassPrefix: 'swiper-has' });

(function(global) {
  'use strict';

  function enableDragScroll(container, options = {}) {
    if (!container) return;

    const opts = {
      fadeClassPrefix: 'drag-has',
      deceleration: 0.95,
      prevEl: null,
      nextEl: null,
      scrollAmount: 0.8,
      statefulContainer: container,
      ...options
    };

    let isDown = false;
    let isDragging = false;
    let startX;
    let scrollLeft;
    let velocity = 0;
    let rafId = null;

    container.addEventListener('pointerdown', handlePointerDown);
    container.addEventListener('pointermove', handlePointerMove);
    container.addEventListener('pointerup', handlePointerUp);
    container.addEventListener('pointerleave', handlePointerUp);

    container.addEventListener('click', e => {
      if (isDragging) {
        e.preventDefault();
        e.stopPropagation();
      }
    }, true);

    function handlePointerDown(e) {
      if (e.button !== 0) return;
      isDown = true;
      isDragging = false;
      startX = e.pageX - container.offsetLeft;
      scrollLeft = container.scrollLeft;
      velocity = 0;
      cancelAnimationFrame(rafId);
      container.classList.add('is-grabbing');
    }

    function handlePointerMove(e) {
      if (!isDown) return;
      const x = e.pageX - container.offsetLeft;
      const walk = x - startX;

      // Начинаем перетаскивание, только если курсор сдвинулся на 5+ пикселей
      if (Math.abs(walk) > 5) {
        isDragging = true;
      }
      
      // Прокручиваем только если мы в состоянии перетаскивания
      if (isDragging) {
        const newScrollLeft = scrollLeft - walk;
        velocity = newScrollLeft - container.scrollLeft;
        container.scrollLeft = newScrollLeft;
        updateEdgeClasses();
      }
    }

    function handlePointerUp() {
      if (!isDown) return;
      isDown = false;
      container.classList.remove('is-grabbing');
      rafId = requestAnimationFrame(momentumLoop);
      updateEdgeClasses();
    }

    function momentumLoop() {
      container.scrollLeft += velocity;
      velocity *= opts.deceleration;
      updateEdgeClasses();
      if (Math.abs(velocity) > 1) {
        rafId = requestAnimationFrame(momentumLoop);
      }
    }

    function updateEdgeClasses() {
      const el = container;
      const statefulEl = opts.statefulContainer;
      const atStart = el.scrollLeft <= 1;
      const atEnd = el.scrollLeft >= el.scrollWidth - el.clientWidth - 1;
      statefulEl.classList.toggle(`${opts.fadeClassPrefix}-prev`, !atStart);
      statefulEl.classList.toggle(`${opts.fadeClassPrefix}-next`, !atEnd);
      
      const prevArrow = opts.prevEl ? document.querySelector(opts.prevEl) : null;
      const nextArrow = opts.nextEl ? document.querySelector(opts.nextEl) : null;

      if (prevArrow) prevArrow.classList.toggle('hidden', atStart);
      if (nextArrow) nextArrow.classList.toggle('hidden', atEnd);
    }

    const prevArrow = opts.prevEl ? document.querySelector(opts.prevEl) : null;
    const nextArrow = opts.nextEl ? document.querySelector(opts.nextEl) : null;

    if (prevArrow) {
      prevArrow.addEventListener('click', () => {
        container.scrollBy({ left: -container.clientWidth * opts.scrollAmount, behavior: 'smooth' });
      });
    }

    if (nextArrow) {
      nextArrow.addEventListener('click', () => {
        container.scrollBy({ left: container.clientWidth * opts.scrollAmount, behavior: 'smooth' });
      });
    }

    updateEdgeClasses();
    container.addEventListener('scroll', updateEdgeClasses, { passive: true });
  }

  global.enableDragScroll = enableDragScroll;
})(window); 