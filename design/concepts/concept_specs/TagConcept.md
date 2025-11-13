**Concept: Tag [User, Book]**

Purpose: label books to assist in searching and organization

Principle: Various users add tags to books. Then, those books can be displayed in groups by shared tag and users can search for books with a specific tag.

State:

    a set of Tags with
      a label String
      an book Book
      a user User
      a private Flag

Actions:

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

Queries:

    _getTagsByBook(user: User, book: Book)
      effects: returns all tags on book

    _getLabelsByBook(user: User, book: Book)
      effects: returns all labels book has been publically tagged with or privately tagged with by user mapped to the number of times that book has been tagged by that label

    _getBooksbyLabel(user: User, labels: String[], type: intersect|union)
      effect: if type is intersect, returns all books tagged with all the labels in labels (including public ones and private ones from user); if type is union returns all books tagged wuth at least one of the labels in labels

    _getTagsByUser(user: User)
      effect: returns all tags from user

    _getLabelsByUser(user: User)
      effect: returns all labels used by user to tag books mapped to number of times they've used that label

    _getAllPublicTags()
      effects: returns all tags in set marked public

    _getAllTags()
      effects: returns all tags in set
