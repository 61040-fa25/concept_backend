// src/utils/broadcast.ts
export type BroadcastEvent = { type: string; payload?: unknown; ts?: string };

const clients = new Set<WritableStreamDefaultWriter<string>>();

export function addClient(writer: WritableStreamDefaultWriter<string>) {
  clients.add(writer);
  return () => clients.delete(writer);
}

export function broadcast(event: BroadcastEvent) {
  const payload = JSON.stringify({ ...event, ts: new Date().toISOString() });
  // Include the `event:` field so clients registered with
  // `EventSource.addEventListener(type, ...)` receive typed events.
  // Format: "event: <type>\n data: <json>\n\n"
  const data = `event: ${event.type}\n` + `data: ${payload}\n\n`;
  // Fire-and-forget writes to each client. If a write fails we remove
  // the client from the set. Avoid calling writer.close() directly which
  // can sometimes throw in certain runtime/error states.
  for (const w of Array.from(clients)) {
    (async () => {
      try {
        await w.write(data);
      } catch {
        // Best-effort cleanup: remove the writer so future broadcasts
        // don't attempt to write to a dead sink. Don't call close() —
        // it can throw in some environments and lead to unhandled
        // promise rejections.
        try {
          // releaseLock is safe if the writer holds a lock; ignore errors
          // if it's not available.
          // deno-lint-ignore no-explicit-any
          (w as any).releaseLock?.();
        } catch {
          // ignore errors from releaseLock
        }
        clients.delete(w);
      }
    })();
  }
}
