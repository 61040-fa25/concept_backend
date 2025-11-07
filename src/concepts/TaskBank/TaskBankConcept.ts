import { ClientSession, Collection, Db, MongoClient } from "npm:mongodb";
import { Empty, ID } from "../../utils/types.ts"; // Adjust path as necessary
import { freshID } from "../../utils/database.ts"; // Adjust path as necessary
import { usernameToUserId } from "../../utils/users.ts";

// Declare collection prefix, use concept name
const PREFIX = "TaskBank" + ".";

// Generic types of this concept
type User = ID;
type Task = ID; // Represents TaskDoc._id
type BankID = ID; // Represents BankDoc._id

/**
 * Relation types for dependencies, and their inverses.
 *
 * - BLOCKS: Source task explicitly prevents target task from starting.
 * - PRECEDS: Source task must be completed before target task.
 * - REQUIRES: Source task needs target task to be completed first (meaning target precedes source).
 *
 * Inverses are automatically managed to ensure bidirectional consistency.
 */
export enum RelationType {
  BLOCKS = "BLOCKS",
  BLOCKED_BY = "BLOCKED_BY",
  PRECEDES = "PRECEDES",
  FOLLOWS = "FOLLOWS",
  REQUIRES = "REQUIRES",
  REQUIRED_BY = "REQUIRED_BY",
}

const inverseRelations: Record<RelationType, RelationType> = {
  [RelationType.BLOCKS]: RelationType.BLOCKED_BY,
  [RelationType.BLOCKED_BY]: RelationType.BLOCKS,
  [RelationType.PRECEDES]: RelationType.FOLLOWS,
  [RelationType.FOLLOWS]: RelationType.PRECEDES,
  [RelationType.REQUIRES]: RelationType.REQUIRED_BY,
  [RelationType.REQUIRED_BY]: RelationType.REQUIRES,
};

/**
 * Retrieves the inverse relation type for a given relation.
 * @param relation The RelationType to find the inverse for.
 * @returns The inverse RelationType.
 * @throws {Error} If no inverse is defined for the given relation type (should not happen with complete `inverseRelations` map).
 */
function getInverseRelation(relation: RelationType): RelationType {
  const inverse = inverseRelations[relation];
  if (!inverse) {
    throw new Error(
      `Internal Error: No inverse defined for relation type: ${relation}`,
    );
  }
  return inverse;
}

/**
 * A Dependency as stored within a Task's 'dependencies' array.
 * 'depTask' is the ID of the task being related to (the target of the dependency).
 */
interface DependencyEntry {
  depTask: Task;
  depRelation: RelationType;
}

/**
 * Represents a user's task bank.
 * @state a set of Banks with a bankOwner of type User
 */
interface BankDoc {
  _id: BankID;
  bankOwner: User;
}

/**
 * Represents a task within a bank.
 * @state a set of Tasks with a taskName, optional description, and a set of Dependencies.
 */
interface TaskDoc {
  _id: Task;
  bankId: BankID; // Link to the bank this task belongs to
  taskName: string;
  description?: string;
  dependencies: DependencyEntry[];
}

// Result types for actions that return a specific entity or an error
type TaskResult = { task: Task } | { error: string };
type DependencyResult = { dependency: DependencyEntry } | { error: string };
type GetDependenciesResult = { dependencies: DependencyEntry[] } | {
  error: string;
};
type EvaluateOrderResult = { orderValid: boolean } | { error: string };

/**
 * @concept TaskBank
 * @purpose allow for tasks to relate to one another
 * @principle users can enter tasks and denote their relationship to other existing tasks.
 */
export default class TaskBankConcept {
  private banks: Collection<BankDoc>;
  private tasks: Collection<TaskDoc>;

  private client?: MongoClient;

  constructor(private readonly db: Db, client?: MongoClient) {
    this.client = client;
    this.banks = this.db.collection(PREFIX + "banks");
    this.tasks = this.db.collection(PREFIX + "tasks");
  }

  /**
   * Helper to find a user's bank or create one if it doesn't exist.
   * A user is assumed to have only one bank.
   *
   * @param owner The user ID.
   * @returns The BankDoc associated with the owner.
   */
  private async _getOrCreateBank(
    owner: User,
    session?: ClientSession,
  ): Promise<BankDoc> {
    let bank = await this.banks.findOne({ bankOwner: owner }, { session });
    if (!bank) {
      const newBankId = freshID();
      bank = { _id: newBankId, bankOwner: owner };
      await this.banks.insertOne(bank, { session });
    }
    return bank;
  }

