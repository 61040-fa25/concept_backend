Check file:///C:/Users/Akosua/Documents/6.104/skrib/src/concepts/skrib/Tagging.test.ts

running 17 tests from ./src/concepts/skrib/Tagging.test.ts

TaggingConcept: Add Tag - success ...

------- output -------

--- Test: Add Tag - success ---

User user:Alice adding tag 'dystopian' to book book:1984

Successfully added tag 0199fdb8-1258-7e0d-bac4-0ce6c0cc392b.

----- output end -----

TaggingConcept: Add Tag - success ... ok (560ms)

TaggingConcept: Add Tag - requires (duplicate) ...

------- output -------

--- Test: Add Tag - requires (duplicate) ---

Initial tag 0199fdb8-1489-7154-9178-36d680a3e9e9 added.

User user:Alice trying to add duplicate tag 'fantasy' to book book:Dune

Duplicate tag attempt correctly failed.

----- output end -----

TaggingConcept: Add Tag - requires (duplicate) ... ok (587ms)

TaggingConcept: Remove Tag - success ...

------- output -------

--- Test: Remove Tag - success ---

Tag 0199fdb8-16d4-7359-94c5-c11af36c6884 added for removal test.

Removing tag 0199fdb8-16d4-7359-94c5-c11af36c6884

tag: 0199fdb8-16d4-7359-94c5-c11af36c6884

Tag 0199fdb8-16d4-7359-94c5-c11af36c6884 successfully removed.

----- output end -----

TaggingConcept: Remove Tag - success ... ok (616ms)

TaggingConcept: Remove Tag - non-existent ...

------- output -------

--- Test: Remove Tag - non-existent ---

Attempting to remove non-existent tag tag:nonexistent

Removal of non-existent tag correctly failed.

----- output end -----

TaggingConcept: Remove Tag - non-existent ... ok (507ms)

TaggingConcept: Mark Private - success ...

------- output -------

--- Test: Mark Private - success ---

Tag 0199fdb8-1b38-7f74-a93b-ce60fabc43dd added and is initially public.

Marking tag 0199fdb8-1b38-7f74-a93b-ce60fabc43dd private.

Tag 0199fdb8-1b38-7f74-a93b-ce60fabc43dd successfully marked private.

----- output end -----

TaggingConcept: Mark Private - success ... ok (578ms)

TaggingConcept: Mark Private - requires (already private) ...

------- output -------

--- Test: Mark Private - requires (already private) ---

Tag 0199fdb8-1d79-7107-ba4d-b13e4d2833cd initially marked private.

Attempting to mark tag 0199fdb8-1d79-7107-ba4d-b13e4d2833cd private again.

Tag 0199fdb8-1d79-7107-ba4d-b13e4d2833cd successfully marked private.

----- output end -----

TaggingConcept: Mark Private - requires (already private) ... ok (566ms)

TaggingConcept: Mark Public - success ...

------- output -------

--- Test: Mark Public - success ---

Tag 0199fdb8-1fb1-7cd2-a1a9-ca0fff3aff1e initially marked private.

Marking tag 0199fdb8-1fb1-7cd2-a1a9-ca0fff3aff1e public.

Tag 0199fdb8-1fb1-7cd2-a1a9-ca0fff3aff1e successfully marked public.

----- output end -----

TaggingConcept: Mark Public - success ... ok (592ms)

TaggingConcept: Mark Public - requires (already public) ...

------- output -------

--- Test: Mark Public - requires (already public) ---

Tag 0199fdb8-21ff-7e1a-b1e5-6fa1e5b423d5 initially public.

Attempting to mark tag 0199fdb8-21ff-7e1a-b1e5-6fa1e5b423d5 public again.

Tag 0199fdb8-21ff-7e1a-b1e5-6fa1e5b423d5 successfully marked public.

----- output end -----

TaggingConcept: Mark Public - requires (already public) ... ok (569ms)

TaggingConcept: Mark Private/Public - non-existent tag ...

------- output -------

--- Test: Mark Private/Public - non-existent tag ---

Attempting to mark non-existent tag tag:nonexistent private.

Attempting to mark non-existent tag tag:nonexistent public.

Marking non-existent tag private/public correctly failed.

----- output end -----

TaggingConcept: Mark Private/Public - non-existent tag ... ok (396ms)

TaggingConcept: Query _getTagsByBook ...

------- output -------

--- Test: Query _getTagsByBook ---

Tags added: 2 public on bookX, 1 private on bookX (by userA), 1 public on bookY.

User user:Alice querying tags for book book:1984

User user:Bob querying tags for book book:1984

User user:Alice querying tags for book book:Dune

Query _getTagsByBook tests passed.

----- output end -----

TaggingConcept: Query _getTagsByBook ... ok (662ms)

TaggingConcept: Query _getBooksbyLabel ...

------- output -------

--- Test: Query _getBooksbyLabel ---

Tags added: bookX has sci-fi (A), fantasy (B). bookY has sci-fi (B). bookZ has personal_sci-fi (A, private).

User user:Alice searching for label 'sci-fi'

User user:Bob searching for label 'sci-fi'

