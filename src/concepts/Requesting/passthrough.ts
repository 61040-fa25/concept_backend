/**
 * The Requesting concept exposes passthrough routes by default,
 * which allow POSTs to the route:
 *
 * /{REQUESTING_BASE_URL}/{Concept name}/{action or query}
 *
 * to passthrough directly to the concept action or query.
 * This is a convenient and natural way to expose concepts to
 * the world, but should only be done intentionally for public
 * actions and queries.
 *
 * This file allows you to explicitly set inclusions and exclusions
 * for passthrough routes:
 * - inclusions: those that you can justify their inclusion
 * - exclusions: those to exclude, using Requesting routes instead
 */

/**
 * INCLUSIONS
 *
 * Each inclusion must include a justification for why you think
 * the passthrough is appropriate (e.g. public query).
 *
 * inclusions = {"route": "justification"}
 */

export const inclusions: Record<string, string> = {
  "/api/Sessioning/create": "",
  "/api/Sessioning/delete": "",
  "/api/Sessioning/_getUser": "",

  "/api/Authentication/_getAllUsers":"",
  "/api/Authentication/_getUsername":"Should be able to get usernames even if not logged in",

  "/api/Commenting/_getCommentsByAuthor": "public",
  "/api/Commenting/_getCommentsByParent": "public",
  "/api/Commenting/_getAllComments": "public",
  "/api/Commenting/_getParent": "public",
  "/api/Commenting/_getAuthor": "public",

  "/api/Notifying/_getAllNotifications": "",
  "/api/Notifying/_getRecipient":"never used by frontend",

  // "/api/Posting/_getPostsByAuthor":"",
  "/api/Posting/_getAllPosts":"public",
  "/api/Posting/_getAuthor":"never actually used by frontend",

  "/api/Shelving/_getShelvesByBook":"never used by frontend",
  "/api/Shelving/_getAllShelves":"never used by frontend",
  "/api/Shelving/_getShelfOwner":"never used by frontend",

  "/api/Tagging/_getAllPublicTags": "public query",
  "/api/Tagging/_getTagOwner":"never used by frontend",
  "/api/Tagging/labelSubSet":"never used by frontend",
  "/api/Tagging/hasAtLeastOneLabel":"never used by frontend",

  "/api/Tagging/_getAllTags":"public",
  "/api/Tagging/_getBooksByLabel":"only ever used for public labels",

  "/api/Upvoting/_getUpvotesByItem":"public",
  "/api/Upvoting/_getAllUpvotes":"public"
};

/**
 * EXCLUSIONS
 *
 * Excluded routes fall back to the Requesting concept, and will
 * instead trigger the normal Requesting.request action. As this
 * is the intended behavior, no justification is necessary.
 *
 * exclusions = ["route"]
 */

export const exclusions: Array<string> = [
  // Feel free to delete these example exclusions

  "/api/Authentication/register",
  "/api/Authentication/authenticate",
  "/api/Authentication/changePassword",
  "/api/Authentication/deleteUser",

  "/api/Commenting/createComment",
  "/api/Commenting/deleteComment",
  "/api/Commenting/editComment",

  "/api/Notifying/notify",
  "/api/Notifying/read",
  "/api/Notifying/_getNotificationsByUser",
  "/api/Notifying/_getReadNotificationsByUser",
  "/api/Notifying/_getUnreadNotificationsByUser",

  "/api/Posting/createPost",
  "/api/Posting/deletePost",
  "/api/Posting/editPost",

  "/api/Shelving/addBook",
  "/api/Shelving/removeBook",
  "/api/Shelving/changeStatus",
  "/api/Shelving/_getUserShelfByBook",
  "/api/Shelving/_getBooksByUser",
  "/api/Shelving/_getShelfByBookAndOwner",

  "/api/Tagging/addTag",
  "/api/Tagging/removeTag",
  "/api/Tagging/markPrivate",
  "/api/Tagging/markPublic",
  "/api/Tagging/_getTagsByBook",
  "/api/Tagging/_getLabelsByBook",
  "/api/Tagging/_getTagsByUser",
  "/api/Tagging/_getLabelsByUser",

  "/api/Upvoting/upvote",
  "/api/Upvoting/unvote",
  "/api/Upvoting/_getUpvotessByUser",

];
