Check file:///C:/Users/Akosua/Documents/6.104/skrib/src/concepts/skrib/Commenting.test.ts

running 9 tests from ./src/concepts/skrib/Commenting.test.ts

Action: createComment - Successfully creates a comment ...

------- output -------

This is commentingConcept: [object Object]

--- Test: createComment ---

Initial comment count: 0

Created comment with ID: 0199fdb6-c324-7fb7-a877-2e46fab5a863

Comment creation verified successfully.

----- output end -----

Action: createComment - Successfully creates a comment ... ok (551ms)

Action: editComment - Successfully edits an existing comment ...

------- output -------

This is commentingConcept: [object Object]

--- Test: editComment ---

Created comment with ID: 0199fdb6-c51a-77cb-9665-4d82ad674a83, body: "Original comment body."

Edited comment ID: 0199fdb6-c51a-77cb-9665-4d82ad674a83 with new body: "Updated comment body."

Comment edit verified successfully.

----- output end -----

Action: editComment - Successfully edits an existing comment ... ok (524ms)

Action: editComment - Fails to edit a non-existent comment ...

------- output -------

This is commentingConcept: [object Object]

--- Test: editComment (non-existent) ---

Attempted to edit non-existent comment, error returned as expected.

----- output end -----

Action: editComment - Fails to edit a non-existent comment ... ok (375ms)

Action: deleteComment - Successfully deletes an existing comment ...

------- output -------

This is commentingConcept: [object Object]

--- Test: deleteComment ---

Created comment with ID: 0199fdb6-c85a-7b62-bb63-9e6f8c246ce1

Deleted comment with ID: 0199fdb6-c85a-7b62-bb63-9e6f8c246ce1

Comment deletion verified successfully.

----- output end -----

Action: deleteComment - Successfully deletes an existing comment ... ok (643ms)

Action: deleteComment - Fails to delete a non-existent comment ...

------- output -------

This is commentingConcept: [object Object]

--- Test: deleteComment (non-existent) ---

Attempted to delete non-existent comment, error returned as expected.

----- output end -----

Action: deleteComment - Fails to delete a non-existent comment ... ok (477ms)

Query: _getCommentsByAuthor - Returns comments by a specific author ...

------- output -------

This is commentingConcept: [object Object]

--- Test: _getCommentsByAuthor ---

Created multiple comments by Alice and Bob.

Found 2 comments by Alice.

Found 1 comments by Bob.

Found 0 comments by Charlie (expected 0).

----- output end -----

Query: _getCommentsByAuthor - Returns comments by a specific author ... ok (508ms)

Query: _getCommentsByParent - Returns comments on a specific item ...

------- output -------

This is commentingConcept: [object Object]

--- Test: _getCommentsByParent ---

Created comments on Post1 and Post2.

Found 2 comments on Post1.

Found 1 comments on Post2.

Found 0 comments on non-existent item (expected 0).

----- output end -----

Query: _getCommentsByParent - Returns comments on a specific item ... ok (565ms)

Query: _getAllComments - Returns all comments in the database ...

------- output -------

This is commentingConcept: [object Object]

--- Test: _getAllComments ---

Created 3 comments.

Found 3 total comments.

----- output end -----

Query: _getAllComments - Returns all comments in the database ... ok (567ms)

Principle Trace: User comments on an item and it becomes publically visible ...

------- output -------

This is commentingConcept: [object Object]

--- Principle Trace ---

User user:Bob views item item:Post1.

User user:Bob creates comment 0199fdb6-d35f-7f01-9d1a-298d6da67d0b on item:Post1 with body: "This is my opinion on the item!".

Verified public visibility via _getAllComments.

Verified linkage to item item:Post1 via _getCommentsByParent.

Verified linkage to user user:Bob via _getCommentsByAuthor.

Principle trace successfully demonstrated: comment created, visible, and linked.

----- output end -----

Principle Trace: User comments on an item and it becomes publically visible ... ok (510ms)



ok | 9 passed | 0 failed (4s)
