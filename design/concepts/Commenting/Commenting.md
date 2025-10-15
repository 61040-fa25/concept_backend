**Concept: Commenting (User, Post)**
* **purpose** enable discussion around shared posts
* **principle** users can comment on posts. Comments can be added, deleted, and edited.
* **state** 
    * a set of Comments with
        * an author User
        * a content String
        * an associated Post
        * a creation date Date
* **actions** 
    * addComment (author: User, content: String, post: Post): (comment: Comment) 
        * *requires* author and post must exist, content cannot be empty
        * *effects* creates a comment authored by the user under the post with the content as text
    * deleteComment (user: User, comment: Comment)
        * *requires* comment must exist, comment must be authored by the user
        * *effects* deletes the comment
    * editComment (user: User, comment: Comment, new_content: String) 
        * *requires* comment must exist, comment must be authored by the user, new_content cannot be empty
        * *effects* edits the comment content to be that of new_content