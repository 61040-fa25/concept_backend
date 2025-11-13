---
timestamp: 'Tue Oct 28 2025 21:20:58 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251028_212058.7f1d6c88.md]]'
content_id: 0e02d7e4af06b0924c89fe4fe3333cd28c0bcc1bb384fa92091c18419a6b4831
---

# file: src\concepts\Shelving\Shelving.ts

```typescript
import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";


// Declare collection prefix, use concept name
const PREFIX = "Shelving" + ".";

// Generic types of this concept
type User = ID;
type Book = ID;


//internal ids
type Shelf = ID;

/**
 * a set of Tags with
 *  a label String
 *  an book Book
 *  a user User
 *  a private Flag
 */
interface Shelves {
  _id: Shelf;
  user: User;
  status: 0|1|2|3;
  book: Book;
}


/**
 * @concept Shelving
 * @purpose to label books to assist in searching and organization
 */
export default class ShelvingConcept {
    private shelves: Collection<Shelves>;


    constructor(private readonly db: Db) {
        this.shelves = this.db.collection(PREFIX + "Shelving");
    }


    /**
     * Adds a book to the given shelf
     * @requires book is not on any of the user's shelves
     * @effects adds book to the shelf specified, 0 means want to read, 1 means currently reading, 2 means read, 3 means did not finish
     */
    async addBook({ user, status, book }: { user: User; status: 0|1|2|3; book: Book}): Promise<{shelf: Shelf}|{error: string}> {
        const existingShelf = await this.shelves.findOne({user, book});
        if(existingShelf != null)
            return {error: `book already added`};

        const shelfID = freshID() as Shelf;
        await this.shelves.insertOne({
            _id: shelfID,
            user,
            status,
            book,
        });

        return {shelf: shelfID};
    }

    /**
     * Removes a book from the given shelf
     * @requires book is on a shelf
     * @effects removes book from shelf
     */
    async removeBook({ shelf }: { shelf: Shelf}): Promise<Empty|{error: string}> {
        const existingShelf = await this.shelves.findOne({_id: shelf});
        if(existingShelf == null)
            return {error: `book doesn't exist`};

        await this.shelves.deleteOne({_id: shelf});
        return {};
    }


    /**
     * Moves book to a different shelf
     * @requires book is on a shelf
     * @effects moves book to the shelf specified by the user
     */
    async changeStatus({ shelf, newStatus }: { shelf: Shelf, newStatus: 0|1|2|3}): Promise<Empty|{error: string}> {
        const existingShelf = await this.shelves.findOne({_id: shelf});
        if(existingShelf == null)
            return {error: `book doesn't exist`};

        await this.shelves.updateOne({_id: shelf }, { $set: { status: newStatus } });
        return {};
    }




    /**
     * returns status user added to book
     */
    async _getUserShelfByBook({ user, book }: {user: User; book: Book}): Promise<number[]> {
        return (await this.shelves.find({user, book}).toArray()).map(shelf => shelf.status);
    }

    /**
     * returns all Shelves added to book, grouped by status
     */
    async _getShelvesByBook({ book }: { book: Book}): Promise<{status: number, shelves: Shelves[]}[]> {
        const shelves = await this.shelves.find({book}).toArray();
        const groupedShelves = [
            {status: 0, shelves: new Array<Shelves>},
            {status: 1, shelves: new Array<Shelves>},
            {status: 2, shelves: new Array<Shelves>},
            {status: 3, shelves: new Array<Shelves>}
        ];

        for (const shelf of shelves){
            const n = shelf.status;
            groupedShelves[n].shelves.push(shelf);
        }

        return groupedShelves;
    }

    /**
     * returns all books user has shelved, grouped by status
     */
    async _getBooksByUser({ user }: {user: User}): Promise<{status: number, shelves: Book[]}[]> {
        const shelves = await this.shelves.find({user}).toArray();
        const groupedShelves = [
            {status: 0, shelves: new Array<Book>},
            {status: 1, shelves: new Array<Book>},
            {status: 2, shelves: new Array<Book>},
            {status: 3, shelves: new Array<Book>}
        ];

        for (const shelf of shelves){
            const n = shelf.status;
            groupedShelves[n].shelves.push(shelf.book);
        }

        return groupedShelves;
    }


    /**
     * returns all Shelves in set, grouped by status
     */
    async _getAllShelves(empty: Empty): Promise<{status: number, shelves: Shelves[]}[]> {
        const shelves = await this.shelves.find({}).toArray();
        const groupedShelves = [
            {status: 0, shelves: new Array<Shelves>},
            {status: 1, shelves: new Array<Shelves>},
            {status: 2, shelves: new Array<Shelves>},
            {status: 3, shelves: new Array<Shelves>}
        ];

        for (const shelf of shelves){
            const n = shelf.status;
            groupedShelves[n].shelves.push(shelf);
        }

        return groupedShelves;
    }

}

```
