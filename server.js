const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const url = require('url');

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const DATA = path.join(ROOT, 'data');
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'wasabee-admin';

if (!fs.existsSync(DATA)) {
  fs.mkdirSync(DATA, { recursive: true });
}

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.pdf': 'application/pdf'
};

/* =========================
   FILE HELPERS
========================= */

const read = (file) => {
  const p = path.join(DATA, file);

  if (!fs.existsSync(p)) {
    fs.writeFileSync(p, '[]');
  }

  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (e) {
    return [];
  }
};

const write = (file, data) => {
  const p = path.join(DATA, file);
  const temp = p + '.tmp';

  fs.writeFileSync(
    temp,
    JSON.stringify(data, null, 2),
    'utf8'
  );

  fs.renameSync(temp, p);
};

/* =========================
   RESPONSE
========================= */

function send(
  res,
  status,
  data,
  type = 'application/json'
) {
  res.writeHead(status, {
    'Content-Type': type,
    'Cache-Control': 'no-store'
  });

  if (type.includes('json')) {
    res.end(JSON.stringify(data));
  } else {
    res.end(data);
  }
}

/* =========================
   REQUEST BODY
========================= */

function body(req) {
  return new Promise((resolve, reject) => {
    let b = '';

    req.on('data', chunk => {
      b += chunk;

      if (b.length > 10e6) {
        req.destroy();
        reject(new Error('Request too large'));
      }
    });

    req.on('end', () => {
      try {
        resolve(b ? JSON.parse(b) : {});
      } catch (e) {
        reject(e);
      }
    });

    req.on('error', reject);
  });
}

/* =========================
   ADMIN AUTH
   Persistent across Render restart
========================= */

function makeAdminToken() {
  return crypto
    .createHmac('sha256', ADMIN_PASSWORD)
    .update('WASABEE_ADMIN_SESSION')
    .digest('hex');
}

function authed(req) {
  const h = req.headers.authorization || '';

  if (!h.startsWith('Bearer ')) {
    return false;
  }

  const token = h.slice(7);

  return token === makeAdminToken();
}

/* =========================
   MENU ITEMS
========================= */

function allItems(menu) {
  const out = [];

  for (const c of menu || []) {

    for (const i of c.items || []) {
      out.push({
        ...i,
        category: c.name
      });
    }

    for (const s of c.subcategories || []) {
      for (const i of s.items || []) {
        out.push({
          ...i,
          category: c.name,
          subcategory: s.name
        });
      }
    }
  }

  return out;
}

/* =========================
   IMAGE UPLOAD
========================= */

function saveUploadedImage(filename, data) {

  const uploadDir =
    path.join(ROOT, 'public', 'uploads');

  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, {
      recursive: true
    });
  }

  const ext =
    path.extname(filename || '').toLowerCase();

  const allowed = [
    '.jpg',
    '.jpeg',
    '.png',
    '.webp',
    '.gif',
    '.svg'
  ];

  if (!allowed.includes(ext)) {
    throw new Error(
      'Only JPG, JPEG, PNG, WEBP, GIF and SVG images are allowed'
    );
  }

  const originalName =
    path.basename(filename, ext);

  const safeName =
    originalName
      .replace(/[^a-z0-9-_]/gi, '-')
      .replace(/-+/g, '-')
      .toLowerCase();

  const finalName =
    Date.now() +
    '-' +
    safeName +
    ext;

  const filePath =
    path.join(uploadDir, finalName);

  const base64 =
    String(data)
      .replace(
        /^data:image\/[^;]+;base64,/,
        ''
      );

  fs.writeFileSync(
    filePath,
    Buffer.from(base64, 'base64')
  );

  return '/uploads/' + finalName;
}

/* =========================
   API
========================= */

