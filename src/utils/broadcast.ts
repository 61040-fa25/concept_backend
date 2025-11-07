// src/utils/broadcast.ts
export type BroadcastEvent = { type: string; payload?: unknown; ts?: string };

const clients = new Set<WritableStreamDefaultWriter<string>>();
// Keep the last broadcast payload (serialized) so newly connected clients
// receive an immediate initial event in case they reconnect quickly.
let lastPayload: string | null = null;
let seq = 0;

export function addClient(writer: WritableStreamDefaultWriter<string>) {
  clients.add(writer);
  try {
    console.debug(`[Broadcast] addClient -> clients=${clients.size}`);
  } catch (_e) {
    // ignore logging failures
  }
  // If we have a recent payload, try to send it to the new client so they
  // start with an up-to-date state. Ignore failures here; the regular
  // broadcast cleanup will remove broken writers.
  if (lastPayload) {
    // Delay the initial write slightly to avoid races where the
    // ReadableStream controller isn't fully ready to accept enqueue/write
    // calls immediately after construction in some runtimes. Use a slightly
    // longer delay to reduce false positives where the client disconnects
    // just as the initial write is attempted.
    setTimeout(() => {
      (async () => {
        try {
          // Wait until the writer is ready; if the stream is closed this
          // promise will reject. For the initial write we will log failures
          // but NOT remove the client immediately; subsequent broadcasts
          // will detect a closed writer and remove it. This reduces churn
          // from short-lived client probes (dev tooling, proxies).
          // eslint-disable-next-line @typescript-eslint/await-thenable
          await writer.ready;
          await writer.write(lastPayload!);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          if (
            msg.includes("cannot close or enqueue") ||
            msg.includes("closing or is closed") ||
            msg.includes("The stream is closing or is closed")
          ) {
            // transient or closing stream: log and keep the client for now.
            console.debug(
              `[BroadcastWrite] initial write failed (will keep client) -> ${msg}`,
            );
            return;
          }
          console.warn(
            `[BroadcastWrite] initial write failed (non-transient) -> ${msg}`,
          );
          // Do not remove on initial write failure; let the normal broadcast
          // flow detect and remove truly dead writers.
        }
      })();
    }, 200);
  }

  return () => removeClient(writer, "client-cancel");
}

function removeClient(w: WritableStreamDefaultWriter<string>, reason?: string) {
  try {
    clients.delete(w);
    console.debug(
      `[Broadcast] removeClient (${
        reason ?? "manual"
      }) -> clients=${clients.size}`,
    );
  } catch (_e) {
    // ignore
  }
}

export function broadcast(event: BroadcastEvent) {
  const payload = JSON.stringify({ ...event, ts: new Date().toISOString() });
  // Include the `event:` field so clients registered with
  // `EventSource.addEventListener(type, ...)` receive typed events.
  // Format: "event: <type>\n data: <json>\n\n"
  const data = `event: ${event.type}\n` + `data: ${payload}\n\n`;
  // Remember the last serialized payload (including event prefix) so new
  // clients can be brought up-to-date immediately after reconnect.
  lastPayload = data;
  // Fire-and-forget writes to each client. If a write fails we remove
  // the client from the set. Avoid calling writer.close() directly which
  // can sometimes throw in certain runtime/error states.
  // We'll send a single combined SSE frame per event (includes `event:` and `data:`)
  // to avoid write races that were happening when sending two sequential writes
  // (typed event + fallback). This reduces controller enqueue/close conflicts.
  seq++;
  const label = `${event.type}#${seq}`;
  // Debug: note outgoing broadcast so we can correlate server activity
  // with client-side observations (keeps log short by truncating payload).
  try {
    const short = payload.length > 200 ? payload.slice(0, 200) + "…" : payload;
    console.debug(
      `[Broadcast] ${label} -> clients=${clients.size} payload=${short}`,
    );
  } catch (_e) {
    // ignore logging errors
  }
  for (const [i, w] of Array.from(clients).entries()) {
    (async () => {
      console.debug(
        `[BroadcastWrite] client#${i} (${label}) - attempting ready/write`,
      );
      try {
        // Wait until the writer is ready (prevents enqueue on a closed
        // controller) and send the typed event first.
        // eslint-disable-next-line @typescript-eslint/await-thenable
        await w.ready;
        console.debug(
          `[BroadcastWrite] client#${i} (${label}) - ready resolved`,
        );
        try {
          // Single write: write the combined event+data frame.
          await w.write(data);
          console.debug(
            `[BroadcastWrite] client#${i} (${label}) - wrote event frame`,
          );
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          if (msg.includes("cannot close or enqueue")) {
            // Retry once after a short delay for transient controller races.
            await new Promise((res) => setTimeout(res, 30));
            try {
              // eslint-disable-next-line @typescript-eslint/await-thenable
              await w.ready;
              await w.write(data);
              console.debug(
                `[BroadcastWrite] client#${i} (${label}) - wrote event frame on retry`,
              );
            } catch (_err2) {
              // fallthrough to removal below
            }
          } else {
            // Non-transient failure: log and remove.
            console.warn(
              `[BroadcastWrite] failed -> removing client#${i} (${label}): ${msg}`,
            );
            removeClient(w, `write-failed#${i}`);
            return;
          }
        }
        // Single-frame broadcast done.
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(
          `[BroadcastWrite] failed -> removing client#${i} (${label}): ${msg}`,
        );
        removeClient(w, `exception#${i}`);
      }
    })();
  }
}

export function clientCount() {
  return clients.size;
}
