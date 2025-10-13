**Concept: SessionLogging (User, Image, Flag)**
* **purpose** capture photo records of a user's activity during a trip session
* **principle** users can start sessions during which they can log image entries. Entries for a session cannot be recorded once the session is ended. Recorded entries will remain associated with the session even after it is ended.
* **state** 
    * a set of Sessions with
        * an owner User
        * a set of Images
        * an active Flag
* **actions** 
    * startSession (user: User): (session: Session) 
        * *requires* user to exist
        * *effects* creates a new session (active = true) under the user
    * addEntry (user: User, session: Session, image: Image)
        * *requires* user to exist, session and image must exist, session must be active and belong to user
        * *effects* adds image to the set of images associated with the session
    * endSession (user: User, session: Session)
        * *requires* user to exist, session must exist and belong to user. Session must be active
        * *effects* ends the session (active = false)