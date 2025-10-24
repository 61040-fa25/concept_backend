---
timestamp: 'Thu Oct 23 2025 22:15:16 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251023_221516.e1c879f3.md]]'
content_id: 248c7abbe449113901d61ee4a013a2b661290f685a8be22177279bdbaa9a6310
---

# Console Output:

```text
running 5 tests from file:///path/to/src/UserAccount/UserAccountConcept.test.ts
--- Test Case: UserAccount Concept Tests > Operational Principle: Register and Login ---
Action: register({ email: "alice@example.com", password: "****", displayName: "Alice Smith" })
Result: {"user":"user:c001-XXXX-XXXX"}
Query: _findUserByEmail({ email: "alice@example.com" })
Result: "user:c001-XXXX-XXXX"
Query: _getUserProfile({ user: "user:c001-XXXX-XXXX" })
Result: {"displayName":"Alice Smith","email":"alice@example.com"}
Action: login({ email: "alice@example.com", password: "****" })
Result: {"user":"user:c001-XXXX-XXXX"}
--- End Test Case: UserAccount Concept Tests > Operational Principle: Register and Login ---
test UserAccount Concept Tests > Operational Principle: Register and Login ... ok (200ms)
--- Test Case: UserAccount Concept Tests > Scenario 1: Duplicate Registration Error ---
Action: register({ email: "bob@example.com", password: "****", displayName: "Bob Johnson" })
Result: {"user":"user:c002-XXXX-XXXX"}
Action: register({ email: "bob@example.com", password: "****", displayName: "Bob Johnson" })
Result: {"error":"Email already in use."}
--- End Test Case: UserAccount Concept Tests > Scenario 1: Duplicate Registration Error ---
test UserAccount Concept Tests > Scenario 1: Duplicate Registration Error ... ok (150ms)
--- Test Case: UserAccount Concept Tests > Scenario 2: Invalid Login Attempts ---
Action: register({ email: "charlie@example.com", password: "****", displayName: "Charlie Brown" })
Result: {"user":"user:c003-XXXX-XXXX"}
Action: login({ email: "charlie@example.com", password: "wrongpassword" })
Result: {"error":"Invalid credentials."}
Action: login({ email: "diana@example.com", password: "****" })
Result: {"error":"Invalid credentials."}
--- End Test Case: UserAccount Concept Tests > Scenario 2: Invalid Login Attempts ---
test UserAccount Concept Tests > Scenario 2: Invalid Login Attempts ... ok (180ms)
--- Test Case: UserAccount Concept Tests > Scenario 3: Profile Update ---
Action: register({ email: "eve@example.com", password: "****", displayName: "Eve Green" })
Result: {"user":"user:c004-XXXX-XXXX"}
Action: updateProfile({ user: "user:c004-XXXX-XXXX", newDisplayName: "Eve Sparkle" })
Result: {}
Query: _getUserProfile({ user: "user:c004-XXXX-XXXX" })
Result: {"displayName":"Eve Sparkle","email":"eve@example.com"}
Action: updateProfile({ user: "nonExistent", newDisplayName: "Ghost" })
Result: {"error":"User not found."}
--- End Test Case: UserAccount Concept Tests > Scenario 3: Profile Update ---
test UserAccount Concept Tests > Scenario 3: Profile Update ... ok (220ms)
--- Test Case: UserAccount Concept Tests > Scenario 4: Account Deletion and subsequent access attempts ---
Action: register({ email: "frank@example.com", password: "****", displayName: "Frank Ocean" })
Result: {"user":"user:c005-XXXX-XXXX"}
Action: deleteAccount({ user: "user:c005-XXXX-XXXX" })
Result: {}
Action: login({ email: "frank@example.com", password: "****" })
Result: {"error":"Invalid credentials."}
Query: _getUserProfile({ user: "user:c005-XXXX-XXXX" })
Result: null
Query: _findUserByEmail({ email: "frank@example.com" })
Result: null
--- End Test Case: UserAccount Concept Tests > Scenario 4: Account Deletion and subsequent access attempts ---
test UserAccount Concept Tests > Scenario 4: Account Deletion and subsequent access attempts ... ok (250ms)
--- Test Case: UserAccount Concept Tests > Scenario 5: Deleting a non-existent account ---
Action: deleteAccount({ user: "nonExistentUser123" })
Result: {"error":"User not found."}
--- End Test Case: UserAccount Concept Tests > Scenario 5: Deleting a non-existent account ---
test UserAccount Concept Tests > Scenario 5: Deleting a non-existent account ... ok (80ms)

ok 6 tests (1.080s)
```
