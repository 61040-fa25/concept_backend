import {
  assert,
  assertEquals,
  assertExists,
  assertNotEquals,
} from "jsr:@std/assert";
import { testDb } from "../../utils/database.ts"; // Adjust path as necessary
import TaskBankConcept, { RelationType } from "./TaskBankConcept.ts"; // Adjust path as necessary
import { ID } from "../../utils/types.ts";

// Utility for creating mock User IDs
const userAlice = "user:Alice" as ID;
const userBob = "user:Bob" as ID;

Deno.test("TaskBankConcept", async (t) => {
  const [db, client] = await testDb();
  const taskBankConcept = new TaskBankConcept(db, client);

  await t.step("should successfully add a task", async () => {
    const result = await taskBankConcept.addTask({
      adder: userAlice,
      name: "Task 1",
      description: "First task for Alice",
    });
    assertExists((result as { task: ID }).task);
    const taskId = (result as { task: ID }).task;

    const dependenciesResult = await taskBankConcept._getDependencies({
      getter: userAlice,
      task: taskId,
    });

    if ("error" in dependenciesResult) {
      throw new Error(`Unexpected error: ${dependenciesResult.error}`);
    }

    assertExists(dependenciesResult.dependencies);
    assertEquals(dependenciesResult.dependencies!.length, 0); // No dependencies initially
  });

  await t.step(
    "should not add a task with an existing name for the same user",
    async () => {
      // Add it first
      const firstAddResult = await taskBankConcept.addTask({
        adder: userAlice,
        name: "Unique Task",
      });
      assertExists((firstAddResult as { task: ID }).task);

      // Try to add again with the same name
      const secondAddResult = await taskBankConcept.addTask({
        adder: userAlice,
        name: "Unique Task",
      });
      assertExists((secondAddResult as { error: string }).error);
      assert(
        (secondAddResult as { error: string }).error.includes("already exists"),
      );
    },
  );

  await t.step(
    "should allow tasks with the same name for different users",
    async () => {
      const aliceTaskResult = await taskBankConcept.addTask({
        adder: userAlice,
        name: "Shared Task",
      });
      assertExists((aliceTaskResult as { task: ID }).task);

      const bobTaskResult = await taskBankConcept.addTask({
        adder: userBob,
        name: "Shared Task",
      });
      assertExists((bobTaskResult as { task: ID }).task);
      assertNotEquals(
        (aliceTaskResult as { task: ID }).task,
        (bobTaskResult as { task: ID }).task,
      );
    },
  );

  await t.step(
    "should successfully delete a task and its dependencies",
    async () => {
      const taskA_id = (await taskBankConcept.addTask({
        adder: userAlice,
        name: "Task A",
      }) as { task: ID }).task;
      const taskB_id = (await taskBankConcept.addTask({
        adder: userAlice,
        name: "Task B",
      }) as { task: ID }).task;

      // Add a dependency from B to A (B PRECEDES A)
      await taskBankConcept.addDependency({
        adder: userAlice,
        task1: taskB_id,
        task2: taskA_id,
        dependency: RelationType.PRECEDES,
      });

      // Verify dependencies before deletion
      const bDepsBefore = await taskBankConcept._getDependencies({
        getter: userAlice,
        task: taskB_id,
      });

      if ("error" in bDepsBefore) {
        throw new Error(`Unexpected error: ${bDepsBefore.error}`);
      }

      assertEquals(bDepsBefore.dependencies!.length, 1);
      assertEquals(bDepsBefore.dependencies![0].depTask, taskA_id);
      assertEquals(
        bDepsBefore.dependencies![0].depRelation,
        RelationType.PRECEDES,
      );

      const aDepsBefore = await taskBankConcept._getDependencies({
        getter: userAlice,
        task: taskA_id,
      });

      if ("error" in aDepsBefore) {
        throw new Error(`Unexpected error: ${aDepsBefore.error}`);
      }
      assertEquals(aDepsBefore.dependencies!.length, 1);
      assertEquals(aDepsBefore.dependencies![0].depTask, taskB_id);
      assertEquals(
        aDepsBefore.dependencies![0].depRelation,
        RelationType.FOLLOWS,
      );

      // Delete Task A
      const deleteResult = await taskBankConcept.deleteTask({
        deleter: userAlice,
        task: taskA_id,
      });
      assertEquals(deleteResult, {});

      // Verify Task A is gone
      const getTaskAResult = await taskBankConcept._getDependencies({
        getter: userAlice,
        task: taskA_id,
      });
      assertExists((getTaskAResult as { error: string }).error);
      assert((getTaskAResult as { error: string }).error.includes("not found"));

      // Verify dependencies on Task B referring to Task A are also gone
      const bDepsAfter = await taskBankConcept._getDependencies({
        getter: userAlice,
        task: taskB_id,
      });
      if ("error" in bDepsAfter) {
        throw new Error(`Unexpected error: ${bDepsAfter.error}`);
      }
      assertEquals(bDepsAfter.dependencies!.length, 0);
    },
  );

  await t.step(
    "should return error when deleting a non-existent task",
    async () => {
      const result = await taskBankConcept.deleteTask({
        deleter: userAlice,
        task: "nonExistentTask" as ID,
      });
      assertExists((result as { error: string }).error);
      assert((result as { error: string }).error.includes("not found"));
    },
  );

  await t.step(
    "should successfully add a dependency and its inverse",
    async () => {
      const taskA_id = (await taskBankConcept.addTask({
        adder: userAlice,
        name: "Dep Task A",
      }) as { task: ID }).task;
      const taskB_id = (await taskBankConcept.addTask({
        adder: userAlice,
        name: "Dep Task B",
      }) as { task: ID }).task;

      const addDepResult = await taskBankConcept.addDependency({
        adder: userAlice,
        task1: taskA_id,
        task2: taskB_id,
        dependency: RelationType.PRECEDES,
      });
      assertExists((addDepResult as { dependency: object }).dependency);

      // Check taskA's dependencies
      const aDeps = await taskBankConcept._getDependencies({
        getter: userAlice,
        task: taskA_id,
      });
      if ("error" in aDeps) {
        throw new Error(`Unexpected error: ${aDeps.error}`);
      }
      assertEquals(aDeps.dependencies!.length, 1);
      assertEquals(aDeps.dependencies![0].depTask, taskB_id);
      assertEquals(aDeps.dependencies![0].depRelation, RelationType.PRECEDES);

      // Check taskB's dependencies (should have the inverse)
      const bDeps = await taskBankConcept._getDependencies({
        getter: userAlice,
        task: taskB_id,
      });
      if ("error" in bDeps) {
        throw new Error(`Unexpected error: ${bDeps.error}`);
      }
      assertEquals(bDeps.dependencies!.length, 1);
      assertEquals(bDeps.dependencies![0].depTask, taskA_id);
      assertEquals(bDeps.dependencies![0].depRelation, RelationType.FOLLOWS);
    },
  );

  await t.step(
    "should return error when adding dependency to non-existent tasks",
    async () => {
      const taskA_id = (await taskBankConcept.addTask({
        adder: userAlice,
        name: "Dep Task X",
      }) as { task: ID }).task;

      const result1 = await taskBankConcept.addDependency({
        adder: userAlice,
        task1: taskA_id,
        task2: "nonExistentTask" as ID,
        dependency: RelationType.PRECEDES,
      });
      assertExists((result1 as { error: string }).error);
      assert((result1 as { error: string }).error.includes("not found"));

      const result2 = await taskBankConcept.addDependency({
        adder: userAlice,
        task1: "nonExistentTask" as ID,
        task2: taskA_id,
        dependency: RelationType.PRECEDES,
      });
      assertExists((result2 as { error: string }).error);
      assert((result2 as { error: string }).error.includes("not found"));
    },
  );

  await t.step("should not allow self-dependency", async () => {
    const taskA_id = (await taskBankConcept.addTask({
      adder: userAlice,
      name: "Self Dep Task",
    }) as { task: ID }).task;
    const result = await taskBankConcept.addDependency({
      adder: userAlice,
      task1: taskA_id,
      task2: taskA_id,
      dependency: RelationType.PRECEDES,
    });
    assertExists((result as { error: string }).error);
    assert(
      (result as { error: string }).error.includes(
        "Cannot add a dependency to the same task.",
      ),
    );
  });

  await t.step("should not add an identical dependency twice", async () => {
    const t1 = (await taskBankConcept.addTask({
      adder: userAlice,
      name: "Duplicate Dep 1",
    }) as { task: ID }).task;
    const t2 = (await taskBankConcept.addTask({
      adder: userAlice,
      name: "Duplicate Dep 2",
    }) as { task: ID }).task;

    await taskBankConcept.addDependency({
      adder: userAlice,
      task1: t1,
      task2: t2,
      dependency: RelationType.PRECEDES,
    });
    const result = await taskBankConcept.addDependency({
      adder: userAlice,
      task1: t1,
      task2: t2,
      dependency: RelationType.PRECEDES,
    });
    assertExists((result as { error: string }).error);
    assert((result as { error: string }).error.includes("already exists"));

    // Check if state is still consistent (only one entry)
    const t1Deps = await taskBankConcept._getDependencies({
      getter: userAlice,
      task: t1,
    });
    if ("error" in t1Deps) {
      throw new Error(`Unexpected error: ${t1Deps.error}`);
    }
    assertEquals(t1Deps.dependencies!.length, 1);
  });

  await t.step(
    "should successfully delete a dependency and its inverse",
    async () => {
      const taskC_id = (await taskBankConcept.addTask({
        adder: userAlice,
        name: "Del Dep Task C",
      }) as { task: ID }).task;
      const taskD_id = (await taskBankConcept.addTask({
        adder: userAlice,
        name: "Del Dep Task D",
      }) as { task: ID }).task;

      await taskBankConcept.addDependency({
        adder: userAlice,
        task1: taskC_id,
        task2: taskD_id,
        dependency: RelationType.PRECEDES,
      });

      // Verify dependencies before deletion
      const cDepsBefore = await taskBankConcept._getDependencies({
        getter: userAlice,
        task: taskC_id,
      });
      if ("error" in cDepsBefore) {
        throw new Error(`Unexpected error: ${cDepsBefore.error}`);
      }
      assertEquals(cDepsBefore.dependencies!.length, 1);
      assertEquals(cDepsBefore.dependencies![0].depTask, taskD_id);
      assertEquals(
        cDepsBefore.dependencies![0].depRelation,
        RelationType.PRECEDES,
      );

      const dDepsBefore = await taskBankConcept._getDependencies({
        getter: userAlice,
        task: taskD_id,
      });
      if ("error" in dDepsBefore) {
        throw new Error(`Unexpected error: ${dDepsBefore.error}`);
      }
      assertEquals(dDepsBefore.dependencies!.length, 1);
      assertEquals(dDepsBefore.dependencies![0].depTask, taskC_id);
      assertEquals(
        dDepsBefore.dependencies![0].depRelation,
        RelationType.FOLLOWS,
      );

      // Delete the dependency
      const deleteDepResult = await taskBankConcept.deleteDependency({
        deleter: userAlice,
        sourceTask: taskC_id,
        targetTask: taskD_id,
        relation: RelationType.PRECEDES,
      });
      assertEquals(deleteDepResult, {});

      // Verify dependencies are gone
      const cDepsAfter = await taskBankConcept._getDependencies({
        getter: userAlice,
        task: taskC_id,
      });
      if ("error" in cDepsAfter) {
        throw new Error(`Unexpected error: ${cDepsAfter.error}`);
      }
      assertEquals(cDepsAfter.dependencies!.length, 0);

      const dDepsAfter = await taskBankConcept._getDependencies({
        getter: userAlice,
        task: taskD_id,
      });
      if ("error" in dDepsAfter) {
        throw new Error(`Unexpected error: ${dDepsAfter.error}`);
      }
      assertEquals(dDepsAfter.dependencies!.length, 0);
    },
  );

  await t.step(
    "should return error when deleting a non-existent dependency",
    async () => {
      const t1 = (await taskBankConcept.addTask({
        adder: userAlice,
        name: "NonExistent Dep 1",
      }) as { task: ID }).task;
      const t2 = (await taskBankConcept.addTask({
        adder: userAlice,
        name: "NonExistent Dep 2",
      }) as { task: ID }).task;

      const result = await taskBankConcept.deleteDependency({
        deleter: userAlice,
        sourceTask: t1,
        targetTask: t2,
        relation: RelationType.PRECEDES,
      });
      assertExists((result as { error: string }).error);
      assert(
        (result as { error: string }).error.includes("Dependency not found"),
      );
    },
  );

  await t.step(
    "should return error when getting dependencies for a non-existent task",
    async () => {
      const result = await taskBankConcept._getDependencies({
        getter: userAlice,
        task: "nonExistentTask" as ID,
      });
      assertExists((result as { error: string }).error);
      assert((result as { error: string }).error.includes("not found"));
    },
  );

  await t.step("should evaluate order correctly", async (st) => {
    const task1_id = (await taskBankConcept.addTask({
      adder: userAlice,
      name: "Eval Task 1",
    }) as { task: ID }).task;
    const task2_id = (await taskBankConcept.addTask({
      adder: userAlice,
      name: "Eval Task 2",
    }) as { task: ID }).task;
    const task3_id = (await taskBankConcept.addTask({
      adder: userAlice,
      name: "Eval Task 3",
    }) as { task: ID }).task;
    const task4_id = (await taskBankConcept.addTask({
      adder: userAlice,
      name: "Eval Task 4",
    }) as { task: ID }).task;

    // Task1 BLOCKS Task2 (T1 -> T2) -- normalized to PRECEDES
    await taskBankConcept.addDependency({
      adder: userAlice,
      task1: task1_id,
      task2: task2_id,
      dependency: RelationType.PRECEDES,
    });
    // Task2 REQUIRES Task3 (T3 -> T2) -- normalized to PRECEDES
    await taskBankConcept.addDependency({
      adder: userAlice,
      task1: task2_id,
      task2: task3_id,
      dependency: RelationType.PRECEDES,
    });
    // Task3 PRECEDES Task4 (T3 -> T4)
    await taskBankConcept.addDependency({
      adder: userAlice,
      task1: task3_id,
      task2: task4_id,
      dependency: RelationType.PRECEDES,
    });

    await st.step(
      "should return true for (task1, task2) if task1 is not blocked by task2 (task1 blocks task2)",
      async () => {
        // T1 BLOCKS T2 means T1 must precede T2. So (T1, T2) is valid.
        const result = await taskBankConcept._evaluateOrder({
          owner: userAlice,
          task1: task1_id,
          task2: task2_id,
        });
        assertEquals(result, { orderValid: true });
      },
    );

    await st.step(
      "should return false for (task2, task1) if task2 is blocked by task1",
      async () => {
        // T1 BLOCKS T2 means T2 is BLOCKED_BY T1. So (T2, T1) is invalid.
        const result = await taskBankConcept._evaluateOrder({
          owner: userAlice,
          task1: task2_id,
          task2: task1_id,
        });
        assertEquals(result, { orderValid: false });
      },
    );

    await st.step(
      "should return true for (task3, task2) if task3 precedes task2",
      async () => {
        // T2 REQUIRES T3 means T3 must precede T2. So (T3, T2) is valid.
        const result = await taskBankConcept._evaluateOrder({
          owner: userAlice,
          task1: task3_id,
          task2: task2_id,
        });
        assertEquals(result, { orderValid: true });
      },
    );

    await st.step(
      "should return false for (task2, task3) if task2 is required by task3",
      async () => {
        // T2 REQUIRES T3 means T2 cannot precede T3. So (T2, T3) is invalid.
        const result = await taskBankConcept._evaluateOrder({
          owner: userAlice,
          task1: task2_id,
          task2: task3_id,
        });
        assertEquals(result, { orderValid: false });
      },
    );

    await st.step("should return true for unrelated tasks", async () => {
      const taskU_id = (await taskBankConcept.addTask({
        adder: userAlice,
        name: "Unrelated Task U",
      }) as { task: ID }).task;
      const taskV_id = (await taskBankConcept.addTask({
        adder: userAlice,
        name: "Unrelated Task V",
      }) as { task: ID }).task;
      // No dependencies between U and V
      const result = await taskBankConcept._evaluateOrder({
        owner: userAlice,
        task1: taskU_id,
        task2: taskV_id,
      });
      assertEquals(result, { orderValid: true }); // U can precede V, V can precede U. Both orders are valid.
    });

    await st.step("should return true for a task with itself", async () => {
      const result = await taskBankConcept._evaluateOrder({
        owner: userAlice,
        task1: task1_id,
        task2: task1_id,
      });
      assertEquals(result, { orderValid: true });
    });

    await st.step(
      "should handle transitive dependencies for invalid order (e.g., Task1 -> Task2 -> Task3 means Task3 cannot precede Task1)",
      async () => {
        // Let's create a linear chain for easier testing: A -> B -> C
        const chainA = (await taskBankConcept.addTask({
          adder: userAlice,
          name: "Chain A",
        }) as { task: ID }).task;
        const chainB = (await taskBankConcept.addTask({
          adder: userAlice,
          name: "Chain B",
        }) as { task: ID }).task;
        const chainC = (await taskBankConcept.addTask({
          adder: userAlice,
          name: "Chain C",
        }) as { task: ID }).task;

        // A precedes B (A -> B)
        await taskBankConcept.addDependency({
          adder: userAlice,
          task1: chainA,
          task2: chainB,
          dependency: RelationType.PRECEDES,
        });
        // B precedes C (B -> C)
        await taskBankConcept.addDependency({
          adder: userAlice,
          task1: chainB,
          task2: chainC,
          dependency: RelationType.PRECEDES,
        });

        // Is (A, C) valid? Yes, A precedes C transitively. A does not block C.
        const resultAC = await taskBankConcept._evaluateOrder({
          owner: userAlice,
          task1: chainA,
          task2: chainC,
        });
        assertEquals(resultAC, { orderValid: true });

        // Is (C, A) valid? No, C is preceded by A transitively (C is FOLLOWS B, B is FOLLOWS A). C cannot precede A.
        const resultCA = await taskBankConcept._evaluateOrder({
          owner: userAlice,
          task1: chainC,
          task2: chainA,
        });
        assertEquals(resultCA, { orderValid: false });
      },
    );

    await st.step(
      "should return error for non-existent tasks in evaluateOrder",
      async () => {
        const taskX_id = (await taskBankConcept.addTask({
          adder: userAlice,
          name: "Eval Task X",
        }) as { task: ID }).task;
        const result1 = await taskBankConcept._evaluateOrder({
          owner: userAlice,
          task1: taskX_id,
          task2: "nonExistent" as ID,
        });
        assertExists((result1 as { error: string }).error);
        assert((result1 as { error: string }).error.includes("not found"));

        const result2 = await taskBankConcept._evaluateOrder({
          owner: userAlice,
          task1: "nonExistent" as ID,
          task2: taskX_id,
        });
        assertExists((result2 as { error: string }).error);
        assert((result2 as { error: string }).error.includes("not found"));
      },
    );
  });

  await t.step(
    "Principle Trace: users can enter tasks and denote their relationship to other existing tasks",
    async (st) => {
      // 1. User Alice creates three tasks: "Design UI", "Implement Backend", "Write Tests".
      const designUI_id = (await taskBankConcept.addTask({
        adder: userAlice,
        name: "Design UI",
      }) as { task: ID }).task;
      const implementBackend_id = (await taskBankConcept.addTask({
        adder: userAlice,
        name: "Implement Backend",
      }) as { task: ID }).task;
      const writeTests_id = (await taskBankConcept.addTask({
        adder: userAlice,
        name: "Write Tests",
      }) as { task: ID }).task;

      assertExists(designUI_id);
      assertExists(implementBackend_id);
      assertExists(writeTests_id);

      // 2. Alice adds dependencies:
      await st.step(
        "add 'Design UI' BLOCKS 'Implement Backend' (normalized to PRECEDES)",
        async () => {
          const depResult = await taskBankConcept.addDependency({
            adder: userAlice,
            task1: designUI_id,
            task2: implementBackend_id,
            dependency: RelationType.PRECEDES,
          });
          if ("error" in depResult) {
            throw new Error(`Unexpected error: ${depResult.error}`);
          }
          assertEquals(depResult.dependency!.depTask, implementBackend_id);

          const uiDeps = await taskBankConcept._getDependencies({
            getter: userAlice,
            task: designUI_id,
          });
          if ("error" in uiDeps) {
            throw new Error(`Unexpected error: ${uiDeps.error}`);
          }
          assertEquals(uiDeps.dependencies!.length, 1);
          assertEquals(uiDeps.dependencies![0].depTask, implementBackend_id);
          assertEquals(
            uiDeps.dependencies![0].depRelation,
            RelationType.PRECEDES,
          );

          const backendDeps = await taskBankConcept._getDependencies({
            getter: userAlice,
            task: implementBackend_id,
          });
          if ("error" in backendDeps) {
            throw new Error(`Unexpected error: ${backendDeps.error}`);
          }
          assertEquals(backendDeps.dependencies!.length, 1);
          assertEquals(backendDeps.dependencies![0].depTask, designUI_id);
          assertEquals(
            backendDeps.dependencies![0].depRelation,
            RelationType.FOLLOWS,
          );
        },
      );

      await st.step(
        "add 'Implement Backend' REQUIRES 'Design UI'",
        async () => {
          // This dependency (Backend REQUIRES UI) is distinct from (UI BLOCKS Backend) in terms of the specific RelationType,
          // but both ultimately enforce "Design UI must precede Implement Backend".
          const depResult = await taskBankConcept.addDependency({
            adder: userAlice,
            task1: implementBackend_id,
            task2: designUI_id,
            dependency: RelationType.PRECEDES,
          });
          if ("error" in depResult) {
            throw new Error(`Unexpected error: ${depResult.error}`);
          }
          assertEquals(depResult.dependency!.depTask, designUI_id);
          assertEquals(
            depResult.dependency!.depRelation,
            RelationType.PRECEDES,
          );

          const backendDeps = await taskBankConcept._getDependencies({
            getter: userAlice,
            task: implementBackend_id,
          });
          if ("error" in backendDeps) {
            throw new Error(`Unexpected error: ${backendDeps.error}`);
          }
          assertEquals(backendDeps.dependencies!.length, 2); // Now has FOLLOWS (from UI) and PRECEDES (to UI)
          assert(
            backendDeps.dependencies!.some((d) =>
              d.depTask === designUI_id &&
              d.depRelation === RelationType.PRECEDES
            ),
          );

          const uiDeps = await taskBankConcept._getDependencies({
            getter: userAlice,
            task: designUI_id,
          });
          if ("error" in uiDeps) {
            throw new Error(`Unexpected error: ${uiDeps.error}`);
          }
          assertEquals(uiDeps.dependencies!.length, 2); // Now has PRECEDES (to Backend) and FOLLOWS (from Backend)
          assert(
            uiDeps.dependencies!.some((d) =>
              d.depTask === implementBackend_id &&
              d.depRelation === RelationType.FOLLOWS
            ),
          );
        },
      );

      await st.step(
        "add 'Implement Backend' BLOCKS 'Write Tests'",
        async () => {
          const depResult = await taskBankConcept.addDependency({
            adder: userAlice,
            task1: implementBackend_id,
            task2: writeTests_id,
            dependency: RelationType.PRECEDES,
          });
          if ("error" in depResult) {
            throw new Error(`Unexpected error: ${depResult.error}`);
          }
          assertEquals(depResult.dependency!.depTask, writeTests_id);

          const backendDeps = await taskBankConcept._getDependencies({
            getter: userAlice,
            task: implementBackend_id,
          });
          if ("error" in backendDeps) {
            throw new Error(`Unexpected error: ${backendDeps.error}`);
          }
          assertEquals(backendDeps.dependencies!.length, 3); // FOLLOWS (UI), PRECEDES (UI), PRECEDES (Tests)
          assert(
            backendDeps.dependencies!.some((d) =>
              d.depTask === writeTests_id &&
              d.depRelation === RelationType.PRECEDES
            ),
          );

          const testDeps = await taskBankConcept._getDependencies({
            getter: userAlice,
            task: writeTests_id,
          });
          if ("error" in testDeps) {
            throw new Error(`Unexpected error: ${testDeps.error}`);
          }
          assertEquals(testDeps.dependencies!.length, 1);
          assertEquals(testDeps.dependencies![0].depTask, implementBackend_id);
          assertEquals(
            testDeps.dependencies![0].depRelation,
            RelationType.FOLLOWS,
          );
        },
      );

      // 3. Alice queries the order:
      await st.step(
        "query: Can 'Implement Backend' be before 'Design UI'? (Expected: False)",
        async () => {
          const result = await taskBankConcept._evaluateOrder({
            owner: userAlice,
            task1: implementBackend_id,
            task2: designUI_id,
          });
          assertEquals(result, { orderValid: false }); // Backend REQUIRES UI, so UI must precede Backend.
        },
      );

      await st.step(
        "query: Can 'Design UI' be before 'Implement Backend'? (Expected: True)",
        async () => {
          const result = await taskBankConcept._evaluateOrder({
            owner: userAlice,
            task1: designUI_id,
            task2: implementBackend_id,
          });
          assertEquals(result, { orderValid: true }); // UI BLOCKS Backend, so UI must precede Backend.
        },
      );

      await st.step(
        "query: Can 'Write Tests' be before 'Implement Backend'? (Expected: False)",
        async () => {
          const result = await taskBankConcept._evaluateOrder({
            owner: userAlice,
            task1: writeTests_id,
            task2: implementBackend_id,
          });
          assertEquals(result, { orderValid: false }); // Backend BLOCKS Tests, so Backend must precede Tests.
        },
      );

      await st.step(
        "query: Can 'Implement Backend' be before 'Write Tests'? (Expected: True)",
        async () => {
          const result = await taskBankConcept._evaluateOrder({
            owner: userAlice,
            task1: implementBackend_id,
            task2: writeTests_id,
          });
          assertEquals(result, { orderValid: true }); // Backend BLOCKS Tests, so Backend must precede Tests.
        },
      );

      await st.step(
        "query: Can 'Design UI' be before 'Write Tests'? (Expected: True, transitively)",
        async () => {
          // Path: Design UI (BLOCKS) -> Implement Backend (BLOCKS) -> Write Tests.
          // So Design UI must precede Write Tests.
          const result = await taskBankConcept._evaluateOrder({
            owner: userAlice,
            task1: designUI_id,
            task2: writeTests_id,
          });
          assertEquals(result, { orderValid: true });
        },
      );

      await st.step(
        "query: Can 'Write Tests' be before 'Design UI'? (Expected: False, transitively)",
        async () => {
          // Due to the transitive dependency Design UI -> Implement Backend -> Write Tests,
          // Write Tests cannot precede Design UI.
          const result = await taskBankConcept._evaluateOrder({
            owner: userAlice,
            task1: writeTests_id,
            task2: designUI_id,
          });
          assertEquals(result, { orderValid: false });
        },
      );
    },
  );

  await client.close();
});
