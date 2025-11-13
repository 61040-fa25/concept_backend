---
timestamp: 'Sat Oct 18 2025 21:21:19 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251018_212119.ef8e583a.md]]'
content_id: 8ee95e5571b565ba4413a604a8140a10932d4c74ab9b8292a176074d5f48c56d
---

# error:

Leaks detected:

* 2 timers were started before the test, but completed during the test. Intervals and timers should not complete in a test if they were not started in that test. This is often caused by not calling `clearTimeout`. The operation were started here:
  at Object.queueUserTimer (ext:core/01\_core.js:795:9)
  at setTimeout (ext:deno\_web/02\_timers.js:64:15)
  at Timeout.<computed> (ext:deno\_node/internal/timers.mjs:76:7)
  at new Timeout (ext:deno\_node/internal/timers.mjs:57:37)
  at setTimeout (node:timers:15:10)
  at MonitorInterval.\_reschedule (file:///C:/Users/Akosua/Documents/6.104/skrib/node\_modules/.deno/mongodb@6.20.0/node\_modules/mongodb/lib/sdam/monitor.js:470:48)
  at MonitorInterval.wake (file:///C:/Users/Akosua/Documents/6.104/skrib/node\_modules/.deno/mongodb@6.20.0/node\_modules/mongodb/lib/sdam/monitor.js:433:18)
  at Timeout.\_onTimeout (file:///C:/Users/Akosua/Documents/6.104/skrib/node\_modules/.deno/mongodb@6.20.0/node\_modules/mongodb/lib/sdam/monitor.js:308:44)
  at cb (ext:deno\_node/internal/timers.mjs:66:49)
  at callback (ext:deno\_web/02\_timers.js:58:7)
* 3 timers were started before the test, but completed during the test. Intervals and timers should not complete in a test if they were not started in that test. This is often caused by not calling `clearTimeout`. The operation were started here:
  at Object.queueUserTimer (ext:core/01\_core.js:795:9)
  at setTimeout (ext:deno\_web/02\_timers.js:64:15)
  at Timeout.<computed> (ext:deno\_node/internal/timers.mjs:76:7)
  at new Timeout (ext:deno\_node/internal/timers.mjs:57:37)
  at setTimeout (node:timers:15:10)
  at ConnectionPool.ensureMinPoolSize (file:///C:/Users/Akosua/Documents/6.104/skrib/node\_modules/.deno/mongodb@6.20.0/node\_modules/mongodb/lib/cmap/connection\_pool.js:429:61)
  at Timeout.\_onTimeout (file:///C:/Users/Akosua/Documents/6.104/skrib/node\_modules/.deno/mongodb@6.20.0/node\_modules/mongodb/lib/cmap/connection\_pool.js:429:73)
  at cb (ext:deno\_node/internal/timers.mjs:66:49)
  at callback (ext:deno\_web/02\_timers.js:58:7)
  at eventLoopTick (ext:core/01\_core.js:214:13)
* 3 timers were started in this test, but never completed. This is often caused by not calling `clearTimeout`. The operation were started here:
  at Object.queueUserTimer (ext:core/01\_core.js:795:9)
  at setTimeout (ext:deno\_web/02\_timers.js:64:15)
  at Timeout.<computed> (ext:deno\_node/internal/timers.mjs:76:7)
  at Timeout.refresh (ext:deno\_node/internal/timers.mjs:102:39)
  at TLSSocket.Socket.\_unrefTimer (node:net:972:19)
  at WriteWrap.onWriteComplete \[as oncomplete] (ext:deno\_node/internal/stream\_base\_commons.ts:98:23)
  at TCP.#write (ext:deno\_node/internal\_binding/stream\_wrap.ts:324:11)
  at eventLoopTick (ext:core/01\_core.js:218:9)
* 3 timers were started in this test, but never completed. This is often caused by not calling `clearTimeout`. The operation were started here:
  at Object.queueUserTimer (ext:core/01\_core.js:795:9)
  at setTimeout (ext:deno\_web/02\_timers.js:64:15)
  at Timeout.<computed> (ext:deno\_node/internal/timers.mjs:76:7)
  at new Timeout (ext:deno\_node/internal/timers.mjs:57:37)
  at setTimeout (node:timers:15:10)
  at ConnectionPool.ensureMinPoolSize (file:///C:/Users/Akosua/Documents/6.104/skrib/node\_modules/.deno/mongodb@6.20.0/node\_modules/mongodb/lib/cmap/connection\_pool.js:429:61)
  at Timeout.\_onTimeout (file:///C:/Users/Akosua/Documents/6.104/skrib/node\_modules/.deno/mongodb@6.20.0/node\_modules/mongodb/lib/cmap/connection\_pool.js:429:73)
  at cb (ext:deno\_node/internal/timers.mjs:66:49)
  at callback (ext:deno\_web/02\_timers.js:58:7)
  at eventLoopTick (ext:core/01\_core.js:214:13)
* 3 timers were started in this test, but never completed. This is often caused by not calling `clearTimeout`. The operation were started here:
  at Object.queueUserTimer (ext:core/01\_core.js:795:9)
  at setTimeout (ext:deno\_web/02\_timers.js:64:15)
  at Timeout.<computed> (ext:deno\_node/internal/timers.mjs:76:7)
  at new Timeout (ext:deno\_node/internal/timers.mjs:57:37)
  at setTimeout (node:timers:15:10)
  at new RTTPinger (file:///C:/Users/Akosua/Documents/6.104/skrib/node\_modules/.deno/mongodb@6.20.0/node\_modules/mongodb/lib/sdam/monitor.js:333:50)
  at checkServer (file:///C:/Users/Akosua/Documents/6.104/skrib/node\_modules/.deno/mongodb@6.20.0/node\_modules/mongodb/lib/sdam/monitor.js:236:33)
  at MonitorInterval.fn (file:///C:/Users/Akosua/Documents/6.104/skrib/node\_modules/.deno/mongodb@6.20.0/node\_modules/mongodb/lib/sdam/monitor.js:297:9)
  at Timeout.MonitorInterval.\_executeAndReschedule \[as \_onTimeout] (file:///C:/Users/Akosua/Documents/6.104/skrib/node\_modules/.deno/mongodb@6.20.0/node\_modules/mongodb/lib/sdam/monitor.js:398:18)
  at cb (ext:deno\_node/internal/timers.mjs:66:49)
* A timer was started before the test, but completed during the test. Intervals and timers should not complete in a test if they were not started in that test. This is often caused by not calling `clearTimeout`. The operation was started here:
  at Object.queueUserTimer (ext:core/01\_core.js:795:9)
  at setTimeout (ext:deno\_web/02\_timers.js:64:15)
  at Timeout.<computed> (ext:deno\_node/internal/timers.mjs:76:7)
  at new Timeout (ext:deno\_node/internal/timers.mjs:57:37)
  at setTimeout (node:timers:15:10)
  at MonitorInterval.\_reschedule (file:///C:/Users/Akosua/Documents/6.104/skrib/node\_modules/.deno/mongodb@6.20.0/node\_modules/mongodb/lib/sdam/monitor.js:470:48)
  at MonitorInterval.wake (file:///C:/Users/Akosua/Documents/6.104/skrib/node\_modules/.deno/mongodb@6.20.0/node\_modules/mongodb/lib/sdam/monitor.js:433:18)
  at Monitor.requestCheck (file:///C:/Users/Akosua/Documents/6.104/skrib/node\_modules/.deno/mongodb@6.20.0/node\_modules/mongodb/lib/sdam/monitor.js:98:25)
  at Server.requestCheck (file:///C:/Users/Akosua/Documents/6.104/skrib/node\_modules/.deno/mongodb@6.20.0/node\_modules/mongodb/lib/sdam/server.js:132:27)
  at scheduleServerCheck (file:///C:/Users/Akosua/Documents/6.104/skrib/node\_modules/.deno/mongodb@6.20.0/node\_modules/mongodb/lib/sdam/topology.js:646:31)

TaggingConcept: Query \_getAllPublicTags => ./src/concepts/skrib/Tagging.test.ts:405:6
error: Leaks detected:

* 3 timers were started before the test, but completed during the test. Intervals and timers should not complete in a test if they were not started in that test. This is often caused by not calling `clearTimeout`. The operation were started here:
  at Object.queueUserTimer (ext:core/01\_core.js:795:9)
  at setTimeout (ext:deno\_web/02\_timers.js:64:15)
  at Timeout.<computed> (ext:deno\_node/internal/timers.mjs:76:7)
  at new Timeout (ext:deno\_node/internal/timers.mjs:57:37)
  at setTimeout (node:timers:15:10)
  at ConnectionPool.ensureMinPoolSize (file:///C:/Users/Akosua/Documents/6.104/skrib/node\_modules/.deno/mongodb@6.20.0/node\_modules/mongodb/lib/cmap/connection\_pool.js:429:61)
  at Timeout.\_onTimeout (file:///C:/Users/Akosua/Documents/6.104/skrib/node\_modules/.deno/mongodb@6.20.0/node\_modules/mongodb/lib/cmap/connection\_pool.js:429:73)
  at cb (ext:deno\_node/internal/timers.mjs:66:49)
  at callback (ext:deno\_web/02\_timers.js:58:7)
  at eventLoopTick (ext:core/01\_core.js:214:13)
* 3 timers were started in this test, but never completed. This is often caused by not calling `clearTimeout`. The operation were started here:
  at Object.queueUserTimer (ext:core/01\_core.js:795:9)
  at setTimeout (ext:deno\_web/02\_timers.js:64:15)
  at Timeout.<computed> (ext:deno\_node/internal/timers.mjs:76:7)
  at new Timeout (ext:deno\_node/internal/timers.mjs:57:37)
  at setTimeout (node:timers:15:10)
  at ConnectionPool.ensureMinPoolSize (file:///C:/Users/Akosua/Documents/6.104/skrib/node\_modules/.deno/mongodb@6.20.0/node\_modules/mongodb/lib/cmap/connection\_pool.js:429:61)
  at Timeout.\_onTimeout (file:///C:/Users/Akosua/Documents/6.104/skrib/node\_modules/.deno/mongodb@6.20.0/node\_modules/mongodb/lib/cmap/connection\_pool.js:429:73)
  at cb (ext:deno\_node/internal/timers.mjs:66:49)
  at callback (ext:deno\_web/02\_timers.js:58:7)
  at eventLoopTick (ext:core/01\_core.js:214:13)

TaggingConcept: Query \_getAllTags => ./src/concepts/skrib/Tagging.test.ts:431:6
error: Leaks detected:

* 3 timers were started before the test, but completed during the test. Intervals and timers should not complete in a test if they were not started in that test. This is often caused by not calling `clearTimeout`. The operation were started here:
  at Object.queueUserTimer (ext:core/01\_core.js:795:9)
  at setTimeout (ext:deno\_web/02\_timers.js:64:15)
  at Timeout.<computed> (ext:deno\_node/internal/timers.mjs:76:7)
  at new Timeout (ext:deno\_node/internal/timers.mjs:57:37)
  at setTimeout (node:timers:15:10)
  at ConnectionPool.ensureMinPoolSize (file:///C:/Users/Akosua/Documents/6.104/skrib/node\_modules/.deno/mongodb@6.20.0/node\_modules/mongodb/lib/cmap/connection\_pool.js:429:61)
  at Timeout.\_onTimeout (file:///C:/Users/Akosua/Documents/6.104/skrib/node\_modules/.deno/mongodb@6.20.0/node\_modules/mongodb/lib/cmap/connection\_pool.js:429:73)
  at cb (ext:deno\_node/internal/timers.mjs:66:49)
  at callback (ext:deno\_web/02\_timers.js:58:7)
  at eventLoopTick (ext:core/01\_core.js:214:13)
* 3 timers were started in this test, but never completed. This is often caused by not calling `clearTimeout`. The operation were started here:
  at Object.queueUserTimer (ext:core/01\_core.js:795:9)
  at setTimeout (ext:deno\_web/02\_timers.js:64:15)
  at Timeout.<computed> (ext:deno\_node/internal/timers.mjs:76:7)
  at new Timeout (ext:deno\_node/internal/timers.mjs:57:37)
  at setTimeout (node:timers:15:10)
  at ConnectionPool.ensureMinPoolSize (file:///C:/Users/Akosua/Documents/6.104/skrib/node\_modules/.deno/mongodb@6.20.0/node\_modules/mongodb/lib/cmap/connection\_pool.js:429:61)
  at Timeout.\_onTimeout (file:///C:/Users/Akosua/Documents/6.104/skrib/node\_modules/.deno/mongodb@6.20.0/node\_modules/mongodb/lib/cmap/connection\_pool.js:429:73)
  at cb (ext:deno\_node/internal/timers.mjs:66:49)
  at callback (ext:deno\_web/02\_timers.js:58:7)
  at eventLoopTick (ext:core/01\_core.js:214:13)
