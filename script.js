/**
 * ShopEase — Premium Delivery Ecommerce
 * Year: 2026 | Built for Tanzania Market
 * * SMS INTEGRATION: Africa's Talking API
 * When a customer places an order via WhatsApp form,
 * an SMS confirmation is sent to the customer's phone number.
 */

// ============================================================
// SMS CONFIGURATION — Africa's Talking
// ============================================================
const SMS_CONFIG = {
  apiKey:    "YOUR_AFRICASTALKING_API_KEY",     
  username:  "YOUR_AT_USERNAME",                
  senderId:  "ShopEase",                        
  apiUrl:    "https://api.africastalking.com/version1/messaging",
};

const CATEGORIES = [
  { id: "phones",      name: "Phones & Pads",    icon: "fa-mobile-screen",  img: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400" },
  { id: "electronics", name: "Audio & Sound",     icon: "fa-headphones",     img: "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=400" },
  { id: "watches",     name: "Watches",           icon: "fa-clock",          img: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400" },
  { id: "clothing",     name: "clothing",           icon: "fa-shirt",          img: "img/image001.jpg" },
];

const WHATSAPP_NUMBER = "255680515787";

// ============================================================
// APP STATE (Sasa hivi PRODUCTS inasomwa kutoka Decap CMS JSON)
// ============================================================
let PRODUCTS   = []; // Hapa itajazwa data ikitoka kwenye products.json
let cart       = JSON.parse(localStorage.getItem('se_cart'))     || [];
let wishlist   = JSON.parse(localStorage.getItem('se_wishlist')) || [];
let currentCategory = 'all';
let searchQuery     = '';
let qvCurrentId     = null;
let qvQty           = 1;

// ============================================================
// DOM READY & DATA FETCHING FROM DECAP CMS
// ============================================================
document.addEventListener('DOMContentLoaded', async () => {
  // BREKI YA ADMIN: Kama tupo kwenye ukurasa wa admin, simamisha kodi hizi mara moja!
  if (window.location.pathname.includes('/admin')) {
    return; 
  }

  initTheme();
  renderCategories();
  renderFilterChips();
  
  // --- KULAINISHA UBONGO: Vuta Bidhaa kutoka kwenye data/products.json ---
  try {
    const response = await fetch('/data/product.json');
    if (!response.ok) {
      throw new Error(`Haijaweza kupata faili la JSON: HTTP ${response.status}`);
    }
    PRODUCTS = await response.json();
    console.log("✅ Bidhaa zimepakiwa kutoka Decap JSON salama!", PRODUCTS);
  } catch (error) {
    console.error("⚠️ Shida imetokea kusoma data za Decap CMS. Hakikisha data/products.json ipo:", error);
    // Kama kuna error, tunatengeneza Array ya dharura duka lisizime kabisa
    PRODUCTS = []; 
  }

  // Baada ya bidhaa kupatikana, sasa duka linawaka rasmi
  renderProducts();
  updateCartBadge();
  setupEventListeners();
  initScrollReveal();
  initCountdown(1 * 24 * 60 * 60 * 1000);
  initLiveOrders();
  initFaq();
  initHeaderScroll();
});


// ============================================================
// THEME
// ============================================================
function initTheme() {
  const theme = localStorage.getItem('se_theme') || 'light';
  if (theme === 'dark') applyDark();
}

function applyDark() {
  document.body.classList.add('dark');
  const btn = document.getElementById('themeToggle');
  if (btn) btn.innerHTML = '<i class="fa-solid fa-sun"></i>';
}

function toggleTheme() {
  const isDark = document.body.classList.toggle('dark');
  localStorage.setItem('se_theme', isDark ? 'dark' : 'light');
  const btn = document.getElementById('themeToggle');
  if (btn) btn.innerHTML = isDark
    ? '<i class="fa-solid fa-sun"></i>'
    : '<i class="fa-solid fa-moon"></i>';
  showToast(isDark ? '🌙 Dark mode on' : '☀️ Light mode on');
}

// ============================================================
// RENDER CATEGORIES
// ============================================================
function renderCategories() {
  const grid = document.getElementById('categoryGrid');
  if (!grid) return;
  grid.innerHTML = CATEGORIES.map(cat => `
    <div class="category-card reveal" style="background-image:url('${cat.img}')" onclick="filterByCategory('${cat.id}')">
      <div class="category-card-inner">
        <i class="fa-solid ${cat.icon}"></i>
        <strong>${cat.name}</strong>
      </div>
    </div>
  `).join('');
}

// ============================================================
// RENDER FILTER CHIPS
// ============================================================
function renderFilterChips() {
  const wrap = document.getElementById('filterChips');
  if (!wrap) return;
  const all = [{ id: 'all', name: 'All Products' }, ...CATEGORIES];
  wrap.innerHTML = all.map(c => `
    <button class="chip ${currentCategory === c.id ? 'active' : ''}" onclick="filterByCategory('${c.id}')">
      ${c.name}
    </button>
  `).join('');
}

// ============================================================
// RENDER PRODUCTS
// ============================================================
function renderProducts() {
  const grid = document.getElementById('productGrid');
  if (!grid) return;

  const filtered = PRODUCTS.filter(p => {
    const catOk    = currentCategory === 'all' || p.category === currentCategory;
    const searchOk = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    return catOk && searchOk;
  });

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:var(--muted);">
        <i class="fa-solid fa-magnifying-glass" style="font-size:2rem;opacity:0.3;display:block;margin-bottom:12px;"></i>
        <p>No products match your search. Try a different term.</p>
      </div>`;
    return;
  }

  grid.innerHTML = filtered.map(p => {
    const stars = Array(5).fill('').map((_, i) =>
      `<i class="${i < p.rating ? 'fa-solid' : 'fa-regular'} fa-star"></i>`
    ).join('');
    const inWish = wishlist.includes(p.id);
    const discount = p.oldPrice
      ? Math.round((1 - p.price / p.oldPrice) * 100)
      : null;

    return `
      <div class="product-card reveal">
        <div class="product-media">
          ${discount ? `<span class="discount-tag">-${discount}%</span>` : ''}
          <button class="icon-btn wishlist-btn ${inWish ? 'active' : ''}" onclick="toggleWishlist('${p.id}')" title="Wishlist">
            <i class="${inWish ? 'fa-solid' : 'fa-regular'} fa-heart"></i>
          </button>
          <img src="${p.img}" alt="${p.name}" loading="lazy">
          <div class="qv-overlay">
            <button class="btn-qv" onclick="openQuickView('${p.id}')">
              <i class="fa-solid fa-eye"></i> Quick View
            </button>
          </div>
        </div>
        <div class="product-body">
          <h3>${p.name}</h3>
          <div class="product-rating">
            ${stars}
            <span class="count">(${p.reviews})</span>
          </div>
          <div class="product-price-row">
            <span class="price-new">TZS ${p.price.toLocaleString()}</span>
            ${p.oldPrice ? `<span class="price-old">TZS ${p.oldPrice.toLocaleString()}</span>` : ''}
          </div>
          <div class="card-actions">
            <button class="btn btn-primary" onclick="addToCart('${p.id}')">
              <i class="fa-solid fa-bag-shopping"></i> Add to Cart
            </button>
            <button class="btn btn-ghost" onclick="openQuickView('${p.id}')">
              <i class="fa-solid fa-eye"></i>
            </button>
          </div>
        </div>
      </div>`;
  }).join('');

  initScrollReveal();
}

// ============================================================
// FILTER & SEARCH
// ============================================================
function filterByCategory(catId) {
  currentCategory = catId;
  renderFilterChips();
  renderProducts();
  document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' });
}

// ============================================================
// CART ENGINE
// ============================================================
function addToCart(productId) {
  const product = PRODUCTS.find(p => p.id === productId);
  if (!product) return;
  const existing = cart.find(i => i.id === productId);
  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({ ...product, quantity: 1 });
  }
  saveCart();
  updateCartBadge();
  showToast(`<i class="fa-solid fa-check"></i> ${product.name} added to cart`);
}

// Hakikisha hesabu ya kuhesabu muda ipo ili isivunje kodi ya mwanzo
function initCountdown(duration) {
  const timerEl = document.getElementById('countdownTimer');
  if (!timerEl) return;
  let targetTime = Date.now() + duration;
  setInterval(() => {
    let diff = targetTime - Date.now();
    if (diff <= 0) diff = 0;
    let hours = Math.floor(diff / (1000 * 60 * 60));
    let mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    let secs = Math.floor((diff % (1000 * 60)) / 1000);
    timerEl.textContent = `${hours}h : ${mins}m : ${secs}s`;
  }, 1000);
}

function changeCartQty(productId, delta) {
  const item = cart.find(i => i.id === productId);
  if (!item) return;
  item.quantity += delta;
  if (item.quantity <= 0) cart = cart.filter(i => i.id !== productId);
  saveCart();
  updateCartBadge();
  renderCartItems();
}

function removeFromCart(productId) {
  cart = cart.filter(i => i.id !== productId);
  saveCart();
  updateCartBadge();
  renderCartItems();
  showToast('<i class="fa-solid fa-trash-can"></i> Item removed');
}

function saveCart() {
  localStorage.setItem('se_cart', JSON.stringify(cart));
}

function updateCartBadge() {
  const total = cart.reduce((sum, i) => sum + i.quantity, 0);
  const badge = document.getElementById('cartCount');
  if (badge) {
    badge.textContent = total;
    badge.style.display = total === 0 ? 'none' : 'flex';
  }
}

function renderCartItems() {
  const wrap  = document.getElementById('cartItems');
  const foot  = document.getElementById('cartFoot');
  const total = document.getElementById('cartTotal');
  if (!wrap) return;

  if (cart.length === 0) {
    wrap.innerHTML = `
      <div class="cart-empty">
        <i class="fa-solid fa-bag-shopping"></i>
        <p>Your cart is empty</p>
        <a href="#products" onclick="closeAllModals()" class="btn btn-primary">Start Shopping</a>
      </div>`;
    if (foot) foot.style.display = 'none';
    return;
  }

  let gross = 0;
  wrap.innerHTML = cart.map(item => {
    const sub = item.price * item.quantity;
    gross += sub;
    return `
      <div class="cart-item">
        <img class="cart-item-img" src="${item.img}" alt="${item.name}">
        <div class="cart-item-info">
          <h5>${item.name}</h5>
          <div class="cart-item-price">TZS ${item.price.toLocaleString()}</div>
          <div class="cart-item-qty">
            <button class="qty-mini" onclick="changeCartQty('${item.id}', -1)">−</button>
            <span>${item.quantity}</span>
            <button class="qty-mini" onclick="changeCartQty('${item.id}', 1)">+</button>
          </div>
        </div>
        <button class="cart-item-del" onclick="removeFromCart('${item.id}')" title="Remove">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>`;
  }).join('');

  if (total) total.textContent = `TZS ${gross.toLocaleString()}`;
  if (foot) foot.style.display = 'flex';
}

// ============================================================
// WISHLIST
// ============================================================
function toggleWishlist(productId) {
  const idx = wishlist.indexOf(productId);
  if (idx > -1) {
    wishlist.splice(idx, 1);
    showToast('<i class="fa-regular fa-heart"></i> Removed from wishlist');
  } else {
    wishlist.push(productId);
    showToast('<i class="fa-solid fa-heart"></i> Added to wishlist!');
  }
  localStorage.setItem('se_wishlist', JSON.stringify(wishlist));
  renderProducts();
}

// ============================================================
// QUICK VIEW MODAL
// ============================================================
let qvQtyValue = 1;

function openQuickView(productId) {
  const p = PRODUCTS.find(prod => prod.id === productId);
  if (!p) return;

  qvCurrentId = productId;
  qvQtyValue  = 1;

  const stars = Array(5).fill('').map((_, i) =>
    `<i class="${i < p.rating ? 'fa-solid' : 'fa-regular'} fa-star"></i>`
  ).join('');

  document.getElementById('qvImage').src     = p.img;
  document.getElementById('qvTitle').textContent = p.name;
  document.getElementById('qvRating').innerHTML  = stars + `<span style="font-size:.8rem;color:var(--muted);margin-left:4px;">(${p.reviews} reviews)</span>`;
  document.getElementById('qvPrice').textContent = `TZS ${p.price.toLocaleString()}`;
  document.getElementById('qvQty').textContent   = 1;

  const oldPriceEl = document.getElementById('qvOldPrice');
  if (p.oldPrice) {
    oldPriceEl.textContent = `TZS ${p.oldPrice.toLocaleString()}`;
    oldPriceEl.style.display = '';
  } else {
    oldPriceEl.style.display = 'none';
  }

  const badgeEl = document.getElementById('qvBadge');
  if (p.oldPrice) {
    const disc = Math.round((1 - p.price / p.oldPrice) * 100);
    badgeEl.textContent = `-${disc}%`;
    badgeEl.style.display = '';
  } else {
    badgeEl.style.display = 'none';
  }

  document.getElementById('qvAddToCartBtn').onclick = () => {
    for (let i = 0; i < qvQtyValue; i++) addToCart(productId);
    closeAllModals();
  };

  document.getElementById('qvOrderNowBtn').onclick = () => {
    for (let i = 0; i < qvQtyValue; i++) addToCart(productId);
    closeAllModals();
    setTimeout(() => openOrderModal(), 300);
  };

  openModal('quickViewModal');
}

function changeQvQty(delta) {
  qvQtyValue = Math.max(1, qvQtyValue + delta);
  document.getElementById('qvQty').textContent = qvQtyValue;
}

// ============================================================
// ORDER MODAL
// ============================================================
function openOrderModal() {
  if (cart.length === 0) {
    showToast('<i class="fa-solid fa-warning"></i> Your cart is empty!');
    return;
  }

  const summaryEl = document.getElementById('orderItemsSummary');
  if (summaryEl) {
    const names = cart.map(i => `${i.name} ×${i.quantity}`).join(' · ');
    const total = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
    summaryEl.innerHTML = `
      <i class="fa-solid fa-bag-shopping"></i>
      <span>${names} — <strong>TZS ${total.toLocaleString()}</strong></span>`;
  }

  document.getElementById('cartSidebar')?.classList.remove('open');
  openModal('orderModal');
}

// ============================================================
// ORDER SUBMISSION + SMS
// ============================================================
async function handleOrderSubmission(e) {
  e.preventDefault();

  const name    = document.getElementById('customerName').value.trim();
  const phone   = document.getElementById('customerPhone').value.trim();
  const address = document.getElementById('customerAddress').value.trim();
  const notes   = document.getElementById('customerNotes').value.trim() || "None";

  if (!name || !phone || !address) {
    showToast('<i class="fa-solid fa-warning"></i> Please fill all required fields');
    return;
  }

  let total = 0;
  let msg   = `*🛒 NEW ORDER — ShopEase*\n\n`;
  msg += `👤 *Customer:* ${name}\n`;
  msg += `📞 *Phone:* ${phone}\n`;
  msg += `📍 *Address:* ${address}\n`;
  msg += `📝 *Notes:* ${notes}\n\n`;
  msg += `*ITEMS ORDERED:*\n`;

  cart.forEach((item, i) => {
    const sub = item.price * item.quantity;
    total += sub;
    msg += `${i + 1}. ${item.name} ×${item.quantity} — TZS ${sub.toLocaleString()}\n`;
    
    if (item.img.startsWith('http')) {
      msg += `   🖼️ Image: ${item.img}\n`;
    } else {
      msg += `   🖼️ Image: https://shopease.co.tz/${item.img}\n`;
    }
  });

  msg += `\n💰 *GRAND TOTAL:* TZS ${total.toLocaleString()}\n\n`;
  msg += `_Payment: Cash on Delivery. Pay after inspection._\n`;
  msg += `_ShopEase — Premium Delivery, Tanzania_`;

  const waUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
  window.open(waUrl, '_blank');

  const smsText = buildSmsText(name, total);
  const normalizedPhone = normalizePhone(phone);

  sendSmsConfirmation(normalizedPhone, smsText);

  closeAllModals();
  document.getElementById('orderForm')?.reset();
  cart = [];
  saveCart();
  updateCartBadge();

  const smsOverlay = document.getElementById('smsConfirm');
  if (smsOverlay) smsOverlay.style.display = 'flex';
}