  /**
   * @action addTask
   * @requires : there is not already a Task with taskName = name in adder's Bank
   * @effects : a new Task with taskName = name and description = desc is returned and added to the set of Tasks
   */
  async addTask(
    { adder, name, description }: {
      adder: User;
      name: string;
      description?: string;
    },
  ): Promise<TaskResult> {
    try {
      const bank = await this._getOrCreateBank(adder);

      // Precondition: check for existing task with the same name in this bank
      const existingTask = await this.tasks.findOne({
        bankId: bank._id,
        taskName: name,
      });
      if (existingTask) {
        return {
          error: `Task with name '${name}' already exists in your bank.`,
        };
      }

      const newTaskId = freshID();
      const newTask: TaskDoc = {
        _id: newTaskId,
        bankId: bank._id,
        taskName: name,
        description,
        dependencies: [],
      };

      await this.tasks.insertOne(newTask);
      console.log("Added new task:", name);
      return { task: newTaskId };
    } catch (e: any) {
      console.error("Error adding task:", e);
      return { error: `Failed to add task: ${e.message}` };
    }
  }

  /**
   * @action deleteTask
   * @requires : task is in set of Tasks in deleter's Bank
   * @effects : task is removed from set of Tasks, and all its associated dependencies (and their inverses) are also removed.
   */
  async deleteTask(
    { deleter, task }: { deleter: User; task: Task },
  ): Promise<Empty | { error: string }> {
    try {
      // Allow callers to pass either a user ID or a username as `deleter`.
      // If a username was provided, resolve it to the user's ID.
      let resolvedDeleter: User = deleter as User;
      try {
        const maybe = await usernameToUserId(this.db, String(deleter));
        if (maybe) resolvedDeleter = maybe;
      } catch {
        // If username resolution fails for any reason, fall back to provided deleter
      }

      const bank = await this._getOrCreateBank(resolvedDeleter);

      // Precondition: task is in deleter's bank
      const taskToDelete = await this.tasks.findOne({
        _id: task,
        bankId: bank._id,
      });
      if (!taskToDelete) {
        return { error: `Task '${task}' not found in your bank.` };
      }

      // 1. Remove the task itself
      await this.tasks.deleteOne({ _id: task });

      // 2. Remove any dependencies where this task is the target (i.e., remove inverse dependencies from other tasks)
      // Find tasks that have a dependency pointing to the task being deleted.
      const tasksToUpdate = await this.tasks.find({
        bankId: bank._id,
        "dependencies.depTask": task,
      }).toArray();

      for (const t of tasksToUpdate) {
        // Remove all DependencyEntry objects where depTask is the deleted task
        const updatedDependencies = t.dependencies.filter(
          (dep) => dep.depTask !== task,
        );
        if (updatedDependencies.length < t.dependencies.length) { // Only update if changes were made
          await this.tasks.updateOne(
            { _id: t._id },
            { $set: { dependencies: updatedDependencies } },
          );
        }
      }

      return {};
    } catch (e: any) {
      console.error("Error deleting task:", e);
      return { error: `Failed to delete task: ${e.message}` };
    }
  }

