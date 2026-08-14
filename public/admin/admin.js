let token=localStorage.getItem('wasabee_admin'),D={};

const $=s=>document.querySelector(s);
const $$=s=>document.querySelectorAll(s);

const money=n=>(D.settings?.currency||'₹')+Number(n||0).toLocaleString('en-IN');
function renderOrders(){

const q=$('#orderSearch')?.value?.toLowerCase()||'';

const list=(D.orders||[]).filter(o=>
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
<b>${esc(o.id)}</b>
<br>
<small>
${o.createdAt?
new Date(o.createdAt).toLocaleString():
''}
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
`<a
target="_blank"
rel="noopener"
href="${esc(o.customer.location)}">
📍 Map
</a>`:''}

</td>

<td>

${(o.items||[]).map(i=>
`${esc(i.name)}
${i.variant?' ('+esc(i.variant)+')':''}
×${Number(i.qty||0)}
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
${esc(o.status||'PENDING')}
</span>
</td>

<td class="actions">

<button
class="small-btn"
onclick="setOrder('${esc(o.id)}','CONFIRMED')">
Confirm
</button>

<button
class="small-btn"
onclick="setOrder('${esc(o.id)}','PREPARING')">
Preparing
</button>

<button
class="small-btn"
onclick="setOrder('${esc(o.id)}','COMPLETED')">
Done
</button>

<button
class="small-btn"
onclick="printKOT('${esc(o.id)}')">
Print KOT
</button>

</td>

</tr>

`).join('')}

</tbody>

</table>

</div>
`;

const search=$('#orderSearch');

if(search){
search.oninput=renderOrders;
}

}


async function setOrder(id,status){

try{

await api(
'/api/admin/orders/'+encodeURIComponent(id),
{
method:'PUT',
body:JSON.stringify({status})
}
);

await refreshAll();

}catch(err){

console.error(err);

alert(
'Could not update order: '+
(err.message||'Unknown error')
);

}

}


function renderKOT(){

const active=(D.orders||[]).filter(o=>
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

<button
class="small-btn"
onclick="printAllKOT()">
🖨️ Print All Active
</button>

</div>

<div class="report-grid">

${active.map(o=>`

<div class="card">

<div class="kpi">

<b>${esc(o.id)}</b>

<span class="pill">
${esc(o.status||'PENDING')}
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
${Number(i.qty||0)} ×
${esc(i.name)}
${i.variant?' — '+esc(i.variant):''}
</span>

<b>
${i.addons?.length?
'Sauce: '+esc(i.addons.join(', ')):''}
</b>

</div>

</div>

`).join('')}

<button
class="primary"
onclick="printKOT('${esc(o.id)}')">
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
<div
class="printable"
style="font-family:Arial;padding:30px">

<h1 style="text-align:center;margin:0">
WASABEE
</h1>

<p style="text-align:center">
KITCHEN ORDER TICKET
</p>

<hr>

<h2>${esc(o.id)}</h2>

<p>
<b>${esc(o.customer?.name||'Customer')}</b>
<br>
${esc(o.customer?.phone||'')}
</p>

<hr>

${(o.items||[]).map(i=>`

<h3>
${Number(i.qty||0)} ×
${esc(i.name)}
${i.variant?' — '+esc(i.variant):''}
</h3>

${i.addons?.length?
`<p>
Sauce/Add-on:
${esc(i.addons.join(', '))}
</p>`:''}

`).join('')}

<hr>

<p>
Order status: ${esc(o.status||'PENDING')}
</p>

</div>
`;
}


function printKOT(id){

const o=(D.orders||[]).find(x=>
String(x.id)===String(id)
);

if(!o){
alert('Order not found');
return;
}

const w=window.open('','_blank');

if(!w){
alert('Please allow pop-ups to print KOT.');
return;
}

w.document.write(`
<!doctype html>
<html>
<head>
<title>WASABEE KOT - ${esc(o.id)}</title>

<style>
body{
font-family:Arial,sans-serif;
margin:0;
padding:20px;
}
@media print{
body{
padding:0;
}
}
</style>

</head>

<body>
${kotHTML(o)}
</body>

</html>
`);

w.document.close();
w.focus();

setTimeout(()=>{
w.print();
},300);

}