User user:Alice searching for label 'personal_sci-fi'

User user:Bob searching for label 'personal_sci-fi'

User user:Alice searching for labels 'sci-fi', 'fantasy', 'personal_sci-fi'

Query _getBooksbyLabel tests passed.

----- output end -----

TaggingConcept: Query _getBooksbyLabel ... ok (959ms)

TaggingConcept: Query _getTagsByUser ...

------- output -------

--- Test: Query _getTagsByUser ---

Tags added: userA has 2 public, 1 private. userB has 1 public.

User user:Alice querying their own tags

User user:Bob querying their own tags

Querying tags for non-existent user 'user:Charlie'

Query _getTagsByUser tests passed.

----- output end -----

TaggingConcept: Query _getTagsByUser ... ok (597ms)

TaggingConcept: Query _getAllPublicTags ...

------- output -------

--- Test: Query _getAllPublicTags ---

Tags added: 2 public, 1 private.

Getting all public tags.

Query _getAllPublicTags tests passed.

----- output end -----

TaggingConcept: Query _getAllPublicTags ... ok (582ms)

TaggingConcept: Query _getAllTags ...

------- output -------

--- Test: Query _getAllTags ---

Tags added: 2 public, 1 private.

Getting all tags (public and private).

Query _getAllTags tests passed.

----- output end -----

TaggingConcept: Query _getAllTags ... ok (630ms)

TaggingConcept: Query _getLabelsByUser ...

------- output -------

--- Test: Query _getLabelsByUser ---

User user:Alice added: 'sci-fi' (bookX), 'fantasy' (bookY), 'sci-fi' (bookZ), 'personal_note' (bookW, private).

User user:Bob added: 'adventure' (bookX).



Querying labels for User user:Alice

Labels for User user:Alice: [

  { label: "sci-fi", count: 2 },

  { label: "fantasy", count: 1 },

  { label: "personal_note", count: 1 }

]



Querying labels for User user:Bob

Labels for User user:Bob: [ { label: "adventure", count: 1 } ]



Querying labels for User user:Charlie (no tags)

Labels for User user:Charlie: []

Query _getLabelsByUser tests passed.

----- output end -----

TaggingConcept: Query _getLabelsByUser ... ok (691ms)

TaggingConcept: Query _getLabelsByBook ...

------- output -------

--- Test: Query _getLabelsByBook ---

Book book:1984 tags: UserA: 'classic', 'fiction', 'private_review' (private); UserB: 'classic'.

Book book:Dune tags: UserB: 'mystery'.



Querying labels for Book book:1984 as User user:Alice

Labels for Book book:1984 (as User user:Alice): [

  { label: "classic", count: 2 },

  { label: "fiction", count: 1 },

  { label: "private_review", count: 1 }

]



Querying labels for Book book:1984 as User user:Bob

Labels for Book book:1984 (as User user:Bob): [ { label: "classic", count: 2 }, { label: "fiction", count: 1 } ]



Querying labels for Book book:Solaris (no tags) as User user:Alice

Labels for Book book:Solaris (as User user:Alice): []

Query _getLabelsByBook tests passed.

----- output end -----

TaggingConcept: Query _getLabelsByBook ... ok (691ms)

TaggingConcept: Principle Trace ...

------- output -------

--- Principle Trace: Label books to assist in searching and organization ---



Trace Step 1: Users add tags to books.

User user:Alice added 'classic' to book:MobyDick, 'sci-fi' to book:Foundation, 'private_note' to book:1984 (private).

User user:Bob added 'adventure' to book:MobyDick, 'dystopian' to book:1984.

All tags in DB:  [

  "user:Alice tags book:MobyDick with classic (private: false)",

  "user:Alice tags book:Foundation with sci-fi (private: false)",

  "user:Bob tags book:MobyDick with adventure (private: false)",

  "user:Bob tags book:1984 with dystopian (private: false)",

  "user:Alice tags book:1984 with private_note (private: true)"

]



Trace Step 2: Books displayed in groups by shared tag.



Displaying books with 'classic' tag (public search):

Found 1 book(s) with 'classic' tag: [object Object]



Displaying books with 'adventure' tag (public search):

Found 1 book(s) with 'adventure' tag: [object Object]



Trace Step 3: Users search for books with a specific tag.



User user:Alice searches for 'sci-fi':

User user:Alice found 1 book(s) with 'sci-fi': [object Object]



User user:Bob searches for 'dystopian':

User user:Bob found 1 book(s) with 'dystopian': [object Object]



User user:Alice searches for their private tag 'private_note':

User user:Alice found 1 book(s) with 'private_note': [object Object]



User user:Bob tries to search for User user:Alice's private tag 'private_note':

User user:Bob found 0 book(s) with 'private_note'.



User user:Alice views all tags on book:1984 (should see their private tag):

User user:Alice sees tags: dystopian, private_note on book:1984.



User user:Bob views all tags on book:1984 (should NOT see User1's private tag):

User user:Bob sees tags: dystopian on book:1984.



Principle Trace complete and verified.

----- output end -----

TaggingConcept: Principle Trace ... ok (1s)



ok | 17 passed | 0 failed (10s)