function buildSmsText(customerName, totalAmount) {
  return (
    `Hi ${customerName}! Your ShopEase order (TZS ${totalAmount.toLocaleString()}) ` +
    `has been received. We will contact you shortly to confirm delivery. ` +
    `Pay cash on delivery. Questions? Call +255680515787. Thank you!`
  );
}

function normalizePhone(phone) {
  phone = phone.replace(/\s+/g, '').replace(/[-()]/g, '');
  if (phone.startsWith('0')) return '+255' + phone.slice(1);
  if (phone.startsWith('255')) return '+' + phone;
  if (!phone.startsWith('+')) return '+255' + phone;
  return phone;
}

async function sendSmsConfirmation(phoneNumber, message) {
  if (
    SMS_CONFIG.apiKey === "YOUR_AFRICASTALKING_API_KEY" ||
    SMS_CONFIG.username === "YOUR_AT_USERNAME"
  ) {
    console.warn("📱 SMS not sent: Africa's Talking credentials not configured.");
    return;
  }

  try {
    const formData = new URLSearchParams();
    formData.append('username', SMS_CONFIG.username);
    formData.append('to',       phoneNumber);
    formData.append('message',  message);
    formData.append('from',     SMS_CONFIG.senderId);

    const response = await fetch(SMS_CONFIG.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'apiKey':        SMS_CONFIG.apiKey,
        'Accept':        'application/json',
      },
      body: formData.toString(),
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const result = await response.json();
    console.info('✅ SMS sent successfully:', result);
  } catch (err) {
    console.warn('⚠️ SMS send failed (non-critical):', err.message);
  }
}