  /**
   * @action addDependency
   * @requires : task1 and task2 are both in set of Tasks in adder's Bank
   * @effects : for task1's set of Dependencies, task2 and dependency are added. for task2's set of Dependencies, task1 and the inverse of dependency are added.
   */
  async addDependency(
    { adder, task1, task2, dependency, clientSession }: {
      adder: User;
      task1: Task;
      task2: Task;
      dependency: RelationType;
      clientSession?: ClientSession;
    },
  ): Promise<DependencyResult> {
    // Internal implementation that performs the actual DB ops, respecting an optional session
    const impl = async (session?: ClientSession): Promise<DependencyResult> => {
      const bank = await this._getOrCreateBank(adder, session);

      // Precondition: task1 and task2 are in adder's bank
      const [t1, t2] = await Promise.all([
        this.tasks.findOne({ _id: task1, bankId: bank._id }, { session }),
        this.tasks.findOne({ _id: task2, bankId: bank._id }, { session }),
      ]);

      if (!t1) {
        return { error: `Task '${task1}' not found in your bank.` };
      }
      if (!t2) {
        return { error: `Task '${task2}' not found in your bank.` };
      }

      // Prevent self-dependency
      if (task1 === task2) {
        return { error: "Cannot add a dependency to the same task." };
      }

      // Check if the specific dependency (task1 -> task2 with 'dependency' type) already exists
      if (
        t1.dependencies.some((d) =>
          d.depTask === task2 && d.depRelation === dependency
        )
      ) {
        return {
          error:
            `Dependency '${dependency}' from '${task1}' to '${task2}' already exists.`,
        };
      }

      // Add dependency from task1 to task2
      const newDepEntry: DependencyEntry = {
        depTask: task2,
        depRelation: dependency,
      };
      await this.tasks.updateOne(
        { _id: task1 },
        { $push: { dependencies: newDepEntry } },
        { session },
      );

      // Add inverse dependency from task2 to task1
      const inverseDependency = getInverseRelation(dependency);
      await this.tasks.updateOne(
        { _id: task2 },
        {
          $push: {
            dependencies: { depTask: task1, depRelation: inverseDependency },
          },
        },
        { session },
      );

      return { dependency: newDepEntry } as DependencyResult;
    };

    try {
      // If a clientSession was provided by the caller, use it.
      if (clientSession) return await impl(clientSession);

      // Otherwise, if we have a MongoClient available, run the operation inside a transaction
      if (this.client) {
        const session = this.client.startSession();
        try {
          let result: DependencyResult | null = null;
          await session.withTransaction(async () => {
            const r = await impl(session);
            result = r as DependencyResult;
            // If the impl returned an error, throw to abort the transaction and return after catching
            if ((result as any).error) throw new Error("ClientError");
          });
          // If result contains error, return it; otherwise return success
          return result ?? { error: "Unknown transaction result" };
        } catch (e: any) {
          // Distinguish client errors bubbled via throw
          if (e && e.message === "ClientError") {
            // Retrieve the impl result outside of transaction to provide the error message
            const r = await impl();
            return r as DependencyResult;
          }
          console.error("Error adding dependency (transaction):", e);
          return { error: `Failed to add dependency: ${e.message}` };
        } finally {
          try {
            await session.endSession();
          } catch (_) {
            // ignore
          }
        }
      }

      // Fallback: no client available, run without transaction
      return await impl();
    } catch (e: any) {
      console.error("Error adding dependency:", e);
      return { error: `Failed to add dependency: ${e.message}` };
    }
  }

