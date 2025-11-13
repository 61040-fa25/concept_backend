// Quick SSE test client that opens an event stream and then triggers a deleteTask POST
const eventsUrl = "http://localhost:9000/events";
const postUrl = "http://localhost:9000/api/ListCreation/deleteTask";

async function main() {
  console.log("Opening SSE connection...");
  const es = await fetch(eventsUrl);
  if (!es.body) throw new Error("No body on events response");
  const reader = es.body.getReader();
  const decoder = new TextDecoder();

  // Trigger the deleteTask after opening the stream
  (async () => {
    await new Promise((r) => setTimeout(r, 200));
    console.log("Posting deleteTask...");
    const resp = await fetch(postUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ list: "list1", task: "task1", deleter: "user1" }),
    });
    console.log("POST status", resp.status);
    try {
      const j = await resp.json();
      console.log("POST response", j);
    } catch (e) {
      console.log("POST response not JSON");
    }
  })();

  const deadline = Date.now() + 5000;
  try {
    while (Date.now() < deadline) {
      const { value, done } = await reader.read();
      if (done) break;
      if (value) {
        const s = decoder.decode(value);
        process.stdout.write(s);
      }
    }
  } finally {
    try {
      reader.cancel();
    } catch {}
    console.log("\nSSE test finished.");
  }
}

main().catch((e) => {
  console.error("SSE test failed:", e);
});
