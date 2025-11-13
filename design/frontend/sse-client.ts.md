lib/sse-client.ts is implemented as follows:
```
import type { Store } from 'pinia';
import type { useSessionStore } from '../stores/session'; // adjust to point to your store type

export default function initSse(store?: ReturnType<typeof useSessionStore>) {
  const candidates = [
    '/events', // works if not proxied or if proxy supports SSE
    // fallback direct backend origin — replace host/port if different
    'http://localhost:8000/events'
  ];

  let es: EventSource | null = null;
  for (const url of candidates) {
    try {
      console.debug('[SSE] attempting EventSource ->', url);
      es = new EventSource(url);
      console.debug('[SSE] EventSource constructed for', url);
      break;
    } catch (err) {
      console.warn('[SSE] EventSource constructor failed for', url, err);
      es = null;
    }
  }

  if (!es) {
    console.error('[SSE] all EventSource constructor attempts failed');
    return null;
  }

  es.addEventListener('open', () => console.debug('[SSE] connected (readyState=' + es!.readyState + ')'));
  es.addEventListener('error', (e) => console.warn('[SSE] error (readyState=' + es!.readyState + ')', e));

  // Fallback: parse onmessage as typed envelope {type, payload}
  es.addEventListener('message', (ev: MessageEvent) => {
    try {
      const obj = JSON.parse(ev.data);
      const type = obj?.type ?? 'message';
      const payload = obj?.payload ?? obj;
      console.debug('[SSE] message fallback', type, payload);
      // if store is provided, we can handle some common types here:
      if (type === 'session.items.changed' && store && payload?.sessionId) {
        void store.loadSessionListItems(payload.sessionId);
      }
    } catch (err) {
      console.warn('[SSE] parse error', err, ev.data);
    }
  });

  // Typed listeners — best for performance/clarity in app code
  es.addEventListener('session.items.changed', (e) => {
    try {
      const wrapper = JSON.parse((e as MessageEvent).data);
      const sessionId = wrapper?.payload?.sessionId;
      if (!sessionId) return;
      if (store) {
        // call Pinia action that does the authoritative reload
        void store.loadSessionListItems(sessionId);
      } else {
        // as fallback dispatch a global event for non-Pinia code
        window.dispatchEvent(new CustomEvent('sse:session.items.changed', { detail: wrapper.payload }));
      }
      console.debug('[SSE] session.items.changed -> reloaded session', sessionId);
    } catch (err) {
      console.error('[SSE] failed to handle session.items.changed', err);
    }
  });

  // Keep a little readyState debug for a few seconds (optional)
  const rid = setInterval(() => console.debug('[SSE] readyState=', es!.readyState), 2000);
  setTimeout(() => { clearInterval(rid); console.debug('[SSE] stopped periodic readyState log'); }, 10000);

  return es;
}
```