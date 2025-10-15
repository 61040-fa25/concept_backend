
--- Starting Friending Concept Tests ---

--- Principle: Users can send friend requests, accept them, and become friends. ---

Action: Alice (user:Alice) sends request to Bob (user:Bob)
Result: { request: "0199e65f-d2d9-7302-9537-e0c42d0f1d70" }

Query: Get received requests for Bob (user:Bob)
Result: { receivedRequests: [ "user:Alice" ] }

Query: Get sent requests for Alice (user:Alice)
Result: { sentRequests: [ "user:Bob" ] }

Action: Bob (user:Bob) accepts request from Alice (user:Alice)
Result: {}

Query: Check if Alice and Bob are friends
Result: { areFriends: [ true ] }

Query: Get friends for Alice (user:Alice)
Result: { friends: [ "user:Bob" ] }

Query: Get friends for Bob (user:Bob)
Result: { friends: [ "user:Alice" ] }

Query: Verify request between Alice and Bob is removed
Result: { receivedRequests: [] }
Result: { sentRequests: [] }

--- Scenario: Denying a friend request ---

Action: Charlie (user:Charlie) sends request to David (user:David)
Result: { request: "0199e65f-d3f7-76fa-80bc-1861012e87a3" }

Action: David (user:David) denies request from Charlie (user:Charlie)
Result: {}

Query: Check if Charlie and David are friends
Result: { areFriends: [ false ] }

Query: Verify request between Charlie and David is removed
Result: { receivedRequests: [] }

--- Scenario: Invalid sendRequest calls ---

Action: Eve (user:Eve) sends request to herself (user:Eve)
Result: { error: "Sender cannot send a friend request to themselves." }

Action: Eve (user:Eve) sends request to Frank (user:Frank)
Result: { request: "0199e65f-d482-7523-b0c3-f46b3610988e" }

Action: Eve (user:Eve) sends request to Frank (user:Frank) again
Result: { error: "A friend request between these users already exists." }

Action: Frank (user:Frank) sends request to Eve (user:Eve)
Result: { error: "A friend request between these users already exists." }

Action: Grace (user:Grace) sends request to Heidi (user:Heidi) to establish friendship for next test
Action: Heidi (user:Heidi) accepts request from Grace (user:Grace)

Query: Verify Grace and Heidi are friends
Result: { areFriends: [ true ] }

Action: Grace (user:Grace) sends request to Heidi (user:Heidi) when they are already friends
Result: { error: "Users are already friends." }

--- Scenario: Invalid accept/denyRequest calls ---

Action: Ivan (user:Ivan) tries to accept request from Frank (user:Frank) when no request exists
Result: { error: "Friend request does not exist." }

Action: Ivan (user:Ivan) tries to deny request from Frank (user:Frank) when no request exists
Result: { error: "Friend request does not exist." }

--- Scenario: Removing an existing friendship ---

Query: Verify Grace and Heidi are friends (from previous test)
Result: { areFriends: [ true ] }

Action: Grace (user:Grace) removes Heidi (user:Heidi) as friend
Result: {}

Query: Check if Grace and Heidi are friends after removal
Result: { areFriends: [ false ] }

Action: Grace (user:Grace) tries to remove Heidi (user:Heidi) again
Result: { error: "Friendship does not exist." }

--- Scenario: Complex query validation with multiple relationships ---

Action: UserX sends request to UserY
Action: UserY accepts request from UserX

Action: UserX sends request to UserZ
Action: UserZ accepts request from UserX

Action: UserX sends request to UserW
Action: UserA sends request to UserX

Query: Get friends for UserX (user:UserX)
Result: { friends: [ "user:UserY", "user:UserZ" ] }

Query: Get sent requests for UserX (user:UserX)
Result: { sentRequests: [ "user:UserW" ] }

Query: Get received requests for UserX (user:UserX)
Result: { receivedRequests: [ "user:UserA" ] }

Query: Check if UserY and UserX are friends
Result: { areFriends: [ true ] }

--- Friending Concept Tests Complete ---
