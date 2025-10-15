**Concept: Posting (User, Image, Date)**
* **purpose** allow users to publish and share content for others to see
* **principle** users can create/publish posts that consist of a caption and at least one image. These posts can be edited and deleted by their owners.
* **state**
    * a set of Posts with
        * a caption String
        * a set of Images
        * an author User
        * a creation date Date
* **actions** 
    * create (user: User, images: Set<Image>, caption: String): (post: Post) 
        * *requires* user to exist, images cannot be empty
        * *effects* creates a new post authored by the user timestamped as now with its content being the caption and images given
    * delete (user: User, post: Post):
        * *requires* user to exist, post to exist and belong to user
        * *effects* deletes the post for the author and their friends
    * edit (user: User, post: Post, new_caption: String)
        * *requires* user to exist, post to exist and belong to user
        * *effects* edits the caption of the post to be that of the new one