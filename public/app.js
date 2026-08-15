let DATA = {
  menu: [],
  settings: {},
  reviews: [],
  coupons: []
};

let cart = [];
let heroIndex = 0;
let heroTimer = null;
let couponDiscount = 0;
let appliedCoupon = '';
let customerLocation = '';

const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);


/* =========================
   BASIC HELPERS
========================= */

function money(n) {
  return (DATA.settings.currency || '₹') +
    Number(n || 0).toLocaleString('en-IN');
}

function toast(msg) {
  const t = $('#toast');
  if (!t) return;

  t.className = 'toast show';
  t.textContent = msg;

  setTimeout(() => {
    t.className = 'toast';
  }, 2400);
}


/* =========================
   INITIAL LOAD
========================= */

async function init() {
  try {
    const r = await fetch('/api/public-data');

    if (!r.ok) {
      throw new Error('Could not load public data');
    }

    DATA = await r.json();

    renderHero();
    renderCats();
    renderMenu();
    renderReviews();
    renderCart();

    startHero();

  } catch (err) {
    console.error('WASABEE INIT ERROR:', err);
    toast('Website data could not be loaded.');
  }
}


/* =========================
   HERO BANNER
========================= */

function renderHero() {
  const container = $('#heroSlides');
  const dots = $('#heroDots');

  if (!container) return;

  const banners = Array.isArray(DATA.settings.heroBanners)
    ? DATA.settings.heroBanners
    : [];

  if (!banners.length) {
    container.innerHTML = '';
    if (dots) dots.innerHTML = '';
    return;
  }

  container.innerHTML = banners.map((x, i) => {

    const title = String(
      x.title || 'Oriental Excellence'
    ).replace(
      'Oriental Excellence',
      'Oriental <em>Excellence</em>'
    );

    return 
      <div
        class="hero-slide ${i === 0 ? 'active' : ''}"
        style="background-image:url('${x.image || ''}')"
      >
        <div class="hero-content">

          <img
            class="hero-logo-white"
            src="/assets/logo-white.png"
            alt="WASABEE Oriental Cuisine"
          >

          <span class="eyebrow">
            WASABEE • ORIENTAL CUISINE
          </span>

          <h1>${title}</h1>

          <p>${x.subtitle || ''}</p>

          <div class="hero-actions">
            <a class="btn purple" href="#order">
              Order Online →
            </a>

            <a class="btn ghost" href="#booking">
              Book a Table
            </a>
          </div>

        </div>
      </div>
    `;
  }).join('');

  if (dots) {
    dots.innerHTML = banners.map((_, i) => `
      <span class="dot ${i === 0 ? 'active' : ''}"></span>
    `).join('');
  }

  heroIndex = 0;
}

function startHero() {
  if (heroTimer) {
    clearInterval(heroTimer);
  }

  const slides = $$('.hero-slide');

  if (slides.length <= 1) return;

  heroTimer = setInterval(() => {
    heroNext();
  }, 5000);
}

function heroNext() {
  const slides = $$('.hero-slide');

  if (!slides.length) return;

  heroIndex =
    (heroIndex + 1) % slides.length;

  heroPaint();
}

function heroPrev() {
  const slides = $$('.hero-slide');

  if (!slides.length) return;

  heroIndex =
    (heroIndex - 1 + slides.length) % slides.length;

  heroPaint();
}

function heroPaint() {
  $$('.hero-slide').forEach((slide, i) => {
    slide.classList.toggle(
      'active',
      i === heroIndex
    );
  });

  $$('.dot').forEach((dot, i) => {
    dot.classList.toggle(
      'active',
      i === heroIndex
    );
  });
}


/* =========================
   CATEGORY BUTTONS
========================= */

function renderCats() {
  const container = $('#categories');

  if (!container) return;

  const categories = Array.isArray(DATA.menu)
    ? DATA.menu
    : [];

  container.innerHTML = categories.map((cat, i) => `
    <button
      class="cat ${i === 0 ? 'active' : ''}"
      onclick="jumpCat('${cat.id}')"
      type="button"
    >
      <span class="icon">
        ${cat.icon || ''}
      </span>

      ${cat.name || ''}
    </button>
  `).join('');
}


/* =========================
   MENU DATA
========================= */

function flattenItems(cat) {

  if (Array.isArray(cat.items)) {
    return cat.items.map(item => ({
      ...item,
      sub: ''
    }));
  }

  return (cat.subcategories || []).flatMap(sub =>
    (sub.items || []).map(item => ({
      ...item,
      sub: sub.name || ''
    }))
  );
}


/* =========================
   MENU IMAGE
========================= */


function imageFor(item){

  if(item.image && String(item.image).trim()){
    return item.image;
  }

  return '/assets/menu-placeholder.jpg';
}
```


  /*
    No fake external image is used here.
    If an item has no image, the CSS background
    will remain available instead of loading
    a broken Unsplash image.
  */

  return '';
}


/* =========================
   MENU
========================= */

function renderMenu(){
  let html = '';

  function itemCard(item){
    if(item.active === false) return '';

    const base = item.variants
      ? Math.min(...item.variants.map(v => Number(v.price || 0)))
      : Number(item.price || 0);

    const label = item.variants
      ? `${item.variants.length} choices`
      : money(base);

    return 
      <article class="food-card">

        <div
          class="food-img"
          style="
            background-image:url('${imageFor(item)}');
            background-size:cover;
            background-position:center;
            background-repeat:no-repeat;
          "
        ></div>

        <div class="food-body">

          <h4>${item.name || ''}</h4>

          <p>
            ${item.description || 'Authentic oriental preparation crafted by WASABEE.'}
          </p>

          ${
            item.variants
              ? `<span class="variant-label">
                  ${label} • Select before adding
                </span>`
              : ''
          }

          <div class="price-row">

            <span class="price">
              ${
                item.variants
                  ? `From ${money(base)}`
                  : money(base)
              }
            </span>

            <button
              type="button"
              class="add"
              onclick='openItem(${JSON.stringify(item).replace(/'/g,"&#39;")})'
            >
              Add +
            </button>

          </div>

        </div>

      </article>
    ;
  }

  DATA.menu.forEach((cat, index) => {

    const items = flattenItems(cat).filter(item => item.active !== false);

    if(!items.length) return;

    html += `
      <section
        class="menu-category"
        id="cat-${cat.id}"
      >

        <div class="section-head menu-category-head">

          <div>
            <span class="eyebrow">
              ${cat.name || 'MENU'}
            </span>

            <h2>
              ${cat.name || ''}
            </h2>
          </div>

        </div>

        <div class="menu-grid">
          ${items.map(itemCard).join('')}
        </div>

      </section>
    `;
  });

  $('#menu').innerHTML = html;
}


