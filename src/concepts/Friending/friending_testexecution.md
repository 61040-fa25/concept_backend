
--- Operational Principle Test ---
Action: user:Alice sends request to user:Bob
Action: user:Bob accepts request from user:Alice
Action: user:Alice removes user:Bob as friend

--- Scenario 1: Denying a Request ---
Action: user:Alice sends request to user:Bob
Action: user:Bob denies request from user:Alice

--- Scenario 2: Invalid Request Attempts ---
Action: user:Alice attempts to send request to user:Alice
Action: user:Charlie sends request to user:David
Action: user:Charlie attempts to send duplicate request to user:David
Action: user:David attempts to send request to user:Charlie (reverse while pending)
Action: user:David accepts request from user:Charlie
Action: user:Charlie attempts to send request to existing friend user:David

--- Scenario 3: Attempts on Non-existent Requests/Friendships ---
Action: user:Alice attempts to accept non-existent request from user:Charlie
Action: user:Alice attempts to deny non-existent request from user:Charlie
Action: user:Alice attempts to remove non-existent friend user:Charlie

--- Scenario 4: Multiple Friends ---
Action: user:Alice sends request to user:Bob
Action: user:Bob accepts request from user:Alice
Action: user:Alice sends request to user:Charlie
Action: user:Charlie accepts request from user:Alice





