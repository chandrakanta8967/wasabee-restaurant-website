let token=localStorage.getItem('wasabee_admin'),D={};

const $=s=>document.querySelector(s);
const $$=s=>document.querySelectorAll(s);

const money=n=>(D.settings?.currency||'₹')+Number(n||0).toLocaleString('en-IN');

$('#loginForm').addEventListener('submit',async e=>{
e.preventDefault();

const r=await fetch('/api/admin/login',{
method:'POST',
headers:{'Content-Type':'application/json'},
body:JSON.stringify({
password:String(new FormData(e.target).get('password')||'').trim()
})
});

if(!r.ok)return alert('Wrong password');

token=(await r.json()).token;

localStorage.setItem('wasabee_admin',token);

load();
});

async function api(u,o={}){
o.headers={
...(o.headers||{}),
Authorization:'Bearer '+token,
'Content-Type':'application/json'
};

const r=await fetch(u,o);

if(r.status===401){
logout();
throw Error('Unauthorized');
}

return r.json();
}

async function load(){
if(!token)return;

try{
D=await api('/api/admin/data');

$('#login').classList.add('hidden');
$('#app').classList.remove('hidden');

renderAll();

}catch(e){
logout();
}
}

async function refreshAll(){
D=await api('/api/admin/data');
renderAll();
}

function renderAll(){
renderOverview();
renderAnalytics();
renderMenu();
renderInventory();
renderOrders();
renderKOT();
renderBookings();
renderCoupons();
renderReviews();
renderSettings();
}

function logout(){
localStorage.removeItem('wasabee_admin');
token=null;

$('#app').classList.add('hidden');
$('#login').classList.remove('hidden');
}

$$('.tab').forEach(b=>b.onclick=()=>{
$$('.tab').forEach(x=>x.classList.remove('active'));

b.classList.add('active');

$$('.panel').forEach(x=>x.classList.add('hidden'));

$('#'+b.dataset.tab).classList.remove('hidden');

$('#pageTitle').textContent=
b.querySelector('span')?.textContent||b.textContent.trim();
});

function allItems(){
const out=[];

(D.menu||[]).forEach(c=>{

(c.items||[]).forEach(i=>
out.push({...i,category:c.name})
);

(c.subcategories||[]).forEach(s=>
(s.items||[]).forEach(i=>
out.push({
...i,
category:c.name,
subcategory:s.name
})
)
);

});

return out;
}

function orderRevenue(){
return D.orders.reduce((s,o)=>s+Number(o.total||0),0);
}

function renderOverview(){

const rev=D.reviews.length?
D.reviews.reduce((s,x)=>s+Number(x.rating||0),0)/D.reviews.length:0;

const pending=D.orders.filter(o=>
['NEW','PENDING'].includes(o.status)
).length;

const today=new Date().toDateString();

const todayOrders=D.orders.filter(o=>
new Date(o.createdAt).toDateString()===today
);

const todayRev=todayOrders.reduce(
(s,o)=>s+Number(o.total||0),0
);

$('#overview').innerHTML=`
<div class="stats">

<div class="stat">
<span>Total Orders</span>
<b>${D.orders.length}</b>
</div>

<div class="stat">
<span>Today's Orders</span>
<b>${todayOrders.length}</b>
</div>

<div class="stat">
<span>Today's Sales</span>
<b>${money(todayRev)}</b>
</div>

<div class="stat">
<span>Pending Orders</span>
<b>${pending}</b>
</div>

<div class="stat">
<span>Rating</span>
<b>${rev?rev.toFixed(1):'—'} ★</b>
</div>

</div>

<div class="grid2">

<div class="card">

<div class="kpi">
<div>
<h3>Recent Orders</h3>
<span class="muted">Live order control</span>
</div>

<button class="small-btn" onclick="showTab('orders')">
View all
</button>

</div>

${D.orders.slice(0,7).map(orderLine).join('')||
'<p class="muted">No orders yet.</p>'}

</div>

<div class="card">

<h3>Quick Actions</h3>

<div class="actions">

<button class="primary" onclick="showTab('menu')">
+ Add Menu Item
</button>

<button class="small-btn" onclick="showTab('inventory')">
Update Stock
</button>

<button class="small-btn" onclick="showTab('kot')">
Open Kitchen KOT
</button>

<button class="small-btn" onclick="showTab('coupons')">
Create Coupon
</button>

</div>

<hr>

<h4>System</h4>

<p class="muted">
Online ordering, WhatsApp, table booking and reviews are connected to this dashboard.
</p>

</div>

</div>
`;
}

function orderLine(o){

return `
<div class="item-row">

<div>
<b>${o.id}</b>

<div class="desc">
${o.customer?.name||''} · ${o.customer?.phone||''}
</div>

</div>

<div>
${money(o.total)}
</div>

<div>
<span class="pill ${
o.status==='COMPLETED'
?'good'
:o.status==='NEW'
?'warn':''
}">
${o.status}
</span>
</div>

<div class="actions">

<button class="small-btn"
onclick="setOrder('${o.id}','CONFIRMED')">
Confirm
</button>

<button class="small-btn"
onclick="setOrder('${o.id}','PREPARING')">
Kitchen
</button>

<button class="small-btn"
onclick="setOrder('${o.id}','COMPLETED')">
Done
</button>

</div>

</div>
`;
}

