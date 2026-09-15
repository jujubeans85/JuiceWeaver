/* Retire only this completed preview's cache after its tabs close. */
const PREFIX='crate-juice.juiceweaver.'+new URL(self.registration.scope).pathname+'|';
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith(PREFIX)).map(k=>caches.delete(k)))).then(()=>self.registration.unregister())));
