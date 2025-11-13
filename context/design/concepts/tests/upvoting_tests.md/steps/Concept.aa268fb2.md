---
timestamp: 'Fri Oct 17 2025 14:56:07 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251017_145607.5599a42f.md]]'
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
