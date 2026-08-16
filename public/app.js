let DATA={menu:[],settings:{},reviews:[],coupons:[]},cart=[],heroIndex=0,heroTimer=null,couponDiscount=0,appliedCoupon='',customerLocation='';
const $=s=>document.querySelector(s),$$=s=>document.querySelectorAll(s);

function money(n){return (DATA.settings.currency||'₹')+Number(n||0).toLocaleString('en-IN')}

async function init(){
  try{
    const r=await fetch('/api/public-data');
    if(!r.ok) throw new Error('Could not load public data');
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

function renderHero(){
  const box=$('#heroSlides'),dots=$('#heroDots');
  if(!box)return;
  const banners=Array.isArray(DATA.settings.heroBanners)?DATA.settings.heroBanners:[];
  box.innerHTML=banners.map((x,i)=>{
    const title=String(x.title||'Oriental Excellence').replace('Oriental Excellence','Oriental <em>Excellence</em>');
    return `<div class="hero-slide ${i===0?'active':''}" style="background-image:url('${x.image||''}')">
      <div class="hero-content">
        <img class="hero-logo-white" src="/assets/logo-white.png" alt="WASABEE Oriental Cuisine">
        <span class="eyebrow">WASABEE • ORIENTAL CUISINE</span>
        <h1>${title}</h1>
        <p>${x.subtitle||''}</p>
        <div class="hero-actions">
          <a class="btn purple" href="#order">Order Online →</a>
          <a class="btn ghost" href="#booking">Book a Table</a>
        </div>
      </div>
    </div>`;
  }).join('');
  if(dots)dots.innerHTML=banners.map((_,i)=>`<span class="dot ${i===0?'active':''}"></span>`).join('');
  heroIndex=0;
}

function startHero(){
  if(heroTimer)clearInterval(heroTimer);
  const slides=$$('.hero-slide');
  if(slides.length<=1)return;
  heroTimer=setInterval(heroNext,5000);
}

function heroNext(){
  const slides=$$('.hero-slide');
  if(!slides.length)return;
  heroIndex=(heroIndex+1)%slides.length;
  heroPaint();
}

function heroPrev(){
  const slides=$$('.hero-slide');
  if(!slides.length)return;
  heroIndex=(heroIndex-1+slides.length)%slides.length;
  heroPaint();
}

function heroPaint(){
  $$('.hero-slide').forEach((x,i)=>x.classList.toggle('active',i===heroIndex));
  $$('.dot').forEach((x,i)=>x.classList.toggle('active',i===heroIndex));
}

function renderCats(){
  const box=$('#categories');
  if(!box)return;
  const cats=Array.isArray(DATA.menu)?DATA.menu:[];
  box.innerHTML=cats.map((x,i)=>`<button class="cat ${i===0?'active':''}" type="button" onclick="jumpCat('${x.id}')"><span class="icon">${x.icon||'🍽️'}</span>${x.name||''}</button>`).join('');
}

function flattenItems(cat){
  if(Array.isArray(cat.items))return cat.items.map(x=>({...x,sub:''}));
  return (cat.subcategories||[]).flatMap(s=>(s.items||[]).map(x=>({...x,sub:s.name||''})));
}

function imageFor(item){
  if(item.image&&String(item.image).trim())return item.image;
  const q=encodeURIComponent(item.name||'asian food');
  return `https://source.unsplash.com/600x400/?${q},asian-food`;
}

function itemCard(item) {

  const image = item.image || item.imageUrl || item.photo || '';

  const imageStyle = image
    ? `style="background-image:url('${image}')"`
    : '';

  return `
    <article class="food-card">

      <div
        class="food-img"
        ${imageStyle}
      >

        ${
          item.veg
            ? '<span class="veg-dot"></span>'
            : ''
        }

      </div>

      <div class="food-body">

        <h4>
          ${item.name || ''}
        </h4>

        <p>
          ${item.description || ''}
        </p>

        ${
          item.variants && item.variants.length
            ? `
              <div class="variant-label">
                ${item.variants.length} choices • Select before adding
              </div>
            `
            : ''
        }

        <div class="price-row">

          <span class="price">
            ${
              item.variants && item.variants.length
                ? `From ₹${Math.min(...item.variants.map(v => Number(v.price) || 0))}`
                : `₹${Number(item.price) || 0}`
            }
          </span>

          <button
            class="add"
            onclick="openItem('${item.id}')"
          >
            Add +
          </button>

        </div>

      </div>

    </article>
  `;
}

function renderMenu(){
  const box=$('#menu');
  if(!box)return;

  let html='';
  const cats=Array.isArray(DATA.menu)?DATA.menu:[];

  cats.forEach(cat=>{
    const items=flattenItems(cat).filter(item=>item.active!==false);

    if(!items.length)return;

    html+=`<section class="menu-category" id="cat-${cat.id}">

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

      <div class="menu-grid">
        ${items.map(itemCard).join('')}
      </div>

    </section>`;
  });

  box.innerHTML=html;
}

function normalizeSearchText(value){
  return String(value||'')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g,'');
}

let currentSearchResults=[];

function ensureSearchResults(){
  let result=
    document.getElementById('menuSearchResults')||
    document.getElementById('menuSearchResult');

  if(result)return result;

  const card=document.querySelector('.menu-search-card');

  if(!card)return null;

  result=document.createElement('div');
  result.id='menuSearchResults';

  card.appendChild(result);

  return result;
}

function toggleMenuSearch(force){
  const modal=document.getElementById('menuSearchModal');
  const input=document.getElementById('menuSearch');

  if(!modal)return;

  const shouldOpen=
    typeof force==='boolean'
      ? force
      : !modal.classList.contains('show');

  if(shouldOpen){

    modal.classList.add('show');

    const result=ensureSearchResults();

    if(result&&!input?.value){
      result.innerHTML=`
        <div class="search-empty">
          <div class="search-empty-icon">🍣</div>
          <h3>Search our menu</h3>
          <p>Type a dish name to find it instantly.</p>
        </div>
      `;
    }

    setTimeout(()=>{
      input?.focus();
    },100);

  }else{

    modal.classList.remove('show');

    clearMenuSearch();
  }
}

function openMenuSearch(){
  toggleMenuSearch(true);
}

function closeMenuSearch(){
  toggleMenuSearch(false);
}

function searchMenu(){

  const input=document.getElementById('menuSearch');
  const result=ensureSearchResults();

  if(!input||!result)return;

  const raw=input.value.trim();
  const query=normalizeSearchText(raw);

  if(!query){

    currentSearchResults=[];

    result.innerHTML=`
      <div class="search-empty">
        <div class="search-empty-icon">🍣</div>
        <h3>Search our menu</h3>
        <p>Type a dish name to find it instantly.</p>
      </div>
    `;

    return;
  }

  const cats=Array.isArray(DATA.menu)?DATA.menu:[];
  const matches=[];

  cats.forEach(cat=>{

    flattenItems(cat).forEach(item=>{

      if(!item||item.active===false)return;

      const name=normalizeSearchText(item.name);

      if(name.includes(query)){
        matches.push(item);
      }

    });

  });

  matches.sort((a,b)=>{

    const aName=normalizeSearchText(a.name);
    const bName=normalizeSearchText(b.name);

    if(aName===query&&bName!==query)return -1;
    if(bName===query&&aName!==query)return 1;

    if(aName.startsWith(query)&&!bName.startsWith(query))return -1;
    if(bName.startsWith(query)&&!aName.startsWith(query))return 1;

    return String(a.name||'').localeCompare(String(b.name||''));
  });

  currentSearchResults=matches;

  if(!matches.length){

    result.innerHTML=`
      <div class="search-empty">
        <div class="search-empty-icon">🔍</div>
        <h3>No menu item found</h3>
        <p>Try another dish name.</p>
      </div>
    `;

    return;
  }

  result.innerHTML=`

    <div class="search-result-count">
      ${matches.length}
      ${matches.length===1?'menu item':'menu items'}
      found
    </div>

    <div class="search-result-list">

      ${matches.map((item,index)=>{

        let price=Number(item.price||0);

        if(Array.isArray(item.variants)&&item.variants.length){

          const prices=item.variants
            .map(v=>Number(v.price||0))
            .filter(v=>v>0);

          if(prices.length){
            price=Math.min(...prices);
          }
        }

        let image='';

        try{
          image=imageFor(item)||'';
        }catch(e){
          image='';
        }

        return `

          <div class="search-result-card">

            <div
              class="search-result-image"
              ${image?`style="background-image:url('${image}')"`:''}
            >
              ${image?'':'🍽️'}
            </div>

            <div class="search-result-info">

              <h3>
                ${item.name||''}
              </h3>

              <p>
                ${item.description||'Authentic oriental preparation crafted by WASABEE.'}
              </p>

              <div class="search-result-bottom">

                <strong>
                  ${item.variants?.length?'From ':''}
                  ${money(price)}
                </strong>

                <button
                  type="button"
                  class="search-add-btn"
                  onclick="selectSearchItem(${index})"
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

function selectSearchItem(index){

  const item=currentSearchResults[index];

  if(!item)return;

  toggleMenuSearch(false);

  if(typeof openItem==='function'){
    openItem(item);
  }
}

function clearMenuSearch(){

  const input=document.getElementById('menuSearch');

  if(input){
    input.value='';
  }

  currentSearchResults=[];

  const result=
    document.getElementById('menuSearchResults')||
    document.getElementById('menuSearchResult');

  if(result){

    result.innerHTML=`
      <div class="search-empty">
        <div class="search-empty-icon">🍣</div>
        <h3>Search our menu</h3>
        <p>Type a dish name to find it instantly.</p>
      </div>
    `;
  }
}

function openItem(item){

  const groups=(item.addonGroups||[])
    .map(id=>
      (DATA.settings.addonGroups||[])
        .find(g=>g.id===id)
    )
    .filter(g=>g&&g.active!==false);

  let addonHtml='';

  if(groups.length){

    addonHtml=`
      <div class="addon-section">

        <div class="addon-section-title">
          <span>➕ Customize Your Order</span>
          <small>Choose options if you want</small>
        </div>

        ${groups.map(g=>`

          <div class="addon-group">

            <div class="addon-group-title">

              <div>
                <h3>${g.name}</h3>
                <small>${g.description||''}</small>
              </div>

              <span class="addon-rule">
                ${g.required?'Required':'Optional'}
                ·
                ${g.selection==='multiple'?'Choose multiple':'Choose one'}
              </span>

            </div>

            <div class="addon-choice-list">

              ${
                (g.options||[])
                  .filter(o=>o.active!==false)
                  .map(o=>`

                    <button
                      type="button"
                      class="addon-choice"
                      data-group="${g.id}"
                      data-mode="${g.selection==='multiple'?'multiple':'single'}"
                      data-price="${Number(o.price||0)}"
                      data-name="${String(o.name).replace(/"/g,'&quot;')}"
                      onclick="selectAddonChoice(this)"
                    >

                      <span>
                        ${g.selection==='multiple'?'☐':'○'}
                      </span>

                      <b>
                        ${o.name}
                      </b>

                      <em>
                        ${Number(o.price||0)?'+'+money(o.price):'Included'}
                      </em>

                    </button>

                  `).join('')
                  ||
                  '<div class="empty">No active options in this group.</div>'
              }

            </div>

          </div>

        `).join('')}

      </div>
    `;
  }

  const legacy=item.addons?.length?`

    <div class="addon-section">

      <div class="addon-section-title">
        <span>Choose Add-on</span>
        <small>Legacy item options</small>
      </div>

      <div class="addon-list">

        ${item.addons.map(a=>`

          <button
            type="button"
            class="addon"
            data-name="${String(a).replace(/"/g,'&quot;')}"
            data-price="0"
            onclick="this.classList.toggle('selected')"
          >
            ${a}
          </button>

        `).join('')}

      </div>

    </div>

  `:'';

  const variants=item.variants?.length?`

    <div class="variant-list">

      ${item.variants.map((v,i)=>`

        <button
          type="button"
          class="variant ${i===0?'selected':''}"
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

  `:`

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
      ${item.variants?.length?'CHOOSE VARIANT':'ADD TO CART'}
    </span>

    <h2>
      ${item.name}
    </h2>

    <p>
      ${item.description||'Authentic oriental preparation crafted by WASABEE.'}
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
    .forEach(x=>x.classList.remove('selected'));

  el.classList.add('selected');
}