function renderAnalytics(){

const days=[];

for(let i=6;i>=0;i--){

const d=new Date();

d.setHours(0,0,0,0);
d.setDate(d.getDate()-i);

const orders=D.orders.filter(o=>{
const x=new Date(o.createdAt);
return x.toDateString()===d.toDateString();
});

days.push({
d,
orders,
rev:orders.reduce(
(s,o)=>s+Number(o.total||0),0
)
});

}

const max=Math.max(
1,
...days.map(x=>x.rev)
);

const itemMap={};

D.orders.forEach(o=>
(o.items||[]).forEach(i=>{
itemMap[i.name]=
(itemMap[i.name]||0)+Number(i.qty||0);
})
);

const top=Object.entries(itemMap)
.sort((a,b)=>b[1]-a[1])
.slice(0,8);

$('#analytics').innerHTML=`

<div class="toolbar">

<div>

<h3>Sales Analytics</h3>

<p class="muted">
Last 7 days based on orders stored by the website.
</p>

</div>

<button class="small-btn"
onclick="downloadReport()">
↓ Export CSV
</button>

</div>

<div class="stats">

<div class="stat">
<span>All-time sales</span>
<b>${money(orderRevenue())}</b>
</div>

<div class="stat">
<span>Average order value</span>
<b>
${D.orders.length?
money(orderRevenue()/D.orders.length):
money(0)}
</b>
</div>

<div class="stat">
<span>Completed</span>
<b>
${D.orders.filter(o=>o.status==='COMPLETED').length}
</b>
</div>

<div class="stat">
<span>Bookings</span>
<b>${D.bookings.length}</b>
</div>

<div class="stat">
<span>Menu items</span>
<b>${allItems().length}</b>
</div>

</div>

<div class="grid2">

<div class="card">

<h3>Daily Sales</h3>

<div class="chart">

${days.map(x=>`

<div class="col">

<div class="barv">

<i style="height:${Math.max(
4,
x.rev/max*115
)}px"></i>

</div>

<b>${money(x.rev)}</b>

<small>
${x.d.toLocaleDateString(
'en-IN',
{weekday:'short'}
)}
</small>

</div>

`).join('')}

</div>

</div>

<div class="card">

<h3>Best Sellers</h3>

<div class="mini-list">

${top.map((x,i)=>`

<div>
<span>${i+1}. ${esc(x[0])}</span>
<b>${x[1]} sold</b>
</div>

`).join('')||
'<span class="muted">No sales data yet.</span>'}

</div>

</div>

</div>
`;
}

function renderOrders(){

const q=$('#orderSearch')?.value?.toLowerCase()||'';

const list=D.orders.filter(o=>
JSON.stringify(o).toLowerCase().includes(q)
);

$('#orders').innerHTML=`

<div class="toolbar">

<div>

<h3>Online Orders</h3>

<p class="muted">
Customer details, location, pricing and status.
</p>

</div>

<input
id="orderSearch"
class="search"
placeholder="Search order / customer"
value="${esc(q)}"
>

</div>

<div class="table-wrap">

<table>

<thead>

<tr>
<th>Order</th>
<th>Customer</th>
<th>Items</th>
<th>Total</th>
<th>Status</th>
<th>Actions</th>
</tr>

</thead>

<tbody>

${list.map(o=>`

<tr>

<td>
<b>${o.id}</b>
<br>
<small>
${new Date(o.createdAt).toLocaleString()}
</small>
</td>

<td>

${esc(o.customer?.name||'')}
<br>
${esc(o.customer?.phone||'')}
<br>
${esc(o.customer?.address||'')}

<br>

${o.customer?.location?
`<a target="_blank"
href="${o.customer.location}">
📍 Map
</a>`:''}

</td>

<td>

${(o.items||[]).map(i=>
`${esc(i.name)}
${i.variant?'('+esc(i.variant)+')':''}
×${i.qty}
${i.addons?.length?
' · '+esc(i.addons.join(', ')):''}`
).join('<br>')}

</td>

<td>

<b>${money(o.total)}</b>

<br>

<small>
GST ${money(o.gst)}
· Container ${money(o.containerCharge)}
</small>

</td>

<td>
<span class="pill">
${o.status}
</span>
</td>

<td class="actions">

<button class="small-btn"
onclick="setOrder('${o.id}','CONFIRMED')">
Confirm
</button>

<button class="small-btn"
onclick="setOrder('${o.id}','PREPARING')">
Preparing
</button>

<button class="small-btn"
onclick="setOrder('${o.id}','COMPLETED')">
Done
</button>

<button class="small-btn"
onclick="printKOT('${o.id}')">
Print KOT
</button>

</td>

</tr>

`).join('')}

</tbody>

</table>

</div>
`;

$('#orderSearch').oninput=renderOrders;
}

async function setOrder(id,status){

await api(
'/api/admin/orders/'+id,
{
method:'PUT',
body:JSON.stringify({status})
}
);

await refreshAll();
}

function renderKOT(){

const active=D.orders.filter(o=>
!['COMPLETED','CANCELLED'].includes(o.status)
);

$('#kot').innerHTML=`

<div class="toolbar">

<div>

<h3>Kitchen Order Ticket</h3>

<p class="muted">
Print a clean kitchen ticket for each active order.
</p>

</div>

<button class="small-btn"
onclick="printAllKOT()">
🖨️ Print All Active
</button>

</div>

<div class="report-grid">

${active.map(o=>`

<div class="card">

<div class="kpi">

<b>${o.id}</b>

<span class="pill">
${o.status}
</span>

</div>

<p>
<b>${esc(o.customer?.name||'Walk-in')}</b>
·
${esc(o.customer?.phone||'')}
</p>

<hr>

${(o.items||[]).map(i=>`

<div class="mini-list">

<div>

<span>
${i.qty} ×
${esc(i.name)}
${i.variant?'— '+esc(i.variant):''}
</span>

<b>
${i.addons?.length?
'Sauce: '+esc(i.addons.join(', ')):''}
</b>

</div>

</div>

`).join('')}

<button class="primary"
onclick="printKOT('${o.id}')">
Print KOT
</button>

</div>

`).join('')||

'<div class="card"><p>No active kitchen orders.</p></div>'}

</div>
`;
}