/* =========================
   FOOD CARD
========================= */

function itemCard(item) {

  if (item.active === false) {
    return '';
  }

  const variants = Array.isArray(item.variants)
    ? item.variants
    : [];

  const hasVariants = variants.length > 0;

  const base = hasVariants
    ? Math.min(
        ...variants.map(v =>
          Number(v.price || 0)
        )
      )
    : Number(item.price || 0);

  const label = hasVariants
    ? `${variants.length} choices`
    : money(base);

  const image = imageFor(item);

  const imageStyle = image
    ? 
      background-image:url('${image}');
      background-size:cover;
      background-position:center;
    `
    : '';

  return `
    <article class="food-card">

      <div
        class="food-img"
        style="${imageStyle}"
      >
        <span>
          ${
            String(item.name || '')
              .toLowerCase()
              .includes('soup')
              ? '🍲'
              : ''
          }
        </span>
      </div>

      <div class="food-body">

        <h4>
          ${item.name || ''}
        </h4>

        <p>
          ${
            item.description ||
            'Authentic oriental preparation crafted by WASABEE.'
          }
        </p>

        ${
          hasVariants
            ? `
              <span class="variant-label">
                ${label} • Select before adding
              </span>
            `
            : ''
        }

        <div class="price-row">

          <span class="price">
            ${
              hasVariants
                ? `From ${money(base)}`
                : money(item.price)
            }
          </span>

          <button
            class="add"
            type="button"
            onclick='openItem(${JSON.stringify(item).replace(/'/g, '&#39;')})'
          >
            Add +
          </button>

        </div>

      </div>

    </article>
  ;
}