function selectAddonChoice(el){

  const mode=el.dataset.mode;

  if(mode==='single'){

    $$(`#itemModal .addon-choice[data-group="${CSS.escape(el.dataset.group)}"]`)
      .forEach(x=>{

        x.classList.remove('selected');

        const s=x.querySelector('span');

        if(s){
          s.textContent='○';
        }

      });

    el.classList.add('selected');

    const s=el.querySelector('span');

    if(s){
      s.textContent='●';
    }

  }else{

    el.classList.toggle('selected');

    const s=el.querySelector('span');

    if(s){
      s.textContent=
        el.classList.contains('selected')
          ?'☑'
          :'☐';
    }
  }
}

function closeItem(){
  $('#itemModal')?.classList.remove('show');
}

function confirmAdd(item){

  let variant='';
  let price=Number(item.price||0);

  if(item.variants?.length){

    const v=$('#itemModal .variant.selected');

    variant=
      v?.querySelector('span')?.textContent||
      item.variants[0].name;

    price=
      Number(
        v?.dataset.price||
        item.variants[0].price
      );
  }

  const groups=(item.addonGroups||[])
    .map(id=>
      (DATA.settings.addonGroups||[])
        .find(g=>g.id===id)
    )
    .filter(g=>g&&g.active!==false);

  for(const g of groups){

    if(
      g.required&&
      !$$(
        `#itemModal .addon-choice[data-group="${CSS.escape(g.id)}"].selected`
      ).length
    ){

      toast(`Please choose ${g.name}`);

      return;
    }
  }

  const addons=[
    ...$$('#itemModal .addon-choice.selected')
  ].map(x=>({
    name:x.dataset.name,
    price:Number(x.dataset.price||0)
  }));

  const legacy=[
    ...$$('#itemModal .addon.selected')
  ].map(x=>({
    name:x.dataset.name||x.textContent.trim(),
    price:Number(x.dataset.price||0)
  }));

  addons.push(...legacy);

  const addonTotal=
    addons.reduce(
      (s,a)=>s+Number(a.price||0),
      0
    );

  cart.push({

    key:Date.now()+Math.random(),

    id:item.id,

    name:item.name,

    variant,

    addons,

    price:price+addonTotal,

    basePrice:price,

    qty:1,

    containerCharge:
      Number(
        item.containerCharge??
        DATA.settings.defaultContainerCharge??
        0
      )

  });

  closeItem();

  renderCart();

  toast('Added to cart ✓');
}