function kotHTML(o){

return `
<div class="printable"
style="font-family:Arial;padding:30px">

<h1 style="text-align:center;margin:0">
WASABEE
</h1>

<p style="text-align:center">
KITCHEN ORDER TICKET
</p>

<hr>

<h2>${o.id}</h2>

<p>
<b>${esc(o.customer?.name||'Customer')}</b>
<br>
${esc(o.customer?.phone||'')}
</p>

<hr>

${(o.items||[]).map(i=>`

<h3>
${i.qty} ×
${esc(i.name)}
${i.variant?'— '+esc(i.variant):''}
</h3>

${i.addons?.length?
`<p>
Sauce/Add-on:
${esc(i.addons.join(', '))}
</p>`:''}

`).join('')}

<hr>

<p>
Order status: ${o.status}
</p>

</div>
`;
}

function printKOT(id){

const o=D.orders.find(x=>x.id===id);

if(!o)return;

const w=window.open('','_blank');

w.document.write(kotHTML(o));

w.document.close();

w.focus();

w.print();
}

function printAllKOT(){

const active=D.orders.filter(o=>
!['COMPLETED','CANCELLED'].includes(o.status)
);

const w=window.open('','_blank');

w.document.write(
active.map(kotHTML).join(
'<div style="page-break-after:always"></div>'
)
);

w.document.close();

w.focus();

w.print();
}

function renderBookings(){

$('#bookings').innerHTML=`

<div class="toolbar">

<div>

<h3>Table Bookings</h3>

<p class="muted">
Manage reservations coming from the website.
</p>

</div>

</div>

<div class="table-wrap">

<table>

<thead>

<tr>
<th>Booking</th>
<th>Customer</th>
<th>Date</th>
<th>Time</th>
<th>Guests</th>
<th>Status</th>
<th>Action</th>
</tr>

</thead>

<tbody>

${D.bookings.map(b=>`

<tr>

<td>${b.id}</td>

<td>
${esc(b.name)}
<br>
${esc(b.phone)}
</td>

<td>${b.date}</td>

<td>${b.time}</td>

<td>${b.guests}</td>

<td>
<span class="pill">
${b.status}
</span>
</td>

<td class="actions">

<button class="small-btn"
onclick="setBooking('${b.id}','CONFIRMED')">
Confirm
</button>

<button class="small-btn"
onclick="setBooking('${b.id}','COMPLETED')">
Done
</button>

</td>

</tr>

`).join('')}

</tbody>

</table>

</div>
`;
}

async function setBooking(id,status){

await api(
'/api/admin/bookings/'+id,
{
method:'PUT',
body:JSON.stringify({status})
}
);

await refreshAll();
}

function renderReviews(){

$('#reviews').innerHTML=`

<div class="toolbar">

<div>

<h3>Customer Reviews</h3>

<p class="muted">
Moderate guest feedback shown on the public website.
</p>

</div>

</div>

${D.reviews.map(r=>`

<div class="review-card">

<b>${esc(r.name)}</b>

<span class="pill">
${'★'.repeat(r.rating||5)}
</span>

<p>
${esc(r.comment)}
</p>

<small>
${new Date(r.createdAt).toLocaleString()}
</small>

<button
class="small-btn danger"
onclick="deleteReview('${r.id}')">
Delete
</button>

</div>

`).join('')||
'<p>No reviews yet.</p>'}
`;
}

async function deleteReview(id){

if(!confirm('Delete this review?'))return;

await api(
'/api/admin/reviews/'+id,
{
method:'DELETE'
}
);

await refreshAll();
}

let menuView='items';

function renderMenu(){

const active=menuView;

let html=`

<div class="toolbar menu-toolbar">

<div>

<span class="eyebrow">
MENU CONTROL CENTER
</span>

<h3>Menu Manager</h3>

<p class="muted">
Manage menu items, categories, variants, prices,
food images, visibility, container charges and add-ons
from one place.
</p>

</div>

<div class="toolbar-actions">

${active==='items'?
`<button class="primary"
onclick="addItem(0)">
+ Add Item
</button>`:''}

<button class="small-btn"
onclick="addCategory()">
+ Add Category
</button>

</div>

</div>
`;

html+=`

<div class="menu-tabs">

<button
class="menu-tab ${active==='items'?'active':''}"
onclick="setMenuView('items')">

🍜 Items
<small>Edit dishes & prices</small>

</button>

<button
class="menu-tab ${active==='categories'?'active':''}"
onclick="setMenuView('categories')">

📂 Categories
<small>Organise your menu</small>

</button>

<button
class="menu-tab ${active==='addons'?'active':''}"
onclick="setMenuView('addons')">

➕ Add-ons
<small>Sauces & extras</small>

</button>

</div>
`;

if(active==='addons')
return $('#menu').innerHTML=
html+renderAddonGroups();

if(active==='categories')
return $('#menu').innerHTML=
html+renderCategories();

html+=`

<div class="helper-card">

<b>How to use:</b>

Click <strong>Edit</strong> on any dish
→ choose variants
→ assign one or more
<strong>Add-on Groups</strong>.

Customers will then see those choices
before adding the dish to cart.

</div>
`;

(D.menu||[]).forEach((c,ci)=>{

html+=`

<div class="category-block">

<div class="cat-head">

<div>

<h3>
${c.icon||'🍽️'}
${esc(c.name)}
</h3>

<span class="muted">
${(c.items||[]).length} item(s)
</span>

</div>

<div>

<button class="small-btn"
onclick="addItem(${ci})">
+ Add Item
</button>

<button class="small-btn danger"
onclick="deleteCategory(${ci})">
Delete Category
</button>

</div>

</div>

<div class="items">

${c.items?
c.items.map((x,ii)=>
itemRow(ci,ii,x)
).join(''):

(c.subcategories||[]).map((sub,si)=>`

<div class="subcat">

<b>${esc(sub.name)}</b>

<button class="small-btn"
onclick="addSubItem(${ci},${si})">
+ Add Item
</button>

${sub.items.map((x,ii)=>
itemRow(ci,ii,x,si)
).join('')}

</div>

`).join('')}

</div>

</div>
`;
});

$('#menu').innerHTML=html;
}

