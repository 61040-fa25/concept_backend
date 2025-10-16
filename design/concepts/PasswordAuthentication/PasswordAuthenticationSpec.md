
# add a query action _getAllUsers to the below concept as done for **concept**: Leaderboard
- **purpose**: To rank players based on scores they achieve.
- **principle**: If multiple players submit scores, the leaderboard will reflect their rankings, with the highest scores appearing first.
- **state**:
    
    ```
    a set of Players with
      a name String
    
    a set of Scores with
      a player Player
      a value Number
      a submittedAt Date
    ```
    
- **actions**:
    - `createPlayer (name: String): (player: Player)`
        - **requires**: A player with the given name does not already exist.
        - **effects**: A new player is created with the given name and a unique ID. Returns the new player's ID.
    - `submitScore (player: Player, value: Number): (score: Score)`
        - **requires**: The player with the given ID exists.
        - **effects**: A new score is recorded for the player with the given value and the current timestamp. Returns the new score's ID.
- **queries**:
    - `_getPlayerScores (player: Player): (scores: Score[])`
        - **effects**: Returns a list of all scores submitted by the specified player.
    - `_getTopScores (limit: Number): (scores: Score[])`
        - **effects**: Returns a list of the top scores across all players, sorted from highest to lowest, up to the given limit.
    - `_getScoresSince (date: Date): (scores: Score[])`
        - **effects**: Returns a list of all scores submitted at or after the given date.
concept PasswordAuthentication [User]
* **purpose** limit access to verified users
* **principle** a user must register with a string username and password and subsequent attempts to login is authenticated by matching the ensuring a user exists with the exact username and password
* **state**
    * a set of **Users** with
        * `username` **String**
        * `password` **String**
* **actions**
    * `register (username: String, password: String): (user: User)`
        * **requires** `username` not in **Users** and length of username >= 8
        * **effect** adds username and password and associates it with User user
    * `authenticate (username: String, password: String): (user: User)`
        * **requires** username exists
        * **effect** returns the user if `password` matches the one associated with username, otherwise Error


    
# response:


concept PasswordAuthentication [User]

- **purpose** limit access to verified users
- **principle** a user must register with a string username and password and subsequent attempts to login is authenticated by matching the ensuring a user exists with the exact username and password
- **state**
  * a set of **Users** with
    * `username` **String**
    * `password` **String**
- **actions**
  * `register (username: String, password: String): (user: User)`
    * **requires** `username` not in **Users** and length of username  and password >= 8
    * **effect** adds username and password and associates it with User user
  * `authenticate (username: String, password: String): (user: User)`
    * **requires** username exists
    * **effect** returns the user if `password` matches the one associated with username, otherwise Error
- **queries**
  * `_getAllUsers (): (users: User[])`
    * **effects**: Returns a list of all registered users.
