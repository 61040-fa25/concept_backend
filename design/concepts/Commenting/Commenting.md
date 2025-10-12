**Concept: Commenting (User, Post)**
* **purpose** enable discussion around shared posts
* **principle** users can comment on posts that are visible to them. Comments can be added, deleted, and edited.
* **state** 
    * a set of Comments with
        * an author User
        * a content String
        * an associated Post
* **actions** 
    * addComment (author: User, content: String, post: Post): (comment: Comment) 
        * *requires* author and post must exist, author must have visibility of the post, content cannot be empty
        * *effects* creates a comment authored by the user under the post with the text content
    * deleteComment (user: User, comment: Comment)
        * *requires* comment must exist, comment must belong to the user
        * *effects* deletes the comment
    * editComment (user: User, comment: Comment, new_content: String) 
        * *requires* comment must exist, comment must belong to the user, new_content cannot be empty
        * *effects* edits the comment content to be that of new_content