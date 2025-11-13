import { Db } from "npm:mongodb";
import { ID } from "./types.ts";

/**
 * Resolve a username to a user ID by looking up the `users` collection.
 * Returns the ID (typed as `ID`) if found, otherwise `null`.
 *
 * Note: This helper assumes a `users` collection exists with documents like:
 * { _id: <ID>, username: string, ... }
 */
export async function usernameToUserId(
  db: Db,
  username: string,
): Promise<ID | null> {
  if (!username) return null;
  const usersCollection = db.collection("users");
  const user = await usersCollection.findOne({ username });
  if (!user) return null;
  // ObjectId from Mongo may not be directly assignable to the branded `ID` type.
  // Convert through `unknown` to satisfy the type system; at runtime this will
  // be the stored _id (likely a string or ObjectId depending on your setup).
  return user._id as unknown as ID;
}
