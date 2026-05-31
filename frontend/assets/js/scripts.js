// Año dinámico
const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = new Date().getFullYear();

// Elementos del DOM (cache)
const carousel = document.getElementById('carousel');
const track = document.getElementById('track');
const slides = Array.from(track?.children ?? []);
const total = slides.length;
const dots = Array.from(document.querySelectorAll('.dot'));
const vid = document.querySelector('.runner-video');
const openBtn = document.getElementById('pc-open');
const dialog = document.getElementById('pc-modal');

// Modal de camisetas
const tshirtOpenBtn = document.getElementById('tshirt-open');
const tshirtDialog = document.getElementById('tshirt-modal');

// Configuración y estado
let index = 0;
let timer = null;
const intervalMs = 5000; // 5 segundos
const normal = 0.7;
const slow = 0.3;

// Navegación del carrusel
function goTo(i) {
  index = (i + total) % total;
  if (track) track.style.setProperty('--x', `${-100 * index}%`);
  dots.forEach((d, di) => d.setAttribute('aria-current', di === index ? 'true' : 'false'));
}
function next() { goTo(index + 1); }
function prev() { goTo(index - 1); }

// Auto-play con pausa al interactuar
function start() {
  stop();
  if (total > 1) timer = setInterval(next, intervalMs);
}
function stop() {
  if (timer) clearInterval(timer);
  timer = null;
}

// Controles del carrusel (eventos)
const nextBtn = document.getElementById('next');
const prevBtn = document.getElementById('prev');
nextBtn?.addEventListener('click', () => { next(); start(); });
prevBtn?.addEventListener('click', () => { prev(); start(); });
dots.forEach(d => d.addEventListener('click', (e) => {
  const idx = parseInt(e.currentTarget.dataset.index, 10);
  if (!Number.isNaN(idx)) { goTo(idx); start(); }
}));

// Pausa cuando el cursor está encima o al enfocar con teclado / touch
if (carousel) {
  ['mouseenter','focusin','touchstart'].forEach(ev => carousel.addEventListener(ev, stop, { passive: true }));
  ['mouseleave','focusout','touchend'].forEach(ev => carousel.addEventListener(ev, start, { passive: true }));
}

// Asegura altura en móviles si no soporta aspect-ratio (fallback opcional)
(function ensureAspectRatio(){
  const supportsAspect = typeof CSS !== 'undefined' && CSS.supports && CSS.supports('aspect-ratio','16/9');
  if (!supportsAspect && carousel) {
    const resize = () => {
      const w = carousel.clientWidth;
      carousel.style.height = (w * 9 / 16) + 'px';
    };
    window.addEventListener('resize', resize);
    resize();
  }
})();

// Observa apariciones suaves al hacer scroll
const observer = new IntersectionObserver((entries, obs) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('show');
      obs.unobserve(entry.target); // ejecutar solo una vez
    }
  });
}, { threshold: 0.15 });

document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

// Control de velocidad del video de fondo del carrusel
function slowDown(){ if (vid) vid.playbackRate = slow; }
function speedUp(){ if (vid) vid.playbackRate = normal; }

if (carousel) {
  carousel.addEventListener('mouseenter', slowDown);
  carousel.addEventListener('mouseleave', speedUp);
  carousel.addEventListener('focusin', slowDown);
  carousel.addEventListener('focusout', speedUp);
}
if (vid) vid.addEventListener('loadedmetadata', () => { vid.playbackRate = normal; });

// Modal: abrir / cerrar y manejo de foco
openBtn?.addEventListener('click', (e) => {
  e.preventDefault();
  dialog?.showModal();           // abre modal
  const first = dialog?.querySelector('input[name="name"]');
  first?.focus();
});

// Cierra al clicar fuera (backdrop)
dialog?.addEventListener('click', (e) => {
  const rect = dialog.getBoundingClientRect();
  const inDialog = (
    e.clientX >= rect.left && e.clientX <= rect.right &&
    e.clientY >= rect.top  && e.clientY <= rect.bottom
  );
  if (!inDialog) dialog.close();
});

// Al cerrar, devolver el foco al disparador
dialog?.addEventListener('close', () => openBtn?.focus());

tshirtOpenBtn?.addEventListener('click', (e) => {
  e.preventDefault();
  tshirtDialog?.showModal();
  const firstInput = tshirtDialog?.querySelector('input[name="nombre"]');
  firstInput?.focus();
});

// Cierra al hacer clic fuera del modal
tshirtDialog?.addEventListener('click', (e) => {
  const rect = tshirtDialog.getBoundingClientRect();
  const inDialog =
    e.clientX >= rect.left && e.clientX <= rect.right &&
    e.clientY >= rect.top && e.clientY <= rect.bottom;
  if (!inDialog) tshirtDialog.close();
});

// Devuelve el foco al botón de abrir modal
tshirtDialog?.addEventListener('close', () => tshirtOpenBtn?.focus());

// Iniciar autoplay
start();

document.querySelectorAll('.tshirt-card').forEach(card => {
  const btn = card.querySelector('.view-back-btn');
  const frontImg = card.querySelector('.front-img');
  const backImg = card.querySelector('.back-img');

  btn.addEventListener('click', () => {
    if (frontImg.style.display !== 'none') {
      frontImg.style.display = 'none';
      backImg.style.display = 'block';
      btn.setAttribute('aria-label', 'Ver vista frontal de la camiseta');
      btn.title = 'Ver vista frontal';
    } else {
      frontImg.style.display = 'block';
      backImg.style.display = 'none';
      btn.setAttribute('aria-label', 'Ver vista trasera de la camiseta');
      btn.title = 'Ver vista trasera';
    }
  });
});