function renderCart(){

  const count=
    cart.reduce((s,x)=>s+x.qty,0);

  if($('#cartCount')){
    $('#cartCount').textContent=count;
  }

  if($('#drawerCount')){
    $('#drawerCount').textContent=count;
  }

  if($('#cartItems')){

    $('#cartItems').innerHTML=
      cart.length

        ?cart.map((x,i)=>`

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
                    ?' · '+x.addons
                      .map(a=>typeof a==='string'?a:a.name)
                      .join(', ')
                    :''
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

        :'<div class="empty">Your cart is empty.<br>Add something delicious!</div>';
  }

  const sub=
    cart.reduce(
      (s,x)=>s+x.price*x.qty,
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
    (sub-discount)*
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
        <span>Sub Total</span>
        <b>${money(sub)}</b>
      </div>

      <div class="sum">
        <span>
          Discount (${DATA.settings.discountPercent||15}%)
        </span>

        <b style="color:#14863b">
          −${money(discount)}
        </b>
      </div>

      <div class="sum">
        <span>
          GST (${DATA.settings.gstPercent||5}%)
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

  $('#cartDrawer')?.classList.add('open');

  $('#overlay')?.classList.add('show');
}

function closeCart(){

  $('#cartDrawer')?.classList.remove('open');

  $('#overlay')?.classList.remove('show');
}

function goCheckout(){

  if(!cart.length){
    return toast('Please add items first');
  }

  closeCart();

  renderCheckout();

  $('#checkoutModal')?.classList.add('show');
}

function closeCheckout(){
  $('#checkoutModal')?.classList.remove('show');
}

function renderCheckout(){

  const sub=
    cart.reduce(
      (s,x)=>s+x.price*x.qty,
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
            x.containerCharge??
            DATA.settings.defaultContainerCharge??
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
        <span>Subtotal</span>
        <b>${money(sub)}</b>
      </div>

      <div class="sum">
        <span>
          ${DATA.settings.discountPercent||15}% Discount
        </span>

        <b>
          −${money(baseDiscount)}
        </b>
      </div>

      <div class="sum">

        <span>
          Coupon ${appliedCoupon?'('+appliedCoupon+')':''}
        </span>

        <b>
          ${
            couponDiscount
              ?'−'+money(couponDiscount)
              :money(0)
          }
        </b>

      </div>

      <div class="sum">

        <span>
          GST (${DATA.settings.gstPercent||5}%)
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

function applyCoupon(){

  const code=
    ($('#couponCode')?.value||'')
      .trim()
      .toUpperCase();

  const sub=
    cart.reduce(
      (s,x)=>s+x.price*x.qty,
      0
    );

  const c=
    (DATA.coupons||[])
      .find(
        x=>
          x.active!==false&&
          String(x.code).toUpperCase()===code
      );

  if(!c){

    couponDiscount=0;
    appliedCoupon='';

    if($('#couponStatus')){

      $('#couponStatus').textContent=
        code
          ?'Invalid coupon code.'
          :'';

      $('#couponStatus').className='coupon-bad';
    }

    renderCheckout();

    return;
  }

  if(sub<Number(c.minOrder||0)){

    couponDiscount=0;
    appliedCoupon='';

    if($('#couponStatus')){

      $('#couponStatus').textContent=
        'Minimum order for this coupon is '+
        money(c.minOrder);

      $('#couponStatus').className='coupon-bad';
    }

    renderCheckout();

    return;
  }

  couponDiscount=
    c.type==='flat'
      ?Math.min(
        sub,
        Number(c.value||0)
      )
      :sub*
        Number(c.value||0)/
        100;

  appliedCoupon=c.code;

  if($('#couponStatus')){

    $('#couponStatus').textContent=
      'Coupon applied ✓';

    $('#couponStatus').className='coupon-ok';
  }

  renderCheckout();
}

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

function renderReviews(){

  const rs=DATA.reviews||[];

  if($('#reviewsList')){

    $('#reviewsList').innerHTML=

      rs.length

        ?rs.map(r=>`

          <div class="review">

            <div class="stars">
              ${
                '★'.repeat(
                  Number(r.rating||5)
                )
              }${
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
                  ?new Date(
                    r.createdAt
                  ).toLocaleDateString()
                  :''
              }
            </small>

          </div>

        `).join('')

        :`

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
            ?'Loved by our guests'
            :'Your review matters'
        }
      </b>

    `;
  }
}

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
    typeof event!=='undefined'&&
    event?.currentTarget
  ){

    event.currentTarget.classList.add('active');
  }
}

function toggleNav(){
  $('.topbar nav')?.classList.toggle('show');
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

document.addEventListener('DOMContentLoaded',()=>{

  $('#menuSearch')?.addEventListener(
    'input',
    searchMenu
  );

  $('#menuSearch')?.addEventListener(
    'keydown',
    e=>{
      if(e.key==='Escape'){
        toggleMenuSearch(false);
      }
    }
  );

  $('#menuSearchModal')?.addEventListener(
    'click',
    e=>{
      if(e.target.id==='menuSearchModal'){
        toggleMenuSearch(false);
      }
    }
  );

  document.addEventListener(
    'keydown',
    e=>{
      if(e.key==='Escape'){
        toggleMenuSearch(false);
      }
    }
  );

  $('#checkoutForm')?.addEventListener(
    'submit',
    async e=>{

      e.preventDefault();

      try{

        const f=new FormData(e.target);

        const sub=
          cart.reduce(
            (s,x)=>s+x.price*x.qty,
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
                  x.containerCharge??
                  DATA.settings.defaultContainerCharge??
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
                'Content-Type':'application/json'
              },
              body:JSON.stringify(order)
            }
          );

        const data=await r.json();

        let text=
          `*WASABEE NEW ONLINE ORDER*\nOrder: ${data.orderId}\n\n*Customer*\nName: ${customer.name}\nPhone: ${customer.phone}\nAddress: ${customer.address}\nLandmark: ${customer.landmark||'-'}\nLocation: ${customerLocation||'-'}\n\n*Items*\n`;

        cart.forEach(
          x=>
            text+=
              `• ${x.name}${x.variant?' ('+x.variant+')':''}${x.addons?.length?' ['+x.addons.map(a=>typeof a==='string'?a:a.name).join(', ')+']':''} × ${x.qty} = ${money(x.price*x.qty)}\n`
        );

        text+=
          `\nSubtotal: ${money(sub)}\nDiscount: -${money(discount)}\nCoupon ${appliedCoupon||''}: -${money(couponDiscount)}\nGST: ${money(gst)}\nContainer: ${money(container)}\n*TOTAL: ${money(total)}*`;

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

  $('#bookingForm')?.addEventListener(
    'submit',
    async e=>{

      e.preventDefault();

      try{

        const f=new FormData(e.target);

        const b=
          Object.fromEntries(
            f.entries()
          );

        await fetch(
          '/api/bookings',
          {
            method:'POST',
            headers:{
              'Content-Type':'application/json'
            },
            body:JSON.stringify(b)
          }
        );

        const text=
          `*WASABEE TABLE BOOKING REQUEST*\nName: ${b.name}\nPhone: ${b.phone}\nDate: ${b.date}\nTime: ${b.time}\nGuests: ${b.guests}\nNotes: ${b.notes||'-'}`;

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

  $('#reviewForm')?.addEventListener(
    'submit',
    async e=>{

      e.preventDefault();

      try{

        const f=new FormData(e.target);

        await fetch(
          '/api/reviews',
          {
            method:'POST',
            headers:{
              'Content-Type':'application/json'
            },
            body:JSON.stringify({
              name:f.get('name'),
              comment:f.get('comment'),
              rating:window.reviewRating||5
            })
          }
        );

        e.target.reset();

        toast(
          'Thank you for your review ✓'
        );

        const r=
          await fetch('/api/public-data');

        DATA=await r.json();

        renderReviews();

      }catch(err){

        console.error(err);

        toast(
          'Could not submit review.'
        );
      }
    }
  );

  $('#starsInput')?.addEventListener(
    'click',
    e=>{

      if(e.target.closest('#starsInput')){

        window.reviewRating=5;

        e.currentTarget.style.color=
          '#d09b00';
      }
    }
  );

  $('#overlay')?.addEventListener(
    'click',
    closeCart
  );

  init();
});