function setMenuView(v){
menuView=v;
renderMenu();
}

function renderCategories(){

return `

<div class="section-grid">

${(D.menu||[]).map((c,i)=>`

<div class="card category-editor">

<div class="kpi">

<div>

<span class="category-icon">
${c.icon||'🍽️'}
</span>

<div>

<h3>
${esc(c.name)}
</h3>

<span class="muted">
${(c.items||[]).length} item(s)
</span>

</div>

</div>

<span class="pill good">
ACTIVE
</span>

</div>

<div class="form-grid">

<input
data-cat="${i}"
data-k="name"
value="${esc(c.name)}"
placeholder="Category name"
>

<input
data-cat="${i}"
data-k="icon"
value="${esc(c.icon||'🍽️')}"
placeholder="Icon / emoji"
>

</div>

</div>

`).join('')}

</div>

<div class="sticky-save">

<button
class="primary"
onclick="saveCategories()">
💾 Save Categories
</button>

</div>
`;
}

async function saveCategories(){

(D.menu||[]).forEach((c,i)=>
$$(`[data-cat="${i}"]`).forEach(el=>
c[el.dataset.k]=el.value
)
);

await saveMenu();

alert('Categories saved');
}

function itemRow(ci,ii,x,si){

const groups=(x.addonGroups||[])
.map(id=>
(D.settings.addonGroups||[])
.find(g=>g.id===id)?.name
)
.filter(Boolean);

return `

<div class="item-row menu-item-row">

<div class="item-main">

<div class="food-mini">

${x.image?
`<img src="${esc(x.image)}" alt="">`
:'🍽️'}

</div>

<div>

<b>
${esc(x.name)}
</b>

<div class="desc">
${esc(x.description||'No description added')}
</div>

${x.variants?.length?
`<div class="item-meta">
${x.variants.length} variants
</div>`:''}

${groups.length?
`<div class="item-meta addon-meta">
Add-ons: ${esc(groups.join(', '))}
</div>`:''}

</div>

</div>

<div>

<strong>

${x.variants?.length?
`From ${money(
Math.min(...x.variants.map(v=>v.price))
)}`
:
money(x.price)}

</strong>

<br>

<small>
Container
${money(
x.containerCharge??
D.settings.defaultContainerCharge??
0
)}
</small>

</div>

<div>

${x.active===false?
'<span class="pill warn">OFF</span>':
'<span class="pill good">ON</span>'}

${groups.length?
`<br>
<span class="pill">
${groups.length}
Add-on group${groups.length>1?'s':''}
</span>`:''}

</div>

<div class="actions">

<button
class="small-btn"
onclick='editItem(${ci},${ii},${si===undefined?"null":si})'>
Edit
</button>

<button
class="small-btn danger"
onclick='deleteItem(${ci},${ii},${si===undefined?"null":si})'>
Delete
</button>

</div>

</div>
`;
}


/* =========================================================
   EDIT MENU ITEM
   IMAGE UPLOAD CODE FIXED
   ========================================================= */

