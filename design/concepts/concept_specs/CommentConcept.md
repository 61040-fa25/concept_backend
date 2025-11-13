**Concept: Commenting [User, Item]**

Purpose: allow user to upload content related to a specific item

Principle: A user views an item, a post or another comment, and wants to express an opinion on it. They create and post a comment which is then publically visible and linked to that item

State:

    a set of Comments with
      a body String
      an author User
      a parent Item


Actions:

    create (user: User, body: String, parent: Item):(comment:Comment)
      effects: creates a comment with body by user that's child of parent and adds it to Comments set

    delete (comment: Comment)
      effects: deletes comment from Comments set

    edit (comment: Comment, newBody: String)
        effects: replaces body of comment with newBody


Queries:

    _getCommentssByAuthor(user: User)
      effects: returns comments authored by user

    _getCommentssByParent(parent: Item)
      effects: returns comments authored by user

    _getAllComments()
      effects: returns all posts in set
