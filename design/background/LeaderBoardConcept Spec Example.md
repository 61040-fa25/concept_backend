# concept: Leaderboard

[](https://github.com/61040-fa25/mongo-recitation/blob/main/README.md#concept-leaderboard)

- **concept**: Leaderboard
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