function printAllKOT(){

const active=(D.orders||[]).filter(o=>
!['COMPLETED','CANCELLED'].includes(o.status)
);

if(!active.length){
alert('No active orders.');
return;
}

const w=window.open('','_blank');

if(!w){
alert('Please allow pop-ups to print KOT.');
return;
}

w.document.write(`
<!doctype html>
<html>
<head>
<title>WASABEE - Active KOT</title>

<style>
body{
font-family:Arial,sans-serif;
margin:0;
padding:20px;
}

.kot-page{
page-break-after:always;
}

.kot-page:last-child{
page-break-after:auto;
}

@media print{
body{
padding:0;
}
}
</style>

</head>

<body>

${active.map(o=>`
<div class="kot-page">
${kotHTML(o)}
</div>
`).join('')}

</body>
</html>
`);

w.document.close();
w.focus();

setTimeout(()=>{
w.print();
},300);

}


function renderBookings(){

const bookings=D.bookings||[];

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

${bookings.map(b=>`

<tr>

<td>${esc(b.id)}</td>

<td>
${esc(b.name)}
<br>
${esc(b.phone)}
</td>

<td>${esc(b.date)}</td>

<td>${esc(b.time)}</td>

<td>${Number(b.guests||0)}</td>

<td>
<span class="pill">
${esc(b.status||'PENDING')}
</span>
</td>

<td class="actions">

<button
class="small-btn"
onclick="setBooking('${esc(b.id)}','CONFIRMED')">
Confirm
</button>

<button
class="small-btn"
onclick="setBooking('${esc(b.id)}','COMPLETED')">
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

try{

await api(
'/api/admin/bookings/'+encodeURIComponent(id),
{
method:'PUT',
body:JSON.stringify({status})
}
);

await refreshAll();

}catch(err){

console.error(err);

alert(
'Could not update booking: '+
(err.message||'Unknown error')
);

}

}


function renderReviews(){

const reviews=D.reviews||[];

$('#reviews').innerHTML=`

<div class="toolbar">

<div>

<h3>Customer Reviews</h3>

<p class="muted">
Moderate guest feedback shown on the public website.
</p>

</div>

</div>

${reviews.map(r=>`

<div class="review-card">

<b>${esc(r.name)}</b>

<span class="pill">
${'★'.repeat(
Math.max(
0,
Math.min(5,Number(r.rating||5))
)
)}
</span>

<p>
${esc(r.comment)}
</p>

<small>
${r.createdAt?
new Date(r.createdAt).toLocaleString():
''}
</small>

<button
class="small-btn danger"
onclick="deleteReview('${esc(r.id)}')">
Delete
</button>

</div>

`).join('')||

'<p>No reviews yet.</p>'}
`;
}


async function deleteReview(id){

if(!confirm('Delete this review?'))return;

try{

await api(
'/api/admin/reviews/'+encodeURIComponent(id),
{
method:'DELETE'
}
);

await refreshAll();

}catch(err){

console.error(err);

alert(
'Could not delete review: '+
(err.message||'Unknown error')
);

}

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
`<button
class="primary"
onclick="addItem(0)">
+ Add Item
</button>`:''}

<button
class="small-btn"
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

<button
class="small-btn"
onclick="addItem(${ci})">
+ Add Item
</button>

<button
class="small-btn danger"
onclick="deleteCategory(${ci})">
Delete Category
</button>

</div>

</div>

<div class="items">

${Array.isArray(c.items)?
c.items.map((x,ii)=>
itemRow(ci,ii,x)
).join(''):

(c.subcategories||[]).map((sub,si)=>`

<div class="subcat">

<b>${esc(sub.name)}</b>

<button
class="small-btn"
onclick="addSubItem(${ci},${si})">
+ Add Item
</button>

${(sub.items||[]).map((x,ii)=>
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
${Array.isArray(c.items)?
c.items.length:
(c.subcategories||[]).reduce(
(s,x)=>s+(x.items||[]).length,0
)}
 item(s)
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
(D.settings?.addonGroups||[])
.find(g=>g.id===id)?.name
)
.filter(Boolean);

return `

<div class="item-row menu-item-row">

<div class="item-main">

<div class="food-mini">

${x.image?
`<img
src="${esc(x.image)}"
alt=""
loading="lazy"
>`:
'🍽️'}

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
Math.min(
...x.variants.map(v=>Number(v.price||0))
)
)}`
:
money(x.price)}

</strong>

<br>

<small>
Container
${money(
x.containerCharge??
D.settings?.defaultContainerCharge??
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
data-stock-id="${esc(i.id)}"
value="${Number(v.qty||0)}"
type="number"
min="0"
>

</td>

<td>

<input
class="stock-input"
data-low-id="${esc(i.id)}"
value="${Number(v.low??5)}"
type="number"
min="0"
>

</td>

<td>

<select
data-active-id="${esc(i.id)}">

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

try{

const map=new Map(
(D.inventory||[]).map(x=>[x.id,x])
);

$$('[data-stock-id]').forEach(el=>{

const id=el.dataset.stockId;

const v=
map.get(id)||{id:id};

v.qty=
Math.max(0,Number(el.value||0));

v.low=
Math.max(
0,
Number(
document.querySelector(
`[data-low-id="${CSS.escape(id)}"]`
)?.value||5
)
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

}catch(err){

console.error(err);

alert(
'Inventory save failed: '+
(err.message||'Unknown error')
);

}

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
value="${esc(c.code||'')}"
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
value="${Number(c.value||0)}"
>

<input
data-coupon="${i}"
data-k="minOrder"
type="number"
value="${Number(c.minOrder||0)}"
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

D.coupons=D.coupons||[];

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

try{

D.coupons=D.coupons||[];

D.coupons.forEach((c,i)=>

$$(`[data-coupon="${i}"]`)
.forEach(el=>{

const k=el.dataset.k;

c[k]=
k==='value'||k==='minOrder'
?Number(el.value||0)
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

}catch(err){

console.error(err);

alert(
'Coupon save failed: '+
(err.message||'Unknown error')
);

}

}


function renderSettings(){

const s=D.settings||{};

s.heroBanners=s.heroBanners||[];

$('#settings').innerHTML=`

<h3>
Website & Business Settings
</h3>

<form
id="settingsForm"
class="form-grid">

<input
name="restaurantName"
value="${esc(s.restaurantName||'')}"
placeholder="Restaurant name"
>

<input
name="phone"
value="${esc(s.phone||'')}"
placeholder="Phone"
>

<input
name="whatsappNumber"
value="${esc(s.whatsappNumber||'')}"
placeholder="WhatsApp number with country code"
>

<input
name="address"
value="${esc(s.address||'')}"
placeholder="Address"
>

<input
name="gstPercent"
type="number"
value="${Number(s.gstPercent||0)}"
>

<input
name="discountPercent"
type="number"
value="${Number(s.discountPercent||0)}"
>

<input
name="defaultContainerCharge"
type="number"
value="${Number(s.defaultContainerCharge||0)}"
>

<input
name="currency"
value="${esc(s.currency||'₹')}"
>

<textarea
name="tagline"
class="wide"
>${esc(s.tagline||'')}</textarea>

<div class="wide">

<h4>
Hero Banners
</h4>

${s.heroBanners.map((b,i)=>`

<div class="banner">

<div class="banner-grid">

<input
data-banner="${i}"
data-k="title"
value="${esc(b.title||'')}"
>

<input
data-banner="${i}"
data-k="subtitle"
value="${esc(b.subtitle||'')}"
>

<input
data-banner="${i}"
data-k="image"
class="wide"
value="${esc(b.image||'')}"
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
type="submit"
class="primary wide">
Save All Settings
</button>

</form>
`;

$('#settingsForm').onsubmit=async e=>{

e.preventDefault();

try{

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
?Number(f.get(k)||0)
:f.get(k);

}

});

$$('[data-banner]').forEach(el=>{

const index=
Number(el.dataset.banner);

if(!s.heroBanners[index]){
s.heroBanners[index]={
title:'',
subtitle:'',
image:''
};
}

s.heroBanners[index][el.dataset.k]=el.value;

});

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

}catch(err){

console.error(err);

alert(
'Settings save failed: '+
(err.message||'Unknown error')
);

}

};

}


function addBanner(){

D.settings=D.settings||{};

D.settings.heroBanners=
D.settings.heroBanners||[];

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

if(b)b.click();

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
.replaceAll('"','&quot;')
.replaceAll("'","&#039;");

}


function csvCell(value){

return `"${String(value??'')
.replaceAll('"','""')}"`;

}


function downloadReport(){

let csv=
'Order ID,Date,Customer,Phone,Subtotal,Discount,GST,Container,Total,Status\n';

(D.orders||[]).forEach(o=>{

csv+=
[
o.id,
o.createdAt,
o.customer?.name||'',
o.customer?.phone||'',
o.subtotal||0,
o.discount||0,
o.gst||0,
o.containerCharge||0,
o.total||0,
o.status||''
]
.map(csvCell)
.join(',')+
'\n';

});

const blob=new Blob(
[csv],
{
type:'text/csv;charset=utf-8;'
}
);

const url=
URL.createObjectURL(blob);

const a=
document.createElement('a');

a.href=url;

a.download=
'wasabee-orders-report.csv';

document.body.appendChild(a);

a.click();

a.remove();

setTimeout(()=>{
URL.revokeObjectURL(url);
},1000);

}


load();
