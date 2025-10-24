[@concept-design-overview](../../background/concept-design-overview.md)

[@concept-specifications](../../background/concept-specifications.md)

[@implementing-concepts](../../background/implementing-concepts.md)

[@Focus](Focus.md)

# implement: Focus

# response:

# concept: Focus

```
concept Focus [User, Task]
  purpose to eliminate decision fatigue by presenting the single task a user should be working on right now
  principle it presents the currently scheduled task to the user, providing a single point of focus
  state
    a CurrentTask element of User with
      a task Task
  actions
    setCurrentTask (user: User, task: Task)
      effect sets the specified task as the user's current focus
    clearCurrentTask (user: User)
      effect removes the current task for the user
    getCurrentTask (user: User): (task: optional Task)
      effect returns the user's current task, if any
```

# file: src/focus/FocusConcept.ts

```typescript
import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "../utils/types.ts";

// Define generic type parameters for this concept
type User = ID;
type Task = ID;

// Define the prefix for MongoDB collections to namespace them for this concept
const PREFIX = "Focus.";

/**
 * Represents the state of the Focus concept.
 * Maps a User to their single current Task.
 */
interface CurrentTaskDoc {
  _id: User;
  task: Task;
}

/**
 * Focus Concept
 *
 * @purpose To eliminate decision fatigue by presenting the single task a user should be working on right now.
 * @principle It presents the currently scheduled task to the user, providing a single point of focus.
 */
export default class FocusConcept {
  private readonly currentTasks: Collection<CurrentTaskDoc>;

  constructor(private readonly db: Db) {
    this.currentTasks = this.db.collection<CurrentTaskDoc>(PREFIX + "currentTasks");
  }

  /**
   * Sets the specified task as the user's current focus.
   * If the user already has a focus task, it is replaced.
   *
   * @param user The ID of the user.
   * @param task The ID of the task to set as the focus.
   * @returns An empty object on success.
   */
  async setCurrentTask({ user, task }: { user: User; task: Task }): Promise<Empty> {
    // This action can always be performed.
    // requires: true

    // effects: sets the specified task as the user's current focus
    await this.currentTasks.updateOne(
      { _id: user },
      { $set: { task: task } },
      { upsert: true },
    );
    return {};
  }

  /**
   * Removes the current task for the user, leaving them with no focus.
   *
   * @param user The ID of the user whose focus should be cleared.
   * @returns An empty object on success.
   */
  async clearCurrentTask({ user }: { user: User }): Promise<Empty> {
    // This action can always be performed.
    // requires: true

    // effects: removes the current task for the user
    await this.currentTasks.deleteOne({ _id: user });
    return {};
  }

  /**
   * Returns the user's current task, if one is set.
   *
   * @param user The ID of the user.
   * @returns An object containing the task ID if found, otherwise an empty object.
   */
  async getCurrentTask({ user }: { user: User }): Promise<{ task?: Task }> {
    // This action can always be performed.
    // requires: true

    // effects: returns the user's current task, if any
    const doc = await this.currentTasks.findOne({ _id: user });
    if (doc) {
      return { task: doc.task };
    }
    return {};
  }
}
```