import {readFileSync,writeFileSync,readdirSync,existsSync,unlinkSync} from 'node:fs';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
// Retire the old compiled replica. The editable React build now owns the app.
for(const old of ['public/assets/index-PM8Qjg89.js','public/assets/index-DbwmC8z6.css'])if(existsSync(old))unlinkSync(old);
const icon=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" rx="110" fill="#f4f0e7"/><g transform="translate(256 256)" fill="none" stroke="#17645c" stroke-width="22" stroke-linecap="round"><circle r="130"/><path d="M-112-65 27-112M0-130 111-32M112-65 84 76M112 65-27 112M0 130-111 32M-112 65-84-76"/></g></svg>`;
writeFileSync('public/app-icon.svg',icon);
for(const [file,size] of [['notesnexa-192x192.png',192],['notesnexa-512x512.png',512],['notesnexa-maskable-512x512.png',512],['favicon-32x32.png',32]])await sharp(Buffer.from(icon)).resize(size,size).png().toFile('public/'+file);
const manifest=JSON.parse(readFileSync('public/manifest.webmanifest','utf8').replace(/^\uFEFF/,''));manifest.theme_color='#f4f0e7';manifest.background_color='#f4f0e7';manifest.description='A considered space for your notes, tasks and next ideas.';writeFileSync('public/manifest.webmanifest',JSON.stringify(manifest,null,2));
const assets=['/','/index.html','/manifest.webmanifest','/app-icon.svg','/notesnexa-192x192.png','/notesnexa-512x512.png','/notesnexa-maskable-512x512.png','/favicon-32x32.png',...readdirSync('public/assets').filter(f=>/\.(js|css)$/.test(f)).map(f=>'/assets/'+f),...readdirSync('public/images').map(f=>'/images/'+f),...readdirSync('public/fonts').map(f=>'/fonts/'+f)];
const version=createHash('sha256').update(readFileSync('public/index.html')).digest('hex').slice(0,12);
writeFileSync('public/sw.js',`const CACHE='notesnexa-shell-${version}';
const SHELL=${JSON.stringify(assets)};
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('notesnexa-shell-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
const u=new URL(event.request.url);
if(event.request.method!=='GET'||u.origin!==location.origin||u.pathname.startsWith('/api')||u.pathname.startsWith('/socket.io'))return;
if(event.request.mode==='navigate'){event.respondWith(fetch(event.request).catch(()=>caches.match('/index.html')));return;}
if(SHELL.includes(u.pathname))event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request)));
});\n`);
console.log('PWA: versioned app shell, self-hosted fonts, deep teal icons.');