function editItem(ci, ii, si) {

  const x =
    si === null
      ? D.menu[ci].items[ii]
      : D.menu[ci].subcategories[si].items[ii];

  const groups =
    D.settings.addonGroups || [];

  openEditor(`

    <span class="eyebrow">
      MENU ITEM
    </span>

    <h2>
      Edit Menu Item
    </h2>

    <p class="muted">
      Set the dish details below.
      Customers only see add-ons assigned to this item.
    </p>

    <form
      id="itemEdit"
      class="form-grid"
    >

      <label>

        Item name

        <input
          name="name"
          value="${esc(x.name)}"
          required
        >

      </label>


      <label>

        Single price

        <span class="hint">
          Use this only when there are no variants.
        </span>

        <input
          name="price"
          type="number"
          value="${x.price ?? ''}"
          placeholder="e.g. 325"
        >

      </label>


      <label>

        Container charge

        <input
          name="containerCharge"
          type="number"
          value="${
            x.containerCharge ??
            D.settings.defaultContainerCharge ??
            0
          }"
        >

      </label>


      <!-- =========================
           FOOD IMAGE
      ========================== -->

      <label class="wide">

        <span>
          Food Image
        </span>

        <input
          type="file"
          id="foodImageFile"
          accept=".jpg,.jpeg,.png,.webp,.gif,.svg,image/*"
        >

        <input
          type="hidden"
          name="image"
          value="${esc(x.image || '')}"
        >

        <small class="hint">
          Select a food image from your computer.
          The image will be uploaded to
          <b>public/uploads</b>.
        </small>

        <div
          id="imagePreview"
          style="
            margin-top:10px;
            display:${x.image ? 'block' : 'none'};
          "
        >

          ${
            x.image
              ? `
                <img
                  src="${esc(x.image)}"
                  alt="${esc(x.name)}"
                  style="
                    width:180px;
                    height:130px;
                    object-fit:cover;
                    border-radius:12px;
                    border:1px solid #ddd;
                    display:block;
                  "
                >
              `
              : ''
          }

        </div>

      </label>


      <label>

        Visibility

        <select name="active">

          <option
            value="true"
            ${
              x.active !== false
                ? 'selected'
                : ''
            }
          >
            Visible / ON
          </option>

          <option
            value="false"
            ${
              x.active === false
                ? 'selected'
                : ''
            }
          >
            Hidden / OFF
          </option>

        </select>

      </label>


      <label class="wide">

        Description

        <textarea
          name="description"
          placeholder="Short food description"
        >${esc(x.description || '')}</textarea>

      </label>


      <label class="wide">

        Variants

        <span class="hint">
          One per line: Variant name | Price
        </span>

        <textarea
          name="variants"
          placeholder="Veg | 275&#10;Non-Veg | 325"
        >${
          (x.variants || [])
            .map(
              v =>
                v.name +
                ' | ' +
                v.price
            )
            .join('\n')
        }</textarea>

      </label>


      <!-- =========================
           ADD-ON GROUPS
      ========================== -->

      <div class="wide addon-assignment">

        <div class="field-title">
          ➕ Add-on Groups
        </div>

        <p class="muted">
          Tick the groups that customers
          should see for this dish.
        </p>

        <div class="addon-check-grid">

          ${
            groups.map(g => `

              <label class="addon-check">

                <input
                  type="checkbox"
                  name="addonGroup"
                  value="${esc(g.id)}"
                  ${
                    (x.addonGroups || [])
                      .includes(g.id)
                      ? 'checked'
                      : ''
                  }
                >

                <span>

                  <b>
                    ${esc(g.name)}
                  </b>

                  <small>

                    ${
                      g.selection === 'single'
                        ? 'Choose one'
                        : 'Choose multiple'
                    }

                    ${
                      g.required
                        ? ' · Required'
                        : ''
                    }

                  </small>

                </span>

              </label>

            `).join('')
          }

          ${
            !groups.length
              ? `
                <div class="empty-box">
                  No add-on groups yet.
                  Open <b>Add-ons</b> tab
                  to create one.
                </div>
              `
              : ''
          }

        </div>

      </div>


      <!-- =========================
           LEGACY ADDONS
      ========================== -->

      <label class="wide legacy-addon">

        <span>
          Legacy Add-ons (optional)
        </span>

        <span class="hint">
          Keep this only for simple text choices.
        </span>

        <textarea
          name="addons"
          placeholder="One simple add-on per line"
        >${
          (x.addons || [])
            .join('\n')
        }</textarea>

      </label>


      <button
        class="primary wide"
        type="submit"
      >
        💾 Save Item
      </button>

    </form>
  `);


  /* =========================
     IMAGE PREVIEW
  ========================== */

  const imageInput =
    $('#foodImageFile');

  if (imageInput) {

    imageInput.onchange = () => {

      const file =
        imageInput.files[0];

      if (!file) return;

      const allowedTypes = [
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/gif',
        'image/svg+xml'
      ];

      if (
        file.type &&
        !allowedTypes.includes(file.type)
      ) {

        alert(
          'Please select JPG, PNG, WEBP, GIF or SVG image.'
        );

        imageInput.value = '';

        return;
      }

      const reader =
        new FileReader();

      reader.onload = () => {

        const preview =
          $('#imagePreview');

        if (!preview) return;

        preview.style.display =
          'block';

        preview.innerHTML = `

          <img
            src="${reader.result}"
            alt="Preview"
            style="
              width:180px;
              height:130px;
              object-fit:cover;
              border-radius:12px;
              border:1px solid #ddd;
              display:block;
            "
          >

          <small
            class="hint"
            style="
              display:block;
              margin-top:6px;
            "
          >
            New image selected.
            Click "Save Item" to upload it.
          </small>
        `;
      };

      reader.readAsDataURL(file);
    };
  }


  /* =========================
     SAVE ITEM
  ========================== */

  $('#itemEdit').onsubmit =
    async e => {

      e.preventDefault();

      const saveButton =
        e.target.querySelector(
          'button[type="submit"]'
        );

      try {

        if (saveButton) {

          saveButton.disabled = true;

          saveButton.textContent =
            '⏳ Saving...';
        }


        const f =
          new FormData(e.target);


        /* =========================
           BASIC ITEM DATA
        ========================== */

        x.name =
          f.get('name');

        x.price =
          f.get('price')
            ? Number(f.get('price'))
            : undefined;

        x.containerCharge =
          Number(
            f.get(
              'containerCharge'
            ) || 0
          );

        x.active =
          f.get('active') === 'true';

        x.description =
          f.get('description') || '';


        /* =========================
           IMAGE UPLOAD
        ========================== */

        const imageFile =
          $('#foodImageFile')?.files?.[0];


        if (imageFile) {

          /*
            Convert image to base64
          */

          const imageData =
            await new Promise(
              (resolve, reject) => {

                const reader =
                  new FileReader();

                reader.onload = () => {

                  resolve(
                    reader.result
                  );
                };

                reader.onerror =
                  () => {

                    reject(
                      new Error(
                        'Could not read image file'
                      )
                    );
                  };

                reader.readAsDataURL(
                  imageFile
                );
              }
            );


          /*
            Upload to server
          */

          const upload =
            await api(
              '/api/admin/upload',
              {
                method: 'POST',

                body:
                  JSON.stringify({
                    filename:
                      imageFile.name,

                    data:
                      imageData
                  })
              }
            );


          if (
            !upload ||
            !upload.ok ||
            !upload.url
          ) {

            throw new Error(
              upload?.error ||
              'Image upload failed'
            );
          }


          /*
            IMPORTANT:
            Save returned URL
            inside menu item
          */

          x.image =
            upload.url;


          console.log(
            'Image uploaded:',
            upload.url
          );

        } else {

          /*
            Keep existing image
          */

          x.image =
            f.get('image') || '';

        }


        /* =========================
           VARIANTS
        ========================== */

        x.variants =
          String(
            f.get('variants') || ''
          )
            .split('\n')
            .map(
              s => s.trim()
            )
            .filter(Boolean)
            .map(s => {

              const parts =
                s
                  .split('|')
                  .map(
                    t => t.trim()
                  );

              return {
                name:
                  parts[0] || '',
                price:
                  Number(
                    parts[1] || 0
                  )
              };
            });


        if (
          !x.variants.length
        ) {

          delete x.variants;
        }


        /* =========================
           ADD-ON GROUPS
        ========================== */

        x.addonGroups = [

          ...e.target.querySelectorAll(
            'input[name="addonGroup"]:checked'
          )

        ].map(
          el => el.value
        );


        /* =========================
           LEGACY ADDONS
        ========================== */

        x.addons =
          String(
            f.get('addons') || ''
          )
            .split('\n')
            .map(
              s => s.trim()
            )
            .filter(Boolean);


        if (
          !x.addons.length
        ) {

          delete x.addons;
        }


        /* =========================
           SAVE MENU JSON
        ========================== */

        await saveMenu();


        /*
          Reload latest server data
        */

        D =
          await api(
            '/api/admin/data'
          );


        closeEditor();

        renderMenu();


        alert(
          '✅ Item saved successfully!\n\n' +
          'Food image uploaded and saved.'
        );


      } catch (err) {

        console.error(
          'Save item error:',
          err
        );

        alert(
          '❌ Save failed:\n\n' +
          (
            err.message ||
            'Unknown error'
          )
        );

      } finally {

        if (saveButton) {

          saveButton.disabled =
            false;

          saveButton.textContent =
            '💾 Save Item';
        }
      }
    };
}

