---
timestamp: 'Sat Oct 18 2025 14:24:40 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251018_142440.6193de2f.md]]'
content_id: 8754b7d746f84f05432aae991d31f8be1b51381bd10f263273cf236e01dca626
---

# concept: Session

* **concept**: Session
* **purpose**: a focused session of completing all tasks on a list
* **principle**: a user will "activate" a list to start a session and be given an ordered list (either default ordering or generated) of tasks on the list to complete
* **state**:
  * a `Session` with
    * an `owner` of type `User`
    * a `List` with
      * a `title` of type `String`
      * a set of `ListItems` with
        * a `task` of type `Task`
        * a `defaultOrder` of type `Number`
        * a `randomOrder` of type  `Number`
        * an `itemStatus` of type `TaskStatus`
      * an `itemCount` of type Number
    * an `active` of type `Flag`
    * an `ordering` of type `OrderType`
    * a `format` of type `FormatType`
* **actions**:
  * `changeSession (list : List, sessionOwner : User)`
    * **requires** : there is not an active session for sessionOwner
    * **effects** : makes list the Session's List with each randomOrder = defaultOrder, itemStatus = Incomplete, active = False, ordering = Default, and format = List
  * `setOrdering (newType : OrderType, setter : Owner)`
    * **requires** : session's active Flag is currently False and setter = owner
    * **effects** : ordering is set to newType
  * `setFormat (newFormat : FormatType, setter : Owner)`
    * **requires** : session's active Flag is currently False and setter = owner
    * **effects** : format is set to newFormat
  * `randomizeOrder (randomizer : User)`
    * **requires** : session's ordering is set to "Random" and randomizer = owner
    * **effects** : each ListItems randomOrder value is updated at random, maintaining dependencies between tasks
  * `activateSession (activator : User)`
    * **requires** : session's active Flag is currently False and activator = owner
    * **effects** : session's active Flag is set to True
  * `startTask (task : Task)`
    * **requires** : task is in a ListItem for session's list, its status is currently "Incomplete", and no other task is "In Progress"
    * **effects** : given ListItem's status is set to "In Progress"
  * `completeTask (task : Task)`
    * **requires** : task is in a ListItem for session's list and its status is currently "In Progress"
    * **effects** : given ListItem's status is set to "Complete"
  * `endSession ( )`
    * **requires** : session's active Flag is currently True
    * **effects** : session's active Flag is set to False