async function api(req,res,p){

  // =========================
  // ADMIN IMAGE UPLOAD
  // =========================
  if(req.method==='POST' && p==='/api/admin/upload'){
    if(!authed(req)){
      return send(res,401,{error:'Unauthorized'});
    }

    try{
      const b=await body(req);

      if(!b.filename || !b.data){
        return send(res,400,{
          ok:false,
          error:'Image file is required'
        });
      }

      const ext=path.extname(b.filename).toLowerCase();
      const allowed=[
        '.jpg',
        '.jpeg',
        '.png',
        '.webp',
        '.gif',
        '.svg'
      ];

      if(!allowed.includes(ext)){
        return send(res,400,{
          ok:false,
          error:'Unsupported image type'
        });
      }

      // Remove data:image/...;base64, prefix
      const imageData=String(b.data)
        .replace(/^data:image\/[^;]+;base64,/,'')
        .replace(/^data:application\/svg\+xml;base64,/,'')
        .replace(/\s/g,'');

      // Cloudinary settings from Render Environment Variables
      const cloudName=process.env.CLOUDINARY_CLOUD_NAME;
      const apiKey=process.env.CLOUDINARY_API_KEY;
      const apiSecret=process.env.CLOUDINARY_API_SECRET;

      if(!cloudName || !apiKey || !apiSecret){
        return send(res,500,{
          ok:false,
          error:'Cloudinary environment variables are missing'
        });
      }

      const timestamp=Math.floor(Date.now()/1000);

      const folder='wasabee/menu';

      // Cloudinary signature
      const signatureBase=
        `folder=${folder}&timestamp=${timestamp}${apiSecret}`;

      const signature=crypto
        .createHash('sha1')
        .update(signatureBase)
        .digest('hex');

      const uploadUrl=
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;

      const form=new URLSearchParams();

      form.append(
        'file',
        `data:image/${ext.replace('.','')};base64,${imageData}`
      );

      form.append('api_key',apiKey);
      form.append('timestamp',String(timestamp));
      form.append('folder',folder);
      form.append('signature',signature);

      const cloudinaryResponse=await fetch(uploadUrl,{
        method:'POST',
        headers:{
          'Content-Type':'application/x-www-form-urlencoded'
        },
        body:form.toString()
      });

      const result=await cloudinaryResponse.json();

      if(!cloudinaryResponse.ok){
        console.error('Cloudinary upload failed:',result);

        return send(res,500,{
          ok:false,
          error:result?.error?.message || 'Cloudinary upload failed'
        });
      }

      console.log('Cloudinary image uploaded:',result.secure_url);

      return send(res,200,{
        ok:true,
        url:result.secure_url,
        public_id:result.public_id
      });

    }catch(err){

      console.error('Image upload error:',err);

      return send(res,500,{
        ok:false,
        error:err.message || 'Image upload failed'
      });
    }
  }

  // =========================
  // PUBLIC DATA
  // =========================
  if(req.method==='GET' && p==='/api/public-data'){
    return send(res,200,{
      menu:read('menu.json'),
      settings:read('settings.json'),
      reviews:read('reviews.json')
        .filter(x=>x.approved!==false)
        .slice(-30)
        .reverse(),
      coupons:read('coupons.json')
        .filter(x=>x.active!==false)
    });
  }

  // =========================
  // ORDERS
  // =========================
  if(req.method==='POST' && p==='/api/orders'){
    const b=await body(req);
    const a=read('orders.json');

    const o={
      id:'WAS-'+Date.now(),
      createdAt:new Date().toISOString(),
      status:'NEW',
      ...b
    };

    a.push(o);
    write('orders.json',a);

    return send(res,200,{
      ok:true,
      orderId:o.id
    });
  }

  // =========================
  // BOOKINGS
  // =========================
  if(req.method==='POST' && p==='/api/bookings'){
    const b=await body(req);
    const a=read('bookings.json');

    const o={
      id:'TB-'+Date.now(),
      createdAt:new Date().toISOString(),
      status:'NEW',
      ...b
    };

    a.push(o);
    write('bookings.json',a);

    return send(res,200,{
      ok:true,
      id:o.id
    });
  }

  // =========================
  // REVIEWS
  // =========================
  if(req.method==='POST' && p==='/api/reviews'){
    const b=await body(req);
    const a=read('reviews.json');

    const o={
      id:'RV-'+Date.now(),
      createdAt:new Date().toISOString(),
      approved:true,
      ...b
    };

    a.push(o);
    write('reviews.json',a);

    return send(res,200,{ok:true});
  }

  // =========================
  // ADMIN LOGIN
  // =========================
  if(req.method==='POST' && p==='/api/admin/login'){
    const b=await body(req);

    if(b.password!==ADMIN_PASSWORD){
      return send(res,401,{
        error:'Wrong password'
      });
    }

    const t=crypto.randomBytes(24).toString('hex');

    sessions.add(t);

    return send(res,200,{
      token:t
    });
  }

  // =========================
  // ADMIN AUTH
  // =========================
  if(p.startsWith('/api/admin/') && !authed(req)){
    return send(res,401,{
      error:'Unauthorized'
    });
  }

  // =========================
  // ADMIN DATA
  // =========================
  if(req.method==='GET' && p==='/api/admin/data'){
    return send(res,200,{
      menu:read('menu.json'),
      settings:read('settings.json'),
      orders:read('orders.json').slice().reverse(),
      bookings:read('bookings.json').slice().reverse(),
      reviews:read('reviews.json').slice().reverse(),
      inventory:read('inventory.json'),
      coupons:read('coupons.json')
    });
  }

  // =========================
  // MENU
  // =========================
  if(req.method==='PUT' && p==='/api/admin/menu'){
    write('menu.json',await body(req));
    return send(res,200,{ok:true});
  }

  // =========================
  // SETTINGS
  // =========================
  if(req.method==='PUT' && p==='/api/admin/settings'){
    write('settings.json',await body(req));
    return send(res,200,{ok:true});
  }

  // =========================
  // INVENTORY
  // =========================
  if(req.method==='PUT' && p==='/api/admin/inventory'){
    write('inventory.json',await body(req));
    return send(res,200,{ok:true});
  }

  // =========================
  // COUPONS
  // =========================
  if(req.method==='PUT' && p==='/api/admin/coupons'){
    write('coupons.json',await body(req));
    return send(res,200,{ok:true});
  }

  // =========================
  // ORDER / BOOKING UPDATE
  // =========================
  let m=p.match(/^\/api\/admin\/(orders|bookings)\/([^/]+)$/);

  if(m && req.method==='PUT'){
    const file=
      m[1]==='orders'
        ? 'orders.json'
        : 'bookings.json';

    const a=read(file);
    const i=a.findIndex(x=>x.id===m[2]);

    if(i<0){
      return send(res,404,{
        error:'Not found'
      });
    }

    a[i]={
      ...a[i],
      ...(await body(req))
    };

    write(file,a);

    return send(res,200,{ok:true});
  }

  // =========================
  // DELETE REVIEW
  // =========================
  m=p.match(/^\/api\/admin\/reviews\/([^/]+)$/);

  if(m && req.method==='DELETE'){
    write(
      'reviews.json',
      read('reviews.json').filter(
        x=>x.id!==m[1]
      )
    );

    return send(res,200,{ok:true});
  }

  return send(res,404,{
    error:'API route not found'
  });
}