function addItem(ci,si=null){

if(!D.menu[ci])ci=0;

const x={
id:'item-'+Date.now(),
name:'New Item',
price:0,
description:'Add a short description',
active:true,
containerCharge:
Number(D.settings.defaultContainerCharge||0)
};

if(si===null){

D.menu[ci].items=
(D.menu[ci].items||[]).concat(x);

}else{

D.menu[ci].subcategories[si].items.push(x);

}

saveMenu().then(()=>{

menuView='items';

renderMenu();

editItem(
ci,
si===null
?D.menu[ci].items.length-1
:D.menu[ci].subcategories[si].items.length-1,
si
);

});
}

function addSubItem(ci,si){

addItem(ci,si);

}

async function deleteItem(ci,ii,si){

if(!confirm('Delete this item?'))return;

if(si===null){

D.menu[ci].items.splice(ii,1);

}else{

D.menu[ci]
.subcategories[si]
.items.splice(ii,1);

}

await saveMenu();

}

async function deleteCategory(ci){

if(!confirm(
'Delete entire category and all its items?'
))return;

D.menu.splice(ci,1);

await saveMenu();

}

function addCategory(){

D.menu.push({
id:'category-'+Date.now(),
name:'New Category',
icon:'🍽️',
items:[]
});

saveMenu().then(()=>{

menuView='categories';

renderMenu();

});

}

function renderAddonGroups(){

const groups=D.settings.addonGroups||[];

return `

<div class="toolbar">

<div>

<span class="eyebrow">
ADD-ON MANAGEMENT
</span>

<h3>
Sauces & Extras
</h3>

<p class="muted">
Create reusable add-on groups such as
<b>Choice of Sauce</b>,
then assign them to any menu item.
</p>

</div>

<button
class="primary"
onclick="addAddonGroup()">
+ Add Add-on Group
</button>

</div>

<div class="helper-card">

<b>Example:</b>

Create
<strong>Choice of Sauce</strong>
→ add
<strong>Chilli Soya, Butter Garlic, Oyster, Kung Pao</strong>
→ open an item like
<strong>Chicken in Choice of Sauce</strong>
→ tick that group.

The customer will see the sauce choices when ordering.

</div>

<div class="addon-groups">

${groups.map((g,gi)=>`

<div class="addon-group-card">

<div class="group-head">

<div>

<span class="group-number">
${gi+1}
</span>

<div>

<h3>
${esc(g.name)}
</h3>

<p class="muted">
${esc(g.description||'No description')}
</p>

</div>

</div>

<div class="actions">

<span class="pill ${
g.active!==false?'good':'warn'
}">

${g.active!==false?'ACTIVE':'OFF'}

</span>

<button
class="small-btn danger"
onclick="deleteAddonGroup(${gi})">
Delete
</button>

</div>

</div>

<div class="form-grid group-fields">

<label>

Group name

<input
data-ag="${gi}"
data-k="name"
value="${esc(g.name)}"
>

</label>

<label>

Selection

<select
data-ag="${gi}"
data-k="selection">

<option
value="single"
${g.selection!=='multiple'?'selected':''}>
Choose ONE
</option>

<option
value="multiple"
${g.selection==='multiple'?'selected':''}>
Choose MULTIPLE
</option>

</select>

</label>

<label>

Description

<input
data-ag="${gi}"
data-k="description"
value="${esc(g.description||'')}"
placeholder="e.g. Select your preferred sauce"
>

</label>

<label>

Required

<select
data-ag="${gi}"
data-k="required">

<option
value="false"
${!g.required?'selected':''}>
Optional
</option>

<option
value="true"
${g.required?'selected':''}>
Required
</option>

</select>

</label>

</div>

<div class="option-head">

<div>

<b>
Options
</b>

<span class="muted">
${g.options?.length||0} choices
</span>

</div>

<button
class="small-btn"
onclick="addAddonOption(${gi})">
+ Add Option
</button>

</div>

<div class="addon-options">

