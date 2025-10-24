---
timestamp: 'Sun Oct 12 2025 17:10:53 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251012_171053.ca8ca4f8.md]]'
content_id: a6dcae78124042a86dc72d22505389e281e615115a6793c8699ebf5a7460d541
---

# concept: ListCreation

* **concept**: ListCreation
* **purpose**: allow for grouping of tasks into lists, subsets of the task bank
* **principle**: users can create a to-do list, select tasks from their task bank to add to it, and set a default ordering of the tasks according to their dependencies
* **state**:
  * a set of `Lists` with
    * a `title` of type `String`
    * a set of `ListItems` with
      * a `task` of type `Task`
      * an `orderNumber` of type `Number`
    * an `itemCount` of type Number
* **actions**:
  * `newList (listName : String) : List`
    * **requires** : no List with listName exists in set of Lists
    * **effect** : new List with title = listName, itemCount = 0, and an empty set of ListItems is returned and added to set of Lists
  * `addTask (list : List, task : Task) : ListItem`
    * **requires** : listItem containing task is not already in list
    * **effect** : a new listItem is created with task = task, taskStatus = incomplete, and defaultOrder = itemCount+1. itemCount is incremented. the new listItem is returned and added to list's set of listItems.
  * `deleteTask (list : List, task : Task)`
    * **requires** : a listIem containing task is in list's set of listItems
    * **effect** : the listItem containing task is removed from list's set of listItems
  * `assignOrder (list : List, task : Task, newOrder : Number)`
    * **requires** : task belongs to a ListItem in list
    * **effects** : task's ListItem gets defaultOrder set to newOrder and the ListItems with defaultOrders between the old value and new value are offset by one accordingly
