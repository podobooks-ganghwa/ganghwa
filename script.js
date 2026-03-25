/* ===================================
   포도책방 강화점 — 인터랙션 스크립트
   =================================== */

// ─── 헤더 스크롤 효과 ───────────────────────────────────────
(function () {
  const header = document.getElementById('header');
  window.addEventListener('scroll', function () {
    if (window.scrollY > 30) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  }, { passive: true });
})();

// ─── 모바일 메뉴 토글 ───────────────────────────────────────
(function () {
  const toggle = document.getElementById('menuToggle');
  const nav = document.getElementById('headerNav');

  toggle.addEventListener('click', function () {
    const isOpen = nav.classList.toggle('open');
    toggle.setAttribute('aria-label', isOpen ? '메뉴 닫기' : '메뉴 열기');
  });

  // 메뉴 링크 클릭 시 닫기
  nav.querySelectorAll('a').forEach(function (link) {
    link.addEventListener('click', function () {
      nav.classList.remove('open');
    });
  });

  // 바깥 클릭 시 닫기
  document.addEventListener('click', function (e) {
    if (!toggle.contains(e.target) && !nav.contains(e.target)) {
      nav.classList.remove('open');
    }
  });
})();

// ─── FAQ 아코디언 ────────────────────────────────────────────
(function () {
  const items = document.querySelectorAll('.faq-item');

  items.forEach(function (item) {
    const btn = item.querySelector('.faq-item__question');
    const answer = item.querySelector('.faq-item__answer');

    btn.addEventListener('click', function () {
      const isOpen = item.classList.contains('open');

      // 다른 항목 모두 닫기
      items.forEach(function (other) {
        if (other !== item) {
          other.classList.remove('open');
          other.querySelector('.faq-item__question').setAttribute('aria-expanded', 'false');
          other.querySelector('.faq-item__answer').style.maxHeight = '0';
        }
      });

      // 현재 항목 토글
      if (isOpen) {
        item.classList.remove('open');
        btn.setAttribute('aria-expanded', 'false');
        answer.style.maxHeight = '0';
      } else {
        item.classList.add('open');
        btn.setAttribute('aria-expanded', 'true');
        answer.style.maxHeight = answer.scrollHeight + 'px';
      }
    });
  });
})();

// ─── 숫자 카운트업 애니메이션 ────────────────────────────────
(function () {
  const statNums = document.querySelectorAll('.stat__num[data-target]');
  let started = false;

  function easeOutQuart(t) {
    return 1 - Math.pow(1 - t, 4);
  }

  function animateCount(el) {
    const target = parseInt(el.dataset.target, 10);
    const duration = 2000;
    const startTime = performance.now();

    function update(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOutQuart(progress);
      const current = Math.round(eased * target);

      el.textContent = current.toLocaleString('ko-KR');

      if (progress < 1) {
        requestAnimationFrame(update);
      } else {
        el.textContent = target.toLocaleString('ko-KR');
      }
    }

    requestAnimationFrame(update);
  }

  function startCountUp() {
    if (started) return;
    started = true;
    statNums.forEach(function (el) {
      animateCount(el);
    });
  }

  // IntersectionObserver로 히어로 섹션이 보일 때 실행
  if ('IntersectionObserver' in window) {
    const hero = document.querySelector('.hero__stats');
    const observer = new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) {
        startCountUp();
        observer.disconnect();
      }
    }, { threshold: 0.3 });
    if (hero) observer.observe(hero);
  } else {
    startCountUp();
  }
})();

// ─── 스크롤 페이드인 ─────────────────────────────────────────
(function () {
  const targets = document.querySelectorAll(
    '.step, .press-card, .pricing-card, .faq-item, .branch__info, .branch__quote, .section__header'
  );

  targets.forEach(function (el) {
    el.classList.add('fade-in');
  });

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry, i) {
        if (entry.isIntersecting) {
          // 약간의 딜레이로 순차 등장
          setTimeout(function () {
            entry.target.classList.add('visible');
          }, (i % 4) * 80);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    targets.forEach(function (el) {
      observer.observe(el);
    });
  } else {
    targets.forEach(function (el) {
      el.classList.add('visible');
    });
  }
})();

// ─── 갤러리 라이트박스 ────────────────────────────────────────
var lightboxImages = [];
var lightboxIndex = 0;

(function () {
  var items = document.querySelectorAll('.gallery-item');
  items.forEach(function (item, i) {
    lightboxImages.push(item.querySelector('img'));
  });
})();

function openLightbox(el) {
  var img = el.querySelector('img');
  lightboxIndex = lightboxImages.indexOf(img);
  var lb = document.getElementById('lightbox');
  document.getElementById('lightboxImg').src = img.src;
  document.getElementById('lightboxImg').alt = img.alt;
  lb.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  document.getElementById('lightbox').classList.remove('active');
  document.body.style.overflow = '';
}

function moveLightbox(dir) {
  lightboxIndex = (lightboxIndex + dir + lightboxImages.length) % lightboxImages.length;
  var img = lightboxImages[lightboxIndex];
  document.getElementById('lightboxImg').src = img.src;
  document.getElementById('lightboxImg').alt = img.alt;
}

document.addEventListener('keydown', function (e) {
  var lb = document.getElementById('lightbox');
  if (!lb.classList.contains('active')) return;
  if (e.key === 'Escape') closeLightbox();
  if (e.key === 'ArrowLeft') moveLightbox(-1);
  if (e.key === 'ArrowRight') moveLightbox(1);
});

// ─── 부드러운 앵커 스크롤 (헤더 높이 오프셋) ─────────────────
(function () {
  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      const targetId = a.getAttribute('href');
      if (targetId === '#') return;
      const targetEl = document.querySelector(targetId);
      if (!targetEl) return;
      e.preventDefault();
      const headerHeight = document.getElementById('header').offsetHeight;
      const top = targetEl.getBoundingClientRect().top + window.scrollY - headerHeight - 16;
      window.scrollTo({ top: top, behavior: 'smooth' });
    });
  });
})();
