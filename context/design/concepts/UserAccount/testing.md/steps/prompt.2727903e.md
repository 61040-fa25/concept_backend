---
timestamp: 'Sun Oct 19 2025 22:32:43 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251019_223243.564f0c62.md]]'
content_id: 2727903e21f4d9764f7f4701804bb12aa966239d293d9632ca69f2c5791f5d16
---

# prompt: running 1 test from ./src/concepts/UserAccount/UserAccountConcept.test.ts

UserAccount Concept Tests ... FAILED (30s)

ERRORS

UserAccount Concept Tests => ./src/concepts/UserAccount/UserAccountConcept.test.ts:7:6
error: Error: MongoDB connection failed: MongoServerSelectionError: received fatal alert: InternalError
throw new Error("MongoDB connection failed: " + e);
^
at initMongoClient (file:///C:/Users/kalina/OneDrive - Massachusetts Institute of Technology/Uni/Senior/6104/concept\_backend/src/utils/database.ts:16:11)
at eventLoopTick (ext:core/01\_core.js:218:9)
at async init (file:///C:/Users/kalina/OneDrive - Massachusetts Institute of Technology/Uni/Senior/6104/concept\_backend/src/utils/database.ts:22:18)
at async testDb (file:///C:/Users/kalina/OneDrive - Massachusetts Institute of Technology/Uni/Senior/6104/concept\_backend/src/utils/database.ts:59:29)
at async file:///C:/Users/kalina/OneDrive - Massachusetts Institute of Technology/Uni/Senior/6104/concept\_backend/src/concepts/UserAccount/UserAccountConcept.test.ts:8:24

FAILURES

UserAccount Concept Tests => ./src/concepts/UserAccount/UserAccountConcept.test.ts:7:6

FAILED | 0 passed | 1 failed (30s)

error: Test failed
