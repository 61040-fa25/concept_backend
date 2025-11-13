---
timestamp: 'Sat Oct 18 2025 17:20:29 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251018_172029.5bc7cbb2.md]]'
content_id: b22c83bd81ca2a1bf07d672a0f5476948cc1c2c60f00976801557c348bb5cb36
---

# file: src/concepts/TaggingConcept.ts

```typescript
import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

// Declare collection prefix, use concept name
const PREFIX = "Tagging" + ".";

// Generic types of this concept
type User = ID;
type Book = ID;

// internal ID for a Tag instance
type Tag = ID;

/**
 * a set of Tags with
 *  a label String
 *  an book Book
 *  a user User
 *  a private Flag
 */
interface TagDocument {
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
  private tags: Collection<TagDocument>;

  constructor(private readonly db: Db) {
    this.tags = this.db.collection(PREFIX + "tags");
  }

  /**
   * addTag (user: User, label: String, book: Book): (tag: Tag)
   *
   * **requires** no Tag by user associating book with label already exists
   *
   * **effects** creates Tag by user associating book with label; returns new tag's ID
   */
  async addTag({ user, label, book }: {
    user: User;
    label: string;
    book: Book;
  }): Promise<{ tag: Tag } | { error: string }> {
    // Check if a tag by this user, label, and book already exists
    const existingTag = await this.tags.findOne({ user, label, book });
    if (existingTag) {
      return { error: "Tag by user for this book and label already exists." };
    }

    const newTagId = freshID();
    const newTag: TagDocument = {
      _id: newTagId,
      user,
      label,
      book,
      private: false, // Default to public
    };

    await this.tags.insertOne(newTag);
    return { tag: newTagId };
  }

  /**
   * removeTag (tag: Tag): Empty
   *
   * **effects** deletes tag from Tag set
   */
  async removeTag({ tag }: { tag: Tag }): Promise<Empty | { error: string }> {
    const result = await this.tags.deleteOne({ _id: tag });
    if (result.deletedCount === 0) {
      return { error: "Tag not found." };
    }
    return {};
  }

  /**
   * markPrivate (tag: Tag): Empty
   *
   * **requires** tag's private flag is false
   *
   * **effects** changes tag's private flag to true
   */
  async markPrivate({ tag }: { tag: Tag }): Promise<Empty | { error: string }> {
    const existingTag = await this.tags.findOne({ _id: tag });
    if (!existingTag) {
      return { error: "Tag not found." };
    }
    if (existingTag.private === true) {
      return { error: "Tag is already private." };
    }

    await this.tags.updateOne(
      { _id: tag },
      { $set: { private: true } },
    );
    return {};
  }

  /**
   * markPublic (tag: Tag): Empty
   *
   * **requires** tag's private flag is true
   *
   * **effects** changes tag's private flag to false
   */
  async markPublic({ tag }: { tag: Tag }): Promise<Empty | { error: string }> {
    const existingTag = await this.tags.findOne({ _id: tag });
    if (!existingTag) {
      return { error: "Tag not found." };
    }
    if (existingTag.private === false) {
      return { error: "Tag is already public." };
    }

    await this.tags.updateOne(
      { _id: tag },
      { $set: { private: false } },
    );
    return {};
  }

  /**
   * _getTagsByBook (user: User, book: Book): (tags: TagDocument[])
   *
   * **effects** returns all public tags associated with the given `book`,
   *             along with private tags created by the `user` associated with that `book`.
   */
  async _getTagsByBook({ user, book }: {
    user: User;
    book: Book;
  }): Promise<TagDocument[]> {
    const tags = await this.tags.find({
      book,
      $or: [
        { private: false }, // Public tags
        { user: user, private: true }, // Private tags by the requesting user
      ],
    }).toArray();
    return tags;
  }

  /**
   * _getBooksbyLabel (user: User, labels: string[]): (tags: TagDocument[])
   *
   * **effects** returns all tags matching any of the given `labels`,
   *             including public tags and private tags created by the `user`.
   *             (Returns the tags, from which the books can be derived.)
   */
  async _getBooksbyLabel({ user, labels }: {
    user: User;
    labels: string[];
  }): Promise<TagDocument[]> {
    if (!labels || labels.length === 0) {
      return [];
    }
    const tags = await this.tags.find({
      label: { $in: labels },
      $or: [
        { private: false }, // Public tags
        { user: user, private: true }, // Private tags by the requesting user
      ],
    }).toArray();
    return tags;
  }

  /**
   * _getTagsByUser (user: User): (tags: TagDocument[])
   *
   * **effects** returns all tags created by the specified `user`.
   */
  async _getTagsByUser({ user }: { user: User }): Promise<TagDocument[]> {
    const tags = await this.tags.find({ user }).toArray();
    return tags;
  }

  /**
   * _getAllPublicTags (): (tags: TagDocument[])
   *
   * **effects** returns all public tags in the database.
   */
  async _getAllPublicTags(empty: Empty = {}): Promise<TagDocument[]> {
    // The spec does not have `empty: Empty` as argument, but stub does.
    // Making it optional for consistency with the spirit of the spec.
    const tags = await this.tags.find({ private: false }).toArray();
    return tags;
  }

  /**
   * _getAllTags (): (tags: TagDocument[])
   *
   * **effects** returns all tags in the database, regardless of privacy.
   */
  async _getAllTags(empty: Empty = {}): Promise<TagDocument[]> {
    // The spec does not have `empty: Empty` as argument, but stub does.
    // Making it optional for consistency with the spirit of the spec.
    const tags = await this.tags.find({}).toArray();
    return tags;
  }
}
```
