---
timestamp: 'Sun Oct 19 2025 14:23:44 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251019_142344.fce2802c.md]]'
content_id: d26f7575e7021fab9203543a985f5ac666cdf4c1dbf24bdd27d8eb36834f8a36
---

# concept: Session

* **concept**: TaskBank
* **purpose**: allow for tasks to relate to one another
* **principle**: users can enter tasks and denote their relationship to other existing tasks.
* **state**:
  * a set of `Banks` with
    * a `bankOwner` of type `User`
    * a set of `Tasks` with
      * a `taskName` of type `String`
      * an optional `description` of type `String`
      * a set of `Dependencies` with
        * a `depTask` of type `Task`
        * a `depRelation` of type `Relation`
* **actions**:
  * `addTask (adder : User, name : String, ? desc : String ) : Task`
    * **requires** : there is not already a Task with taskName = name in adder's Bank
    * **effects** : a new Task with taskName = name and description = desc is returned and added to the set of Tasks
  * `deleteTask (deleter : User, task : Task)`
    * **requires** : task is in set of Tasks in deleter's Bank
    * **effects** : task is removed from set of Tasks
  * `addDependency (adder : User, task1 : Task, task2 : Task, dependency : Relation) : Dependency`
    * **requires** : task1 and task2 are both in set of Tasks in adder's Bank
    * **effects** : for task1's set of Dependencies, task2 and dependency are added. for task2's set of Dependencies, task1 and the inverse of dependency are added.
  * `deleteDependency (deleter : User, task : Task, dependency : Dependency)`
    * **requires** : task has dependency in its set of Dependencies in deleter's Bank
    * **effects** : dependency is removed from task's set of Dependencies and the corresponding Dependency is deleted from depTask's set of Dependencies
  * `getDependencies (getter : User, task : Task) : Set<Dependency>`
    * **requires** : task is in set of Tasks in getter's Bank
    * **effects** : returns the set of Dependencies for task
  * `evaluateOrder (owner : User, task1 : Task, task2 : Task) : Boolean`
    * **requires** : task1 and task2 are in set of Tasks in owner's Bank
    * **effects** : returns True iff task1 and task2 are in a valid order according to their dependencies
