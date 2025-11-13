# Concept: Upvote [User, Item]

Purpose: rank items by popularity

Principle: Various users upvote items. Those items can then be ranked by number of votes.

State:

    a set of Votes with
      a target Item
      a user User

Actions:

    upvote (user: User, item: Item):
      requires: no vote by user for item
      effects: adds vote by user for item to Votes set

    unvote (user: User, item: Item)
      requires: a vote by user for item exists
      effects: removes said vote from Votes set

Queries:

    _getUpvotessByUser(user: User)
      effects: returns all upvotes from user

    _getUpvotessByItem(item: Item)
      effects: returns all upvotes on item

    _getAllUpvotes()
      effects: returns all upvotes in set