/* =========================
   MENU SEARCH
========================= */

function openMenuSearch() {

  const modal =
    document.getElementById('menuSearchModal');

  const input =
    document.getElementById('menuSearch');

  if (!modal || !input) {
    console.error(
      'menuSearchModal or menuSearch not found'
    );
    return;
  }

  modal.classList.add('show');

  setTimeout(() => {
    input.focus();
  }, 100);
}

function closeMenuSearch() {

  const modal =
    document.getElementById('menuSearchModal');

  const input =
    document.getElementById('menuSearch');

  if (modal) {
    modal.classList.remove('show');
  }

  if (input) {
    input.value = '';
  }

  clearMenuSearch();
}

function searchMenu() {

  const input =
    document.getElementById('menuSearch');

  const result =
    document.getElementById('menuSearchResults');

  if (!input) return;

  const query =
    input.value.trim().toLowerCase();

  const cards =
    document.querySelectorAll('.food-card');

  let found = 0;

  cards.forEach(card => {

    const text =
      card.innerText.toLowerCase();

    if (!query) {

      card.style.display = '';

    } else if (text.includes(query)) {

      card.style.display = '';
      found++;

    } else {

      card.style.display = 'none';

    }
  });

  if (result) {

    if (!query) {

      result.innerHTML = '';

    } else if (found) {

      result.innerHTML =
        `<p class="search-found">
          ${found} menu item${found > 1 ? 's' : ''} found
        </p>`;

    } else {

      result.innerHTML =
        `<p class="search-not-found">
          No menu item found.
        </p>`;

    }
  }
}

function clearMenuSearch() {

  const input =
    document.getElementById('menuSearch');

  if (input) {
    input.value = '';
  }

  document
    .querySelectorAll('.food-card')
    .forEach(card => {
      card.style.display = '';
    });

  const result =
    document.getElementById('menuSearchResults');

  if (result) {
    result.innerHTML = '';
  }
}


/* =========================
   ITEM MODAL
========================= */