${(g.options||[]).map((o,oi)=>`

<div class="addon-option">

<input
data-ao="${gi}"
data-oi="${oi}"
data-k="name"
value="${esc(o.name)}"
placeholder="Option name"
>

<input
data-ao="${gi}"
data-oi="${oi}"
data-k="price"
type="number"
value="${o.price||0}"
placeholder="Price"
>

<select
data-ao="${gi}"
data-oi="${oi}"
data-k="active">

<option
value="true"
${o.active!==false?'selected':''}>
ON
</option>

<option
value="false"
${o.active===false?'selected':''}>
OFF
</option>

</select>

<button
class="icon-delete"
title="Delete option"
onclick="deleteAddonOption(${gi},${oi})">
🗑
</button>

</div>

`).join('')||

'<div class="empty-box">No options yet. Click + Add Option.</div>'}

</div>

</div>

`).join('')}

</div>

<div class="sticky-save">

<button
class="primary"
onclick="saveAddonGroups()">
💾 Save All Add-ons
</button>

</div>
`;
}

function addAddonGroup(){

D.settings.addonGroups=
D.settings.addonGroups||[];

D.settings.addonGroups.push({

id:'addon-'+Date.now(),

name:'New Add-on Group',

description:'Add a short description',

selection:'single',

required:false,

active:true,

options:[]

});

renderMenu();

}

function deleteAddonGroup(i){

if(!confirm(
'Delete this add-on group? It will also be removed from item assignments after you save.'
))return;

const id=D.settings.addonGroups[i].id;

D.settings.addonGroups.splice(i,1);

(D.menu||[]).forEach(c=>
(c.items||[]).forEach(x=>
x.addonGroups=
(x.addonGroups||[]).filter(v=>v!==id)
)
);

renderMenu();

}

function addAddonOption(gi){

D.settings.addonGroups[gi].options=
D.settings.addonGroups[gi].options||[];

D.settings.addonGroups[gi].options.push({

id:'option-'+Date.now(),

name:'New Option',

price:0,

active:true

});

renderMenu();

}

function deleteAddonOption(gi,oi){

D.settings
.addonGroups[gi]
.options.splice(oi,1);

renderMenu();

}

async function saveAddonGroups(){

const groups=
D.settings.addonGroups||[];

groups.forEach((g,gi)=>{

$$(`[data-ag="${gi}"]`)
.forEach(el=>{

const k=el.dataset.k;

g[k]=
k==='selection'
?el.value
:k==='required'
?el.value==='true'
:el.value;

});

(g.options||[]).forEach((o,oi)=>
$$(`[data-ao="${gi}"][data-oi="${oi}"]`)
.forEach(el=>{

const k=el.dataset.k;

o[k]=
k==='price'
?Number(el.value||0)
:k==='active'
?el.value==='true'
:el.value;

})
);

});

await api(
'/api/admin/settings',
{
method:'PUT',
body:JSON.stringify(D.settings)
}
);

D=await api('/api/admin/data');

menuView='addons';

renderMenu();

alert('Add-ons saved successfully');

}

async function saveMenu(){

await api(
'/api/admin/menu',
{
method:'PUT',
body:JSON.stringify(D.menu)
}
);

D=await api('/api/admin/data');

renderMenu();

}

function renderInventory(){

const items=allItems();

const map=new Map(
(D.inventory||[]).map(x=>[x.id,x])
);

$('#inventory').innerHTML=`

<div class="toolbar">

<div>

<h3>
Inventory & Out of Stock
</h3>

<p class="muted">
Track available quantity,
low-stock threshold and availability.
</p>

</div>

<button
class="small-btn"
onclick="saveInventory()">
💾 Save Inventory
</button>

</div>

<div class="table-wrap">

<table>

<thead>

<tr>

<th>Item</th>
<th>Category</th>
<th>Stock Qty</th>
<th>Low Alert</th>
<th>Status</th>

</tr>

</thead>

<tbody>

${items.map(i=>{

const v=
map.get(i.id)||
{
id:i.id,
qty:0,
low:5,
active:i.active!==false
};

return `

<tr class="${v.qty<=v.low?'stock-low':'stock-ok'}">

<td>
<b>${esc(i.name)}</b>
</td>

<td>
${esc(i.category)}
</td>

<td>

<input
class="stock-input"
data-stock-id="${i.id}"
value="${v.qty}"
type="number"
min="0"
>

</td>

<td>

<input
class="stock-input"
data-low-id="${i.id}"
value="${v.low}"
type="number"
min="0"
>

</td>

<td>

<select
data-active-id="${i.id}">

<option
value="true"
${v.active!==false?'selected':''}>
Available
</option>

<option
value="false"
${v.active===false?'selected':''}>
Out of stock
</option>

</select>

</td>

</tr>

`;

}).join('')}

</tbody>

</table>

</div>
`;
}

async function saveInventory(){

const map=new Map(
(D.inventory||[]).map(x=>[x.id,x])
);

$$('[data-stock-id]').forEach(el=>{

const id=el.dataset.stockId;

const v=
map.get(id)||{id};

v.qty=Number(el.value);

v.low=
Number(
document.querySelector(
`[data-low-id="${CSS.escape(id)}"]`
)?.value||5
);

v.active=
document.querySelector(
`[data-active-id="${CSS.escape(id)}"]`
)?.value==='true';

map.set(id,v);

});

D.inventory=[...map.values()];

await api(
'/api/admin/inventory',
{
method:'PUT',
body:JSON.stringify(D.inventory)
}
);

alert('Inventory saved');

renderInventory();

}

function renderCoupons(){

const cs=D.coupons||[];

$('#coupons').innerHTML=`

<div class="toolbar">

<div>

<h3>
Coupon & Offer Manager
</h3>

<p class="muted">
Create codes for future campaigns.
The public order page can read active coupon definitions.
</p>

</div>

<button
class="primary"
onclick="addCoupon()">
+ Add Coupon
</button>

</div>

${cs.map((c,i)=>`

<div
class="card"
style="margin-bottom:10px">

<div class="kpi">

<div>

<h3>
${esc(c.code)}
</h3>

<span class="muted">
${esc(c.description||'')}
</span>

</div>

<span class="pill ${
c.active?'good':'warn'
}">

