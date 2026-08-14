const http=require('http'),fs=require('fs'),path=require('path'),crypto=require('crypto'),url=require('url');
const PORT=process.env.PORT||3000, ROOT=__dirname, DATA=path.join(ROOT,'data'), ADMIN_PASSWORD=process.env.ADMIN_PASSWORD||'wasabee-admin';
const sessions=new Set();
const read=f=>{const p=path.join(DATA,f);if(!fs.existsSync(p))fs.writeFileSync(p,'[]');return JSON.parse(fs.readFileSync(p,'utf8'))};
const write=(f,d)=>{const p=path.join(DATA,f),t=p+'.tmp';fs.writeFileSync(t,JSON.stringify(d,null,2));fs.renameSync(t,p)};
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.svg':'image/svg+xml','.pdf':'application/pdf'};
function send(res,status,data,type='application/json'){res.writeHead(status,{'Content-Type':type,'Cache-Control':'no-store'});res.end(type.includes('json')?JSON.stringify(data):data)}
function body(req){return new Promise((resolve,reject)=>{let b='';req.on('data',c=>{b+=c;if(b.length>5e6)req.destroy()});req.on('end',()=>{try{resolve(b?JSON.parse(b):{})}catch(e){reject(e)}});req.on('error',reject)})}
function authed(req){const h=req.headers.authorization||'';return h.startsWith('Bearer ')&&sessions.has(h.slice(7))}
function allItems(menu){const out=[];for(const c of menu){if(c.items)for(const i of c.items)out.push({...i,category:c.name});if(c.subcategories)for(const s of c.subcategories)for(const i of (s.items||[]))out.push({...i,category:c.name,subcategory:s.name});}return out}
function saveUploadedImage(filename,data){
  const uploadDir=path.join(ROOT,'public','uploads');
  if(!fs.existsSync(uploadDir))fs.mkdirSync(uploadDir,{recursive:true});

  const ext=path.extname(filename||'').toLowerCase();
  const allowed=['.jpg','.jpeg','.png','.webp','.gif'];

  if(!allowed.includes(ext))throw new Error('Only JPG, JPEG, PNG, WEBP and GIF images are allowed');

  const safeName=path.basename(filename,ext)
    .replace(/[^a-z0-9-_]/gi,'-')
    .toLowerCase();

  const finalName=Date.now()+'-'+safeName+ext;
  const filePath=path.join(uploadDir,finalName);

  fs.writeFileSync(filePath,Buffer.from(data,'base64'));

  return '/uploads/'+finalName;
}
async function api(req,res,p){
     if(req.method==='POST'&&p==='/api/admin/upload'){
   if(!authed(req))return send(res,401,{error:'Unauthorized'});
   try{
     const b=await body(req);
     if(!b.filename||!b.data)return send(res,400,{error:'Image file is required'});

     const uploadDir=path.join(ROOT,'public','uploads');
     if(!fs.existsSync(uploadDir))fs.mkdirSync(uploadDir,{recursive:true});

     const ext=path.extname(b.filename).toLowerCase();
     const allowed=['.jpg','.jpeg','.png','.webp','.gif'];
     if(!allowed.includes(ext))return send(res,400,{error:'Invalid image type'});

     const safeName=path.basename(b.filename,ext).replace(/[^a-z0-9-_]/gi,'-').toLowerCase();
     const finalName=Date.now()+'-'+safeName+ext;
     const base64=String(b.data).replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/,'');
     fs.writeFileSync(path.join(uploadDir,finalName),Buffer.from(base64,'base64'));

     return send(res,200,{ok:true,url:'/uploads/'+finalName});
   }catch(e){
     return send(res,400,{error:e.message||'Upload failed'});
   }
 }
 if(req.method==='POST'&&p==='/api/admin/upload'){
  if(!authed(req))return send(res,401,{error:'Unauthorized'});

  try{
    const b=await body(req);

    if(!b.filename||!b.data){
      return send(res,400,{ok:false,error:'Filename or image data missing'});
    }

    const ext=path.extname(b.filename).toLowerCase();
    const allowed=['.jpg','.jpeg','.png','.webp','.gif','.svg'];

    if(!allowed.includes(ext)){
      return send(res,400,{ok:false,error:'Unsupported image type'});
    }

    const uploadsDir=path.join(ROOT,'public','uploads');

    if(!fs.existsSync(uploadsDir)){
      fs.mkdirSync(uploadsDir,{recursive:true});
    }

    const safeName=Date.now()+'-'+
      path.basename(b.filename).replace(/[^a-zA-Z0-9._-]/g,'_');

    const filePath=path.join(uploadsDir,safeName);

    const base64=String(b.data).replace(/^data:image\/[^;]+;base64,/,'');
    fs.writeFileSync(filePath,Buffer.from(base64,'base64'));

    return send(res,200,{
      ok:true,
      url:'/uploads/'+safeName
    });

  }catch(err){
    console.error('Image upload error:',err);
    return send(res,500,{
      ok:false,
      error:'Image upload failed'
    });
  }
}
 if(req.method==='GET'&&p==='/api/public-data')return send(res,200,{menu:read('menu.json'),settings:read('settings.json'),reviews:read('reviews.json').filter(x=>x.approved!==false).slice(-30).reverse(),coupons:read('coupons.json').filter(x=>x.active!==false)});
 if(req.method==='POST'&&p==='/api/orders'){const b=await body(req),a=read('orders.json'),o={id:'WAS-'+Date.now(),createdAt:new Date().toISOString(),status:'NEW',...b};a.push(o);write('orders.json',a);return send(res,200,{ok:true,orderId:o.id})}
 if(req.method==='POST'&&p==='/api/bookings'){const b=await body(req),a=read('bookings.json'),o={id:'TB-'+Date.now(),createdAt:new Date().toISOString(),status:'NEW',...b};a.push(o);write('bookings.json',a);return send(res,200,{ok:true,id:o.id})}
 if(req.method==='POST'&&p==='/api/reviews'){const b=await body(req),a=read('reviews.json'),o={id:'RV-'+Date.now(),createdAt:new Date().toISOString(),approved:true,...b};a.push(o);write('reviews.json',a);return send(res,200,{ok:true})}
 if(req.method==='POST'&&p==='/api/admin/login'){const b=await body(req);if(b.password!==ADMIN_PASSWORD)return send(res,401,{error:'Wrong password'});const t=crypto.randomBytes(24).toString('hex');sessions.add(t);return send(res,200,{token:t})}
 if(p.startsWith('/api/admin/')&&!authed(req))return send(res,401,{error:'Unauthorized'});
 if(req.method==='GET'&&p==='/api/admin/data')return send(res,200,{menu:read('menu.json'),settings:read('settings.json'),orders:read('orders.json').slice().reverse(),bookings:read('bookings.json').slice().reverse(),reviews:read('reviews.json').slice().reverse(),inventory:read('inventory.json'),coupons:read('coupons.json')});
 if(req.method==='PUT'&&p==='/api/admin/menu'){write('menu.json',await body(req));return send(res,200,{ok:true})}
 if(req.method==='PUT'&&p==='/api/admin/settings'){write('settings.json',await body(req));return send(res,200,{ok:true})}
 if(req.method==='PUT'&&p==='/api/admin/inventory'){write('inventory.json',await body(req));return send(res,200,{ok:true})}
 if(req.method==='PUT'&&p==='/api/admin/coupons'){write('coupons.json',await body(req));return send(res,200,{ok:true})}
 let m=p.match(/^\/api\/admin\/(orders|bookings)\/([^/]+)$/);if(m&&req.method==='PUT'){const file=m[1]==='orders'?'orders.json':'bookings.json',a=read(file),i=a.findIndex(x=>x.id===m[2]);if(i<0)return send(res,404,{error:'Not found'});a[i]={...a[i],...(await body(req))};write(file,a);return send(res,200,{ok:true})}
 m=p.match(/^\/api\/admin\/reviews\/([^/]+)$/);if(m&&req.method==='DELETE'){write('reviews.json',read('reviews.json').filter(x=>x.id!==m[1]));return send(res,200,{ok:true})}
 return send(res,404,{error:'API route not found'});
}
const server=http.createServer(async(req,res)=>{try{const p=url.parse(req.url).pathname;if(p.startsWith('/api/'))return await api(req,res,p);let file;if(p==='/')file=path.join(ROOT,'public','index.html');else if(p==='/admin'||p==='/admin/')file=path.join(ROOT,'public','admin','index.html');else file=path.join(ROOT,'public',decodeURIComponent(p));if(!file.startsWith(path.join(ROOT,'public')))return send(res,403,{error:'Forbidden'});if(!fs.existsSync(file)||fs.statSync(file).isDirectory())file=path.join(ROOT,'public','index.html');const ext=path.extname(file).toLowerCase();res.writeHead(200,{'Content-Type':mime[ext]||'application/octet-stream'});fs.createReadStream(file).pipe(res)}catch(e){console.error(e);send(res,500,{error:'Server error'})}});
server.listen(PORT,()=>console.log(`WASABEE running at http://localhost:${PORT}`));