function openItem(item) {

  const groups =
    (item.addonGroups || [])
      .map(id =>
        (DATA.settings.addonGroups || [])
          .find(g => g.id === id)
      )
      .filter(
        g => g && g.active !== false
      );

  let addonHtml = '';

  if (groups.length) {

    addonHtml = 
      <div class="addon-section">

        <div class="addon-section-title">
          <span>➕ Customize Your Order</span>
          <small>
            Choose options if you want
          </small>
        </div>

        ${groups.map(g => 

          <div class="addon-group">

            <div class="addon-group-title">

              <div>
                <h3>${g.name}</h3>
                <small>
                  ${g.description || ''}
                </small>
              </div>

              <span class="addon-rule">
                ${g.required ? 'Required' : 'Optional'}
                ·
                ${
                  g.selection === 'multiple'
                    ? 'Choose multiple'
                    : 'Choose one'
                }
              </span>

            </div>

            <div class="addon-choice-list">

              ${
                (g.options || [])
                  .filter(o => o.active !== false)
                  .map(o => 

                    <button
                      type="button"
                      class="addon-choice"
                      data-group="${g.id}"
                      data-mode="${
                        g.selection === 'multiple'
                          ? 'multiple'
                          : 'single'
                      }"
                      data-price="${Number(o.price || 0)}"
                      data-name="${String(o.name).replace(/"/g, '&quot;')}"
                      onclick="selectAddonChoice(this)"
                    >

                      <span>
                        ${
                          g.selection === 'multiple'
                            ? '☐'
                            : '○'
                        }
                      </span>

                      <b>
                        ${o.name}
                      </b>

                      <em>
                        ${
                          Number(o.price || 0)
                            ? '+' + money(o.price)
                            : 'Included'
                        }
                      </em>

                    </button>

                  `).join('') ||
                  '<div class="empty">No active options in this group.</div>'
              }

            </div>

          </div>

        `).join('')}

      </div>
    `;
  }


  const legacy =
    item.addons?.length
      ? 
        <div class="addon-section">

          <div class="addon-section-title">
            <span>Choose Add-on</span>
            <small>
              Legacy item options
            </small>
          </div>

          <div class="addon-list">

            ${item.addons.map(a => 

              <button
                type="button"
                class="addon"
                data-name="${String(a).replace(/"/g, '&quot;')}"
                data-price="0"
                onclick="this.classList.toggle('selected')"
              >
                ${a}
              </button>

            `).join('')}

          </div>

        </div>
      `
      : '';


  const variantsHtml =
    item.variants?.length
      ? `
        <div class="variant-list">

          ${item.variants.map((v, i) => `

            <button
              type="button"
              class="variant ${
                i === 0 ? 'selected' : ''
              }"
              data-price="${v.price}"
              onclick="selectVariant(this)"
            >

              <span>
                ${v.name}
              </span>

              <b>
                ${money(v.price)}
              </b>

            </button>

          `).join('')}

        </div>
      `
      : `
        <input
          type="hidden"
          id="singlePrice"
          value="${item.price || 0}"
        >
      `;


  const modalBody =
    $('#itemModalBody');

  if (!modalBody) return;


  modalBody.innerHTML = `

    <span class="eyebrow">
      ${
        item.variants?.length
          ? 'CHOOSE VARIANT'
          : 'ADD TO CART'
      }
    </span>

    <h2>
      ${item.name}
    </h2>

    <p>
      ${
        item.description ||
        'Authentic oriental preparation crafted by WASABEE.'
      }
    </p>

    ${variantsHtml}

    ${addonHtml}

    ${legacy}

    <div class="modal-price-note">
      Container charge is added at checkout.
    </div>

    <div style="margin-top:22px">

      <button
        class="btn purple full"
        type="button"
        onclick='confirmAdd(${JSON.stringify(item).replace(/'/g, '&#39;')})'
      >
        Add to Cart
      </button>

    </div>
  `;

  $('#itemModal')?.classList.add('show');
}

function selectVariant(el) {

  $$('#itemModal .variant')
    .forEach(x =>
      x.classList.remove('selected')
    );

  el.classList.add('selected');
}

function selectAddonChoice(el) {

  const mode =
    el.dataset.mode;

  if (mode === 'single') {

    $$(
      `#itemModal .addon-choice[data-group="${CSS.escape(el.dataset.group)}"]`
    ).forEach(x => {

      x.classList.remove('selected');

      const span =
        x.querySelector('span');

      if (span) {
        span.textContent = '○';
      }
    });

    el.classList.add('selected');

    const span =
      el.querySelector('span');

    if (span) {
      span.textContent = '●';
    }

  } else {

    el.classList.toggle('selected');

    const span =
      el.querySelector('span');

    if (span) {
      span.textContent =
        el.classList.contains('selected')
          ? '☑'
          : '☐';
    }
  }
}

function closeItem() {
  $('#itemModal')?.classList.remove('show');
}


/* =========================
   ADD TO CART
========================= */

function confirmAdd(item) {

  let variant = '';
  let price = Number(item.price || 0);

  if (item.variants?.length) {

    const selected =
      $('#itemModal .variant.selected');

    variant =
      selected
        ?.querySelector('span')
        ?.textContent ||
      item.variants[0].name;

    price =
      Number(
        selected?.dataset.price ||
        item.variants[0].price
      );
  }


  const groups =
    (item.addonGroups || [])
      .map(id =>
        (DATA.settings.addonGroups || [])
          .find(g => g.id === id)
      )
      .filter(
        g => g && g.active !== false
      );


  for (const g of groups) {

    if (
      g.required &&
      !$$(
        `#itemModal .addon-choice[data-group="${CSS.escape(g.id)}"].selected`
      ).length
    ) {

      toast(`Please choose ${g.name}`);

      return;
    }
  }


  const addons =
    [...$$(
      '#itemModal .addon-choice.selected'
    )].map(x => ({
      name: x.dataset.name,
      price: Number(x.dataset.price || 0)
    }));


  const legacy =
    [...$$(
      '#itemModal .addon.selected'
    )].map(x => ({
      name:
        x.dataset.name ||
        x.textContent.trim(),
      price:
        Number(x.dataset.price || 0)
    }));


  addons.push(...legacy);


  const addonTotal =
    addons.reduce(
      (sum, a) =>
        sum + Number(a.price || 0),
      0
    );


  cart.push({

    key:
      Date.now() +
      Math.random(),

    id: item.id,

    name: item.name,

    variant,

    addons,

    price:
      price + addonTotal,

    basePrice:
      price,

    qty: 1,

    containerCharge:
      Number(
        item.containerCharge ??
        DATA.settings.defaultContainerCharge ??
        0
      )
  });


  closeItem();

  renderCart();

  toast('Added to cart ✓');
}


