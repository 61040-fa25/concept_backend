main.ts is implemented as follows:
```
// src/main.ts
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import initSse from './lib/sse-client'; // path may vary
import { useSessionStore } from './stores/session'; // path may vary

const app = createApp(App);
const pinia = createPinia();
app.use(pinia);
app.mount('#app');

// Create store and start SSE after Pinia is installed
const store = useSessionStore();

// Ensure we keep a global reference so it can't be GC'd by accident
const es = initSse(store); // pass store so sse-client can call actions directly
;(window as any).__es = es;
```