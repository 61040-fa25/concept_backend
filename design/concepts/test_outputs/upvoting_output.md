Check file:///C:/Users/Akosua/Documents/6.104/skrib/src/concepts/skrib/Upvoting.test.ts

running 1 test from ./src/concepts/skrib/Upvoting.test.ts

UpvotingConcept: Action and Principle Tests ...

  upvote: successfully adds a vote ...

------- output -------


--- Test: upvote: successfully adds a vote ---

Initial votes: 0

User user:Alice upvoted item:Post1. Result: {}

Votes for item:Post1: [\{"_id":"0199fdb8-ddc2-755d-9904-5ab822df5e16","user":"user:Alice","target":"item:Post1"\}]

Votes by user:Alice: [\{"_id":"0199fdb8-ddc2-755d-9904-5ab822df5e16","user":"user:Alice","target":"item:Post1"\}]

----- output end -----

  upvote: successfully adds a vote ... ok (107ms)

  upvote: requires no existing vote by user for item ...

------- output -------



--- Test: upvote: requires no existing vote by user for item ---

User user:Alice tried to upvote item:Post1 again. Result: {"error":"User user:Alice has already upvoted item:Post1"}

Votes for item:Post1 after failed attempt: [{"_id":"0199fdb8-ddc2-755d-9904-5ab822df5e16","user":"user:Alice","target":"item:Post1"}]

----- output end -----

  upvote: requires no existing vote by user for item ... ok (32ms)

  unvote: successfully removes a vote ...

------- output -------


--- Test: unvote: successfully removes a vote ---

Pre-unvote votes for item:Post1: [{"_id":"0199fdb8-ddc2-755d-9904-5ab822df5e16","user":"user:Alice","target":"item:Post1"}]

User user:Alice unvoted item:Post1. Result: {}

Post-unvote votes for item:Post1: []

Votes by user:Alice after unvote: []

----- output end -----

  unvote: successfully removes a vote ... ok (80ms)

  unvote: requires a vote by user for item exists ...

------- output -------


--- Test: unvote: requires a vote by user for item exists ---

User user:Alice tried to unvote item:Post2 (no vote). Result: {"error":"User user:Alice hasn't upvoted item:Post2"}

Votes for item:Post2 after failed attempt: []

----- output end -----

  unvote: requires a vote by user for item exists ... ok (30ms)

  Principle: Various users upvote items. Those items can then be ranked by number of votes. ...

------- output -------


--- Principle Test: Ranking Items by Popularity ---

Action: user:Alice upvotes item:Post1

Current votes: item:Post1 (1), item:Post2 (0)

Action: user:Bob upvotes item:Post1

Current votes: item:Post1 (2), item:Post2 (0)

Action: user:Alice upvotes item:Post2

Current votes: item:Post1 (2), item:Post2 (1)

Action: user:Bob upvotes item:Post2

Current votes: item:Post1 (2), item:Post2 (2)

Action: user:Charlie upvotes item:Post1

Current votes: item:Post1 (3), item:Post2 (2)



Verification: Check item popularity for ranking.

Item item:Post1 has 3 votes.

Item item:Post2 has 2 votes.

Item item:Comment3 has 0 votes.

Principle demonstrated: Items can be ranked by the number of upvotes.

----- output end -----

  Principle: Various users upvote items. Those items can then be ranked by number of votes. ... ok (888ms)

UpvotingConcept: Action and Principle Tests ... ok (1s)



ok | 1 passed (5 steps) | 0 failed (1s)