/* =========================
   CART
========================= */

function renderCart() {

  const count =
    cart.reduce(
      (sum, item) =>
        sum + item.qty,
      0
    );

  if ($('#cartCount')) {
    $('#cartCount').textContent =
      count;
  }

  if ($('#drawerCount')) {
    $('#drawerCount').textContent =
      count;
  }


  if ($('#cartItems')) {

    $('#cartItems').innerHTML =
      cart.length

        ? cart.map((x, i) => `

          <div class="cart-row">

            <div class="cart-thumb">
              🍜
            </div>

            <div class="cart-info">

              <h4>
                ${x.name}
              </h4>

              <small>
                ${x.variant || ''}
                ${
                  x.addons?.length
                    ? ' · ' +
                      x.addons
                        .map(a =>
                          typeof a === 'string'
                            ? a
                            : a.name
                        )
                        .join(', ')
                    : ''
                }
              </small>

              <div class="qty">

                <button
                  type="button"
                  onclick="changeQty(${i}, -1)"
                >
                  −
                </button>

                <b>
                  ${x.qty}
                </b>

                <button
                  type="button"
                  onclick="changeQty(${i}, 1)"
                >
                  +
                </button>

              </div>

            </div>

            <div>

              <b>
                ${money(x.price * x.qty)}
              </b>

              <button
                class="remove"
                type="button"
                onclick="removeItem(${i})"
              >
                🗑
              </button>

            </div>

          </div>

        `).join('')

        : `
          <div class="empty">
            Your cart is empty.
            <br>
            Add something delicious!
          </div>
        `;
  }


  const sub =
    cart.reduce(
      (sum, x) =>
        sum + x.price * x.qty,
      0
    );

  const discount =
    sub *
    (Number(
      DATA.settings.discountPercent || 15
    ) / 100);

  const gst =
    (sub - discount) *
    (Number(
      DATA.settings.gstPercent || 5
    ) / 100);

  const total =
    sub -
    discount +
    gst;


  if ($('#cartSummary')) {

    $('#cartSummary').innerHTML = `

      <div class="sum">
        <span>Sub Total</span>
        <b>${money(sub)}</b>
      </div>

      <div class="sum">
        <span>
          Discount (${DATA.settings.discountPercent || 15}%)
        </span>

        <b style="color:#14863b">
          −${money(discount)}
        </b>
      </div>

      <div class="sum">

        <span>
          GST (${DATA.settings.gstPercent || 5}%)
        </span>

        <b>
          ${money(gst)}
        </b>

      </div>

      <div class="sum total">

        <span>
          Items Total
        </span>

        <b style="color:var(--purple)">
          ${money(total)}
        </b>

      </div>

      <small style="color:#857686">
        Container charges are shown at checkout.
      </small>

    `;
  }
}

function changeQty(i, d) {

  if (!cart[i]) return;

  cart[i].qty += d;

  if (cart[i].qty <= 0) {
    cart.splice(i, 1);
  }

  renderCart();
}

function removeItem(i) {

  cart.splice(i, 1);

  renderCart();
}

function openCart() {

  $('#cartDrawer')?.classList.add('open');

  $('#overlay')?.classList.add('show');
}

function closeCart() {

  $('#cartDrawer')?.classList.remove('open');

  $('#overlay')?.classList.remove('show');
}


/* =========================
   CHECKOUT
========================= */

function goCheckout() {

  if (!cart.length) {
    toast('Please add items first');
    return;
  }

  closeCart();

  renderCheckout();

  $('#checkoutModal')?.classList.add('show');
}

function closeCheckout() {

  $('#checkoutModal')?.classList.remove('show');
}

function renderCheckout() {

  const sub =
    cart.reduce(
      (sum, x) =>
        sum + x.price * x.qty,
      0
    );

  const baseDiscount =
    sub *
    (Number(
      DATA.settings.discountPercent || 15
    ) / 100);

  const gst =
    (
      sub -
      baseDiscount -
      couponDiscount
    ) *
    (
      Number(
        DATA.settings.gstPercent || 5
      ) / 100
    );

  const container =
    cart.reduce(
      (sum, x) =>
        sum +
        (
          Number(
            x.containerCharge ??
            DATA.settings.defaultContainerCharge ??
            0
          ) * x.qty
        ),
      0
    );

  const total =
    sub -
    baseDiscount -
    couponDiscount +
    gst +
    container;


  if (!$('#checkoutTotal')) return;


  $('#checkoutTotal').innerHTML = `

    <div class="sum">
      <span>Subtotal</span>
      <b>${money(sub)}</b>
    </div>

    <div class="sum">
      <span>
        ${DATA.settings.discountPercent || 15}% Discount
      </span>

      <b>
        −${money(baseDiscount)}
      </b>
    </div>

    <div class="sum">

      <span>
        Coupon
        ${
          appliedCoupon
            ? '(' + appliedCoupon + ')'
            : ''
        }
      </span>

      <b>
        ${
          couponDiscount
            ? '−' + money(couponDiscount)
            : money(0)
        }
      </b>

    </div>

    <div class="sum">

      <span>
        GST (${DATA.settings.gstPercent || 5}%)
      </span>

      <b>
        ${money(gst)}
      </b>

    </div>

    <div class="sum">

      <span>
        Container
      </span>

      <b>
        ${money(container)}
      </b>

    </div>

    <div class="sum total">

      <span>
        Payable
      </span>

      <b style="color:var(--purple)">
        ${money(total)}
      </b>

    </div>

  `;
}


/* =========================
   COUPON
========================= */

function applyCoupon() {

  const input =
    $('#couponCode');

  const code =
    (input?.value || '')
      .trim()
      .toUpperCase();

  const sub =
    cart.reduce(
      (sum, x) =>
        sum + x.price * x.qty,
      0
    );


  const coupon =
    (DATA.coupons || [])
      .find(
        x =>
          x.active !== false &&
          String(x.code).toUpperCase() === code
      );


  if (!coupon) {

    couponDiscount = 0;
    appliedCoupon = '';

    if ($('#couponStatus')) {
      $('#couponStatus').textContent =
        code
          ? 'Invalid coupon code.'
          : '';

      $('#couponStatus').className =
        'coupon-bad';
    }

    renderCheckout();

    return;
  }


  if (
    sub <
    Number(coupon.minOrder || 0)
  ) {

    couponDiscount = 0;
    appliedCoupon = '';

    if ($('#couponStatus')) {

      $('#couponStatus').textContent =
        'Minimum order for this coupon is ' +
        money(coupon.minOrder);

      $('#couponStatus').className =
        'coupon-bad';
    }

    renderCheckout();

    return;
  }


  couponDiscount =
    coupon.type === 'flat'
      ? Math.min(
          sub,
          Number(coupon.value || 0)
        )
      : sub *
        Number(coupon.value || 0) /
        100;

  appliedCoupon =
    coupon.code;


  if ($('#couponStatus')) {

    $('#couponStatus').textContent =
      'Coupon applied ✓';

    $('#couponStatus').className =
      'coupon-ok';
  }


  renderCheckout();
}


/* =========================
   LOCATION
========================= */

function getLocation() {

  if (!navigator.geolocation) {

    if ($('#locationStatus')) {
      $('#locationStatus').textContent =
        'Geolocation not supported';
    }

    return;
  }


  if ($('#locationStatus')) {
    $('#locationStatus').textContent =
      'Getting location…';
  }


  navigator.geolocation.getCurrentPosition(

    position => {

      customerLocation =
        `https://www.google.com/maps?q=${position.coords.latitude},${position.coords.longitude}`;

      if ($('#locationStatus')) {
        $('#locationStatus').textContent =
          'Current location added ✓';
      }
    },

    () => {

      if ($('#locationStatus')) {
        $('#locationStatus').textContent =
          'Could not get location. Please enter address manually.';
      }
    }
  );
}