${c.active?'ACTIVE':'OFF'}

</span>

</div>

<div class="form-grid">

<input
data-coupon="${i}"
data-k="code"
value="${esc(c.code)}"
>

<select
data-coupon="${i}"
data-k="type">

<option
value="percent"
${c.type==='percent'?'selected':''}>
Percent
</option>

<option
value="flat"
${c.type==='flat'?'selected':''}>
Flat amount
</option>

</select>

<input
data-coupon="${i}"
data-k="value"
type="number"
value="${c.value||0}"
>

<input
data-coupon="${i}"
data-k="minOrder"
type="number"
value="${c.minOrder||0}"
>

<input
class="wide"
data-coupon="${i}"
data-k="description"
value="${esc(c.description||'')}"
>

<select
data-coupon="${i}"
data-k="active">

<option
value="true"
${c.active?'selected':''}>
Active
</option>

<option
value="false"
${!c.active?'selected':''}>
Off
</option>

</select>

</div>

</div>

`).join('')}

<button
class="primary"
onclick="saveCoupons()">
Save Coupons
</button>
`;
}

function addCoupon(){

D.coupons.push({

id:'CP-'+Date.now(),

code:'NEWCODE',

type:'percent',

value:10,

minOrder:0,

active:true,

description:'New offer'

});

renderCoupons();

}

async function saveCoupons(){

D.coupons.forEach((c,i)=>

$$(`[data-coupon="${i}"]`)
.forEach(el=>{

const k=el.dataset.k;

c[k]=
k==='value'||k==='minOrder'
?Number(el.value)
:k==='active'
?el.value==='true'
:el.value;

})
);

await api(
'/api/admin/coupons',
{
method:'PUT',
body:JSON.stringify(D.coupons)
}
);

alert('Coupons saved');

}

function renderSettings(){

const s=D.settings;

$('#settings').innerHTML=`

<h3>
Website & Business Settings
</h3>

<form
id="settingsForm"
class="form-grid">

<input
name="restaurantName"
value="${esc(s.restaurantName)}"
placeholder="Restaurant name"
>

<input
name="phone"
value="${esc(s.phone)}"
placeholder="Phone"
>

<input
name="whatsappNumber"
value="${esc(s.whatsappNumber)}"
placeholder="WhatsApp number with country code"
>

<input
name="address"
value="${esc(s.address)}"
placeholder="Address"
>

<input
name="gstPercent"
type="number"
value="${s.gstPercent}"
>

<input
name="discountPercent"
type="number"
value="${s.discountPercent}"
>

<input
name="defaultContainerCharge"
type="number"
value="${s.defaultContainerCharge}"
>

<input
name="currency"
value="${esc(s.currency)}"
>

<textarea
name="tagline"
class="wide"
>${esc(s.tagline)}</textarea>

<div class="wide">

<h4>
Hero Banners
</h4>

${(s.heroBanners||[]).map((b,i)=>`

<div class="banner">

<div class="banner-grid">

<input
data-banner="${i}"
data-k="title"
value="${esc(b.title)}"
>

<input
data-banner="${i}"
data-k="subtitle"
value="${esc(b.subtitle)}"
>

<input
data-banner="${i}"
data-k="image"
class="wide"
value="${esc(b.image)}"
>

</div>

</div>

`).join('')}

<button
type="button"
class="small-btn"
onclick="addBanner()">
+ Add Banner
</button>

</div>

<button
class="primary wide">
Save All Settings
</button>

</form>
`;

$('#settingsForm').onsubmit=async e=>{

e.preventDefault();

const f=new FormData(e.target);

Object.keys(s).forEach(k=>{

if(k==='heroBanners')return;

if(f.has(k)){

s[k]=
[
'gstPercent',
'discountPercent',
'defaultContainerCharge'
].includes(k)
?Number(f.get(k))
:f.get(k);

}

});

$$('[data-banner]').forEach(el=>
s.heroBanners[
Number(el.dataset.banner)
][el.dataset.k]=el.value
);

await api(
'/api/admin/settings',
{
method:'PUT',
body:JSON.stringify(s)
}
);

D=await api('/api/admin/data');

renderSettings();

alert('Settings saved');

};

}

function addBanner(){

D.settings.heroBanners.push({

title:'New Promotion',

subtitle:'Edit this banner text.',

image:''

});

renderSettings();

}

function showTab(id){

const b=
document.querySelector(
`.tab[data-tab="${id}"]`
);

b?.click();

}

function openEditor(html){

$('#editorBody').innerHTML=html;

$('#editor').classList.add('show');

}

function closeEditor(){

$('#editor').classList.remove('show');

}

function esc(s){

return String(s??'')
.replaceAll('&','&amp;')
.replaceAll('<','&lt;')
.replaceAll('>','&gt;')
.replaceAll('"','&quot;');

}

function downloadReport(){

let csv=
'Order ID,Date,Customer,Phone,Subtotal,Discount,GST,Container,Total,Status\n';

D.orders.forEach(o=>{

csv+=
`"${o.id}","${o.createdAt}","${o.customer?.name||''}","${o.customer?.phone||''}",${o.subtotal||0},${o.discount||0},${o.gst||0},${o.containerCharge||0},${o.total||0},"${o.status}"\n`;

});

const a=document.createElement('a');

a.href=
URL.createObjectURL(
new Blob(
[csv],
{type:'text/csv'}
)
);

a.download=
'wasabee-orders-report.csv';

a.click();

URL.revokeObjectURL(a.href);

}

load();
