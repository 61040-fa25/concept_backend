---
timestamp: 'Sat Oct 18 2025 17:03:35 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251018_170335.92cdfd87.md]]'
content_id: aa268fb2d9421305ff36ad39a1c14a250aeb489677c776930a5ccdc82c347c86
---

# Concept: Upvote \[User, Item]

Purpose: rank items by popularity

Principle: Various users upvote items. Those items can then be ranked by number of votes.

State:

```
a set of Votes with
  a target Item
  a user User
```

actions:

```
upvote (user: User, item: Item):
  requires: no vote by user for item
  effects: adds vote by user for item to Votes set

unvote (user: User, item: Item)
  requires: a vote by user for item exists
  effects: removes said vote from Votes set
```
