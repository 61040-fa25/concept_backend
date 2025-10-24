---
timestamp: 'Tue Oct 21 2025 16:03:59 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251021_160359.22c7b53a.md]]'
content_id: c2c98ea0c9459066067c82988d19a11f93a36b03da84212eb1c2ee1c45e5be8f
---

# concept: ListCreation

* **concept**: ListCreation
* **purpose**: allow for grouping of tasks into lists, subsets of the task bank
* **principle**: users can create a to-do list, select tasks from their task bank to add to it, and set a default ordering of the tasks according to their dependencies
* **state**:
  * a set of `Lists` with
    * an `owner` of type `User`
    * a `title` of type `String`
    * a set of `ListItems` with
      * a `task` of type `Task`
      * an `orderNumber` of type `Number`
    * an `itemCount` of type Number
* **actions**:
  * `newList (listName : String, listOwner : User) : List`
    * **requires** : no List with listName exists in set of Lists with owner = listOwner
    * **effect** : new List with title = listName, itemCount = 0, and an empty set of ListItems is returned and added to set of Lists
  * `addTask (list : List, task : Task, adder : User) : ListItem`
    * **requires** : listItem containing task is not already in list and adder = owner of list
    * **effect** : a new listItem is created with task = task, taskStatus = incomplete, and defaultOrder = itemCount+1. itemCount is incremented. the new listItem is returned and added to list's set of listItems.
  * `deleteTask (list : List, task : Task, deleter : User)`
    * **requires** : a listIem containing task is in list's set of listItems and deleter = owner of list
    * **effect** : the listItem containing task is removed from list's set of listItems
  * `assignOrder (list : List, task : Task, newOrder : Number, assigner : User)`
    * **requires** : task belongs to a ListItem in list and assigner = owner of list
    * **effects** : task's ListItem gets defaultOrder set to newOrder and the ListItems with defaultOrders between the old value and new value are offset by one accordingly

Code:
