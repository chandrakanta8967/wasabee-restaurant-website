/* =========================================================
   WASABEE ORIENTAL CUISINE
   PUBLIC WEBSITE APP.JS
   Clean replacement version
   ========================================================= */

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
let reviewRating = 5;

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);


/* =========================================================
   BASIC HELPERS
   ========================================================= */

function money(value) {
  const currency = DATA?.settings?.currency || '₹';
  const number = Number(value || 0);

  return currency + number.toLocaleString('en-IN');
}


function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}


function escapeAttribute(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}


function toast(message) {
  const t = $('#toast');

  if (!t) {
    console.log(message);
    return;
  }

  t.className = 'toast show';
  t.textContent = message;

  clearTimeout(t._timer);

  t._timer = setTimeout(() => {
    t.className = 'toast';
  }, 2400);
}


/* =========================================================
   INITIAL LOAD
   ========================================================= */

async function init() {
  try {
    const response = await fetch('/api/public-data', {
      cache: 'no-store'
    });

    if (!response.ok) {
      throw new Error(
        `Public data request failed: ${response.status}`
      );
    }

    const data = await response.json();

    DATA = {
      menu: Array.isArray(data.menu) ? data.menu : [],
      settings: data.settings || {},
      reviews: Array.isArray(data.reviews) ? data.reviews : [],
      coupons: Array.isArray(data.coupons) ? data.coupons : []
    };

    renderHero();
    renderCats();
    renderMenu();
    renderReviews();
    renderCart();

    startHero();

  } catch (error) {
    console.error('WASABEE INIT ERROR:', error);

    toast(
      'Website data could not be loaded. Please refresh the page.'
    );
  }
}


/* =========================================================
   HERO BANNER
   ========================================================= */

function renderHero() {
  const container = $('#heroSlides');
  const dots = $('#heroDots');

  if (!container) {
    return;
  }

  const banners = Array.isArray(DATA?.settings?.heroBanners)
    ? DATA.settings.heroBanners
    : [];

  heroIndex = 0;

  if (!banners.length) {
    container.innerHTML = '';
    
    if (dots) {
      dots.innerHTML = '';
    }

    return;
  }

  container.innerHTML = banners.map((banner, index) => {

    const rawTitle =
      String(banner?.title || 'Oriental Excellence');

    const title = rawTitle.replace(
      'Oriental Excellence',
      'Oriental <em>Excellence</em>'
    );

    const image =
      banner?.image
        ? escapeAttribute(banner.image)
        : '';

    const subtitle =
      escapeHtml(banner?.subtitle || '');

    return `
      <div
        class="hero-slide ${index === 0 ? 'active' : ''}"
        style="background-image:url('${image}')"
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

          <p>
            ${subtitle}
          </p>

          <div class="hero-actions">

            <a
              class="btn purple"
              href="#order"
            >
              Order Online →
            </a>

            <a
              class="btn ghost"
              href="#booking"
            >
              Book a Table
            </a>

          </div>

        </div>

      </div>
    `;

  }).join('');

  if (dots) {
    dots.innerHTML = banners.map((_, index) => `
      <span
        class="dot ${index === 0 ? 'active' : ''}"
      ></span>
    `).join('');
  }
}


function startHero() {
  if (heroTimer) {
    clearInterval(heroTimer);
    heroTimer = null;
  }

  const slides = $$('.hero-slide');

  if (slides.length <= 1) {
    return;
  }

  heroTimer = setInterval(() => {
    heroNext();
  }, 5000);
}


function heroNext() {
  const slides = $$('.hero-slide');

  if (!slides.length) {
    return;
  }

  heroIndex =
    (heroIndex + 1) % slides.length;

  heroPaint();
}


function heroPrev() {
  const slides = $$('.hero-slide');

  if (!slides.length) {
    return;
  }

  heroIndex =
    (heroIndex - 1 + slides.length) % slides.length;

  heroPaint();
}


function heroPaint() {
  $$('.hero-slide').forEach((slide, index) => {
    slide.classList.toggle(
      'active',
      index === heroIndex
    );
  });

  $$('.dot').forEach((dot, index) => {
    dot.classList.toggle(
      'active',
      index === heroIndex
    );
  });
}


/* =========================================================
   CATEGORY BUTTONS
   ========================================================= */

function renderCats() {
  const container = $('#categories');

  if (!container) {
    return;
  }

  const categories =
    Array.isArray(DATA.menu)
      ? DATA.menu
      : [];

  container.innerHTML = categories.map((cat, index) => {

    const id = escapeAttribute(cat?.id || '');
    const name = escapeHtml(cat?.name || '');
    const icon = cat?.icon || '🍽️';

    return `
      <button
        type="button"
        class="cat ${index === 0 ? 'active' : ''}"
        onclick="jumpCat('${id}')"
      >
        <span class="icon">
          ${icon}
        </span>

        ${name}
      </button>
    `;

  }).join('');
}