  /**
   * @action deleteDependency
   * @requires : task has dependency in its set of Dependencies in deleter's Bank
   * @effects : dependency is removed from task's set of Dependencies and the corresponding Dependency is deleted from depTask's set of Dependencies
   *
   * Note: The 'dependency' argument here is broken down into `sourceTask`, `targetTask`, and `relation`
   * to accurately identify the specific dependency to remove.
   */
  async deleteDependency(
    { deleter, sourceTask, targetTask, relation, clientSession }: {
      deleter: User;
      sourceTask: Task;
      targetTask: Task;
      relation: RelationType;
      clientSession?: ClientSession;
    },
  ): Promise<Empty | { error: string }> {
    const impl = async (session?: ClientSession) => {
      const bank = await this._getOrCreateBank(deleter, session);

      // Precondition: sourceTask and targetTask are in deleter's bank
      const [sourceTaskDoc, targetTaskDoc] = await Promise.all([
        this.tasks.findOne({ _id: sourceTask, bankId: bank._id }, { session }),
        this.tasks.findOne({ _id: targetTask, bankId: bank._id }, { session }),
      ]);

      if (!sourceTaskDoc) {
        return { error: `Source task '${sourceTask}' not found in your bank.` };
      }
      if (!targetTaskDoc) {
        return { error: `Target task '${targetTask}' not found in your bank.` };
      }

      // Identify the specific dependency to remove from sourceTask
      const dependencyToRemove: DependencyEntry = {
        depTask: targetTask,
        depRelation: relation,
      };

      // Check if dependency exists on sourceTask
      const existsOnSource = sourceTaskDoc.dependencies.some(
        (dep) =>
          dep.depTask === dependencyToRemove.depTask &&
          dep.depRelation === dependencyToRemove.depRelation,
      );
      if (!existsOnSource) {
        return {
          error:
            `Dependency not found from '${sourceTask}' to '${targetTask}' with relation '${relation}'.`,
        };
      }

      // Remove dependency from sourceTask
      await this.tasks.updateOne(
        { _id: sourceTask },
        { $pull: { dependencies: dependencyToRemove } },
        { session },
      );

      // Remove inverse dependency from targetTask
      const inverseRelation = getInverseRelation(relation);
      const inverseDependencyToRemove: DependencyEntry = {
        depTask: sourceTask,
        depRelation: inverseRelation,
      };

      // Check if inverse dependency exists on targetTask before trying to pull
      const existsOnTarget = targetTaskDoc.dependencies.some(
        (dep) =>
          dep.depTask === inverseDependencyToRemove.depTask &&
          dep.depRelation === inverseDependencyToRemove.depRelation,
      );
      if (existsOnTarget) {
        await this.tasks.updateOne(
          { _id: targetTask },
          { $pull: { dependencies: inverseDependencyToRemove } },
          { session },
        );
      } else {
        console.warn(
          `Inverse dependency not found on target task '${targetTask}' for deleted relation from '${sourceTask}'. Data inconsistency possible.`,
        );
      }

      return {} as Empty;
    };

    try {
      if (clientSession) {
        return (await impl(clientSession)) as Empty | { error: string };
      }

      if (this.client) {
        const session = this.client.startSession();
        try {
          let result: Empty | { error: string } | null = null;
          await session.withTransaction(async () => {
            const r = await impl(session);
            result = r as Empty | { error: string };
            if ((result as any).error) throw new Error("ClientError");
          });
          return (result ?? { error: "Unknown transaction result" }) as
            | Empty
            | { error: string };
        } catch (e: any) {
          if (e && e.message === "ClientError") {
            const r = await impl();
            return r as Empty | { error: string };
          }
          console.error("Error deleting dependency (transaction):", e);
          return { error: `Failed to delete dependency: ${e.message}` };
        } finally {
          try {
            await session.endSession();
          } catch (_) {
            // ignore
          }
        }
      }

      // Fallback: no client available, run without transaction
      return await impl();
    } catch (e: any) {
      console.error("Error deleting dependency:", e);
      return { error: `Failed to delete dependency: ${e.message}` };
    }
  }

  /**
   * @query getDependencies
   * @requires : task is in set of Tasks in getter's Bank
   * @effects : returns the set of Dependencies for task
   */
  async _getDependencies(
    { getter, task }: { getter: User; task: Task },
  ): Promise<{ dependencies: DependencyEntry[] } | { error: string }> {
    try {
      const bank = await this._getOrCreateBank(getter);

      // Precondition: task is in getter's bank
      const taskDoc = await this.tasks.findOne({ _id: task, bankId: bank._id });
      if (!taskDoc) {
        return { error: `Task '${task}' not found in your bank.` };
      }

      return { dependencies: taskDoc.dependencies };
    } catch (e: any) {
      console.error("Error getting dependencies:", e);
      return { error: `Failed to get dependencies: ${e.message}` };
    }
  }

  /**
   * @query listTasks
   * @requires : owner is a valid User
   * @effects : returns all TaskDoc objects in the owner's bank
   */
  async listTasks(
    { owner }: { owner: User },
  ): Promise<{ tasks: TaskDoc[] } | { error: string }> {
    try {
      const bank = await this._getOrCreateBank(owner);
      const tasks = await this.tasks.find({ bankId: bank._id }).toArray();
      return { tasks };
    } catch (e: any) {
      console.error("Error listing tasks:", e);
      return { error: `Failed to list tasks: ${e.message}` };
    }
  }

  /**
   * @query getTask
   * @requires : owner and task id are valid
   * @effects : returns a single TaskDoc for the given task id in the owner's bank
   */
  async getTask(
    { owner, task }: { owner: User; task: Task },
  ): Promise<{ task: TaskDoc } | { error: string }> {
    try {
      const bank = await this._getOrCreateBank(owner);
      const taskDoc = await this.tasks.findOne({ _id: task, bankId: bank._id });
      if (!taskDoc) return { error: `Task '${task}' not found in your bank.` };
      return { task: taskDoc };
    } catch (e: any) {
      console.error("Error getting task:", e);
      return { error: `Failed to get task: ${e.message}` };
    }
  }