// ============================================================
// MODAL HELPERS
// ============================================================
function openModal(id) {
  document.getElementById(id)?.classList.add('open');
  document.getElementById('overlay')?.classList.add('show');
  document.body.style.overflow = 'hidden';
}

function closeAllModals() {
  ['quickViewModal', 'orderModal'].forEach(id =>
    document.getElementById(id)?.classList.remove('open')
  );
  document.getElementById('cartSidebar')?.classList.remove('open');
  document.getElementById('overlay')?.classList.remove('show');
  document.body.style.overflow = '';
}

// ============================================================
// EVENT LISTENERS
// ============================================================
function setupEventListeners() {
  document.getElementById('themeToggle')?.addEventListener('click', toggleTheme);

  document.getElementById('menuToggle')?.addEventListener('click', () => {
    document.getElementById('navLinks')?.classList.toggle('open');
  });

  document.getElementById('searchToggle')?.addEventListener('click', (e) => {
    e.stopPropagation();
    const dd = document.getElementById('searchDropdown');
    dd?.classList.toggle('open');
    if (dd?.classList.contains('open')) {
      setTimeout(() => document.getElementById('searchInput')?.focus(), 100);
    }
  });

  document.addEventListener('click', (e) => {
    const dd = document.getElementById('searchDropdown');
    if (dd && !dd.closest('.search-wrap')?.contains(e.target)) {
      dd.classList.remove('open');
    }
  });

  document.getElementById('searchInput')?.addEventListener('input', (e) => {
    searchQuery = e.target.value;
    renderProducts();
  });

  document.getElementById('cartButton')?.addEventListener('click', () => {
    renderCartItems();
    document.getElementById('cartSidebar')?.classList.add('open');
    document.getElementById('overlay')?.add('show');
  });

  document.getElementById('closeCart')?.addEventListener('click', closeAllModals);
  document.getElementById('overlay')?.addEventListener('click', closeAllModals);
  document.getElementById('checkoutButton')?.addEventListener('click', openOrderModal);
  document.getElementById('orderForm')?.addEventListener('submit', handleOrderSubmission);

  const backTop = document.getElementById('backTop');
  window.addEventListener('scroll', () => {
    if (backTop) backTop.style.display = window.scrollY > 400 ? 'flex' : 'none';
  });
  backTop?.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

  window.addEventListener('scroll', highlightNavOnScroll, { passive: true });
}

