let DATA={
  menu:[],
  settings:{},
  reviews:[],
  coupons:[]
};

let cart=[];
let heroIndex=0;
let heroTimer=null;
let couponDiscount=0;
let appliedCoupon='';
let customerLocation='';

const $=s=>document.querySelector(s);
const $$=s=>document.querySelectorAll(s);

function money(n){
  return (DATA.settings.currency||'₹')+
    Number(n||0).toLocaleString('en-IN');
}

/* =========================
   INITIAL LOAD
========================= */

async function init(){
  try{
    const r=await fetch('/api/public-data');

    if(!r.ok){
      throw new Error('Could not load public data');
    }

    DATA=await r.json();

    renderHero();
    renderCats();
    renderMenu();
    renderReviews();
    renderCart();
    startHero();

  }catch(err){
    console.error('WASABEE INIT ERROR:',err);
    toast('Website data could not be loaded.');
  }
}


/* =========================
   HERO BANNER
========================= */

function renderHero(){

  const box=$('#heroSlides');
  const dots=$('#heroDots');

  if(!box)return;

  const banners=
    Array.isArray(DATA.settings.heroBanners)
      ? DATA.settings.heroBanners
      : [];

  box.innerHTML=banners.map((x,i)=>{

    const title=String(
      x.title||'Oriental Excellence'
    ).replace(
      'Oriental Excellence',
      'Oriental <em>Excellence</em>'
    );

    return `
      <div
        class="hero-slide ${i===0?'active':''}"
        style="background-image:url('${x.image||''}')"
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

          <p>${x.subtitle||''}</p>

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

  if(dots){

    dots.innerHTML=banners.map((_,i)=>`
      <span class="dot ${i===0?'active':''}"></span>
    `).join('');

  }

  heroIndex=0;
}


function startHero(){

  if(heroTimer){
    clearInterval(heroTimer);
  }

  const slides=$$('.hero-slide');

  if(slides.length<=1)return;

  heroTimer=setInterval(heroNext,5000);
}


function heroNext(){

  const slides=$$('.hero-slide');

  if(!slides.length)return;

  heroIndex=
    (heroIndex+1)%slides.length;

  heroPaint();
}


function heroPrev(){

  const slides=$$('.hero-slide');

  if(!slides.length)return;

  heroIndex=
    (heroIndex-1+slides.length)%slides.length;

  heroPaint();
}


function heroPaint(){

  $$('.hero-slide').forEach((x,i)=>{
    x.classList.toggle(
      'active',
      i===heroIndex
    );
  });

  $$('.dot').forEach((x,i)=>{
    x.classList.toggle(
      'active',
      i===heroIndex
    );
  });

}


/* =========================
   CATEGORIES
========================= */

function renderCats(){

  const box=$('#categories');

  if(!box)return;

  const cats=
    Array.isArray(DATA.menu)
      ? DATA.menu
      : [];

  box.innerHTML=cats.map((x,i)=>`

    <button
      class="cat ${i===0?'active':''}"
      type="button"
      onclick="jumpCat('${x.id}')"
    >

      <span class="icon">
        ${x.icon||'🍽️'}
      </span>

      ${x.name||''}

    </button>

  `).join('');
}


/* =========================
   MENU DATA
========================= */

function flattenItems(cat){

  if(Array.isArray(cat.items)){

    return cat.items.map(x=>({
      ...x,
      sub:''
    }));

  }

  return (cat.subcategories||[]).flatMap(
    s=>
      (s.items||[]).map(x=>({
        ...x,
        sub:s.name||''
      }))
  );

}


/* =========================
   FOOD IMAGE
========================= */

function imageFor(item){

  if(
    item.image &&
    String(item.image).trim()
  ){
    return item.image;
  }

  const q=
    encodeURIComponent(
      item.name||'asian food'
    );

  return `https://source.unsplash.com/600x400/?${q},asian-food`;
}


/* =========================
   FOOD CARD
========================= */

function itemCard(item){

  if(item.active===false)return '';

  const variants=
    Array.isArray(item.variants)
      ? item.variants
      : [];

  const hasVariants=
    variants.length>0;

  const base=
    hasVariants
      ? Math.min(
          ...variants.map(
            v=>Number(v.price||0)
          )
        )
      : Number(item.price||0);

  const label=
    hasVariants
      ? `${variants.length} choices`
      : money(base);

  const name=
    String(item.name||'');

  const icon=
    name.toLowerCase().includes('soup')
      ? '🍲'
      : name.toLowerCase().includes('sushi')
        ? '🍣'
        : '🍽️';

  return `

    <article class="food-card">

      <div
        class="food-img"
        style="
          background-image:
            linear-gradient(
              135deg,
              rgba(128,0,128,.35),
              rgba(15,0,15,.12)
            ),
            url('${imageFor(item)}');

          background-size:cover;
          background-position:center;
          background-repeat:no-repeat;
        "
      >

        <span>${icon}</span>

      </div>

      <div class="food-body">

        <h4>${item.name||''}</h4>

        <p>
          ${
            item.description||
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
                : money(base)
            }

          </span>

          <button
            class="add"
            type="button"
            onclick='openItem(${JSON.stringify(item).replace(/'/g,"&#39;")})'
          >
            Add +
          </button>

        </div>

      </div>

    </article>

  `;
}


/* =========================
   RENDER MENU
========================= */

function renderMenu(){

  const box=$('#menu');

  if(!box)return;

  let html='';

  const cats=
    Array.isArray(DATA.menu)
      ? DATA.menu
      : [];

  cats.forEach(cat=>{

    const items=
      flattenItems(cat)
      .filter(item=>item.active!==false);

    if(!items.length)return;

    html+=`

      <section
        class="menu-category"
        id="cat-${cat.id}"
      >

        <div class="section-head menu-category-head">

          <div>

            <span class="eyebrow">
              ${cat.name||'MENU'}
            </span>

            <h2>
              ${cat.name||''}
            </h2>

          </div>

        </div>

        <div class="grid">

          ${items.map(itemCard).join('')}

        </div>

      </section>

    `;

  });

  box.innerHTML=html;
}


/* =========================
   HEADER SEARCH
========================= */

function openMenuSearch(){

  const input=$('#menuSearch');
  const order=$('#order');

  if(order){

    order.scrollIntoView({
      behavior:'smooth',
      block:'start'
    });

  }

  if(input){

    setTimeout(()=>{

      input.focus();
      input.select();

    },450);

  }

}

function toggleMenuSearch(){ const modal = document.getElementById('menuSearchModal'); if(!modal) return; modal.classList.add('show'); const input = document.getElementById('menuSearch'); if(input){ setTimeout(() => { input.focus(); }, 100); } }
function closeMenuSearch(){

  clearMenuSearch();

}


function searchMenu() {
  const input = document.getElementById('menuSearch');
  const result = document.getElementById('menuSearchResults');

  if (!input || !result) return;

  const query = input.value.trim().toLowerCase();

  if (!query) {
    result.innerHTML = `
      <div class="search-empty">
        <div class="search-empty-icon">🍣</div>
        <h3>Search our menu</h3>
        <p>Type a dish name to find it instantly.</p>
      </div>
    `;
    return;
  }

  const cats = Array.isArray(DATA.menu) ? DATA.menu : [];
  const matches = [];

  cats.forEach(cat => {
    const items = flattenItems(cat);

    items.forEach(item => {
      if (item.active === false) return;

      const name = String(item.name || '').toLowerCase();
      const description = String(item.description || '').toLowerCase();

      if (name.includes(query) || description.includes(query)) {
        matches.push(item);
      }
    });
  });

  matches.sort((a, b) => {
    const aName = String(a.name || '').toLowerCase();
    const bName = String(b.name || '').toLowerCase();

    if (aName === query) return -1;
    if (bName === query) return 1;

    if (aName.startsWith(query) && !bName.startsWith(query)) return -1;
    if (bName.startsWith(query) && !aName.startsWith(query)) return 1;

    return aName.localeCompare(bName);
  });

  if (!matches.length) {
    result.innerHTML = `
      <div class="search-empty">
        <div class="search-empty-icon">🔍</div>
        <h3>No menu item found</h3>
        <p>Try another dish name.</p>
      </div>
    `;
    return;
  }

  result.innerHTML = `
    <div class="search-result-count">
      ${matches.length} ${matches.length === 1 ? 'menu item' : 'menu items'} found
    </div>

    <div class="search-result-list">
      ${matches.map(item => {
        let price = Number(item.price || 0);

        if (Array.isArray(item.variants) && item.variants.length) {
          const prices = item.variants
            .map(v => Number(v.price || 0))
            .filter(v => v > 0);

          if (prices.length) {
            price = Math.min(...prices);
          }
        }

        return `
          <div class="search-result-card">
            <div
              class="search-result-image"
              style="background-image:url('${imageFor(item)}')"
            ></div>

            <div class="search-result-info">
              <h3>${item.name || ''}</h3>

              <p>
                ${item.description || 'Authentic oriental preparation.'}
              </p>

              <div class="search-result-bottom">
                <strong>
                  ${item.variants && item.variants.length ? 'From ' : ''}
                  ${money(price)}
                </strong>

                <button
                  class="search-add-btn"
                  onclick='openItem(${JSON.stringify(item).replace(/'/g, "&#39;")})'
                >
                  Add +
                </button>
              </div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function clearMenuSearch(){

  const input=$('#menuSearch');

  if(input){
    input.value='';
  }

  $$('.food-card').forEach(
    card=>{
      card.style.display='';
    }
  );

  const result=
    $('#menuSearchResult')||
    $('#menuSearchResults');

  if(result){
    result.innerHTML='';
  }

}


