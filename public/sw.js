const CACHE='notesnexa-shell-991c530d77eb';
const SHELL=["/","/index.html","/manifest.webmanifest","/app-icon.svg","/notesnexa-192x192.png","/notesnexa-512x512.png","/notesnexa-maskable-512x512.png","/favicon-32x32.png","/assets/Auth-CCAQYGMK.js","/assets/index-aa6XHgta.js","/assets/index-DvbB02sj.css","/assets/NoteEditor-Dxent5kq.js","/assets/shared-CYtdMhzV.js","/assets/three.module-8lGkyZuJ.js","/assets/Workspace-i0t2W4kV.js","/images/reminders-banner.webp","/images/tasks-banner.webp","/fonts/dm-sans-400.ttf","/fonts/dm-sans-500.ttf","/fonts/dm-sans-600.ttf","/fonts/dm-sans-700.ttf","/fonts/DM-Sans-OFL.txt","/fonts/DM-Serif-Display-OFL.txt","/fonts/dm-serif-italic.ttf","/fonts/dm-serif.ttf"];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('notesnexa-shell-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
const u=new URL(event.request.url);
if(event.request.method!=='GET'||u.origin!==location.origin||u.pathname.startsWith('/api')||u.pathname.startsWith('/socket.io'))return;
if(event.request.mode==='navigate'){event.respondWith(fetch(event.request).catch(()=>caches.match('/index.html')));return;}
if(SHELL.includes(u.pathname))event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request)));
});
