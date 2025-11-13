**Concept: Shelving [User, Book]**

Purpose: categorize books based on their read status for each user

Principle: A user will mark a book as 'read', 'reading', 'want to read', or 'did not finish', which they then can view at a later point in time

State:

    a set of Shelves with
      a book Book
      a user User
      a status Number (0 = 'want to read', 1 = 'reading', 2 = 'read', 3 ='did not finish')

Actions:

    addBook (user: User, status: String, book: Book): (shelf: Shelf)
      requires: no Shelf by user for book in set
      effects: creates Shelf by user for book and adds to set

    removeBook (shelf: Shelf)
      effects: deletes readStatus from Shelves set

    changeShelf (shelf: Shelf, newStatus: Number)
      effects: changes the status of shelf to newStatus

Queries:

    _getUserShelfByBook(user: User, book: Book)
      effects: returns status user added to book

    _getShelvesByBook(book: Book)
      effects: returns all Shelves added to book, grouped by status

    _getBooksByUser(user: User)
      effects: returns all books user has shelved, grouped by status

    _getAllShelves()
      effects: returns all Shelves in set, grouped by status
