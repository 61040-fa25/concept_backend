import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";


// Declare collection prefix, use concept name
const PREFIX = "Posting" + ".";

// Generic types of this concept
type User = ID;


//internal ids
type Post = ID;

/**
 * a set of Posts with
 *  a body String
 *  an author User
 */
interface Posts {
  _id: Post;
  author: User;
  body: string;
  date: Date;
}


/**
 * @concept Post
 * @purpose to allow users to upload content, generally to ask for book recommendations
 */
export default class PostingConcept {
  private posts: Collection<Posts>;


  constructor(private readonly db: Db) {
    this.posts = this.db.collection(PREFIX + "posts");
  }


  /**
   * Creates a post
   * @effects creates a post with body by user and adds it to Posts set
   *
   */
  async createPost({ user, body }: { user: User; body: string }): Promise<{post: Post}> {

    const postId = freshID() as Post;
    await this.posts.insertOne({
      _id: postId,
      author: user,
      body,
      date: new Date(),
    });
    return { post: postId };
  }



  /**
   * Deletes a post
   * @requires post exists
   * @effects removes post from Posts set
   */
  async deletePost({ post }: { post: Post;}): Promise<{success: string}|{error: string}> {
    console.log(`post id: ${post}`);
    const existingPost = await this.posts.findOne({ _id: post });
    if (!existingPost) {
      return { error: `Post with ID ${post} not found.` };
    }

    await this.posts.deleteOne({_id: post})
    return {success: "successful deletion"};
  }



  /**
   * Edits an existing post
   * @requires post exists
   * @effects replaces body of post with newBody
   */
  async editPost({ post, newBody }: { post: Post; newBody: string }): Promise<{success:string}|{error: string}> {
    const existingPost = await this.posts.findOne({ _id: post });
    if (!existingPost) {
      return { error: `Post with ID ${post} not found.` };
    }
    await this.posts.updateOne({_id: post }, { $set: { body: newBody } });
    return {success:"successful edit"};
  }


  /**
   * Deletes all posts in set
   */
  // async deleteAllPosts({}): Promise<Empty>{
  //   for (const post of await this._getAllPosts({})){
  //     await this.posts.deleteOne({_id: post._id});
  //   }
  //   return {};
  // }


  /**
   * returns all posts created by author
   */
  // async _getPostsByAuthor({ author }: { author: User }): Promise<Posts[]> {
  //   return await this.posts.find({ author }).toArray();
  // }

  /**
   * returns all posts in database
   */
  async _getAllPosts({}): Promise<Posts[]> {
    return (await this.posts.find().toArray());
  }

  /**
   * returns author of post
   */
  async _getAuthor({post}: {post:Post}): Promise<{author: User}[]>{
    console.log(`looking for post with id ${post}`);
    const postInDB = await this.posts.findOne({_id: post});
    console.log(`post: ${postInDB?.author}`);

    return postInDB !== null? [{author: postInDB.author}]:[]
  }

}
