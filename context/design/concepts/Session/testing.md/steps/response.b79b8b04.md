---
timestamp: 'Fri Oct 17 2025 17:31:56 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251017_173156.c44a0566.md]]'
content_id: b79b8b04c44ca6640a502ab1d7652f8e51cb0ebc1c7a1f0a6b78e83a002587f9
---

# response:

```typescript
// file: src/Session/SessionConcept.test.ts
import { assertEquals, assertNotEquals, assertExists } from "jsr:@std/assert";
import { testDb } from "../../utils/database.ts"; // Adjust path as needed
import SessionConcept from "./SessionConcept.ts";
import { ID, Empty } from "../../utils/types.ts";

// Define generic types and enums used in the concept for testing clarity
type User = ID;
type List = ID;
type Task = ID;

enum OrderType {
  Default = "Default",
  Random = "Random",
}

enum FormatType {
  List = "List",
  Kanban = "Kanban",
}

enum TaskStatus {
  Incomplete = "Incomplete",
  InProgress = "InProgress",
  Complete = "Complete",
}

// Test data
const USER_ALICE = "user:Alice" as User;
const USER_BOB = "user:Bob" as User;
const LIST_GROCERIES = "list:Groceries" as List;
const LIST_WORK = "list:Work" as List;
const TASK_MILK = "task:BuyMilk" as Task;
const TASK_BREAD = "task:BuyBread" as Task;
const TASK_EGGS = "task:BuyEggs" as Task;
const TASK_REPORT = "task:FinishReport" as Task;
const TASK_MEETING = "task:PrepareForMeeting" as Task;

const GROCERIES_ITEMS = [
  { task: TASK_MILK, defaultOrder: 0 },
  { task: TASK_BREAD, defaultOrder: 1 },
  { task: TASK_EGGS, defaultOrder: 2 },
];

const WORK_ITEMS = [
  { task: TASK_REPORT, defaultOrder: 0 },
  { task: TASK_MEETING, defaultOrder: 1 },
];

Deno.test("SessionConcept functionality", async (t) => {
  const [db, client] = await testDb();
  const sessionConcept = new SessionConcept(db);

  await t.step("changeSession: should initialize a new session correctly", async () => {
    const result = await sessionConcept.changeSession({
      listId: LIST_GROCERIES,
      listTitle: "Groceries",
      listItemsData: GROCERIES_ITEMS,
      sessionOwner: USER_ALICE,
    });
    assertEquals(result, {});

    const session = await sessionConcept._getSession({ sessionOwner: USER_ALICE });
    assertExists(session);
    assertEquals(session.owner, USER_ALICE);
    assertEquals(session.active, false);
    assertEquals(session.ordering, OrderType.Default);
    assertEquals(session.format, FormatType.List);
    assertEquals(session.list.id, LIST_GROCERIES);
    assertEquals(session.list.title, "Groceries");
    assertEquals(session.list.itemCount, 3);
    session.list.items.forEach((item, index) => {
      assertEquals(item.defaultOrder, index);
      assertEquals(item.randomOrder, index); // Should be initialized to default order
      assertEquals(item.itemStatus, TaskStatus.Incomplete);
    });
  });

  await t.step("changeSession: should prevent changing session if current session is active", async () => {
    // First, activate the session
    await sessionConcept.activateSession({ activator: USER_ALICE });
    const activeSession = await sessionConcept._getSession({ sessionOwner: USER_ALICE });
    assertEquals(activeSession?.active, true);

    const result = await sessionConcept.changeSession({
      listId: LIST_WORK,
      listTitle: "Work",
      listItemsData: WORK_ITEMS,
      sessionOwner: USER_ALICE,
    });
    assertEquals(result, { error: `User '${USER_ALICE}' already has an active session. Please end it first.` });

    // Verify the session state hasn't changed to the new list
    const session = await sessionConcept._getSession({ sessionOwner: USER_ALICE });
    assertEquals(session?.list.id, LIST_GROCERIES);
  });

  await t.step("changeSession: should allow changing session if current session is inactive", async () => {
    // End the active session first
    await sessionConcept.endSession({ sessionOwner: USER_ALICE });
    const inactiveSession = await sessionConcept._getSession({ sessionOwner: USER_ALICE });
    assertEquals(inactiveSession?.active, false);

    const result = await sessionConcept.changeSession({
      listId: LIST_WORK,
      listTitle: "Work",
      listItemsData: WORK_ITEMS,
      sessionOwner: USER_ALICE,
    });
    assertEquals(result, {});

    const session = await sessionConcept._getSession({ sessionOwner: USER_ALICE });
    assertExists(session);
    assertEquals(session.list.id, LIST_WORK);
    assertEquals(session.list.title, "Work");
    assertEquals(session.list.itemCount, 2);
    session.list.items.forEach((item, index) => {
      assertEquals(item.defaultOrder, index);
      assertEquals(item.randomOrder, index);
      assertEquals(item.itemStatus, TaskStatus.Incomplete);
    });
  });

  await t.step("setOrdering: should set ordering for an inactive session", async () => {
    // Ensure session is inactive
    await sessionConcept.endSession({ sessionOwner: USER_ALICE });

    const result = await sessionConcept.setOrdering({
      newType: OrderType.Random,
      setter: USER_ALICE,
    });
    assertEquals(result, {});

    const session = await sessionConcept._getSession({ sessionOwner: USER_ALICE });
    assertEquals(session?.ordering, OrderType.Random);
  });

  await t.step("setOrdering: should not set ordering for an active session", async () => {
    // Activate session
    await sessionConcept.activateSession({ activator: USER_ALICE });

    const result = await sessionConcept.setOrdering({
      newType: OrderType.Default,
      setter: USER_ALICE,
    });
    assertEquals(result, { error: `Cannot change ordering while session for '${USER_ALICE}' is active.` });

    const session = await sessionConcept._getSession({ sessionOwner: USER_ALICE });
    assertEquals(session?.ordering, OrderType.Random); // Should remain Random
  });

  await t.step("setFormat: should set format for an inactive session", async () => {
    // Ensure session is inactive
    await sessionConcept.endSession({ sessionOwner: USER_ALICE });

    const result = await sessionConcept.setFormat({
      newFormat: FormatType.Kanban,
      setter: USER_ALICE,
    });
    assertEquals(result, {});

    const session = await sessionConcept._getSession({ sessionOwner: USER_ALICE });
    assertEquals(session?.format, FormatType.Kanban);
  });

  await t.step("setFormat: should not set format for an active session", async () => {
    // Activate session
    await sessionConcept.activateSession({ activator: USER_ALICE });

    const result = await sessionConcept.setFormat({
      newFormat: FormatType.List,
      setter: USER_ALICE,
    });
    assertEquals(result, { error: `Cannot change format while session for '${USER_ALICE}' is active.` });

    const session = await sessionConcept._getSession({ sessionOwner: USER_ALICE });
    assertEquals(session?.format, FormatType.Kanban); // Should remain Kanban
  });

  await t.step("randomizeOrder: should randomize order when ordering is 'Random'", async () => {
    // Ensure session is inactive, set ordering to Random
    await sessionConcept.endSession({ sessionOwner: USER_ALICE });
    await sessionConcept.setOrdering({ newType: OrderType.Random, setter: USER_ALICE });

    // Initial check of randomOrder (should be same as defaultOrder)
    let sessionBefore = await sessionConcept._getSession({ sessionOwner: USER_ALICE });
    const initialRandomOrders = sessionBefore!.list.items.map(item => item.randomOrder);
    const initialDefaultOrders = sessionBefore!.list.items.map(item => item.defaultOrder);
    assertEquals(initialRandomOrders, initialDefaultOrders);

    const result = await sessionConcept.randomizeOrder({ randomizer: USER_ALICE });
    assertEquals(result, {});

    const sessionAfter = await sessionConcept._getSession({ sessionOwner: USER_ALICE });
    assertExists(sessionAfter);
    const newRandomOrders = sessionAfter.list.items.map(item => item.randomOrder);

    // Verify random orders are shuffled (unlikely to be the same if multiple items)
    assertNotEquals(newRandomOrders, initialRandomOrders);
    // Verify all random orders are unique and within the expected range (0 to itemCount-1)
    const sortedNewRandomOrders = [...newRandomOrders].sort((a,b) => a - b);
    assertEquals(sortedNewRandomOrders, Array.from({ length: WORK_ITEMS.length }, (_, i) => i));
  });

  await t.step("randomizeOrder: should not randomize order when ordering is not 'Random'", async () => {
    // Set ordering to Default
    await sessionConcept.setOrdering({ newType: OrderType.Default, setter: USER_ALICE });
    const sessionBefore = await sessionConcept._getSession({ sessionOwner: USER_ALICE });
    assertEquals(sessionBefore?.ordering, OrderType.Default);
    const initialRandomOrders = sessionBefore!.list.items.map(item => item.randomOrder);

    const result = await sessionConcept.randomizeOrder({ randomizer: USER_ALICE });
    assertEquals(result, { error: `Cannot randomize order; session for '${USER_ALICE}' is not set to random ordering.` });

    const sessionAfter = await sessionConcept._getSession({ sessionOwner: USER_ALICE });
    const newRandomOrders = sessionAfter!.list.items.map(item => item.randomOrder);
    assertEquals(newRandomOrders, initialRandomOrders); // Should not have changed
  });

  await t.step("activateSession: should activate an inactive session", async () => {
    // Ensure session is inactive
    await sessionConcept.endSession({ sessionOwner: USER_ALICE });

    const result = await sessionConcept.activateSession({ activator: USER_ALICE });
    assertEquals(result, {});

    const session = await sessionConcept._getSession({ sessionOwner: USER_ALICE });
    assertEquals(session?.active, true);
  });

  await t.step("activateSession: should not activate an already active session", async () => {
    // Session should still be active from previous step
    const sessionBefore = await sessionConcept._getSession({ sessionOwner: USER_ALICE });
    assertEquals(sessionBefore?.active, true);

    const result = await sessionConcept.activateSession({ activator: USER_ALICE });
    assertEquals(result, { error: `Session for '${USER_ALICE}' is already active.` });

    const sessionAfter = await sessionConcept._getSession({ sessionOwner: USER_ALICE });
    assertEquals(sessionAfter?.active, true); // Should remain active
  });

  await t.step("startTask: should start an 'Incomplete' task", async () => {
    // Session is active from previous step
    await sessionConcept.endSession({ sessionOwner: USER_ALICE }); // Ensure no task is in progress
    await sessionConcept.activateSession({ activator: USER_ALICE });

    const result = await sessionConcept.startTask({ task: TASK_REPORT, sessionOwner: USER_ALICE });
    assertEquals(result, {});

    const session = await sessionConcept._getSession({ sessionOwner: USER_ALICE });
    const taskReport = session?.list.items.find(item => item.task === TASK_REPORT);
    assertEquals(taskReport?.itemStatus, TaskStatus.InProgress);

    const taskMeeting = session?.list.items.find(item => item.task === TASK_MEETING);
    assertEquals(taskMeeting?.itemStatus, TaskStatus.Incomplete); // Other task should remain Incomplete
  });

  await t.step("startTask: should not start a task if another is 'In Progress'", async () => {
    // TASK_REPORT is still 'In Progress' from previous step
    const sessionBefore = await sessionConcept._getSession({ sessionOwner: USER_ALICE });
    assertEquals(sessionBefore?.list.items.find(item => item.task === TASK_REPORT)?.itemStatus, TaskStatus.InProgress);

    const result = await sessionConcept.startTask({ task: TASK_MEETING, sessionOwner: USER_ALICE });
    assertEquals(result, { error: `Another task ('${TASK_REPORT}') is already 'In Progress'.` });

    const sessionAfter = await sessionConcept._getSession({ sessionOwner: USER_ALICE });
    const taskMeeting = sessionAfter?.list.items.find(item => item.task === TASK_MEETING);
    assertEquals(taskMeeting?.itemStatus, TaskStatus.Incomplete); // Should remain Incomplete
  });

  await t.step("startTask: should not start a task that is not 'Incomplete'", async () => {
    // Complete the TASK_REPORT
    await sessionConcept.completeTask({ task: TASK_REPORT, sessionOwner: USER_ALICE });
    const sessionAfterCompletion = await sessionConcept._getSession({ sessionOwner: USER_ALICE });
    assertEquals(sessionAfterCompletion?.list.items.find(item => item.task === TASK_REPORT)?.itemStatus, TaskStatus.Complete);

    const result = await sessionConcept.startTask({ task: TASK_REPORT, sessionOwner: USER_ALICE });
    assertEquals(result, { error: `Task '${TASK_REPORT}' is not in 'Incomplete' status. Current: ${TaskStatus.Complete}.` });
  });

  await t.step("startTask: should not start a task if session is inactive", async () => {
    await sessionConcept.endSession({ sessionOwner: USER_ALICE });
    const session = await sessionConcept._getSession({ sessionOwner: USER_ALICE });
    assertEquals(session?.active, false);

    const result = await sessionConcept.startTask({ task: TASK_MEETING, sessionOwner: USER_ALICE });
    assertEquals(result, { error: `Session for user '${USER_ALICE}' is not active. Activate it first.` });
  });


  await t.step("completeTask: should complete an 'In Progress' task", async () => {
    // Activate session and start a task first
    await sessionConcept.activateSession({ activator: USER_ALICE });
    await sessionConcept.startTask({ task: TASK_MEETING, sessionOwner: USER_ALICE });
    const sessionBefore = await sessionConcept._getSession({ sessionOwner: USER_ALICE });
    assertEquals(sessionBefore?.list.items.find(item => item.task === TASK_MEETING)?.itemStatus, TaskStatus.InProgress);

    const result = await sessionConcept.completeTask({ task: TASK_MEETING, sessionOwner: USER_ALICE });
    assertEquals(result, {});

    const sessionAfter = await sessionConcept._getSession({ sessionOwner: USER_ALICE });
    const taskMeeting = sessionAfter?.list.items.find(item => item.task === TASK_MEETING);
    assertEquals(taskMeeting?.itemStatus, TaskStatus.Complete);
  });

  await t.step("completeTask: should not complete a task that is not 'In Progress'", async () => {
    // TASK_REPORT is already 'Complete' from an earlier step
    const sessionBefore = await sessionConcept._getSession({ sessionOwner: USER_ALICE });
    assertEquals(sessionBefore?.list.items.find(item => item.task === TASK_REPORT)?.itemStatus, TaskStatus.Complete);

    const result = await sessionConcept.completeTask({ task: TASK_REPORT, sessionOwner: USER_ALICE });
    assertEquals(result, { error: `Task '${TASK_REPORT}' is not in 'In Progress' status. Current: ${TaskStatus.Complete}.` });
  });

  await t.step("completeTask: should not complete a task if session is inactive", async () => {
    await sessionConcept.endSession({ sessionOwner: USER_ALICE });
    const session = await sessionConcept._getSession({ sessionOwner: USER_ALICE });
    assertEquals(session?.active, false);

    // Make sure a task exists and is not complete for the test (reset session with groceries)
    await sessionConcept.changeSession({
        listId: LIST_GROCERIES,
        listTitle: "Groceries",
        listItemsData: GROCERIES_ITEMS,
        sessionOwner: USER_ALICE,
      });
    await sessionConcept.activateSession({ activator: USER_ALICE });
    await sessionConcept.startTask({task: TASK_MILK, sessionOwner: USER_ALICE});
    await sessionConcept.endSession({ sessionOwner: USER_ALICE }); // Now session is inactive, Milk is InProgress

    const result = await sessionConcept.completeTask({ task: TASK_MILK, sessionOwner: USER_ALICE });
    assertEquals(result, { error: `Session for user '${USER_ALICE}' is not active. Activate it first.` });

    const milkTask = (await sessionConcept._getSession({ sessionOwner: USER_ALICE }))?.list.items.find(i => i.task === TASK_MILK);
    assertEquals(milkTask?.itemStatus, TaskStatus.InProgress); // Status should not have changed
  });


  await t.step("endSession: should end an active session", async () => {
    // Ensure session is active
    await sessionConcept.activateSession({ activator: USER_ALICE });
    const sessionBefore = await sessionConcept._getSession({ sessionOwner: USER_ALICE });
    assertEquals(sessionBefore?.active, true);

    const result = await sessionConcept.endSession({ sessionOwner: USER_ALICE });
    assertEquals(result, {});

    const sessionAfter = await sessionConcept._getSession({ sessionOwner: USER_ALICE });
    assertEquals(sessionAfter?.active, false);
  });

  await t.step("endSession: should not end an already inactive session", async () => {
    // Session is inactive from previous step
    const sessionBefore = await sessionConcept._getSession({ sessionOwner: USER_ALICE });
    assertEquals(sessionBefore?.active, false);

    const result = await sessionConcept.endSession({ sessionOwner: USER_ALICE });
    assertEquals(result, { error: `Session for '${USER_ALICE}' is not active.` });

    const sessionAfter = await sessionConcept._getSession({ sessionOwner: USER_ALICE });
    assertEquals(sessionAfter?.active, false); // Should remain inactive
  });

  await t.step("Queries: _getSession should return null for non-existent session", async () => {
    const session = await sessionConcept._getSession({ sessionOwner: USER_BOB });
    assertEquals(session, null);
  });

  await t.step("Queries: _getTasksInOrder should return tasks in default order", async () => {
    await sessionConcept.changeSession({
      listId: LIST_GROCERIES,
      listTitle: "Groceries",
      listItemsData: GROCERIES_ITEMS,
      sessionOwner: USER_BOB,
    }); // Create a new session for Bob
    await sessionConcept.setOrdering({ newType: OrderType.Default, setter: USER_BOB });
    await sessionConcept.activateSession({ activator: USER_BOB });
    await sessionConcept.startTask({ task: TASK_BREAD, sessionOwner: USER_BOB }); // Start bread
    await sessionConcept.completeTask({ task: TASK_BREAD, sessionOwner: USER_BOB }); // Complete bread

    const orderedTasks = await sessionConcept._getTasksInOrder({ sessionOwner: USER_BOB });
    assertEquals(orderedTasks, [
      { task: TASK_MILK, order: 0, status: TaskStatus.Incomplete },
      { task: TASK_BREAD, order: 1, status: TaskStatus.Complete },
      { task: TASK_EGGS, order: 2, status: TaskStatus.Incomplete },
    ]);
  });

  await t.step("Queries: _getTasksInOrder should return tasks in random order", async () => {
    await sessionConcept.endSession({ sessionOwner: USER_BOB });
    await sessionConcept.setOrdering({ newType: OrderType.Random, setter: USER_BOB });
    await sessionConcept.randomizeOrder({ randomizer: USER_BOB });
    await sessionConcept.activateSession({ activator: USER_BOB });

    const orderedTasks = await sessionConcept._getTasksInOrder({ sessionOwner: USER_BOB });
    assertExists(orderedTasks);
    assertEquals(Array.isArray(orderedTasks), true);
    // Verify that tasks are present and their order is based on randomOrder, not defaultOrder.
    // We can't predict the exact order, but we can check if it's different and tasks are there.
    const session = await sessionConcept._getSession({ sessionOwner: USER_BOB });
    const expectedTasks = session!.list.items.sort((a,b) => a.randomOrder - b.randomOrder).map(item => ({
        task: item.task,
        order: item.randomOrder,
        status: item.itemStatus
    }));
    assertEquals(orderedTasks, expectedTasks);
    // Ensure the random orders are distinct from default orders for at least one item (highly probable with `randomizeOrder`)
    const defaultOrders = (orderedTasks as Array<{task: Task, order: number, status: TaskStatus}>).map(t => t.order);
    const initialDefaultOrders = GROCERIES_ITEMS.map(item => item.defaultOrder);
    assertNotEquals(defaultOrders, initialDefaultOrders); // Highly likely to be different
  });

  await t.step("Principle Trace: a user will 'activate' a list to start a session and be given an ordered list (either default ordering or generated) of tasks on the list to complete", async () => {
    const user = "user:PrincipleTest" as User;
    const list = "list:PrincipleList" as List;
    const taskA = "task:PrincipleTaskA" as Task;
    const taskB = "task:PrincipleTaskB" as Task;
    const principleItems = [
      { task: taskA, defaultOrder: 0 },
      { task: taskB, defaultOrder: 1 },
    ];

    // 1. User changes to a new session (implicitly creates/configures it)
    let result: Empty | {error: string} = await sessionConcept.changeSession({
      listId: list,
      listTitle: "Principle Demo",
      listItemsData: principleItems,
      sessionOwner: user,
    });
    assertEquals(result, {});
    let session = await sessionConcept._getSession({ sessionOwner: user });
    assertExists(session);
    assertEquals(session.active, false);
    assertEquals(session.list.items.length, 2);
    assertEquals(session.list.items[0].itemStatus, TaskStatus.Incomplete);
    assertEquals(session.list.items[1].itemStatus, TaskStatus.Incomplete);
    assertEquals(session.ordering, OrderType.Default);

    // 2. User activates the list to start a session
    result = await sessionConcept.activateSession({ activator: user });
    assertEquals(result, {});
    session = await sessionConcept._getSession({ sessionOwner: user });
    assertEquals(session?.active, true);

    // Get the ordered list (default ordering in this case)
    let orderedTasks = await sessionConcept._getTasksInOrder({ sessionOwner: user });
    assertEquals(orderedTasks, [
      { task: taskA, order: 0, status: TaskStatus.Incomplete },
      { task: taskB, order: 1, status: TaskStatus.Incomplete },
    ]);

    // 3. User starts and completes the first task
    result = await sessionConcept.startTask({ task: taskA, sessionOwner: user });
    assertEquals(result, {});
    session = await sessionConcept._getSession({ sessionOwner: user });
    assertEquals(session?.list.items.find(i => i.task === taskA)?.itemStatus, TaskStatus.InProgress);

    result = await sessionConcept.completeTask({ task: taskA, sessionOwner: user });
    assertEquals(result, {});
    session = await sessionConcept._getSession({ sessionOwner: user });
    assertEquals(session?.list.items.find(i => i.task === taskA)?.itemStatus, TaskStatus.Complete);

    orderedTasks = await sessionConcept._getTasksInOrder({ sessionOwner: user });
    assertEquals(orderedTasks, [
      { task: taskA, order: 0, status: TaskStatus.Complete },
      { task: taskB, order: 1, status: TaskStatus.Incomplete },
    ]);

    // 4. User ends the session
    result = await sessionConcept.endSession({ sessionOwner: user });
    assertEquals(result, {});
    session = await sessionConcept._getSession({ sessionOwner: user });
    assertEquals(session?.active, false);

  });

  await client.close();
});
```