/* =========================
   ONLINE ORDER
========================= */

async function submitCheckout(e) {

  e.preventDefault();

  const form =
    e.target;

  const f =
    new FormData(form);


  const sub =
    cart.reduce(
      (sum, x) =>
        sum + x.price * x.qty,
      0
    );


  const discount =
    sub *
    Number(
      DATA.settings.discountPercent || 15
    ) /
    100;


  const gst =
    (
      sub -
      discount -
      couponDiscount
    ) *
    Number(
      DATA.settings.gstPercent || 5
    ) /
    100;


  const container =
    cart.reduce(
      (sum, x) =>
        sum +
        (
          Number(
            x.containerCharge ??
            DATA.settings.defaultContainerCharge ??
            0
          ) * x.qty
        ),
      0
    );


  const total =
    sub -
    discount -
    couponDiscount +
    gst +
    container;


  const customer = {

    name: f.get('name'),

    phone: f.get('phone'),

    address: f.get('address'),

    landmark: f.get('landmark'),

    location: customerLocation
  };


  const order = {

    customer,

    items: cart,

    subtotal: sub,

    discount,

    couponDiscount,

    coupon: appliedCoupon,

    gst,

    containerCharge: container,

    total
  };


  try {

    const r =
      await fetch(
        '/api/orders',
        {
          method: 'POST',
          headers: {
            'Content-Type':
              'application/json'
          },
          body:
            JSON.stringify(order)
        }
      );


    const data =
      await r.json();


    let text =
      `*WASABEE NEW ONLINE ORDER*\n`;

    text +=
      `Order: ${data.orderId}\n\n`;

    text +=
      `*Customer*\n`;

    text +=
      `Name: ${customer.name}\n`;

    text +=
      `Phone: ${customer.phone}\n`;

    text +=
      `Address: ${customer.address}\n`;

    text +=
      `Landmark: ${customer.landmark || '-'}\n`;

    text +=
      `Location: ${customerLocation || '-'}\n\n`;

    text +=
      `*Items*\n`;


    cart.forEach(x => {

      text +=
        `• ${x.name}`;

      if (x.variant) {
        text +=
          ` (${x.variant})`;
      }

      if (x.addons?.length) {

        text +=
          ` [${
            x.addons
              .map(a =>
                typeof a === 'string'
                  ? a
                  : a.name
              )
              .join(', ')
          }]`;
      }

      text +=
        ` × ${x.qty} = ${money(
          x.price * x.qty
        )}\n`;
    });


    text +=
      `\nSubtotal: ${money(sub)}\n`;

    text +=
      `Discount: -${money(discount)}\n`;

    text +=
      `Coupon ${appliedCoupon || ''}: -${money(couponDiscount)}\n`;

    text +=
      `GST: ${money(gst)}\n`;

    text +=
      `Container: ${money(container)}\n`;

    text +=
      `*TOTAL: ${money(total)}*`;


    const whatsapp =
      DATA.settings.whatsappNumber;


    if (whatsapp) {

      window.open(
        `https://wa.me/${whatsapp}?text=${encodeURIComponent(text)}`,
        '_blank'
      );
    }


    cart = [];

    couponDiscount = 0;

    appliedCoupon = '';

    customerLocation = '';

    renderCart();

    closeCheckout();

    toast(
      'Order sent to WhatsApp ✓'
    );


  } catch (err) {

    console.error(err);

    toast(
      'Could not place order. Please try again.'
    );
  }
}


/* =========================
   TABLE BOOKING
========================= */

async function submitBooking(e) {

  e.preventDefault();

  const f =
    new FormData(e.target);

  const b =
    Object.fromEntries(
      f.entries()
    );


  try {

    await fetch(
      '/api/bookings',
      {
        method: 'POST',
        headers: {
          'Content-Type':
            'application/json'
        },
        body:
          JSON.stringify(b)
      }
    );


    const text =
      `*WASABEE TABLE BOOKING REQUEST*\n` +
      `Name: ${b.name}\n` +
      `Phone: ${b.phone}\n` +
      `Date: ${b.date}\n` +
      `Time: ${b.time}\n` +
      `Guests: ${b.guests}\n` +
      `Notes: ${b.notes || '-'}`;


    const whatsapp =
      DATA.settings.whatsappNumber;


    if (whatsapp) {

      window.open(
        `https://wa.me/${whatsapp}?text=${encodeURIComponent(text)}`,
        '_blank'
      );
    }


    e.target.reset();

    toast(
      'Booking request sent ✓'
    );


  } catch (err) {

    console.error(err);

    toast(
      'Booking could not be sent.'
    );
  }
}