// ============================================================
// TOAST
// ============================================================
function showToast(htmlMsg) {
  const stack = document.getElementById('toastStack');
  if (!stack) return;
  const t = document.createElement('div');
  t.className = 'toast';
  t.innerHTML = htmlMsg;
  stack.appendChild(t);
  setTimeout(() => {
    t.style.opacity = '0';
    t.style.transform = 'translateY(10px)';
    t.style.transition = 'all 0.3s';
    setTimeout(() => t.remove(), 300);
  }, 3200);
}

// ============================================================
// SCROLL REVEAL
// ============================================================
function initScrollReveal() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
}

// ============================================================
// LIVE ORDERS SIMULATION (Social Proof)
// ============================================================
function initLiveOrders() {
  const ticker = document.getElementById('liveOrder');
  if (!ticker) return;

  const names   = ["Amani", "Said", "Fatma", "Kelvin", "Mariam", "Juma", "Neema", "Hussein", "Grace", "Baraka"];
  const places  = ["Kinondoni", "Temeke", "Ilala", "Mwenge", "Sinza", "Posta", "Mikocheni", "Kariakoo"];

  setInterval(() => {
    if (PRODUCTS.length === 0) return; // Linda isilete kosa kama hakuna bidhaa bado
    const name = names[Math.floor(Math.random() * names.length)];
    const loc  = places[Math.floor(Math.random() * places.length)];
    const prod = PRODUCTS[Math.floor(Math.random() * PRODUCTS.length)];
    const mins = Math.floor(Math.random() * 55) + 2;

    ticker.innerHTML = `
      <div class="live-ticker-inner">
        <i class="fa-solid fa-circle-check"></i>
        <span><strong>${name}</strong> from ${loc} ordered <strong>${prod.name}</strong> ${mins}m ago</span>
      </div>`;
    ticker.classList.add('show');
    setTimeout(() => ticker.classList.remove('show'), 5000);
  }, 10000);
}

// ============================================================
// FAQ ACCORDION
// ============================================================
function initFaq() {
  document.querySelectorAll('.faq-q').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = btn.closest('.faq-item');
      const isOpen = item.classList.contains('open');
      document.querySelectorAll('.faq-item.open').forEach(i => i.classList.remove('open'));
      if (!isOpen) item.classList.add('open');
    });
  });
}

// ============================================================
// HEADER SCROLL EFFECT
// ============================================================
function initHeaderScroll() {
  const header = document.getElementById('siteHeader');
  window.addEventListener('scroll', () => {
    header?.classList.toggle('scrolled', window.scrollY > 20);
  }, { passive: true });
}

// ============================================================
// NAV HIGHLIGHT ON SCROLL
// ============================================================
function highlightNavOnScroll() {
  const sections = ['home', 'categories', 'products', 'faq'];
  let current = 'home';
  sections.forEach(id => {
    const el = document.getElementById(id);
    if (el && window.scrollY >= el.offsetTop - 100) current = id;
  });
  document.querySelectorAll('.nav-link').forEach(link => {
    const href = link.getAttribute('href')?.replace('#', '');
    link.classList.toggle('active', href === current || (href === '' && current === 'home'));
  });
}
