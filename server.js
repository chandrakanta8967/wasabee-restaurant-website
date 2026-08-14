const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const url = require('url');

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const DATA = path.join(ROOT, 'data');
const PUBLIC = path.join(ROOT, 'public');
const UPLOADS = path.join(PUBLIC, 'uploads');

const ADMIN_PASSWORD =
  process.env.ADMIN_PASSWORD || 'wasabee-admin';

const sessions = new Set();

/* =========================
   FOLDERS
========================= */

if (!fs.existsSync(DATA)) {
  fs.mkdirSync(DATA, { recursive: true });
}

if (!fs.existsSync(PUBLIC)) {
  fs.mkdirSync(PUBLIC, { recursive: true });
}

if (!fs.existsSync(UPLOADS)) {
  fs.mkdirSync(UPLOADS, { recursive: true });
}

/* =========================
   DATA HELPERS
========================= */

const read = file => {
  const p = path.join(DATA, file);

  if (!fs.existsSync(p)) {
    fs.writeFileSync(p, '[]');
  }

  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (e) {
    console.error('JSON read error:', file, e);
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
   MIME TYPES
========================= */

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

  '.pdf': 'application/pdf',
  '.ico': 'image/x-icon'
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
      b += chunk.toString();

      /* 15 MB request limit */
      if (b.length > 15 * 1024 * 1024) {
        reject(new Error('Request too large'));
        req.destroy();
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
   AUTH
========================= */

function authed(req) {
  const h = req.headers.authorization || '';

  return (
    h.startsWith('Bearer ') &&
    sessions.has(h.slice(7))
  );
}

/* =========================
   ALL MENU ITEMS
========================= */

function allItems(menu) {
  const out = [];

  for (const c of menu || []) {

    if (c.items) {
      for (const i of c.items) {
        out.push({
          ...i,
          category: c.name
        });
      }
    }

    if (c.subcategories) {
      for (const s of c.subcategories) {
        for (const i of s.items || []) {
          out.push({
            ...i,
            category: c.name,
            subcategory: s.name
          });
        }
      }
    }
  }

  return out;
}

/* =========================
   IMAGE UPLOAD
========================= */

function saveUploadedImage(filename, data) {

  if (!filename) {
    throw new Error('Filename is required');
  }

  if (!data) {
    throw new Error('Image data is required');
  }

  if (!fs.existsSync(UPLOADS)) {
    fs.mkdirSync(UPLOADS, {
      recursive: true
    });
  }

  const ext =
    path.extname(filename).toLowerCase();

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

  let base64 = String(data);

  /*
    Supports:
    data:image/png;base64,...
    and raw base64
  */

  base64 = base64.replace(
    /^data:image\/[^;]+;base64,/,
    ''
  );

  base64 = base64.replace(
    /^data:application\/[^;]+;base64,/,
    ''
  );

  const originalName =
    path.basename(
      filename,
      ext
    );

  const safeName =
    originalName
      .replace(/[^a-zA-Z0-9-_]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .toLowerCase() || 'food-image';

  const finalName =
    Date.now() +
    '-' +
    crypto.randomBytes(5).toString('hex') +
    '-' +
    safeName +
    ext;

  const filePath =
    path.join(UPLOADS, finalName);

  fs.writeFileSync(
    filePath,
    Buffer.from(base64, 'base64')
  );

  return {
    filename: finalName,
    url: '/uploads/' + finalName,
    path: filePath
  };
}

/* =========================
   API
========================= */

async function api(req, res, p) {

  /* =========================
     ADMIN LOGIN
  ========================= */

  if (
    req.method === 'POST' &&
    p === '/api/admin/login'
  ) {

    try {

      const b = await body(req);

      if (
        b.password !== ADMIN_PASSWORD
      ) {
        return send(
          res,
          401,
          {
            error: 'Wrong password'
          }
        );
      }

      const token =
        crypto.randomBytes(24).toString('hex');

      sessions.add(token);

      return send(
        res,
        200,
        {
          token
        }
      );

    } catch (e) {

      return send(
        res,
        400,
        {
          error: 'Invalid request'
        }
      );
    }
  }

  /* =========================
     PUBLIC DATA
  ========================= */

  if (
    req.method === 'GET' &&
    p === '/api/public-data'
  ) {

    return send(
      res,
      200,
      {
        menu: read('menu.json'),

        settings:
          read('settings.json'),

        reviews:
          read('reviews.json')
            .filter(
              x => x.approved !== false
            )
            .slice(-30)
            .reverse(),

        coupons:
          read('coupons.json')
            .filter(
              x => x.active !== false
            )
      }
    );
  }

  /* =========================
     ORDERS
  ========================= */

  if (
    req.method === 'POST' &&
    p === '/api/orders'
  ) {

    const b = await body(req);

    const a = read('orders.json');

    const o = {
      id: 'WAS-' + Date.now(),
      createdAt:
        new Date().toISOString(),
      status: 'NEW',
      ...b
    };

    a.push(o);

    write('orders.json', a);

    return send(
      res,
      200,
      {
        ok: true,
        orderId: o.id
      }
    );
  }

  /* =========================
     BOOKINGS
  ========================= */

  if (
    req.method === 'POST' &&
    p === '/api/bookings'
  ) {

    const b = await body(req);

    const a =
      read('bookings.json');

    const o = {
      id: 'TB-' + Date.now(),
      createdAt:
        new Date().toISOString(),
      status: 'NEW',
      ...b
    };

    a.push(o);

    write('bookings.json', a);

    return send(
      res,
      200,
      {
        ok: true,
        id: o.id
      }
    );
  }

  /* =========================
     REVIEWS
  ========================= */

  if (
    req.method === 'POST' &&
    p === '/api/reviews'
  ) {

    const b = await body(req);

    const a =
      read('reviews.json');

    const o = {
      id: 'RV-' + Date.now(),
      createdAt:
        new Date().toISOString(),
      approved: true,
      ...b
    };

    a.push(o);

    write('reviews.json', a);

    return send(
      res,
      200,
      {
        ok: true
      }
    );
  }

  /* =========================
     ADMIN AUTH CHECK
  ========================= */

  if (
    p.startsWith('/api/admin/') &&
    !authed(req)
  ) {
    return send(
      res,
      401,
      {
        error: 'Unauthorized'
      }
    );
  }

  /* =========================
     IMAGE UPLOAD
     ONLY ONE ROUTE
  ========================= */

  if (
    req.method === 'POST' &&
    p === '/api/admin/upload'
  ) {

    try {

      const b = await body(req);

      if (
        !b.filename ||
        !b.data
      ) {

        return send(
          res,
          400,
          {
            ok: false,
            error:
              'Image filename or image data is missing'
          }
        );
      }

      const uploaded =
        saveUploadedImage(
          b.filename,
          b.data
        );

      console.log(
        'Image uploaded:',
        uploaded.path
      );

      return send(
        res,
        200,
        {
          ok: true,
          url: uploaded.url,
          filename:
            uploaded.filename
        }
      );

    } catch (e) {

      console.error(
        'Image upload error:',
        e
      );

      return send(
        res,
        400,
        {
          ok: false,
          error:
            e.message ||
            'Image upload failed'
        }
      );
    }
  }

  /* =========================
     ADMIN DATA
  ========================= */

  if (
    req.method === 'GET' &&
    p === '/api/admin/data'
  ) {

    return send(
      res,
      200,
      {
        menu:
          read('menu.json'),

        settings:
          read('settings.json'),

        orders:
          read('orders.json')
            .slice()
            .reverse(),

        bookings:
          read('bookings.json')
            .slice()
            .reverse(),

        reviews:
          read('reviews.json')
            .slice()
            .reverse(),

        inventory:
          read('inventory.json'),

        coupons:
          read('coupons.json')
      }
    );
  }

  /* =========================
     SAVE MENU
  ========================= */

  if (
    req.method === 'PUT' &&
    p === '/api/admin/menu'
  ) {

    const data = await body(req);

    write(
      'menu.json',
      data
    );

    return send(
      res,
      200,
      {
        ok: true
      }
    );
  }

  /* =========================
     SAVE SETTINGS
  ========================= */

  if (
    req.method === 'PUT' &&
    p === '/api/admin/settings'
  ) {

    const data = await body(req);

    write(
      'settings.json',
      data
    );

    return send(
      res,
      200,
      {
        ok: true
      }
    );
  }

  /* =========================
     SAVE INVENTORY
  ========================= */

  if (
    req.method === 'PUT' &&
    p === '/api/admin/inventory'
  ) {

    const data = await body(req);

    write(
      'inventory.json',
      data
    );

    return send(
      res,
      200,
      {
        ok: true
      }
    );
  }

  /* =========================
     SAVE COUPONS
  ========================= */

  if (
    req.method === 'PUT' &&
    p === '/api/admin/coupons'
  ) {

    const data = await body(req);

    write(
      'coupons.json',
      data
    );

    return send(
      res,
      200,
      {
        ok: true
      }
    );
  }

  /* =========================
     ORDER / BOOKING STATUS
  ========================= */

  let m =
    p.match(
      /^\/api\/admin\/(orders|bookings)\/([^/]+)$/
    );

  if (
    m &&
    req.method === 'PUT'
  ) {

    const file =
      m[1] === 'orders'
        ? 'orders.json'
        : 'bookings.json';

    const a = read(file);

    const i =
      a.findIndex(
        x => x.id === m[2]
      );

    if (i < 0) {

      return send(
        res,
        404,
        {
          error: 'Not found'
        }
      );
    }

    a[i] = {
      ...a[i],
      ...(await body(req))
    };

    write(
      file,
      a
    );

    return send(
      res,
      200,
      {
        ok: true
      }
    );
  }

  /* =========================
     DELETE REVIEW
  ========================= */

  m =
    p.match(
      /^\/api\/admin\/reviews\/([^/]+)$/
    );

  if (
    m &&
    req.method === 'DELETE'
  ) {

    write(
      'reviews.json',

      read('reviews.json')
        .filter(
          x => x.id !== m[1]
        )
    );

    return send(
      res,
      200,
      {
        ok: true
      }
    );
  }

  return send(
    res,
    404,
    {
      error:
        'API route not found'
    }
  );
}

/* =========================
   STATIC SERVER
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

        /* =========================
           STATIC FILES
        ========================= */

        let file;

        if (p === '/') {

          file =
            path.join(
              PUBLIC,
              'index.html'
            );

        } else if (
          p === '/admin' ||
          p === '/admin/'
        ) {

          file =
            path.join(
              PUBLIC,
              'admin',
              'index.html'
            );

        } else {

          file =
            path.join(
              PUBLIC,
              decodeURIComponent(p)
            );
        }

        const publicRoot =
          path.resolve(PUBLIC);

        const resolved =
          path.resolve(file);

        /* Security check */
        if (
          !resolved.startsWith(
            publicRoot +
            path.sep
          ) &&
          resolved !== publicRoot
        ) {

          return send(
            res,
            403,
            {
              error: 'Forbidden'
            }
          );
        }

        /* If file doesn't exist */
        if (
          !fs.existsSync(resolved) ||
          fs.statSync(resolved).isDirectory()
        ) {

          /*
            Do NOT redirect missing
            upload/image files to index.html.
          */

          if (
            p.startsWith('/uploads/')
          ) {

            return send(
              res,
              404,
              {
                error:
                  'Uploaded image not found'
              }
            );
          }

          resolved =
            path.join(
              PUBLIC,
              'index.html'
            );
        }

        const ext =
          path.extname(
            resolved
          ).toLowerCase();

        res.writeHead(
          200,
          {
            'Content-Type':
              mime[ext] ||
              'application/octet-stream'
          }
        );

        fs.createReadStream(
          resolved
        ).pipe(res);

      } catch (e) {

        console.error(e);

        if (!res.headersSent) {

          send(
            res,
            500,
            {
              error:
                'Server error'
            }
          );
        }
      }
    }
  );

server.listen(
  PORT,
  () => {

    console.log(
      `WASABEE running at http://localhost:${PORT}`
    );

    console.log(
      `Upload folder: ${UPLOADS}`
    );
  }
);
