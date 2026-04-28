// ── Navigation toggle (mobile) ──────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.querySelector('.nav-toggle');
  const links  = document.querySelector('.nav-links');
  if (toggle && links) {
    toggle.addEventListener('click', () => links.classList.toggle('open'));
  }

  // Mark active nav link
  const path = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a').forEach(a => {
    if (a.getAttribute('href') === path) a.classList.add('active');
  });

  // Gallery lightbox
  const overlay = document.querySelector('.modal-overlay');
  const modalImg = overlay && overlay.querySelector('img');
  const modalCap = overlay && overlay.querySelector('.modal-caption');
  const closeBtn = overlay && overlay.querySelector('.modal-close');

  document.querySelectorAll('.gallery-item').forEach(item => {
    item.addEventListener('click', () => {
      if (!overlay) return;
      const img = item.querySelector('img');
      const cap = item.querySelector('.gallery-caption');
      if (img && modalImg) modalImg.src = img.src;
      if (cap && modalCap) modalCap.textContent = cap.textContent;
      overlay.classList.add('open');
    });
  });

  if (closeBtn) closeBtn.addEventListener('click', () => overlay.classList.remove('open'));
  if (overlay) overlay.addEventListener('click', e => {
    if (e.target === overlay) overlay.classList.remove('open');
  });

  // Keyboard close
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && overlay) overlay.classList.remove('open');
  });

  // Animate counters
  const counters = document.querySelectorAll('[data-count]');
  if (counters.length) {
    const io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const el = entry.target;
          const target = parseInt(el.dataset.count, 10);
          const duration = 1400;
          const step = target / (duration / 16);
          let current = 0;
          const timer = setInterval(() => {
            current = Math.min(current + step, target);
            el.textContent = Math.floor(current).toLocaleString();
            if (current >= target) clearInterval(timer);
          }, 16);
          io.unobserve(el);
        }
      });
    }, { threshold: 0.5 });
    counters.forEach(c => io.observe(c));
  }

  // Scroll reveal
  const reveals = document.querySelectorAll('.reveal');
  if (reveals.length) {
    const revealIO = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('visible');
          revealIO.unobserve(e.target);
        }
      });
    }, { threshold: 0.12 });
    reveals.forEach(el => revealIO.observe(el));
  }
});