/* =========================
   ITEM MODAL
========================= */

function openItem(item){

  const groups=
    (item.addonGroups||[])
      .map(
        id=>
          (DATA.settings.addonGroups||[])
            .find(g=>g.id===id)
      )
      .filter(
        g=>g&&g.active!==false
      );


  let addonHtml='';


  if(groups.length){

    addonHtml=`

      <div class="addon-section">

        <div class="addon-section-title">

          <span>
            ➕ Customize Your Order
          </span>

          <small>
            Choose options if you want
          </small>

        </div>

        ${groups.map(g=>`

          <div class="addon-group">

            <div class="addon-group-title">

              <div>

                <h3>${g.name}</h3>

                <small>
                  ${g.description||''}
                </small>

              </div>

              <span class="addon-rule">

                ${
                  g.required
                    ? 'Required'
                    : 'Optional'
                }

                ·

                ${
                  g.selection==='multiple'
                    ? 'Choose multiple'
                    : 'Choose one'
                }

              </span>

            </div>


            <div class="addon-choice-list">

              ${
                (g.options||[])
                  .filter(
                    o=>o.active!==false
                  )
                  .map(o=>`

                    <button
                      type="button"
                      class="addon-choice"
                      data-group="${g.id}"
                      data-mode="${
                        g.selection==='multiple'
                          ? 'multiple'
                          : 'single'
                      }"
                      data-price="${Number(o.price||0)}"
                      data-name="${
                        String(o.name)
                          .replace(/"/g,'&quot;')
                      }"
                      onclick="selectAddonChoice(this)"
                    >

                      <span>
                        ${
                          g.selection==='multiple'
                            ? '☐'
                            : '○'
                        }
                      </span>

                      <b>${o.name}</b>

                      <em>

                        ${
                          Number(o.price||0)
                            ? '+'+money(o.price)
                            : 'Included'
                        }

                      </em>

                    </button>

                  `)
                  .join('')
                  ||
                  '<div class="empty">No active options in this group.</div>'
              }

            </div>

          </div>

        `).join('')}

      </div>

    `;

  }


  const legacy=
    item.addons?.length
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

            ${
              item.addons.map(a=>`

                <button
                  type="button"
                  class="addon"
                  data-name="${
                    String(a)
                      .replace(/"/g,'&quot;')
                  }"
                  data-price="0"
                  onclick="this.classList.toggle('selected')"
                >

                  ${a}

                </button>

              `).join('')
            }

          </div>

        </div>

      `
      : '';


  const variants=
    item.variants?.length

      ? `

        <div class="variant-list">

          ${
            item.variants.map((v,i)=>`

              <button
                type="button"
                class="variant ${
                  i===0?'selected':''
                }"
                data-price="${v.price}"
                onclick="selectVariant(this)"
              >

                <span>${v.name}</span>

                <b>${money(v.price)}</b>

              </button>

            `).join('')
          }

        </div>

      `

      : `

        <input
          type="hidden"
          id="singlePrice"
          value="${item.price||0}"
        >

      `;


  const body=$('#itemModalBody');

  if(!body)return;


  body.innerHTML=`

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
        item.description||
        'Authentic oriental preparation crafted by WASABEE.'
      }
    </p>

    ${variants}

    ${addonHtml}

    ${legacy}

    <div class="modal-price-note">

      Container charge is added at checkout.

    </div>

    <div style="margin-top:22px">

      <button
        class="btn purple full"
        type="button"
        onclick='confirmAdd(${JSON.stringify(item).replace(/'/g,"&#39;")})'
      >

        Add to Cart

      </button>

    </div>

  `;


  $('#itemModal')?.classList.add('show');

}


function selectVariant(el){

  $$('#itemModal .variant')
    .forEach(
      x=>x.classList.remove('selected')
    );

  el.classList.add('selected');

}


function selectAddonChoice(el){

  const mode=el.dataset.mode;


  if(mode==='single'){

    $$(
      `#itemModal .addon-choice[data-group="${CSS.escape(el.dataset.group)}"]`
    ).forEach(x=>{

      x.classList.remove('selected');

      const s=x.querySelector('span');

      if(s)s.textContent='○';

    });


    el.classList.add('selected');

    const s=el.querySelector('span');

    if(s)s.textContent='●';

  }

  else{

    el.classList.toggle('selected');

    const s=el.querySelector('span');

    if(s){

      s.textContent=
        el.classList.contains('selected')
          ? '☑'
          : '☐';

    }

  }

}


