---
timestamp: 'Sun Oct 19 2025 10:53:29 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251019_105329.577e40b7.md]]'
content_id: ffa754144f6719bd44dec776c964097a207d7d54b47b1536bc3c6bdc591b4155
---

# file: src\concepts\skrib\Tagging.ts

```typescript
import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";


// Declare collection prefix, use concept name
const PREFIX = "Tagging" + ".";

// Generic types of this concept
type User = ID;
type Book = ID;


//internal ids
type Tag = ID;

/**
 * a set of Tags with
 *  a label String
 *  an book Book
 *  a user User
 *  a private Flag
 */
interface Tags {
  _id: Tag;
  user: User;
  label: string;
  book: Book;
  private: boolean;
}


/**
 * @concept Tagging
 * @purpose to label books to assist in searching and organization
 */
export default class TaggingConcept {
    private tags: Collection<Tags>;


    constructor(private readonly db: Db) {
        this.tags = this.db.collection(PREFIX + "tags");
    }


    /**
     * Adds a tag to a book
     * @requires no user tag with label already associated with book
     * @effects adds a tag from user with label associated with book to Tags set; default is public (private is false)
     */
    async addTag({ user, label, book }: { user: User; label: string; book: Book}): Promise<{tag: Tag}|{error: string}> {
        const existingTag = await this.tags.findOne({user, label, book});
        if(existingTag != null)
            return {error: `tag already added`};

        const tagID = freshID() as Tag;
        await this.tags.insertOne({
            _id: tagID,
            user,
            label,
            book,
            private: false
        });

        return {tag: tagID};
    }

    /**
     * Removes a tag from a book
     * @requires tag exists
     * @effects removes tag from Tags set
     */
    async removeTag({ tag }: { tag: Tag}): Promise<Empty|{error: string}> {
        const existingTag = await this.tags.findOne({_id: tag});
        if(existingTag == null)
            return {error: `tag doesn't exist`};

        await this.tags.deleteOne({_id: tag});
        console.log(`tag: ${tag}`);
        return {};
    }

    /**
     * Marks a tag as private (only searchable to user)
     * @requires tag exists
     * @effects sets private flag to true
     */
    async markPrivate({ tag }: { tag: Tag}): Promise<Empty|{error: string}> {
        const existingTag = await this.tags.findOne({_id: tag});
        if(existingTag == null)
            return {error: `tag doesn't exist`};

        await this.tags.updateOne({_id: tag }, { $set: { private: true } });
        return {};
        // throw new Error("not implemented");
    }

    /**
     * Marks a tag as public (searchable to all)
     * @requires tag exists
     * @effects sets private flag to false
     */
    async markPublic({ tag }: { tag: Tag}): Promise<Empty|{error: string}> {
        const existingTag = await this.tags.findOne({_id: tag});
        if(existingTag == null)
            return {error: `tag doesn't exist`};

        await this.tags.updateOne({_id: tag }, { $set: { private: false } });
        return {};
        // throw new Error("not implemented");
    }


    /**
     * returns all public tags associated with book along with
     * private tags created by user associated with book
     */
    async _getTagsByBook({ user, book }: {user: User; book: Book}): Promise<Tags[]> {
        const tags = this.tags.find({book}).toArray();
        return (await tags).filter((x) => (!x.private || x.user == user));
        // throw new Error("not implemented");
    }

    /**
     * returns all labels of public tags associated with book along with
     * private tags created by user associated with book.
     */
    async _getLabelsByBook({ user, book }: {user: User; book: Book}): Promise<{label: string, count: number}[]> {
        const tags = await this._getTagsByBook({user, book});
        const labels = new Map<string, number>();
        for(const tag of tags){
            labels.set(tag.label, (labels.get(tag.label) || 0) + 1);
        }

        const labelsArray = [];

        for (const label of labels.entries()){
            labelsArray.push({
                label: label[0],
                count: label[1]
            })
        }
        return labelsArray.sort((a, b) => b.count - a.count);
    }

    /**
     * returns all books with every one of the labels in labels, including labels of private tags by user
     */
    async _getBooksByLabel({ user, labels, type }: {user: User; labels: string[]; type: 'intersect'|'union'}): Promise<{book: Book, tagCount: number}[]> {
        const tags = (await this._getAllTags({}))
        .filter((x) => (!x.private || x.user == user));

        const availableBooks = new Set(tags.map((t) => (t.book)));
        const books = []

        // console.log(availableBooks);
        for (const book of availableBooks){

            const bookLabels = (await this._getLabelsByBook({user, book})).map((l) => l.label);
            // console.log(bookLabels);
            if (type == 'intersect' && this.labelSubSet(labels, bookLabels)){
                // console.log(`book: ${book}, intersect`);
                books.push({book, tagCount: labels.length});
            }
            if (type == 'union'){
                const numMatchingTags = this.hasAtLeastOneLabel(bookLabels, labels);
                // console.log(`book: ${book}, union`);
                if (numMatchingTags)
                    books.push({book, tagCount: numMatchingTags});
            }
        }

        return books.sort((a, b) => b.tagCount - a.tagCount);
    }

    /**
     * returns all tags created by user
     */
    async _getTagsByUser({ user }: {user: User}): Promise<Tags[]> {
        const tags = await this.tags.find({user}).toArray();
        return tags;
        // throw new Error("not implemented");
    }

    /**
     * returns all labels created by user
     */
    async _getLabelsByUser({ user }: {user: User}): Promise<{label: string, count: number}[]> {
        const tags = await this._getTagsByUser({user});
        const labels = new Map<string, number>();
        for(const tag of tags){
            labels.set(tag.label, (labels.get(tag.label) || 0) + 1);
        }
        const labelsArray = [];

        for (const label of labels.entries()){
            labelsArray.push({
                label: label[0],
                count: label[1]
            })
        }
        return labelsArray.sort((a, b) => b.count - a.count);

        // throw new Error("not implemented");
    }

    /**
     * returns all public tags in database
     */
    async _getAllPublicTags(empty: Empty): Promise<Tags[]> {
        return await this.tags.find({private: false}).toArray();
        // throw new Error("not implemented");
    }

    /**
     * returns all tags in database
     */
    async _getAllTags(empty: Empty): Promise<Tags[]> {
        return await this.tags.find({}).toArray();
        // throw new Error("not implemented");
    }



    private labelSubSet(subSet: string[], superSet: string[]): boolean{
        for (const label of subSet){
            if (!superSet.includes(label))
                return false;
        }
        return true;
    }

    private hasAtLeastOneLabel(subSet: string[], mainSet: string[]): number{
        let count = 0;
        for (const label of subSet){
            if (mainSet.includes(label))
                count ++;
        }
        return count;
    }
}

```