  /**
   * @query evaluateOrder
   * @requires : task1 and task2 are in set of Tasks in owner's Bank
   * @effects : returns True iff task1 and task2 are in a valid order according to their dependencies.
   *            (A "valid order (task1, task2)" means task1 can precede task2, i.e., task2 does not directly or indirectly block task1)
   */
  async _evaluateOrder(
    { owner, task1, task2 }: { owner: User; task1: Task; task2: Task },
  ): Promise<EvaluateOrderResult> {
    try {
      const bank = await this._getOrCreateBank(owner);

      // Precondition: task1 and task2 are in owner's bank
      const [t1Doc, t2Doc] = await Promise.all([
        this.tasks.findOne({ _id: task1, bankId: bank._id }),
        this.tasks.findOne({ _id: task2, bankId: bank._id }),
      ]);

      if (!t1Doc) {
        return { error: `Task '${task1}' not found in your bank.` };
      }
      if (!t2Doc) {
        return { error: `Task '${task2}' not found in your bank.` };
      }

      // If they are the same task, order is vacuously valid
      if (task1 === task2) {
        return { orderValid: true };
      }

      // To evaluate order (task1, task2) as valid, we must ensure there is NO path from task2 to task1
      // in the "must precede" graph. An edge A -> B in this graph means "A must precede B".

      const allTasksInBank = await this.tasks.find({ bankId: bank._id })
        .toArray();

      // Build the graph where an edge (A, B) means A MUST PRECEDE B
      const mustPrecedeGraph = new Map<Task, Set<Task>>();
      for (const t of allTasksInBank) {
        if (!mustPrecedeGraph.has(t._id)) {
          mustPrecedeGraph.set(t._id, new Set<Task>());
        }

        for (const dep of t.dependencies) {
          // Interpret each dep.depRelation as the relation from `t._id` (the source task)
          // to `dep.depTask` (the target). Map that relation to a "must precede" edge
          // (A -> B means A must precede B).
          switch (dep.depRelation) {
            // Interpret dependency entry as: dep.depTask depRelation t
            // i.e. the relation describes dep.depTask relative to the source task `t._id`.
            // Map that to a "must precede" edge (A -> B means A must precede B):
            // - PRECEDES | BLOCKS | REQUIRED_BY => dep.depTask must precede t
            // - FOLLOWS | REQUIRES | BLOCKED_BY => t must precede dep.depTask
            case RelationType.PRECEDES:
            case RelationType.BLOCKS:
            case RelationType.REQUIRED_BY:
              // dep.depTask must precede t
              if (!mustPrecedeGraph.has(dep.depTask)) {
                mustPrecedeGraph.set(dep.depTask, new Set<Task>());
              }
              mustPrecedeGraph.get(dep.depTask)!.add(t._id);
              break;
            case RelationType.FOLLOWS:
            case RelationType.REQUIRES:
            case RelationType.BLOCKED_BY:
              // t must precede dep.depTask
              mustPrecedeGraph.get(t._id)!.add(dep.depTask);
              break;
            default:
              // Unknown relation: be conservative and do not add an edge
              break;
          }
        }
      }

      // Perform DFS to check if there's a path from task2 to task1 in the 'must precede' graph.
      // If such a path exists, it means task2 must precede task1, which makes the order (task1, task2) invalid.
      const visited = new Set<Task>();
      const pathStack: Task[] = []; // Used for current path in recursive DFS, useful for cycle detection (not strictly needed here but good practice)

      const dfsCheckPath = (current: Task): boolean => {
        visited.add(current);
        pathStack.push(current);

        if (current === task1) {
          return true; // Found a path from task2 to task1, so task2 must precede task1
        }

        const neighbors = mustPrecedeGraph.get(current) || new Set();
        for (const neighbor of neighbors) {
          if (!visited.has(neighbor)) {
            if (dfsCheckPath(neighbor)) {
              return true;
            }
          }
        }
        pathStack.pop(); // Backtrack
        return false;
      };

      // The order (task1, task2) is valid if task2 does NOT have to precede task1.
      // This means there is NO path from task2 to task1 in our `must precede` graph.
      const task2MustPrecedeTask1 = dfsCheckPath(task2);

      return { orderValid: !task2MustPrecedeTask1 };
    } catch (e) {
      console.error("Error evaluating order:", e);
      return {
        error: `Failed to evaluate order: ${
          (e as Error)?.message ?? String(e)
        }`,
      };
    }
  }
}
