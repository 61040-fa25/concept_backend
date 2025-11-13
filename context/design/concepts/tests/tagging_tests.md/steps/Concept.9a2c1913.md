---
timestamp: 'Sat Oct 18 2025 17:19:28 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251018_171928.517f74ba.md]]'
content_id: 9a2c1913d301205cb690bbb610723d5c8710d5cef8d0b0e13d35378fea0ffe4a
---

# Concept: Tag \[User, Book]

**Purpose**: label books to assist in searching and organization

**Principle**: Various users add tags to books. Then, those books can be displayed in groups by shared tag and users can search for books with a specific tag.

**State**:

a set of Tags with
a label String
an book Book
a user User
a private Flag

**Actions**:

addTag (user: User, label: String, book: Book): (tag: Tag)
requires: no Tag by user associating book with label
effects: creates Tag by user associating book with label

removeTag (tag: Tag)
effects: deletes tag from Tag set

markPrivate (tag: Tag)
requires: tag's private flag is false
effects: changes tag's private flag to true

markPublic (tag: Tag)
requires: tag's private flag is true
effects: changes tag's private flag to false

**Queries**:

\_getTagsByBook(user: User, book: Book)

\_getBooksbyLabel(user: User, label: String)

\_getTagsByUser(user: User)

\_getAllTags()