/* =========================
   REVIEWS
========================= */

function renderReviews() {

  const rs =
    DATA.reviews || [];


  if ($('#reviewsList')) {

    $('#reviewsList').innerHTML =
      rs.length

        ? rs.map(r => {

            const rating =
              Math.max(
                0,
                Math.min(
                  5,
                  Number(r.rating || 5)
                )
              );

            return `
              <div class="review">

                <div class="stars">
                  ${'★'.repeat(rating)}
                  ${'☆'.repeat(5 - rating)}
                </div>

                <h4>
                  ${r.name || 'Guest'}
                </h4>

                <p>
                  ${r.comment || ''}
                </p>

                <small>
                  ${
                    r.createdAt
                      ? new Date(
                          r.createdAt
                        ).toLocaleDateString()
                      : ''
                  }
                </small>

              </div>
            `;

          }).join('')

        : `
          <div class="review">

            <div class="stars">
              ★★★★★
            </div>

            <h4>
              Be our first reviewer
            </h4>

            <p>
              Share your WASABEE experience with us.
            </p>

          </div>
        `;
  }


  if ($('#reviewSummary')) {

    $('#reviewSummary').innerHTML = `

      <div class="stars">
        ★★★★★
      </div>

      <b>
        ${
          rs.length
            ? 'Loved by our guests'
            : 'Your review matters'
        }
      </b>

    `;
  }
}


async function submitReview(e) {

  e.preventDefault();

  const f =
    new FormData(e.target);


  try {

    await fetch(
      '/api/reviews',
      {
        method: 'POST',
        headers: {
          'Content-Type':
            'application/json'
        },
        body:
          JSON.stringify({

            name:
              f.get('name'),

            comment:
              f.get('comment'),

            rating:
              window.reviewRating || 5

          })
      }
    );


    e.target.reset();

    toast(
      'Thank you for your review ✓'
    );


    const r =
      await fetch(
        '/api/public-data'
      );

    DATA =
      await r.json();


    renderReviews();


  } catch (err) {

    console.error(err);

    toast(
      'Could not submit review.'
    );
  }
}


/* =========================
   NAVIGATION
========================= */

function jumpCat(id) {

  const target =
    document.querySelector(
      '#cat-' + id
    );

  if (target) {

    target.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });
  }


  $$('.cat').forEach(x =>
    x.classList.remove('active')
  );


  if (
    typeof event !== 'undefined' &&
    event?.currentTarget
  ) {

    event.currentTarget
      .classList.add('active');
  }
}

function toggleNav() {

  $('.topbar nav')
    ?.classList.toggle('show');
}


/* =========================
   EVENT LISTENERS
========================= */

document.addEventListener(
  'DOMContentLoaded',
  () => {

    $('#checkoutForm')
      ?.addEventListener(
        'submit',
        submitCheckout
      );


    $('#bookingForm')
      ?.addEventListener(
        'submit',
        submitBooking
      );


    $('#reviewForm')
      ?.addEventListener(
        'submit',
        submitReview
      );


    $('#starsInput')
      ?.addEventListener(
        'click',
        e => {

          if (
            e.target.closest('#starsInput')
          ) {

            window.reviewRating = 5;

            e.currentTarget.style.color =
              '#d09b00';
          }
        }
      );


    const searchInput =
      $('#menuSearch');

    if (searchInput) {

      searchInput.addEventListener(
        'input',
        searchMenu
      );

      searchInput.addEventListener(
        'keydown',
        e => {

          if (e.key === 'Escape') {
            closeMenuSearch();
          }
        }
      );
    }


    const overlay =
      $('#overlay');

    if (overlay) {

      overlay.addEventListener(
        'click',
        closeCart
      );
    }


    init();
  }
);