/* =========================================================
   MENU DATA HELPERS
   ========================================================= */

function flattenItems(category) {

  if (Array.isArray(category?.items)) {

    return category.items.map(item => ({
      ...item,
      sub: ''
    }));

  }

  return (category?.subcategories || [])
    .flatMap(sub => {

      return (sub?.items || []).map(item => ({
        ...item,
        sub: sub?.name || ''
      }));

    });
}


/* =========================================================
   MENU IMAGE
   ========================================================= */

function imageFor(item) {

  if (
    item?.image &&
    String(item.image).trim()
  ) {
    return String(item.image).trim();
  }

  const name =
    encodeURIComponent(
      item?.name || 'asian food'
    );

  return `https://source.unsplash.com/600x400/?${name},asian-food`;
}


/* =========================================================
   MENU CARD
   ========================================================= */

function itemCard(item) {

  if (
    !item ||
    item.active === false
  ) {
    return '';
  }

  const variants =
    Array.isArray(item.variants)
      ? item.variants
      : [];

  const hasVariants =
    variants.length > 0;

  let basePrice =
    Number(item.price || 0);

  if (hasVariants) {

    const prices = variants
      .map(v => Number(v?.price || 0))
      .filter(price => !Number.isNaN(price));

    if (prices.length) {
      basePrice = Math.min(...prices);
    }

  }

  const label = hasVariants
    ? `${variants.length} choices`
    : money(basePrice);

  const image =
    escapeAttribute(imageFor(item));

  const itemJson =
    JSON.stringify(item)
      .replace(/\\/g, '\\\\')
      .replace(/'/g, '&#39;');

  const itemName =
    escapeHtml(item.name || '');

  const description =
    escapeHtml(
      item.description ||
      'Authentic oriental preparation crafted by WASABEE.'
    );

  let icon = '';

  const lowerName =
    String(item.name || '').toLowerCase();

  if (lowerName.includes('soup')) {
    icon = '🍲';
  } else if (lowerName.includes('sushi')) {
    icon = '🍣';
  }

  return `
    <article class="food-card">

      <div
        class="food-img"
        style="
          background-image:url('${image}');
          background-size:cover;
          background-position:center;
          background-repeat:no-repeat;
        "
      >
        <span>${icon}</span>
      </div>

      <div class="food-body">

        <h4>
          ${itemName}
        </h4>

        <p>
          ${description}
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
                ? `From ${money(basePrice)}`
                : money(basePrice)
            }

          </span>

          <button
            type="button"
            class="add"
            onclick='openItem(${itemJson})'
          >
            Add +
          </button>

        </div>

      </div>

    </article>
  `;
}


/* =========================================================
   MAIN MENU
   IMPORTANT:
   Keeps the original menu/grid structure.
   ========================================================= */

function renderMenu() {

  const container = $('#menu');

  if (!container) {
    return;
  }

  let html = '';

  const categories =
    Array.isArray(DATA.menu)
      ? DATA.menu
      : [];

  categories.forEach(category => {

    const categoryId =
      escapeAttribute(category?.id || '');

    const categoryName =
      escapeHtml(category?.name || 'MENU');

    const categoryIcon =
      category?.icon || '🍽️';

    html += `
      <section
        class="menu-category"
        id="cat-${categoryId}"
      >

        <h3>
          ${categoryIcon}
          ${categoryName}
        </h3>
    `;


    /* -----------------------------------------
       CATEGORY WITH SUBCATEGORIES
       ----------------------------------------- */

    if (
      Array.isArray(category?.subcategories) &&
      category.subcategories.length
    ) {

      category.subcategories.forEach(subcategory => {

        const subName =
          escapeHtml(
            subcategory?.name || ''
          );

        const items =
          Array.isArray(subcategory?.items)
            ? subcategory.items
            : [];

        const activeItems =
          items.filter(
            item => item?.active !== false
          );

        if (!activeItems.length) {
          return;
        }

        html += `
          <div class="subcat">
            ${subName}
          </div>

          <div class="grid">
            ${activeItems
              .map(item => itemCard(item))
              .join('')}
          </div>
        `;

      });


    } else {

      /* -----------------------------------------
         NORMAL CATEGORY
         ----------------------------------------- */

      const items =
        Array.isArray(category?.items)
          ? category.items
          : [];

      const activeItems =
        items.filter(
          item => item?.active !== false
        );

      if (activeItems.length) {

        html += `
          <div class="grid">
            ${activeItems
              .map(item => itemCard(item))
              .join('')}
          </div>
        `;

      }

    }

    html += `
      </section>
    `;

  });

  container.innerHTML = html;

  /*
    Important:
    Search can be used after the menu is rendered.
  */

  const currentSearch =
    $('#menuSearch');

  if (
    currentSearch &&
    currentSearch.value.trim()
  ) {
    searchMenu();
  }
}


/* =========================================================
   MENU SEARCH
   ========================================================= */

function getSearchResultElement() {

  return (
    document.getElementById('menuSearchResults') ||
    document.getElementById('menuSearchResult')
  );

}


function openMenuSearch() {

  const modal =
    document.getElementById('menuSearchModal');

  const input =
    document.getElementById('menuSearch');


  /*
    If you already have a search modal in HTML,
    use it.
  */

  if (modal && input) {

    modal.classList.add('show');

    setTimeout(() => {
      input.focus();
    }, 100);

    return;
  }


  /*
    If there is no modal and search input already
    exists in the page, focus it.
  */

  if (input) {

    input.focus();

    try {
      input.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    } catch (error) {
      console.log(error);
    }

    return;
  }


  /*
    Last fallback:
    create a small search overlay dynamically.
  */

  createSearchModal();

}


function createSearchModal() {

  if (
    document.getElementById('menuSearchModal')
  ) {
    openMenuSearch();
    return;
  }

  const modal =
    document.createElement('div');

  modal.id =
    'menuSearchModal';

  modal.className =
    'modal';

  modal.innerHTML = `
    <div class="modal-card">

      <button
        type="button"
        class="modal-close"
        onclick="closeMenuSearch()"
      >
        ×
      </button>

      <span class="eyebrow">
        WASABEE MENU
      </span>

      <h2>
        Search Menu
      </h2>

      <div
        class="menu-search-box"
        style="margin-top:20px"
      >

        <input
          type="search"
          id="menuSearch"
          placeholder="🔍 Search menu item..."
          autocomplete="off"
        >

        <button
          type="button"
          onclick="clearMenuSearch()"
        >
          Clear
        </button>

      </div>

      <div
        id="menuSearchResults"
        style="margin-top:10px"
      ></div>

    </div>
  `;

  document.body.appendChild(modal);

  const input =
    modal.querySelector('#menuSearch');

  if (input) {

    input.addEventListener(
      'input',
      searchMenu
    );

    input.addEventListener(
      'keydown',
      event => {

        if (event.key === 'Escape') {
          closeMenuSearch();
        }

      }
    );

    setTimeout(() => {
      input.focus();
    }, 100);

  }

  modal.classList.add('show');
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

  if (!input) {
    return;
  }

  const query =
    input.value
      .trim()
      .toLowerCase();

  const cards =
    document.querySelectorAll('.food-card');

  const result =
    getSearchResultElement();

  let found = 0;


  cards.forEach(card => {

    const text =
      card.innerText
        .toLowerCase();

    if (!query) {

      card.style.display = '';
      return;

    }

    if (text.includes(query)) {

      card.style.display = '';
      found++;

    } else {

      card.style.display = 'none';

    }

  });


  /*
    Hide empty category sections when searching.
    This does NOT change their normal layout.
  */

  const sections =
    document.querySelectorAll(
      '.menu-category'
    );

  sections.forEach(section => {

    if (!query) {

      section.style.display = '';

      return;
    }

    const visibleCards =
      section.querySelectorAll(
        '.food-card:not([style*="display: none"])'
      );

    section.style.display =
      visibleCards.length
        ? ''
        : 'none';

  });


  if (result) {

    if (!query) {

      result.innerHTML = '';

    } else if (found) {

      result.innerHTML = `
        <p class="search-found">
          ${found}
          menu item${found > 1 ? 's' : ''}
          found
        </p>
      `;

    } else {

      result.innerHTML = `
        <p class="search-not-found">
          No menu item found.
        </p>
      `;

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


  document
    .querySelectorAll('.menu-category')
    .forEach(section => {
      section.style.display = '';
    });


  const result =
    getSearchResultElement();

  if (result) {
    result.innerHTML = '';
  }

}


/* =========================================================
   ITEM MODAL
   ========================================================= */

function openItem(item) {

  const modalBody =
    $('#itemModalBody');

  if (!modalBody) {
    return;
  }


  const groups =
    (item?.addonGroups || [])
      .map(id =>
        (DATA.settings.addonGroups || [])
          .find(group => group.id === id)
      )
      .filter(
        group =>
          group &&
          group.active !== false
      );


  let addonHtml = '';


  if (groups.length) {

    addonHtml = `
      <div class="addon-section">

        <div class="addon-section-title">

          <span>
            ➕ Customize Your Order
          </span>

          <small>
            Choose options if you want
          </small>

        </div>

        ${groups.map(group => {

          const options =
            (group.options || [])
              .filter(
                option =>
                  option.active !== false
              );


          return `
            <div class="addon-group">

              <div class="addon-group-title">

                <div>

                  <h3>
                    ${escapeHtml(group.name || '')}
                  </h3>

                  <small>
                    ${escapeHtml(group.description || '')}
                  </small>

                </div>

                <span class="addon-rule">

                  ${
                    group.required
                      ? 'Required'
                      : 'Optional'
                  }

                  ·

                  ${
                    group.selection === 'multiple'
                      ? 'Choose multiple'
                      : 'Choose one'
                  }

                </span>

              </div>


              <div class="addon-choice-list">

                ${
                  options.length
                    ? options.map(option => {

                        const mode =
                          group.selection === 'multiple'
                            ? 'multiple'
                            : 'single';

                        const price =
                          Number(option.price || 0);

                        return `
                          <button
                            type="button"
                            class="addon-choice"
                            data-group="${escapeAttribute(group.id)}"
                            data-mode="${mode}"
                            data-price="${price}"
                            data-name="${escapeAttribute(option.name || '')}"
                            onclick="selectAddonChoice(this)"
                          >

                            <span>
                              ${
                                mode === 'multiple'
                                  ? '☐'
                                  : '○'
                              }
                            </span>

                            <b>
                              ${escapeHtml(option.name || '')}
                            </b>

                            <em>
                              ${
                                price
                                  ? '+' + money(price)
                                  : 'Included'
                              }
                            </em>

                          </button>
                        `;

                      }).join('')
                    : `
                      <div class="empty">
                        No active options in this group.
                      </div>
                    `
                }

              </div>

            </div>
          `;

        }).join('')}

      </div>
    `;

  }


  const legacy =
    Array.isArray(item?.addons) &&
    item.addons.length
      ? `
        <div class="addon-section">

          <div class="addon-section-title">

            <span>
              Choose Add-on
            </span>

            <small>
              Legacy item options
            </small>

          </div>

          <div class="addon-list">

            ${item.addons.map(addon => `
              <button
                type="button"
                class="addon"
                data-name="${escapeAttribute(addon)}"
                data-price="0"
                onclick="this.classList.toggle('selected')"
              >
                ${escapeHtml(addon)}
              </button>
            `).join('')}

          </div>

        </div>
      `
      : '';


  const variants =
    Array.isArray(item?.variants)
      ? item.variants
      : [];


  const variantsHtml =
    variants.length
      ? `
        <div class="variant-list">

          ${variants.map((variant, index) => `

            <button
              type="button"
              class="variant ${
                index === 0
                  ? 'selected'
                  : ''
              }"
              data-price="${Number(variant.price || 0)}"
              onclick="selectVariant(this)"
            >

              <span>
                ${escapeHtml(variant.name || '')}
              </span>

              <b>
                ${money(variant.price)}
              </b>

            </button>

          `).join('')}

        </div>
      `
      : `
        <input
          type="hidden"
          id="singlePrice"
          value="${Number(item.price || 0)}"
        >
      `;


  const itemJson =
    JSON.stringify(item)
      .replace(/\\/g, '\\\\')
      .replace(/'/g, '&#39;');


  modalBody.innerHTML = `

    <span class="eyebrow">
      ${
        variants.length
          ? 'CHOOSE VARIANT'
          : 'ADD TO CART'
      }
    </span>

    <h2>
      ${escapeHtml(item.name || '')}
    </h2>

    <p>
      ${escapeHtml(
        item.description ||
        'Authentic oriental preparation crafted by WASABEE.'
      )}
    </p>

    ${variantsHtml}

    ${addonHtml}

    ${legacy}

    <div class="modal-price-note">
      Container charge is added at checkout.
    </div>

    <div style="margin-top:22px">

      <button
        type="button"
        class="btn purple full"
        onclick='confirmAdd(${itemJson})'
      >
        Add to Cart
      </button>

    </div>

  `;


  $('#itemModal')?.classList.add('show');
}


function selectVariant(element) {

  $$('#itemModal .variant')
    .forEach(item => {
      item.classList.remove('selected');
    });

  element.classList.add('selected');
}


function selectAddonChoice(element) {

  const mode =
    element.dataset.mode;


  if (mode === 'single') {

    const group =
      element.dataset.group;


    $$(
      `#itemModal .addon-choice[data-group="${CSS.escape(group)}"]`
    ).forEach(choice => {

      choice.classList.remove('selected');

      const span =
        choice.querySelector('span');

      if (span) {
        span.textContent = '○';
      }

    });


    element.classList.add('selected');

    const span =
      element.querySelector('span');

    if (span) {
      span.textContent = '●';
    }


  } else {

    element.classList.toggle('selected');

    const span =
      element.querySelector('span');

    if (span) {

      span.textContent =
        element.classList.contains('selected')
          ? '☑'
          : '☐';

    }

  }

}


function closeItem() {

  $('#itemModal')
    ?.classList.remove('show');

}


/* =========================================================
   ADD TO CART
   ========================================================= */

function confirmAdd(item) {

  let variant = '';
  let price = Number(item.price || 0);


  const variants =
    Array.isArray(item.variants)
      ? item.variants
      : [];


  if (variants.length) {

    const selected =
      $('#itemModal .variant.selected');


    variant =
      selected
        ?.querySelector('span')
        ?.textContent
        ?.trim() ||
      variants[0].name;


    price =
      Number(
        selected?.dataset.price ||
        variants[0].price ||
        0
      );

  }


  const groups =
    (item.addonGroups || [])
      .map(id =>
        (DATA.settings.addonGroups || [])
          .find(group => group.id === id)
      )
      .filter(
        group =>
          group &&
          group.active !== false
      );


  for (const group of groups) {

    if (
      group.required &&
      !$$(
        `#itemModal .addon-choice[data-group="${CSS.escape(group.id)}"].selected`
      ).length
    ) {

      toast(
        `Please choose ${group.name}`
      );

      return;
    }

  }


  const addons =
    [
      ...$$(
        '#itemModal .addon-choice.selected'
      )
    ].map(element => ({
      name: element.dataset.name,
      price: Number(
        element.dataset.price || 0
      )
    }));


  const legacy =
    [
      ...$$(
        '#itemModal .addon.selected'
      )
    ].map(element => ({
      name:
        element.dataset.name ||
        element.textContent.trim(),

      price:
        Number(
          element.dataset.price || 0
        )
    }));


  addons.push(...legacy);


  const addonTotal =
    addons.reduce(
      (sum, addon) =>
        sum +
        Number(addon.price || 0),
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
      price +
      addonTotal,

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

  toast(
    'Added to cart ✓'
  );

}


/* =========================================================
   CART
   ========================================================= */

function renderCart() {

  const count =
    cart.reduce(
      (sum, item) =>
        sum + Number(item.qty || 0),
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

        ? cart.map((item, index) => {

            const addons =
              item.addons?.length
                ? item.addons
                    .map(addon =>
                      typeof addon === 'string'
                        ? addon
                        : addon.name
                    )
                    .join(', ')
                : '';


            return `
              <div class="cart-row">

                <div class="cart-thumb">
                  🍜
                </div>

                <div class="cart-info">

                  <h4>
                    ${escapeHtml(item.name || '')}
                  </h4>

                  <small>

                    ${escapeHtml(item.variant || '')}

                    ${
                      addons
                        ? ' · ' +
                          escapeHtml(addons)
                        : ''
                    }

                  </small>

                  <div class="qty">

                    <button
                      type="button"
                      onclick="changeQty(${index}, -1)"
                    >
                      −
                    </button>

                    <b>
                      ${item.qty}
                    </b>

                    <button
                      type="button"
                      onclick="changeQty(${index}, 1)"
                    >
                      +
                    </button>

                  </div>

                </div>

                <div>

                  <b>
                    ${money(
                      item.price *
                      item.qty
                    )}
                  </b>

                  <button
                    type="button"
                    class="remove"
                    onclick="removeItem(${index})"
                  >
                    🗑
                  </button>

                </div>

              </div>
            `;

          }).join('')

        : `
          <div class="empty">
            Your cart is empty.
            <br>
            Add something delicious!
          </div>
        `;

  }


  const subtotal =
    cart.reduce(
      (sum, item) =>
        sum +
        Number(item.price || 0) *
        Number(item.qty || 0),
      0
    );


  const discountPercent =
    Number(
      DATA.settings.discountPercent || 15
    );


  const gstPercent =
    Number(
      DATA.settings.gstPercent || 5
    );


  const discount =
    subtotal *
    discountPercent /
    100;


  const gst =
    (subtotal - discount) *
    gstPercent /
    100;


  const total =
    subtotal -
    discount +
    gst;


  if ($('#cartSummary')) {

    $('#cartSummary').innerHTML = `

      <div class="sum">

        <span>
          Sub Total
        </span>

        <b>
          ${money(subtotal)}
        </b>

      </div>


      <div class="sum">

        <span>
          Discount (${discountPercent}%)
        </span>

        <b style="color:#14863b">
          −${money(discount)}
        </b>

      </div>


      <div class="sum">

        <span>
          GST (${gstPercent}%)
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


function changeQty(index, difference) {

  if (!cart[index]) {
    return;
  }

  cart[index].qty += difference;

  if (cart[index].qty <= 0) {
    cart.splice(index, 1);
  }

  renderCart();
}


function removeItem(index) {

  if (
    index < 0 ||
    index >= cart.length
  ) {
    return;
  }

  cart.splice(index, 1);

  renderCart();
}


function openCart() {

  $('#cartDrawer')
    ?.classList.add('open');

  $('#overlay')
    ?.classList.add('show');

}


function closeCart() {

  $('#cartDrawer')
    ?.classList.remove('open');

  $('#overlay')
    ?.classList.remove('show');

}


/* =========================================================
   CHECKOUT
   ========================================================= */

function goCheckout() {

  if (!cart.length) {

    toast(
      'Please add items first'
    );

    return;
  }

  closeCart();

  renderCheckout();

  $('#checkoutModal')
    ?.classList.add('show');

}


function closeCheckout() {

  $('#checkoutModal')
    ?.classList.remove('show');

}


function renderCheckout() {

  const subtotal =
    cart.reduce(
      (sum, item) =>
        sum +
        Number(item.price || 0) *
        Number(item.qty || 0),
      0
    );


  const discountPercent =
    Number(
      DATA.settings.discountPercent || 15
    );


  const gstPercent =
    Number(
      DATA.settings.gstPercent || 5
    );


  const baseDiscount =
    subtotal *
    discountPercent /
    100;


  const gstBase =
    subtotal -
    baseDiscount -
    couponDiscount;


  const gst =
    Math.max(0, gstBase) *
    gstPercent /
    100;


  const container =
    cart.reduce(
      (sum, item) =>
        sum +
        Number(
          item.containerCharge ??
          DATA.settings.defaultContainerCharge ??
          0
        ) *
        Number(item.qty || 0),
      0
    );


  const total =
    subtotal -
    baseDiscount -
    couponDiscount +
    gst +
    container;


  const checkoutTotal =
    $('#checkoutTotal');

  if (!checkoutTotal) {
    return;
  }


  checkoutTotal.innerHTML = `

    <div class="sum">

      <span>
        Subtotal
      </span>

      <b>
        ${money(subtotal)}
      </b>

    </div>


    <div class="sum">

      <span>
        ${discountPercent}% Discount
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
            ? '(' +
              escapeHtml(appliedCoupon) +
              ')'
            : ''
        }
      </span>

      <b>
        ${
          couponDiscount
            ? '−' +
              money(couponDiscount)
            : money(0)
        }
      </b>

    </div>


    <div class="sum">

      <span>
        GST (${gstPercent}%)
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


/* =========================================================
   COUPON
   ========================================================= */

function applyCoupon() {

  const input =
    $('#couponCode');

  const code =
    String(input?.value || '')
      .trim()
      .toUpperCase();


  const subtotal =
    cart.reduce(
      (sum, item) =>
        sum +
        Number(item.price || 0) *
        Number(item.qty || 0),
      0
    );


  const coupon =
    (DATA.coupons || [])
      .find(item =>
        item.active !== false &&
        String(item.code || '')
          .toUpperCase() === code
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


  const minimum =
    Number(
      coupon.minOrder || 0
    );


  if (subtotal < minimum) {

    couponDiscount = 0;
    appliedCoupon = '';

    if ($('#couponStatus')) {

      $('#couponStatus').textContent =
        'Minimum order for this coupon is ' +
        money(minimum);

      $('#couponStatus').className =
        'coupon-bad';

    }

    renderCheckout();

    return;
  }


  const value =
    Number(
      coupon.value || 0
    );


  if (
    String(coupon.type || '')
      .toLowerCase() === 'flat'
  ) {

    couponDiscount =
      Math.min(
        subtotal,
        value
      );

  } else {

    couponDiscount =
      subtotal *
      value /
      100;

  }


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


/* =========================================================
   LOCATION
   ========================================================= */

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


/* =========================================================
   ONLINE ORDER
   ========================================================= */

async function submitCheckout(event) {

  event.preventDefault();


  const form =
    event.target;

  const formData =
    new FormData(form);


  const subtotal =
    cart.reduce(
      (sum, item) =>
        sum +
        Number(item.price || 0) *
        Number(item.qty || 0),
      0
    );


  const discountPercent =
    Number(
      DATA.settings.discountPercent || 15
    );


  const gstPercent =
    Number(
      DATA.settings.gstPercent || 5
    );


  const discount =
    subtotal *
    discountPercent /
    100;


  const gst =
    Math.max(
      0,
      subtotal -
      discount -
      couponDiscount
    ) *
    gstPercent /
    100;


  const container =
    cart.reduce(
      (sum, item) =>
        sum +
        Number(
          item.containerCharge ??
          DATA.settings.defaultContainerCharge ??
          0
        ) *
        Number(item.qty || 0),
      0
    );


  const total =
    subtotal -
    discount -
    couponDiscount +
    gst +
    container;


  const customer = {

    name:
      formData.get('name'),

    phone:
      formData.get('phone'),

    address:
      formData.get('address'),

    landmark:
      formData.get('landmark'),

    location:
      customerLocation

  };


  const order = {

    customer,

    items: cart,

    subtotal,

    discount,

    couponDiscount,

    coupon: appliedCoupon,

    gst,

    containerCharge:
      container,

    total

  };


  try {

    const response =
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


    if (!response.ok) {
      throw new Error(
        `Order request failed: ${response.status}`
      );
    }


    const data =
      await response.json();


    let message =
      '*WASABEE NEW ONLINE ORDER*\n';


    message +=
      `Order: ${
        data.orderId ||
        data.id ||
        'NEW'
      }\n\n`;


    message +=
      '*Customer*\n';


    message +=
      `Name: ${customer.name}\n`;


    message +=
      `Phone: ${customer.phone}\n`;


    message +=
      `Address: ${customer.address}\n`;


    message +=
      `Landmark: ${
        customer.landmark || '-'
      }\n`;


    message +=
      `Location: ${
        customerLocation || '-'
      }\n\n`;


    message +=
      '*Items*\n';


    cart.forEach(item => {

      message +=
        `• ${item.name}`;


      if (item.variant) {

        message +=
          ` (${item.variant})`;

      }


      if (item.addons?.length) {

        const addons =
          item.addons
            .map(addon =>
              typeof addon === 'string'
                ? addon
                : addon.name
            )
            .join(', ');

        message +=
          ` [${addons}]`;

      }


      message +=
        ` × ${item.qty} = ${
          money(
            item.price *
            item.qty
          )
        }\n`;

    });


    message +=
      `\nSubtotal: ${money(subtotal)}\n`;


    message +=
      `Discount: -${money(discount)}\n`;


    message +=
      `Coupon ${
        appliedCoupon || ''
      }: -${money(couponDiscount)}\n`;


    message +=
      `GST: ${money(gst)}\n`;


    message +=
      `Container: ${money(container)}\n`;


    message +=
      `*TOTAL: ${money(total)}*`;


    const whatsapp =
      DATA.settings.whatsappNumber;


    if (whatsapp) {

      window.open(
        `https://wa.me/${whatsapp}?text=${encodeURIComponent(message)}`,
        '_blank'
      );

    }


    cart = [];

    couponDiscount = 0;

    appliedCoupon = '';

    customerLocation = '';


    renderCart();

    closeCheckout();


    if (form) {
      form.reset();
    }


    if ($('#couponStatus')) {
      $('#couponStatus').textContent = '';
      $('#couponStatus').className = '';
    }


    if ($('#locationStatus')) {
      $('#locationStatus').textContent =
        'Location not added';
    }


    toast(
      'Order sent to WhatsApp ✓'
    );


  } catch (error) {

    console.error(
      'CHECKOUT ERROR:',
      error
    );

    toast(
      'Could not place order. Please try again.'
    );

  }

}


/* =========================================================
   TABLE BOOKING
   ========================================================= */

async function submitBooking(event) {

  event.preventDefault();


  const form =
    event.target;

  const formData =
    new FormData(form);


  const booking =
    Object.fromEntries(
      formData.entries()
    );


  try {

    const response =
      await fetch(
        '/api/bookings',
        {
          method: 'POST',

          headers: {
            'Content-Type':
              'application/json'
          },

          body:
            JSON.stringify(booking)
        }
      );


    if (!response.ok) {
      throw new Error(
        `Booking request failed: ${response.status}`
      );
    }


    const text =
      `*WASABEE TABLE BOOKING REQUEST*\n` +
      `Name: ${booking.name}\n` +
      `Phone: ${booking.phone}\n` +
      `Date: ${booking.date}\n` +
      `Time: ${booking.time}\n` +
      `Guests: ${booking.guests}\n` +
      `Notes: ${booking.notes || '-'}`;


    const whatsapp =
      DATA.settings.whatsappNumber;


    if (whatsapp) {

      window.open(
        `https://wa.me/${whatsapp}?text=${encodeURIComponent(text)}`,
        '_blank'
      );

    }


    form.reset();


    toast(
      'Booking request sent ✓'
    );


  } catch (error) {

    console.error(
      'BOOKING ERROR:',
      error
    );

    toast(
      'Booking could not be sent.'
    );

  }

}


/* =========================================================
   REVIEWS
   ========================================================= */

function renderReviews() {

  const reviews =
    Array.isArray(DATA.reviews)
      ? DATA.reviews
      : [];


  const reviewsList =
    $('#reviewsList');


  if (reviewsList) {

    if (!reviews.length) {

      reviewsList.innerHTML = `
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

    } else {

      reviewsList.innerHTML =
        reviews.map(review => {

          const rating =
            Math.max(
              0,
              Math.min(
                5,
                Number(
                  review.rating || 5
                )
              )
            );


          let date = '';

          if (review.createdAt) {

            const parsedDate =
              new Date(
                review.createdAt
              );

            if (
              !Number.isNaN(
                parsedDate.getTime()
              )
            ) {

              date =
                parsedDate.toLocaleDateString();

            }

          }


          return `
            <div class="review">

              <div class="stars">
                ${'★'.repeat(rating)}
                ${'☆'.repeat(5 - rating)}
              </div>

              <h4>
                ${escapeHtml(
                  review.name || 'Guest'
                )}
              </h4>

              <p>
                ${escapeHtml(
                  review.comment || ''
                )}
              </p>

              ${
                date
                  ? `<small>${date}</small>`
                  : ''
              }

            </div>
          `;

        }).join('');

    }

  }


  const summary =
    $('#reviewSummary');


  if (summary) {

    summary.innerHTML = `

      <div class="stars">
        ★★★★★
      </div>

      <b>
        ${
          reviews.length
            ? 'Loved by our guests'
            : 'Your review matters'
        }
      </b>

    `;

  }

}


async function submitReview(event) {

  event.preventDefault();


  const form =
    event.target;

  const formData =
    new FormData(form);


  try {

    const response =
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
                formData.get('name'),

              comment:
                formData.get('comment'),

              rating:
                reviewRating || 5

            })
        }
      );


    if (!response.ok) {
      throw new Error(
        `Review request failed: ${response.status}`
      );
    }


    form.reset();

    reviewRating = 5;


    toast(
      'Thank you for your review ✓'
    );


    const responseData =
      await fetch(
        '/api/public-data',
        {
          cache: 'no-store'
        }
      );


    if (responseData.ok) {

      DATA =
        await responseData.json();

      renderReviews();

    }


  } catch (error) {

    console.error(
      'REVIEW ERROR:',
      error
    );

    toast(
      'Could not submit review.'
    );

  }

}


/* =========================================================
   CATEGORY NAVIGATION
   ========================================================= */

function jumpCat(id) {

  const target =
    document.querySelector(
      '#cat-' + CSS.escape(String(id))
    );


  if (target) {

    target.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });

  }


  $$('.cat')
    .forEach(button => {
      button.classList.remove(
        'active'
      );
    });


  /*
    onclick="jumpCat(...)" sends the click event
    through the global browser event in most browsers.
    This is kept compatible with the existing HTML.
  */

  if (
    typeof event !== 'undefined' &&
    event?.currentTarget
  ) {

    event.currentTarget
      .classList.add('active');

  }

}


/* =========================================================
   MOBILE NAVIGATION
   ========================================================= */

function toggleNav() {

  $('.topbar nav')
    ?.classList.toggle('show');

}


/* =========================================================
   EVENT LISTENERS
   ========================================================= */

function setupEventListeners() {

  /* -----------------------------------------
     CHECKOUT
     ----------------------------------------- */

  const checkoutForm =
    $('#checkoutForm');

  if (checkoutForm) {

    checkoutForm.addEventListener(
      'submit',
      submitCheckout
    );

  }


  /* -----------------------------------------
     BOOKING
     ----------------------------------------- */

  const bookingForm =
    $('#bookingForm');

  if (bookingForm) {

    bookingForm.addEventListener(
      'submit',
      submitBooking
    );

  }


  /* -----------------------------------------
     REVIEW
     ----------------------------------------- */

  const reviewForm =
    $('#reviewForm');

  if (reviewForm) {

    reviewForm.addEventListener(
      'submit',
      submitReview
    );

  }


  /* -----------------------------------------
     STAR RATING
     ----------------------------------------- */

  const starsInput =
    $('#starsInput');

  if (starsInput) {

    starsInput.addEventListener(
      'click',
      () => {

        reviewRating = 5;

        starsInput.style.color =
          '#d09b00';

      }
    );

  }


  /* -----------------------------------------
     MENU SEARCH
     ----------------------------------------- */

  const searchInput =
    $('#menuSearch');

  if (searchInput) {

    searchInput.addEventListener(
      'input',
      searchMenu
    );


    searchInput.addEventListener(
      'keydown',
      event => {

        if (event.key === 'Escape') {
          closeMenuSearch();
        }

      }
    );

  }


  /* -----------------------------------------
     CART OVERLAY
     ----------------------------------------- */

  const overlay =
    $('#overlay');

  if (overlay) {

    overlay.addEventListener(
      'click',
      closeCart
    );

  }


  /* -----------------------------------------
     CLOSE MODALS WHEN CLICKING OUTSIDE
     ----------------------------------------- */

  const itemModal =
    $('#itemModal');

  if (itemModal) {

    itemModal.addEventListener(
      'click',
      event => {

        if (
          event.target ===
          itemModal
        ) {

          closeItem();

        }

      }
    );

  }


  const checkoutModal =
    $('#checkoutModal');

  if (checkoutModal) {

    checkoutModal.addEventListener(
      'click',
      event => {

        if (
          event.target ===
          checkoutModal
        ) {

          closeCheckout();

        }

      }
    );

  }


  const menuSearchModal =
    $('#menuSearchModal');

  if (menuSearchModal) {

    menuSearchModal.addEventListener(
      'click',
      event => {

        if (
          event.target ===
          menuSearchModal
        ) {

          closeMenuSearch();

        }

      }
    );

  }


  /* -----------------------------------------
     ESC KEY
     ----------------------------------------- */

  document.addEventListener(
    'keydown',
    event => {

      if (event.key !== 'Escape') {
        return;
      }

      closeCart();
      closeItem();
      closeCheckout();
      closeMenuSearch();

    }
  );

}


/* =========================================================
   START APPLICATION
   ========================================================= */

if (
  document.readyState ===
  'loading'
) {

  document.addEventListener(
    'DOMContentLoaded',
    () => {

      setupEventListeners();
      init();

    },
    {
      once: true
    }
  );

} else {

  setupEventListeners();
  init();

}