/* =========================
   WEB SERVER
========================= */

const server =
  http.createServer(
    async (req, res) => {

      try {

        const p =
          url.parse(
            req.url
          ).pathname;

        /* API */

        if (
          p.startsWith('/api/')
        ) {

          return await api(
            req,
            res,
            p
          );
        }

        /* STATIC FILES */

        let file;

        if (p === '/') {

          file =
            path.join(
              ROOT,
              'public',
              'index.html'
            );

        } else if (
          p === '/admin' ||
          p === '/admin/'
        ) {

          file =
            path.join(
              ROOT,
              'public',
              'admin',
              'index.html'
            );

        } else {

          file =
            path.join(
              ROOT,
              'public',
              decodeURIComponent(p)
            );
        }

        const publicRoot =
          path.join(
            ROOT,
            'public'
          );

        const normalized =
          path.normalize(file);

        if (
          !normalized.startsWith(
            publicRoot
          )
        ) {

          return send(res, 403, {
            error: 'Forbidden'
          });
        }

        if (
          !fs.existsSync(file) ||
          fs.statSync(file).isDirectory()
        ) {

          file =
            path.join(
              ROOT,
              'public',
              'index.html'
            );
        }

        const ext =
          path.extname(file)
            .toLowerCase();

        res.writeHead(200, {
          'Content-Type':
            mime[ext] ||
            'application/octet-stream',
          'Cache-Control':
            'no-cache'
        });

        fs.createReadStream(
          file
        ).pipe(res);

      } catch (e) {

        console.error(e);

        send(res, 500, {
          error: 'Server error'
        });
      }
    }
  );

server.listen(
  PORT,
  () => {
    console.log(
      `WASABEE running at http://localhost:${PORT}`
    );
  }
);
