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

/* =========================================================
   DIRECTORIES
   ========================================================= */

if (!fs.existsSync(DATA)) {
  fs.mkdirSync(DATA, { recursive: true });
}

if (!fs.existsSync(PUBLIC)) {
  fs.mkdirSync(PUBLIC, { recursive: true });
}

if (!fs.existsSync(UPLOADS)) {
  fs.mkdirSync(UPLOADS, { recursive: true });
}

/* =========================================================
   DATA HELPERS
   ========================================================= */

const read = (file) => {
  const p = path.join(DATA, file);

  if (!fs.existsSync(p)) {
    fs.writeFileSync(p, '[]', 'utf8');
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

/* =========================================================
   MIME TYPES
   ========================================================= */

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

/* =========================================================
   RESPONSE
   ========================================================= */

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

/* =========================================================
   REQUEST BODY
   ========================================================= */

function body(req) {
  return new Promise((resolve, reject) => {
    let b = '';

    req.on('data', (chunk) => {
      b += chunk;

      if (b.length > 15e6) {
        reject(new Error('Request body too large'));
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

/* =========================================================
   AUTH
   ========================================================= */

function authed(req) {
  const h = req.headers.authorization || '';

  return (
    h.startsWith('Bearer ') &&
    sessions.has(h.slice(7))
  );
}

/* =========================================================
   IMAGE UPLOAD
   ========================================================= */

function saveUploadedImage(filename, data) {
  if (!filename || !data) {
    throw new Error('Filename or image data missing');
  }

  const ext =
    path.extname(filename).toLowerCase();

  const allowed = [
    '.jpg',
    '.jpeg',
    '.png',
    '.webp',
    '.gif'
  ];

  if (!allowed.includes(ext)) {
    throw new Error(
      'Only JPG, JPEG, PNG, WEBP and GIF images are allowed'
    );
  }

  let base64 = String(data);

  /*
    Accept:
    data:image/png;base64,XXXX
    OR
    plain base64
  */

  base64 = base64.replace(
    /^data:image\/[^;]+;base64,/,
    ''
  );

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
    path.join(UPLOADS, finalName);

  fs.writeFileSync(
    filePath,
    Buffer.from(base64, 'base64')
  );

  console.log(
    'Image uploaded:',
    finalName
  );

  return '/uploads/' + finalName;
}

/* =========================================================
   API
   ========================================================= */

async function api(req, res, p) {

  /* -------------------------------------------------------
     ADMIN LOGIN
     ------------------------------------------------------- */

  if (
    req.method === 'POST' &&
    p === '/api/admin/login'
  ) {
    try {
      const b = await body(req);

      if (b.password !== ADMIN_PASSWORD) {
        return send(res, 401, {
          error: 'Wrong password'
        });
      }

      const token =
        crypto
          .randomBytes(24)
          .toString('hex');

      sessions.add(token);

      return send(res, 200, {
        token
      });

    } catch (e) {
      return send(res, 400, {
        error: 'Invalid request'
      });
    }
  }

  /* -------------------------------------------------------
     ADMIN IMAGE UPLOAD
     ------------------------------------------------------- */

  if (
    req.method === 'POST' &&
    p === '/api/admin/upload'
  ) {

    if (!authed(req)) {
      return send(res, 401, {
        ok: false,
        error: 'Unauthorized'
      });
    }

    try {
      const b = await body(req);

      const imageUrl =
        saveUploadedImage(
          b.filename,
          b.data
        );

      return send(res, 200, {
        ok: true,
        url: imageUrl
      });

    } catch (e) {

      console.error(
        'Image upload error:',
        e
      );

      return send(res, 400, {
        ok: false,
        error:
          e.message ||
          'Image upload failed'
      });
    }
  }

  /* -------------------------------------------------------
     PUBLIC DATA
     ------------------------------------------------------- */

  if (
    req.method === 'GET' &&
    p === '/api/public-data'
  ) {

    return send(res, 200, {
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
    });
  }

  /* -------------------------------------------------------
     PUBLIC ORDERS
     ------------------------------------------------------- */

  if (
    req.method === 'POST' &&
    p === '/api/orders'
  ) {

    try {
      const b = await body(req);

      const orders =
        read('orders.json');

      const order = {
        id:
          'WAS-' +
          Date.now(),

        createdAt:
          new Date().toISOString(),

        status: 'NEW',

        ...b
      };

      orders.push(order);

      write(
        'orders.json',
        orders
      );

      return send(res, 200, {
        ok: true,
        orderId: order.id
      });

    } catch (e) {

      console.error(e);

      return send(res, 400, {
        ok: false,
        error: 'Order could not be saved'
      });
    }
  }

  /* -------------------------------------------------------
     PUBLIC BOOKINGS
     ------------------------------------------------------- */

  if (
    req.method === 'POST' &&
    p === '/api/bookings'
  ) {

    try {
      const b = await body(req);

      const bookings =
        read('bookings.json');

      const booking = {
        id:
          'TB-' +
          Date.now(),

        createdAt:
          new Date().toISOString(),

        status: 'NEW',

        ...b
      };

      bookings.push(booking);

      write(
        'bookings.json',
        bookings
      );

      return send(res, 200, {
        ok: true,
        id: booking.id
      });

    } catch (e) {

      console.error(e);

      return send(res, 400, {
        ok: false,
        error:
          'Booking could not be saved'
      });
    }
  }

  /* -------------------------------------------------------
     PUBLIC REVIEWS
     ------------------------------------------------------- */

  if (
    req.method === 'POST' &&
    p === '/api/reviews'
  ) {

    try {
      const b = await body(req);

      const reviews =
        read('reviews.json');

      const review = {
        id:
          'RV-' +
          Date.now(),

        createdAt:
          new Date().toISOString(),

        approved: true,

        ...b
      };

      reviews.push(review);

      write(
        'reviews.json',
        reviews
      );

      return send(res, 200, {
        ok: true
      });

    } catch (e) {

      console.error(e);

      return send(res, 400, {
        ok: false,
        error:
          'Review could not be saved'
      });
    }
  }

  /* -------------------------------------------------------
     ALL OTHER ADMIN API
     ------------------------------------------------------- */

  if (
    p.startsWith('/api/admin/') &&
    !authed(req)
  ) {
    return send(res, 401, {
      error: 'Unauthorized'
    });
  }

  /* -------------------------------------------------------
     ADMIN DATA
     ------------------------------------------------------- */

  if (
    req.method === 'GET' &&
    p === '/api/admin/data'
  ) {

    return send(res, 200, {

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
    });
  }

  /* -------------------------------------------------------
     MENU
     ------------------------------------------------------- */

  if (
    req.method === 'PUT' &&
    p === '/api/admin/menu'
  ) {

    const data =
      await body(req);

    write(
      'menu.json',
      data
    );

    return send(res, 200, {
      ok: true
    });
  }

  /* -------------------------------------------------------
     SETTINGS
     ------------------------------------------------------- */

  if (
    req.method === 'PUT' &&
    p === '/api/admin/settings'
  ) {

    const data =
      await body(req);

    write(
      'settings.json',
      data
    );

    return send(res, 200, {
      ok: true
    });
  }

  /* -------------------------------------------------------
     INVENTORY
     ------------------------------------------------------- */

  if (
    req.method === 'PUT' &&
    p === '/api/admin/inventory'
  ) {

    const data =
      await body(req);

    write(
      'inventory.json',
      data
    );

    return send(res, 200, {
      ok: true
    });
  }

  /* -------------------------------------------------------
     COUPONS
     ------------------------------------------------------- */

  if (
    req.method === 'PUT' &&
    p === '/api/admin/coupons'
  ) {

    const data =
      await body(req);

    write(
      'coupons.json',
      data
    );

    return send(res, 200, {
      ok: true
    });
  }

  /* -------------------------------------------------------
     ORDER / BOOKING STATUS
     ------------------------------------------------------- */

  const statusMatch =
    p.match(
      /^\/api\/admin\/(orders|bookings)\/([^/]+)$/
    );

  if (
    statusMatch &&
    req.method === 'PUT'
  ) {

    const type =
      statusMatch[1];

    const id =
      statusMatch[2];

    const file =
      type === 'orders'
        ? 'orders.json'
        : 'bookings.json';

    const items =
      read(file);

    const index =
      items.findIndex(
        x => x.id === id
      );

    if (index < 0) {
      return send(res, 404, {
        error: 'Not found'
      });
    }

    const update =
      await body(req);

    items[index] = {
      ...items[index],
      ...update
    };

    write(
      file,
      items
    );

    return send(res, 200, {
      ok: true
    });
  }

  /* -------------------------------------------------------
     DELETE REVIEW
     ------------------------------------------------------- */

  const reviewMatch =
    p.match(
      /^\/api\/admin\/reviews\/([^/]+)$/
    );

  if (
    reviewMatch &&
    req.method === 'DELETE'
  ) {

    const id =
      reviewMatch[1];

    const reviews =
      read('reviews.json')
        .filter(
          x => x.id !== id
        );

    write(
      'reviews.json',
      reviews
    );

    return send(res, 200, {
      ok: true
    });
  }

  /* -------------------------------------------------------
     UNKNOWN API
     ------------------------------------------------------- */

  return send(res, 404, {
    error: 'API route not found'
  });
}

/* =========================================================
   STATIC FILE SERVER
   ========================================================= */

const server =
  http.createServer(
    async (req, res) => {

      try {

        const pathname =
          url.parse(
            req.url
          ).pathname;

        /* API */

        if (
          pathname.startsWith('/api/')
        ) {
          return await api(
            req,
            res,
            pathname
          );
        }

        /* -------------------------------------------------
           ROOT / PUBLIC WEBSITE
           ------------------------------------------------- */

        let file;

        if (pathname === '/') {

          file =
            path.join(
              PUBLIC,
              'index.html'
            );

        } else if (
          pathname === '/admin' ||
          pathname === '/admin/'
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
              decodeURIComponent(pathname)
            );
        }

        /* SECURITY */

        const publicRoot =
          path.resolve(PUBLIC);

        const requested =
          path.resolve(file);

        if (
          requested !== publicRoot &&
          !requested.startsWith(
            publicRoot + path.sep
          )
        ) {

          return send(res, 403, {
            error: 'Forbidden'
          });
        }

        /* -------------------------------------------------
           FILE NOT FOUND
           ------------------------------------------------- */

        if (
          !fs.existsSync(file) ||
          fs.statSync(file).isDirectory()
        ) {

          /*
            Do NOT send index.html for missing images.
            This is important because missing image URLs
            should return 404 instead of HTML.
          */

          const ext =
            path.extname(file)
              .toLowerCase();

          if (
            ext === '.png' ||
            ext === '.jpg' ||
            ext === '.jpeg' ||
            ext === '.webp' ||
            ext === '.gif' ||
            ext === '.svg'
          ) {

            return send(res, 404, {
              error: 'Image not found'
            });
          }

          file =
            path.join(
              PUBLIC,
              'index.html'
            );
        }

        /* -------------------------------------------------
           SERVE FILE
           ------------------------------------------------- */

        const ext =
          path.extname(file)
            .toLowerCase();

        res.writeHead(200, {
          'Content-Type':
            mime[ext] ||
            'application/octet-stream'
        });

        fs.createReadStream(file)
          .pipe(res);

      } catch (e) {

        console.error(
          'Server error:',
          e
        );

        if (!res.headersSent) {
          send(res, 500, {
            error: 'Server error'
          });
        } else {
          res.end();
        }
      }
    }
  );

/* =========================================================
   START SERVER
   ========================================================= */

server.listen(
  PORT,
  () => {
    console.log(
      `WASABEE running at http://localhost:${PORT}`
    );

    console.log(
      `Uploads directory: ${UPLOADS}`
    );
  }
);
