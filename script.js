gsap.registerPlugin(ScrollTrigger);

const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const isTouch = window.matchMedia('(pointer: coarse)').matches;

/* -------- Lenis smooth scroll -------- */
let lenis;
if (!prefersReduced) {
  lenis = new Lenis({
    duration: 1.15,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    smoothTouch: false,
  });
  function raf(time) {
    lenis.raf(time);
    requestAnimationFrame(raf);
  }
  requestAnimationFrame(raf);
  lenis.on('scroll', ScrollTrigger.update);
}

/* -------- Nav scroll state -------- */
const nav = document.getElementById('nav');
window.addEventListener('scroll', () => {
  if (window.scrollY > 60) nav.classList.add('is-scrolled');
  else nav.classList.remove('is-scrolled');
}, { passive: true });

/* -------- Hero 4-beat cadence -------- */
if (!prefersReduced) {
  const heroTl = gsap.timeline({ delay: 0.3 });
  heroTl
    .fromTo('.hero__eyebrow', { opacity: 0, y: -16 }, { opacity: 1, y: 0, duration: 0.7, ease: 'power2.out' })
    .fromTo('.hero__title', { opacity: 0, y: 50 }, { opacity: 1, y: 0, duration: 1.2, ease: 'expo.out' }, '-=0.3')
    .fromTo('.hero__sub', { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.85, ease: 'power2.out' }, '-=0.6')
    .fromTo('.hero__cta-row', { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.75, ease: 'power2.out' }, '-=0.45');
} else {
  document.querySelectorAll('.hero__eyebrow, .hero__title, .hero__sub, .hero__cta-row').forEach(el => {
    el.style.opacity = '1';
  });
}

/* -------- Stacked cards cover -------- */
const cards = document.querySelectorAll('.cardstack__card');
const N = cards.length;

if (!prefersReduced && cards.length > 0) {
  cards.forEach((card, i) => {
    gsap.set(card, {
      y: i === 0 ? 0 : window.innerHeight * 0.55,
      opacity: i === 0 ? 1 : 0,
      scale: 1,
      zIndex: i + 1,
    });
  });

  ScrollTrigger.create({
    trigger: '#cardstackPin',
    start: 'top top',
    end: `+=${N * 100}%`,
    pin: true,
    pinSpacing: true,
    scrub: 1,
    anticipatePin: 1,
    invalidateOnRefresh: true,
    onUpdate: (self) => {
      const seg = 1 / N;
      cards.forEach((card, i) => {
        const localP = gsap.utils.clamp(0, 1, (self.progress - i * seg) / seg);
        const nextLocalP = i < N - 1
          ? gsap.utils.clamp(0, 1, (self.progress - (i + 1) * seg) / seg)
          : 0;

        if (i === 0) {
          gsap.set(card, {
            y: 0,
            opacity: 1 - nextLocalP * 0.4,
            scale: 1 - nextLocalP * 0.05,
            filter: `brightness(${1 - nextLocalP * 0.35})`,
            zIndex: i + 1,
          });
        } else {
          const inP = localP;
          gsap.set(card, {
            y: (1 - inP) * window.innerHeight * 0.55,
            opacity: inP - nextLocalP * 0.4,
            scale: 1 - nextLocalP * 0.05,
            filter: `brightness(${1 - nextLocalP * 0.35})`,
            zIndex: i + 1,
          });
        }
      });
    },
  });
} else if (prefersReduced) {
  cards.forEach((card) => {
    gsap.set(card, { position: 'relative', top: 'auto', left: 'auto', transform: 'none', opacity: 1, marginBottom: '2rem' });
  });
  const pin = document.getElementById('cardstackPin');
  pin.style.height = 'auto';
  pin.style.padding = '2rem 0';
}

/* -------- Reveal on scroll -------- */
const io = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-in');
      io.unobserve(entry.target);
    }
  });
}, { threshold: 0.15, rootMargin: '0px 0px -80px 0px' });

document.querySelectorAll('[data-reveal]').forEach(el => io.observe(el));

/* ============ CART LOGIC ============ */
const cart = [];
const cartEl = document.getElementById('cart');
const cartBackdrop = document.getElementById('cartBackdrop');
const cartBody = document.getElementById('cartBody');
const cartFoot = document.getElementById('cartFoot');
const cartSubtotal = document.getElementById('cartSubtotal');
const cartDelivery = document.getElementById('cartDelivery');
const cartTotal = document.getElementById('cartTotal');
const cartCheckout = document.getElementById('cartCheckout');
const navCartCount = document.getElementById('navCartCount');
const cartFab = document.getElementById('cartFab');
const fabCount = document.getElementById('fabCount');
const toast = document.getElementById('toast');
const toastItem = document.getElementById('toastItem');

function addToCart(id, name, price, img) {
  const existing = cart.find(item => item.id === id);
  if (existing) {
    existing.qty++;
  } else {
    cart.push({ id, name, price, img, qty: 1 });
  }
  renderCart();
  showToast(name);
  cartFab.classList.add('is-visible');
}

