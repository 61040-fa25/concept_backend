import { assert, assertEquals, assertNotEquals } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import { ID } from "@utils/types.ts";
import TasksConcept from "./TasksConcept.ts";
import { TaskDocument } from "./TasksConcept.ts";

// Helper to check for an error return type from an action
function isError(response: unknown): response is { error: string } {
  return typeof response === "object" && response !== null &&
    "error" in response &&
    typeof (response as { error: unknown }).error === "string";
}

// Helper to check for a successful return type from an action
function isSuccess<T>(response: unknown): response is T {
  return typeof response === "object" && response !== null &&
    !("error" in response);
}

Deno.test("TasksConcept", async (t) => {
  const [db, client] = await testDb();
  const tasksConcept = new TasksConcept(db);

  // --- Test Users ---
  const userAlice = "user:Alice" as ID;
  const userBob = "user:Bob" as ID;

  await t.step(
    "Operational Principle: tasks are added to a prioritized list and can be marked as complete",
    async () => {
      console.log("\n--- TRACE: Operational Principle ---");

      // 1. Alice creates her task list
      console.log(`Action: createUserTasks({ user: "${userAlice}" })`);
      const createListResult = await tasksConcept.createUserTasks({
        user: userAlice,
      });
      console.log("Result:", createListResult);
      assert(!isError(createListResult));

      // 2. Alice adds three tasks
      console.log(
        `Action: createTask({ owner: "${userAlice}", description: "Buy milk" })`,
      );
      const task1Result = await tasksConcept.createTask({
        owner: userAlice,
        description: "Buy milk",
      });
      console.log("Result:", task1Result);
      assert(isSuccess<{ task: ID }>(task1Result));
      const task1Id = task1Result.task;

      console.log(
        `Action: createTask({ owner: "${userAlice}", description: "Walk the dog" })`,
      );
      const task2Result = await tasksConcept.createTask({
        owner: userAlice,
        description: "Walk the dog",
      });
      console.log("Result:", task2Result);
      assert(isSuccess<{ task: ID }>(task2Result));
      const task2Id = task2Result.task;

      console.log(
        `Action: createTask({ owner: "${userAlice}", description: "File taxes" })`,
      );
      const task3Result = await tasksConcept.createTask({
        owner: userAlice,
        description: "File taxes",
      });
      console.log("Result:", task3Result);
      assert(isSuccess<{ task: ID }>(task3Result));
      const task3Id = task3Result.task;

      // 3. Verify the tasks are present and in order
      console.log(`Query: _getTasks({ user: "${userAlice}" })`);
      const allTasksResult = await tasksConcept._getTasks({ user: userAlice });
      console.log("Result:", allTasksResult);
      assert(isSuccess<{ tasks: TaskDocument[] }>(allTasksResult));
      assertEquals(allTasksResult.tasks.length, 3);
      assertEquals(allTasksResult.tasks.map((t) => t._id), [
        task1Id,
        task2Id,
        task3Id,
      ]);
      assertEquals(allTasksResult.tasks[0].description, "Buy milk");
      assertEquals(allTasksResult.tasks[0].status, "TODO");

      // 4. Alice marks "Buy milk" as complete
      console.log(`Action: markTaskComplete({ task: "${task1Id}" })`);
      const markCompleteResult = await tasksConcept.markTaskComplete({
        task: task1Id,
      });
      console.log("Result:", markCompleteResult);
      assert(!isError(markCompleteResult));

      // 5. Verify the status has changed
      console.log(`Query: _getTasks({ user: "${userAlice}" }) again`);
      const updatedTasksResult = await tasksConcept._getTasks({
        user: userAlice,
      });
      console.log("Result:", updatedTasksResult);
      assert(isSuccess<{ tasks: TaskDocument[] }>(updatedTasksResult));
      const completedTask = updatedTasksResult.tasks.find((t) =>
        t._id === task1Id
      );
      assertNotEquals(completedTask, undefined);
      assertEquals(completedTask?.status, "DONE");

      // 6. Verify remaining tasks only shows TODO items
      console.log(`Query: _getRemainingTasks({ user: "${userAlice}" })`);
      const remainingTasksResult = await tasksConcept._getRemainingTasks({
        user: userAlice,
      });
      console.log("Result:", remainingTasksResult);
      assert(isSuccess<{ tasks: TaskDocument[] }>(remainingTasksResult));
      assertEquals(remainingTasksResult.tasks.length, 2);
      assertEquals(remainingTasksResult.tasks.map((t) => t._id), [
        task2Id,
        task3Id,
      ]);
      console.log("--- END TRACE: Operational Principle ---");
    },
  );

  await t.step("Scenario 1: Reordering and updating tasks", async () => {
    console.log("\n--- SCENARIO: Reordering and updating tasks ---");
    await tasksConcept.createUserTasks({ user: userBob });

    const t1Res = await tasksConcept.createTask({
      owner: userBob,
      description: "Task A",
    });
    const t2Res = await tasksConcept.createTask({
      owner: userBob,
      description: "Task B",
    });
    const t3Res = await tasksConcept.createTask({
      owner: userBob,
      description: "Task C",
    });
    assert(isSuccess<{ task: ID }>(t1Res));
    assert(isSuccess<{ task: ID }>(t2Res));
    assert(isSuccess<{ task: ID }>(t3Res));
    const [t1, t2, t3] = [t1Res.task, t2Res.task, t3Res.task];

    console.log(`Query: _getTasks for Bob initially`);
    let bobTasks = await tasksConcept._getTasks({ user: userBob });
    assert(isSuccess<{ tasks: TaskDocument[] }>(bobTasks));
    assertEquals(bobTasks.tasks.map((t) => t._id), [t1, t2, t3]);
    console.log("Initial order:", bobTasks.tasks.map((t) => t.description));

    const newOrder = [t3, t1, t2];
    console.log(`Action: reorderTasks for Bob with new order [C, A, B]`);
    const reorderRes = await tasksConcept.reorderTasks({
      user: userBob,
      newOrder,
    });
    console.log("Result:", reorderRes);
    assert(!isError(reorderRes));

    bobTasks = await tasksConcept._getTasks({ user: userBob });
    assert(isSuccess<{ tasks: TaskDocument[] }>(bobTasks));
    assertEquals(bobTasks.tasks.map((t) => t._id), newOrder);
    console.log("New order:", bobTasks.tasks.map((t) => t.description));

    const newDescription = "Task C - Updated";
    const newDueDate = new Date();
    console.log(`Action: updateTask for ${t3}`);
    const updateRes = await tasksConcept.updateTask({
      task: t3,
      newDescription,
      newDueDate,
    });
    console.log("Result:", updateRes);
    assert(!isError(updateRes));

    bobTasks = await tasksConcept._getTasks({ user: userBob });
    assert(isSuccess<{ tasks: TaskDocument[] }>(bobTasks));
    const updatedTask = bobTasks.tasks.find((t) => t._id === t3);
    assertEquals(updatedTask?.description, newDescription);
    assertEquals(updatedTask?.dueDate?.toISOString(), newDueDate.toISOString());
    console.log("Updated task details confirmed.");
  });

  await t.step("Scenario 2: Deleting tasks", async () => {
    console.log("\n--- SCENARIO: Deleting tasks ---");
    const userToDelete = "user:ToDelete" as ID;
    await tasksConcept.createUserTasks({ user: userToDelete });

    const t1Res = await tasksConcept.createTask({
      owner: userToDelete,
      description: "Task D",
    });
    const t2Res = await tasksConcept.createTask({
      owner: userToDelete,
      description: "Task E",
    });
    assert(isSuccess<{ task: ID }>(t1Res));
    assert(isSuccess<{ task: ID }>(t2Res));
    const [t1, t2] = [t1Res.task, t2Res.task];

    console.log(`Action: deleteTask ${t1}`);
    const deleteRes = await tasksConcept.deleteTask({ task: t1 });
    console.log("Result:", deleteRes);
    assert(!isError(deleteRes));

    let userTasks = await tasksConcept._getTasks({ user: userToDelete });
    assert(isSuccess<{ tasks: TaskDocument[] }>(userTasks));
    assertEquals(userTasks.tasks.length, 1);
    assertEquals(userTasks.tasks[0]._id, t2);
    console.log("Task D deleted successfully.");

    console.log(`Action: deleteAllForUser for ${userToDelete}`);
    const deleteAllRes = await tasksConcept.deleteAllForUser({
      user: userToDelete,
    });
    console.log("Result:", deleteAllRes);
    assert(!isError(deleteAllRes));

    userTasks = await tasksConcept._getTasks({ user: userToDelete });
    assert(isError(userTasks));
    assertEquals(
      userTasks.error,
      `No task list found for user ${userToDelete}.`,
    );
    console.log(`All tasks for ${userToDelete} deleted successfully.`);
  });

  await t.step(
    "Scenario 3: Handling error conditions and requirements",
    async () => {
      console.log("\n--- SCENARIO: Handling error conditions ---");
      const userCharlie = "user:Charlie" as ID;

      console.log(`Action: createTask for non-existent user ${userCharlie}`);
      const result1 = await tasksConcept.createTask({
        owner: userCharlie,
        description: "Invalid task",
      });
      console.log("Result:", result1);
      assert(isError(result1));

      console.log(`Action: createUserTasks for ${userCharlie}`);
      const result2 = await tasksConcept.createUserTasks({ user: userCharlie });
      console.log("Result:", result2);
      assert(!isError(result2));

      console.log(`Action: createUserTasks for ${userCharlie} AGAIN`);
      const result3 = await tasksConcept.createUserTasks({ user: userCharlie });
      console.log("Result:", result3);
      assert(isError(result3));

      const fakeTaskId = "task:fake" as ID;
      console.log(`Action: updateTask for non-existent task ${fakeTaskId}`);
      const result4 = await tasksConcept.updateTask({
        task: fakeTaskId,
        newDescription: "won't work",
      });
      console.log("Result:", result4);
      assert(isError(result4));

      const t1Res = await tasksConcept.createTask({
        owner: userCharlie,
        description: "Real Task",
      });
      assert(isSuccess<{ task: ID }>(t1Res));
      const t1 = t1Res.task;
      console.log(
        `Action: reorderTasks for ${userCharlie} with invalid task ID`,
      );
      const result5 = await tasksConcept.reorderTasks({
        user: userCharlie,
        newOrder: [t1, fakeTaskId],
      });
      console.log("Result:", result5);
      assert(isError(result5));

      console.log(
        `Action: reorderTasks for ${userCharlie} with incomplete list`,
      );
      const result6 = await tasksConcept.reorderTasks({
        user: userCharlie,
        newOrder: [],
      });
      console.log("Result:", result6);
      assert(isError(result6));
    },
  );

  await t.step(
    "Scenario 4: Querying empty and fully completed lists",
    async () => {
      console.log(
        "\n--- SCENARIO: Querying empty and fully completed lists ---",
      );
      const userDavid = "user:David" as ID;

      console.log(`Action: createUserTasks for ${userDavid}`);
      await tasksConcept.createUserTasks({ user: userDavid });

      console.log(`Query: _getTasks on empty list`);
      let davidTasks = await tasksConcept._getTasks({ user: userDavid });
      assert(isSuccess<{ tasks: TaskDocument[] }>(davidTasks));
      assertEquals(davidTasks.tasks.length, 0);

      console.log(`Query: _getRemainingTasks on empty list`);
      let davidRemaining = await tasksConcept._getRemainingTasks({
        user: userDavid,
      });
      assert(isSuccess<{ tasks: TaskDocument[] }>(davidRemaining));
      assertEquals(davidRemaining.tasks.length, 0);
      console.log("Empty list queries work as expected.");

      const t1Res = await tasksConcept.createTask({
        owner: userDavid,
        description: "Task F",
      });
      const t2Res = await tasksConcept.createTask({
        owner: userDavid,
        description: "Task G",
      });
      assert(isSuccess<{ task: ID }>(t1Res));
      assert(isSuccess<{ task: ID }>(t2Res));

      console.log(`Action: markTaskComplete for both of David's tasks`);
      await tasksConcept.markTaskComplete({ task: t1Res.task });
      await tasksConcept.markTaskComplete({ task: t2Res.task });

      console.log(`Query: _getTasks on fully completed list`);
      davidTasks = await tasksConcept._getTasks({ user: userDavid });
      assert(isSuccess<{ tasks: TaskDocument[] }>(davidTasks));
      assertEquals(davidTasks.tasks.length, 2);
      assert(davidTasks.tasks.every((t) => t.status === "DONE"));

      console.log(`Query: _getRemainingTasks on fully completed list`);
      davidRemaining = await tasksConcept._getRemainingTasks({
        user: userDavid,
      });
      assert(isSuccess<{ tasks: TaskDocument[] }>(davidRemaining));
      assertEquals(davidRemaining.tasks.length, 0);
      console.log("Fully completed list queries work as expected.");
    },
  );

  await client.close();
});