function closeItem(){

  $('#itemModal')
    ?.classList.remove('show');

}


/* =========================
   ADD TO CART
========================= */

function confirmAdd(item){

  let variant='';

  let price=
    Number(item.price||0);


  if(item.variants?.length){

    const v=
      $('#itemModal .variant.selected');

    variant=
      v?.querySelector('span')?.textContent
      ||
      item.variants[0].name;

    price=
      Number(
        v?.dataset.price
        ||
        item.variants[0].price
      );

  }


  const groups=
    (item.addonGroups||[])
      .map(
        id=>
          (DATA.settings.addonGroups||[])
            .find(g=>g.id===id)
      )
      .filter(
        g=>g&&g.active!==false
      );


  for(const g of groups){

    if(
      g.required &&
      !$$(
        `#itemModal .addon-choice[data-group="${CSS.escape(g.id)}"].selected`
      ).length
    ){

      toast(
        `Please choose ${g.name}`
      );

      return;

    }

  }


  const addons=[
    ...$$(
      '#itemModal .addon-choice.selected'
    )
  ].map(x=>({

    name:x.dataset.name,

    price:
      Number(
        x.dataset.price||0
      )

  }));


  const legacy=[
    ...$$(
      '#itemModal .addon.selected'
    )
  ].map(x=>({

    name:
      x.dataset.name||
      x.textContent.trim(),

    price:
      Number(
        x.dataset.price||0
      )

  }));


  addons.push(...legacy);


  const addonTotal=
    addons.reduce(
      (s,a)=>
        s+Number(a.price||0),
      0
    );


  cart.push({

    key:
      Date.now()+Math.random(),

    id:item.id,

    name:item.name,

    variant,

    addons,

    price:
      price+addonTotal,

    basePrice:price,

    qty:1,

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

function renderCart(){

  const count=
    cart.reduce(
      (s,x)=>s+x.qty,
      0
    );


  if($('#cartCount'))
    $('#cartCount').textContent=count;

  if($('#drawerCount'))
    $('#drawerCount').textContent=count;


  if($('#cartItems')){

    $('#cartItems').innerHTML=
      cart.length

        ? cart.map((x,i)=>`

          <div class="cart-row">

            <div class="cart-thumb">
              🍜
            </div>

            <div class="cart-info">

              <h4>
                ${x.name}
              </h4>

              <small>

                ${x.variant||''}

                ${
                  x.addons?.length
                    ? ' · '+
                      x.addons
                        .map(
                          a=>
                            typeof a==='string'
                              ? a
                              : a.name
                        )
                        .join(', ')
                    : ''
                }

              </small>

              <div class="qty">

                <button
                  onclick="changeQty(${i},-1)"
                >
                  −
                </button>

                <b>
                  ${x.qty}
                </b>

                <button
                  onclick="changeQty(${i},1)"
                >
                  +
                </button>

              </div>

            </div>

            <div>

              <b>
                ${money(x.price*x.qty)}
              </b>

              <button
                class="remove"
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


  const sub=
    cart.reduce(
      (s,x)=>
        s+x.price*x.qty,
      0
    );


  const discount=
    sub*
    (
      Number(
        DATA.settings.discountPercent||15
      )/100
    );


  const gst=
    (
      sub-discount
    )*
    (
      Number(
        DATA.settings.gstPercent||5
      )/100
    );


  const total=
    sub-discount+gst;


  if($('#cartSummary')){

    $('#cartSummary').innerHTML=`

      <div class="sum">

        <span>
          Sub Total
        </span>

        <b>
          ${money(sub)}
        </b>

      </div>


      <div class="sum">

        <span>
          Discount (
          ${DATA.settings.discountPercent||15}%
          )
        </span>

        <b style="color:#14863b">

          −${money(discount)}

        </b>

      </div>


      <div class="sum">

        <span>
          GST (
          ${DATA.settings.gstPercent||5}%
          )
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


function changeQty(i,d){

  if(!cart[i])return;

  cart[i].qty+=d;

  if(cart[i].qty<=0){

    cart.splice(i,1);

  }

  renderCart();

}


function removeItem(i){

  cart.splice(i,1);

  renderCart();

}


function openCart(){

  $('#cartDrawer')
    ?.classList.add('open');

  $('#overlay')
    ?.classList.add('show');

}


function closeCart(){

  $('#cartDrawer')
    ?.classList.remove('open');

  $('#overlay')
    ?.classList.remove('show');

}


function goCheckout(){

  if(!cart.length){

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


function closeCheckout(){

  $('#checkoutModal')
    ?.classList.remove('show');

}


/* =========================
   CHECKOUT
========================= */

function renderCheckout(){

  const sub=
    cart.reduce(
      (s,x)=>
        s+x.price*x.qty,
      0
    );


  const baseDiscount=
    sub*
    (
      Number(
        DATA.settings.discountPercent||15
      )/100
    );


  const gst=
    (
      sub-
      baseDiscount-
      couponDiscount
    )*
    (
      Number(
        DATA.settings.gstPercent||5
      )/100
    );


  const container=
    cart.reduce(
      (s,x)=>
        s+
        (
          Number(
            x.containerCharge ??
            DATA.settings.defaultContainerCharge ??
            0
          )*
          x.qty
        ),
      0
    );


  const total=
    sub-
    baseDiscount-
    couponDiscount+
    gst+
    container;


  if($('#checkoutTotal')){

    $('#checkoutTotal').innerHTML=`

      <div class="sum">

        <span>
          Subtotal
        </span>

        <b>
          ${money(sub)}
        </b>

      </div>


      <div class="sum">

        <span>
          ${
            DATA.settings.discountPercent||15
          }% Discount
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
              ? '('+appliedCoupon+')'
              : ''
          }
        </span>

        <b>

          ${
            couponDiscount
              ? '−'+money(couponDiscount)
              : money(0)
          }

        </b>

      </div>


      <div class="sum">

        <span>
          GST (
          ${DATA.settings.gstPercent||5}%
          )
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

}


/* =========================
   COUPON
========================= */

function applyCoupon(){

  const code=
    ($('#couponCode')?.value||'')
      .trim()
      .toUpperCase();


  const sub=
    cart.reduce(
      (s,x)=>
        s+x.price*x.qty,
      0
    );


  const c=
    (DATA.coupons||[])
      .find(
        x=>
          x.active!==false &&
          String(x.code)
            .toUpperCase()===code
      );


  if(!c){

    couponDiscount=0;

    appliedCoupon='';


    if($('#couponStatus')){

      $('#couponStatus').textContent=
        code
          ? 'Invalid coupon code.'
          : '';

      $('#couponStatus')
        .className='coupon-bad';

    }

    renderCheckout();

    return;

  }


  if(
    sub<
    Number(c.minOrder||0)
  ){

    couponDiscount=0;

    appliedCoupon='';


    if($('#couponStatus')){

      $('#couponStatus').textContent=
        'Minimum order for this coupon is '+
        money(c.minOrder);

      $('#couponStatus')
        .className='coupon-bad';

    }

    renderCheckout();

    return;

  }


  couponDiscount=
    c.type==='flat'
      ? Math.min(
          sub,
          Number(c.value||0)
        )
      : sub*
        Number(c.value||0)/
        100;


  appliedCoupon=c.code;


  if($('#couponStatus')){

    $('#couponStatus').textContent=
      'Coupon applied ✓';

    $('#couponStatus')
      .className='coupon-ok';

  }


  renderCheckout();

}


/* =========================
   LOCATION
========================= */

function getLocation(){

  if(!navigator.geolocation){

    if($('#locationStatus')){

      $('#locationStatus').textContent=
        'Geolocation not supported';

    }

    return;

  }


  if($('#locationStatus')){

    $('#locationStatus').textContent=
      'Getting location…';

  }


  navigator.geolocation.getCurrentPosition(

    p=>{

      customerLocation=
        `https://www.google.com/maps?q=${p.coords.latitude},${p.coords.longitude}`;


      if($('#locationStatus')){

        $('#locationStatus').textContent=
          'Current location added ✓';

      }

    },

    ()=>{

      if($('#locationStatus')){

        $('#locationStatus').textContent=
          'Could not get location. Please enter address manually.';

      }

    }

  );

}


/* =========================
   REVIEWS
========================= */

function renderReviews(){

  const rs=
    DATA.reviews||[];


  if($('#reviewsList')){

    $('#reviewsList').innerHTML=

      rs.length

        ? rs.map(r=>`

          <div class="review">

            <div class="stars">

              ${
                '★'.repeat(
                  Number(r.rating||5)
                )
              }

              ${
                '☆'.repeat(
                  5-Number(r.rating||5)
                )
              }

            </div>

            <h4>
              ${r.name||'Guest'}
            </h4>

            <p>
              ${r.comment||''}
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

        `).join('')

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


  if($('#reviewSummary')){

    $('#reviewSummary').innerHTML=`

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


/* =========================
   NAVIGATION
========================= */

function jumpCat(id){

  document
    .querySelector('#cat-'+id)
    ?.scrollIntoView({
      behavior:'smooth',
      block:'start'
    });


  $$('.cat')
    .forEach(
      x=>x.classList.remove('active')
    );


  if(
    typeof event!=='undefined' &&
    event?.currentTarget
  ){

    event.currentTarget
      .classList.add('active');

  }

}


function toggleNav(){

  $('.topbar nav')
    ?.classList.toggle('show');

}


function toast(msg){

  const t=$('#toast');

  if(!t)return;

  t.className='toast show';

  t.textContent=msg;

  setTimeout(
    ()=>t.className='toast',
    2400
  );

}


/* =========================
   PAGE EVENTS
========================= */

document.addEventListener(
  'DOMContentLoaded',
  ()=>{

    /* SEARCH */

    $('#menuSearch')
      ?.addEventListener(
        'input',
        searchMenu
      );


    $('#menuSearch')
      ?.addEventListener(
        'keydown',
        e=>{

          if(e.key==='Escape'){

            clearMenuSearch();

          }

        }
      );


    /* CHECKOUT */

    $('#checkoutForm')
      ?.addEventListener(
        'submit',
        async e=>{

          e.preventDefault();

          try{

            const f=
              new FormData(e.target);


            const sub=
              cart.reduce(
                (s,x)=>
                  s+x.price*x.qty,
                0
              );


            const discount=
              sub*
              Number(
                DATA.settings.discountPercent||15
              )/
              100;


            const gst=
              (
                sub-
                discount-
                couponDiscount
              )*
              Number(
                DATA.settings.gstPercent||5
              )/
              100;


            const container=
              cart.reduce(
                (s,x)=>
                  s+
                  (
                    Number(
                      x.containerCharge ??
                      DATA.settings.defaultContainerCharge ??
                      0
                    )*
                    x.qty
                  ),
                0
              );


            const total=
              sub-
              discount-
              couponDiscount+
              gst+
              container;


            const customer={

              name:f.get('name'),

              phone:f.get('phone'),

              address:f.get('address'),

              landmark:f.get('landmark'),

              location:customerLocation

            };


            const order={

              customer,

              items:cart,

              subtotal:sub,

              discount,

              gst,

              containerCharge:container,

              total

            };


            const r=
              await fetch(
                '/api/orders',
                {
                  method:'POST',

                  headers:{
                    'Content-Type':
                      'application/json'
                  },

                  body:
                    JSON.stringify(order)

                }
              );


            const data=
              await r.json();


            let text=
              `*WASABEE NEW ONLINE ORDER*\n`+
              `Order: ${data.orderId}\n\n`+
              `*Customer*\n`+
              `Name: ${customer.name}\n`+
              `Phone: ${customer.phone}\n`+
              `Address: ${customer.address}\n`+
              `Landmark: ${customer.landmark||'-'}\n`+
              `Location: ${customerLocation||'-'}\n\n`+
              `*Items*\n`;


            cart.forEach(x=>{

              text+=
                `• ${x.name}`+
                `${
                  x.variant
                    ? ' ('+x.variant+')'
                    : ''
                }`+
                `${
                  x.addons?.length
                    ? ' ['+
                      x.addons
                        .map(
                          a=>
                            typeof a==='string'
                              ? a
                              : a.name
                        )
                        .join(', ')+
                      ']'
                    : ''
                }`+
                ` × ${x.qty}`+
                ` = ${money(x.price*x.qty)}\n`;

            });


            text+=
              `\nSubtotal: ${money(sub)}\n`+
              `Discount: -${money(discount)}\n`+
              `Coupon ${appliedCoupon||''}: -${money(couponDiscount)}\n`+
              `GST: ${money(gst)}\n`+
              `Container: ${money(container)}\n`+
              `*TOTAL: ${money(total)}*`;


            if(DATA.settings.whatsappNumber){

              window.open(
                `https://wa.me/${DATA.settings.whatsappNumber}?text=${encodeURIComponent(text)}`,
                '_blank'
              );

            }


            cart=[];

            couponDiscount=0;

            appliedCoupon='';

            renderCart();

            closeCheckout();

            toast(
              'Order sent to WhatsApp ✓'
            );


          }catch(err){

            console.error(err);

            toast(
              'Could not place order. Please try again.'
            );

          }

        }
      );


    /* BOOKING */

    $('#bookingForm')
      ?.addEventListener(
        'submit',
        async e=>{

          e.preventDefault();

          try{

            const f=
              new FormData(e.target);


            const b=
              Object.fromEntries(
                f.entries()
              );


            await fetch(
              '/api/bookings',
              {
                method:'POST',

                headers:{
                  'Content-Type':
                    'application/json'
                },

                body:
                  JSON.stringify(b)

              }
            );


            const text=
              `*WASABEE TABLE BOOKING REQUEST*\n`+
              `Name: ${b.name}\n`+
              `Phone: ${b.phone}\n`+
              `Date: ${b.date}\n`+
              `Time: ${b.time}\n`+
              `Guests: ${b.guests}\n`+
              `Notes: ${b.notes||'-'}`;


            if(DATA.settings.whatsappNumber){

              window.open(
                `https://wa.me/${DATA.settings.whatsappNumber}?text=${encodeURIComponent(text)}`,
                '_blank'
              );

            }


            e.target.reset();

            toast(
              'Booking request sent ✓'
            );


          }catch(err){

            console.error(err);

            toast(
              'Booking could not be sent.'
            );

          }

        }
      );


    /* REVIEW */

    $('#reviewForm')
      ?.addEventListener(
        'submit',
        async e=>{

          e.preventDefault();

          try{

            const f=
              new FormData(e.target);


            await fetch(
              '/api/reviews',
              {
                method:'POST',

                headers:{
                  'Content-Type':
                    'application/json'
                },

                body:
                  JSON.stringify({

                    name:f.get('name'),

                    comment:f.get('comment'),

                    rating:
                      window.reviewRating||5

                  })

              }
            );


            e.target.reset();

            toast(
              'Thank you for your review ✓'
            );


            const r=
              await fetch(
                '/api/public-data'
              );


            DATA=
              await r.json();


            renderReviews();


          }catch(err){

            console.error(err);

            toast(
              'Could not submit review.'
            );

          }

        }
      );


    /* STAR RATING */

    $('#starsInput')
      ?.addEventListener(
        'click',
        e=>{

          if(
            e.target.closest(
              '#starsInput'
            )
          ){

            window.reviewRating=5;

            e.currentTarget.style.color=
              '#d09b00';

          }

        }
      );


    /* CART OVERLAY */

    $('#overlay')
      ?.addEventListener(
        'click',
        closeCart
      );


    /* START WEBSITE */

    init();

  }
);