function removeFromCart(id) {
  const idx = cart.findIndex(item => item.id === id);
  if (idx > -1) cart.splice(idx, 1);
  renderCart();
}

function changeQty(id, delta) {
  const item = cart.find(item => item.id === id);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) {
    removeFromCart(id);
  } else {
    renderCart();
  }
}

function getSubtotal() {
  return cart.reduce((sum, item) => sum + item.price * item.qty, 0);
}

function getTotalCount() {
  return cart.reduce((sum, item) => sum + item.qty, 0);
}

function renderCart() {
  const count = getTotalCount();
  navCartCount.textContent = count;
  fabCount.textContent = count;

  if (cart.length === 0) {
    cartBody.innerHTML = `
      <div class="cart__empty">
        <div class="cart__empty-mark">—</div>
        <p>Your box is empty.</p>
        <p>Choose a flavor from tonight's board to begin.</p>
        <p class="cart__empty-hint">Open until 11pm</p>
      </div>
    `;
    cartFoot.style.display = 'none';
    return;
  }

  cartBody.innerHTML = cart.map(item => `
    <div class="cart-item">
      <div class="cart-item__img">
        <img src="https://picsum.photos/seed/${item.img}/200/200" alt="">
      </div>
      <div class="cart-item__info">
        <h4>${item.name}</h4>
        <div class="cart-item__sub">$${item.price} · per scoop</div>
        <div class="cart-item__qty">
          <button onclick="changeQty('${item.id}', -1)" aria-label="Decrease">−</button>
          <span>${item.qty}</span>
          <button onclick="changeQty('${item.id}', 1)" aria-label="Increase">+</button>
        </div>
      </div>
      <div class="cart-item__right">
        <div class="cart-item__price">$${item.price * item.qty}</div>
        <button class="cart-item__remove" onclick="removeFromCart('${item.id}')">Remove</button>
      </div>
    </div>
  `).join('');

  cartFoot.style.display = 'block';
  const sub = getSubtotal();
  const delivery = sub >= 50 ? 0 : 6;
  cartSubtotal.textContent = `$${sub}`;
  cartDelivery.textContent = delivery === 0 ? 'Free' : `$${delivery}`;
  cartTotal.textContent = `$${sub + delivery}`;
}

function openCart() {
  cartEl.classList.add('is-open');
  cartBackdrop.classList.add('is-open');
  document.body.style.overflow = 'hidden';
  if (lenis) lenis.stop();
}
function closeCart() {
  cartEl.classList.remove('is-open');
  cartBackdrop.classList.remove('is-open');
  document.body.style.overflow = '';
  if (lenis) lenis.start();
}

document.getElementById('navCartBtn').addEventListener('click', openCart);
document.getElementById('cartFab').addEventListener('click', openCart);
document.getElementById('cartClose').addEventListener('click', closeCart);
cartBackdrop.addEventListener('click', closeCart);

cartCheckout.addEventListener('click', () => {
  const total = cartTotal.textContent;
  cartBody.innerHTML = `
    <div class="cart__empty">
      <div class="cart__empty-mark" style="color:var(--gold-500);opacity:1">✓</div>
      <p style="font-family:'Cormorant Garamond',serif;font-size:1.6rem;color:var(--gold-100)">Box reserved.</p>
      <p>Your order of <span style="color:var(--gold-500)">${total}</span> has been queued.</p>
      <p>Counter staff will have it packed within the hour.</p>
      <p class="cart__empty-hint">See you at the door</p>
    </div>
  `;
  cartFoot.style.display = 'none';
  cart.length = 0;
  navCartCount.textContent = '0';
  fabCount.textContent = '0';
  setTimeout(() => cartFab.classList.remove('is-visible'), 600);
});

/* -------- Add-to-cart bindings -------- */
document.querySelectorAll('.flavor-add').forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const id = btn.dataset.id;
    const name = btn.dataset.name;
    const price = parseInt(btn.dataset.price, 10);
    const img = btn.dataset.img;
    addToCart(id, name, price, img);
  });
});

/* -------- Toast -------- */
let toastTimer;
function showToast(name) {
  toastItem.textContent = name;
  toast.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 2200);
}

/* -------- Initial cart render -------- */
renderCart();

/* -------- Smooth anchor scroll via Lenis -------- */
document.querySelectorAll('a[href^="#"]').forEach(link => {
  link.addEventListener('click', (e) => {
    const targetId = link.getAttribute('href');
    if (targetId === '#' || !targetId) return;
    const target = document.querySelector(targetId);
    if (!target) return;
    e.preventDefault();
    if (lenis) {
      lenis.scrollTo(target, { offset: -20, duration: 1.4 });
    } else {
      target.scrollIntoView({ behavior: 'smooth' });
    }
  });
});

/* -------- Refresh ScrollTrigger after images load -------- */
window.addEventListener('load', () => {
  ScrollTrigger.refresh();
});