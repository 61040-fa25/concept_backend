---
timestamp: 'Wed Oct 15 2025 22:10:46 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251015_221046.1008006d.md]]'
content_id: ec070a2e8db712c45b35696c6e6973e3dd9e23bf02905317010ea50b4ae87360
---

# response:

You are absolutely right to ask! The same principle applies here.

The `https://deno.land/std@0.218.0/testing/bdd.ts` import is also referencing a module from the Deno standard library, just like `assert`. Therefore, it should also be updated to use the `jsr:` specifier for the reasons previously discussed (better dependency management, `deno.json` integration, simpler syntax, and alignment with modern Deno practices).

The corrected import for the testing utilities would be:

```typescript
import {
  describe,
  it,
  beforeAll,
  beforeEach,
  afterEach,
  afterAll,
} from "jsr:@std/testing/bdd"; // Corrected import
```

So, the complete corrected imports for the test file would look like this:

```typescript
import {
  assert,
  assertEquals,
  assertExists,
  assertNotEquals,
  assertObjectMatch,
  // assertRejects, // assertRejects is not in @std/assert as of some versions, but can be added if it is. For now, removed.
  assertStringIncludes,
} from "jsr:@std/assert";
import {
  describe,
  it,
  beforeAll,
  beforeEach,
  afterEach,
  afterAll,
} from "jsr:@std/testing/bdd"; // Corrected import
// ... rest of the imports
```

**Note on `assertRejects`:** As of `@std/assert` v0.218.0, `assertRejects` is indeed available. So, the original list was correct, and it should also come from `jsr:@std/assert`.

Final corrected import block for your test file:

```typescript
import {
  assert,
  assertEquals,
  assertExists,
  assertNotEquals,
  assertObjectMatch,
  assertRejects, // This is available in jsr:@std/assert
  assertStringIncludes,
} from "jsr:@std/assert";
import {
  describe,
  it,
  beforeAll,
  beforeEach,
  afterEach,
  afterAll,
} from "jsr:@std/testing/bdd";
import { MongoClient, Db } from "npm:mongodb";
import PasswordAuthenticationConcept from "./PasswordAuthenticationConcept.ts";
import { ID } from "@utils/types.ts";
```
