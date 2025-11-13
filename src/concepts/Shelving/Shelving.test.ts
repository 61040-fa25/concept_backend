import { assertEquals, assertNotEquals, assertArrayIncludes, assertStrictEquals } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import ShelvingConcept from "./ShelvingConcept.ts";
import { ID } from "@utils/types.ts";

Deno.test("Concept: Shelving", async (t) => {
    const [db, client] = await testDb();
    const shelving = new ShelvingConcept(db);

    const USER_1 = "user1" as ID;
    const USER_2 = "user2" as ID;
    const BOOK_A = "bookA" as ID;
    const BOOK_B = "bookB" as ID;
    const BOOK_C = "bookC" as ID;

    let shelfA_user1: ID; // For bookA by user1
    let shelfB_user1: ID; // For bookB by user1
    let shelfA_user2: ID; // For bookA by user2

    console.log("--- Starting Shelving Concept Tests ---");


    await t.step("Action: addBook", async (testStep) => {
        console.log("\n--- Testing addBook action ---");

        await testStep.step("1. Successfully add a book to a user's shelf", async () => {
            console.log(`Trace: User '${USER_1}' adds Book '${BOOK_A}' with status 'want to read' (0).`);
            const result = await shelving.addBook({ user: USER_1, status: 0, book: BOOK_A });

            assertNotEquals((result as { error: string }).error, "book already added", "Expected addBook to succeed.");
            assertEquals(typeof (result as { shelf: ID }).shelf, "string", "Expected a shelf ID to be returned.");
            shelfA_user1 = (result as { shelf: ID }).shelf;

            // Verify effect: shelf exists and has correct properties
            const userShelf = await shelving._getUserShelfByBook({ user: USER_1, book: BOOK_A });
            assertStrictEquals(userShelf.length, 1, "expected book to be found on shelf")
            assertStrictEquals(userShelf[0]?.shelfNumber, 0, "Expected bookA to be on user1's 'want to read' shelf.");
            console.log(`Confirmation: Shelf '${shelfA_user1}' created for user '${USER_1}' and book '${BOOK_A}' with status 0.`);
        });

        await testStep.step("2. Fail to add the same book by the same user (requires check)", async () => {
            console.log(`Trace: User '${USER_1}' attempts to add Book '${BOOK_A}' again.`);
            const result = await shelving.addBook({ user: USER_1, status: 1, book: BOOK_A });

            assertEquals((result as { error: string }).error, "book already added", "Expected addBook to fail because book is already on shelf.");
            console.log(`Confirmation: Attempt to add duplicate failed as expected: '${(result as { error: string }).error}'.`);
        });

        await testStep.step("3. Add a different book for the same user", async () => {
            console.log(`Trace: User '${USER_1}' adds Book '${BOOK_B}' with status 'reading' (1).`);
            const result = await shelving.addBook({ user: USER_1, status: 1, book: BOOK_B });
            assertNotEquals((result as { error: string }).error, "book already added", "Expected addBook for a different book to succeed.");
            shelfB_user1 = (result as { shelf: ID }).shelf;
            console.log(`Confirmation: Shelf '${shelfB_user1}' created for user '${USER_1}' and book '${BOOK_B}' with status 1.`);
        });

        await testStep.step("4. Add the same book for a different user", async () => {
            console.log(`Trace: User '${USER_2}' adds Book '${BOOK_A}' with status 'read' (2).`);
            const result = await shelving.addBook({ user: USER_2, status: 2, book: BOOK_A });
            assertNotEquals((result as { error: string }).error, "book already added", "Expected addBook for a different user to succeed.");
            shelfA_user2 = (result as { shelf: ID }).shelf;
            console.log(`Confirmation: Shelf '${shelfA_user2}' created for user '${USER_2}' and book '${BOOK_A}' with status 2.`);
        });
    });

    await t.step("Action: changeStatus", async (testStep) => {
        console.log("\n--- Testing changeStatus action ---");

        await testStep.step("1. Successfully change the status of an existing shelf", async () => {
            console.log(`Trace: User '${USER_1}' changes status of Book '${BOOK_A}' (shelf '${shelfA_user1}') from 'want to read' (0) to 'reading' (1).`);
            const result = await shelving.changeStatus({ shelf: shelfA_user1, newStatus: 1 });

            assertEquals(Object.keys(result).length, 1, "Expected changeStatus to return an empty object on success.");

            // Verify effect: status is updated
            const userShelfStatuses = await shelving._getUserShelfByBook({ user: USER_1, book: BOOK_A });
            assertStrictEquals(userShelfStatuses.length, 1, "expected book to be found on shelf")
            assertStrictEquals(userShelfStatuses[0]?.shelfNumber, 1, "Expected bookA to be on user1's 'want to read' shelf.");
            // assertArrayIncludes(userShelfStatuses, [1], "Expected bookA's status for user1 to be updated to 1.");
            console.log(`Confirmation: Status of shelf '${shelfA_user1}' updated to 1.`);
        });

        await testStep.step("2. Fail to change status for a non-existent shelf (requires check)", async () => {
            const nonExistentShelf = "nonexistentShelf" as ID;
            console.log(`Trace: Attempting to change status for non-existent shelf '${nonExistentShelf}'.`);
            const result = await shelving.changeStatus({ shelf: nonExistentShelf, newStatus: 2 });

            assertEquals((result as { error: string }).error, `book doesn't exist`, "Expected changeStatus to fail for non-existent shelf.");
            console.log(`Confirmation: Attempt to change status for non-existent shelf failed as expected: '${(result as { error: string }).error}'.`);
        });
    });

    await t.step("Query: _getUserShelfByBook", async () => {
        console.log("\n--- Testing _getUserShelfByBook query ---");

        console.log(`Trace: Querying status for user '${USER_1}' and book '${BOOK_A}'.`);
        const statuses = await shelving._getUserShelfByBook({ user: USER_1, book: BOOK_A });
        assertStrictEquals(statuses.length, 1, "expected book to be found on shelf")
        assertStrictEquals(statuses[0]?.shelfNumber, 1, "Expected bookA to be on user1's 'want to read' shelf.");
        // assertArrayIncludes(statuses, [1], "Expected _getUserShelfByBook to return status 1 for BOOK_A by USER_1.");
        assertEquals(statuses.length, 1, "Expected only one status for a specific user and book.");
        console.log(`Confirmation: User '${USER_1}' has book '${BOOK_A}' with status: ${statuses}.`);

        console.log(`Trace: Querying status for user '${USER_2}' and book '${BOOK_A}'.`);
        const statuses2 = await shelving._getUserShelfByBook({ user: USER_2, book: BOOK_A });
        assertStrictEquals(statuses2.length, 1, "expected book to be found on shelf")
        assertStrictEquals(statuses2[0]?.shelfNumber, 2, "Expected bookA to be on user1's 'want to read' shelf.");
        // assertArrayIncludes(statuses2, [2], "Expected _getUserShelfByBook to return status 2 for BOOK_A by USER_2.");
        console.log(`Confirmation: User '${USER_2}' has book '${BOOK_A}' with status: ${statuses2}.`);

        console.log(`Trace: Querying status for non-existent book 'BOOK_C' by user '${USER_1}'.`);
        const noStatuses = await shelving._getUserShelfByBook({ user: USER_1, book: BOOK_C });
        assertEquals(noStatuses.length, 0, "Expected an empty array for a book not shelved by the user.");
        console.log(`Confirmation: No status found for book 'BOOK_C' by user '${USER_1}'.`);
    });

    await t.step("Query: _getShelvesByBook", async () => {
        console.log("\n--- Testing _getShelvesByBook query ---");

        console.log(`Trace: Querying all shelves for book '${BOOK_A}'.`);
        const groupedShelves = await shelving._getShelvesByBook({ book: BOOK_A });

        // Statuses: 0 = 'want to read', 1 = 'reading', 2 = 'read', 3 ='did not finish'
        // For BOOK_A: USER_1 has status 1 (reading), USER_2 has status 2 (read)
        assertEquals(groupedShelves[0].shelves.length, 0, "Expected no shelves with status 0 for BOOK_A.");
        assertEquals(groupedShelves[1].shelves.length, 1, "Expected 1 shelf with status 1 for BOOK_A.");
        assertEquals(groupedShelves[2].shelves.length, 1, "Expected 1 shelf with status 2 for BOOK_A.");
        assertEquals(groupedShelves[3].shelves.length, 0, "Expected no shelves with status 3 for BOOK_A.");

        assertEquals(groupedShelves[1].shelves[0].user, USER_1, "Expected user1 in status 1 for BOOK_A.");
        assertEquals(groupedShelves[2].shelves[0].user, USER_2, "Expected user2 in status 2 for BOOK_A.");

        console.log("Confirmation: _getShelvesByBook for BOOK_A correctly groups by status.");
        console.log(`  Status 1 (reading): ${groupedShelves[1].shelves.map(s => s.user).join(', ')}`);
        console.log(`  Status 2 (read): ${groupedShelves[2].shelves.map(s => s.user).join(', ')}`);
    });

    await t.step("Query: _getBooksByUser", async () => {
        console.log("\n--- Testing _getBooksByUser query ---");

        console.log(`Trace: Querying all books shelved by user '${USER_1}'.`);
        const groupedBooks = await shelving._getBooksByUser({ user: USER_1 });

        // For USER_1: BOOK_A has status 1 (reading), BOOK_B has status 1 (reading)
        assertEquals(groupedBooks[0].shelves.length, 0, "Expected no books with status 0 for USER_1.");
        assertArrayIncludes(groupedBooks[1].shelves, [BOOK_A, BOOK_B], "Expected BOOK_A and BOOK_B in status 1 for USER_1.");
        assertEquals(groupedBooks[1].shelves.length, 2, "Expected 2 books with status 1 for USER_1.");
        assertEquals(groupedBooks[2].shelves.length, 0, "Expected no books with status 2 for USER_1.");

        console.log("Confirmation: _getBooksByUser for USER_1 correctly groups by status.");
        console.log(`  Status 1 (reading): ${groupedBooks[1].shelves.join(', ')}`);
    });

    await t.step("Query: _getAllShelves", async () => {
        console.log("\n--- Testing _getAllShelves query ---");

        console.log("Trace: Querying all shelves in the system.");
        const allGroupedShelves = await shelving._getAllShelves({});

        // Current state:
        // USER_1, BOOK_A, status 1
        // USER_1, BOOK_B, status 1
        // USER_2, BOOK_A, status 2

        assertEquals(allGroupedShelves[0].shelves.length, 0, "Expected no shelves with status 0 globally.");
        assertEquals(allGroupedShelves[1].shelves.length, 2, "Expected 2 shelves with status 1 globally.");
        assertEquals(allGroupedShelves[2].shelves.length, 1, "Expected 1 shelf with status 2 globally.");
        assertEquals(allGroupedShelves[3].shelves.length, 0, "Expected no shelves with status 3 globally.");

        const status1Shelves = allGroupedShelves[1].shelves.map(s => `${s.user}:${s.book}`);
        assertArrayIncludes(status1Shelves, [`${USER_1}:${BOOK_A}`, `${USER_1}:${BOOK_B}`], "Expected correct shelves in status 1.");

        const status2Shelves = allGroupedShelves[2].shelves.map(s => `${s.user}:${s.book}`);
        assertArrayIncludes(status2Shelves, [`${USER_2}:${BOOK_A}`], "Expected correct shelves in status 2.");

        console.log("Confirmation: _getAllShelves correctly groups all shelves by status.");
        console.log(`  Status 1 (reading) shelves: ${status1Shelves.join(', ')}`);
        console.log(`  Status 2 (read) shelves: ${status2Shelves.join(', ')}`);
    });

    await t.step("Principle: Categorize books based on read status for each user", async () => {
        console.log("\n--- Testing Principle: User book categorization over time ---");
        // Principle: A user will mark a book as 'read', 'reading', 'want to read', or 'did not finish',
        // which they then can view at a later point in time

        const P_USER = "principleUser" as ID;
        const P_BOOK_X = "principleBookX" as ID;
        const P_BOOK_Y = "principleBookY" as ID;
        let p_shelfX: ID;
        let p_shelfY: ID;

        console.log(`Trace: User '${P_USER}' interacts with Book '${P_BOOK_X}' and '${P_BOOK_Y}'.`);

        console.log("Step 1: User adds BookX as 'want to read' (0).");
        const addXResult = await shelving.addBook({ user: P_USER, status: 0, book: P_BOOK_X });
        p_shelfX = (addXResult as { shelf: ID }).shelf;
        assertNotEquals(p_shelfX, undefined, "Expected shelf for BookX to be created.");
        assertEquals((await shelving._getUserShelfByBook({ user: P_USER, book: P_BOOK_X }))[0]?.shelfNumber, 0);

        console.log("Step 2: User starts reading BookX, changes status to 'reading' (1).");
        await shelving.changeStatus({ shelf: p_shelfX, newStatus: 1 });
        assertEquals((await shelving._getUserShelfByBook({ user: P_USER, book: P_BOOK_X }))[0]?.shelfNumber, 1);

        console.log("Step 3: User finishes BookX, changes status to 'read' (2).");
        await shelving.changeStatus({ shelf: p_shelfX, newStatus: 2 });
        assertEquals((await shelving._getUserShelfByBook({ user: P_USER, book: P_BOOK_X }))[0]?.shelfNumber, 2);

        console.log("Step 4: User adds BookY as 'want to read' (0).");
        const addYResult = await shelving.addBook({ user: P_USER, status: 0, book: P_BOOK_Y });
        p_shelfY = (addYResult as { shelf: ID }).shelf;
        assertNotEquals(p_shelfY, undefined, "Expected shelf for BookY to be created.");
        assertEquals((await shelving._getUserShelfByBook({ user: P_USER, book: P_BOOK_Y }))[0]?.shelfNumber, 0);

        console.log("Step 5: User starts BookY but abandons it, changes status to 'did not finish' (3).");
        await shelving.changeStatus({ shelf: p_shelfY, newStatus: 3 });
        assertEquals((await shelving._getUserShelfByBook({ user: P_USER, book: P_BOOK_Y }))[0]?.shelfNumber, 3);

        console.log("Step 6: Verify _getBooksByUser reflects the final states.");
        const finalUserBooks = await shelving._getBooksByUser({ user: P_USER });
        assertEquals(finalUserBooks[0].shelves.length, 0, "Expected no 'want to read' books for principle user.");
        assertEquals(finalUserBooks[1].shelves.length, 0, "Expected no 'reading' books for principle user.");
        assertArrayIncludes(finalUserBooks[2].shelves, [P_BOOK_X], "Expected BookX under 'read' books.");
        assertArrayIncludes(finalUserBooks[3].shelves, [P_BOOK_Y], "Expected BookY under 'did not finish' books.");
        console.log(`Confirmation: User '${P_USER}' books are correctly categorized:`);
        console.log(`  'read' (2): ${finalUserBooks[2].shelves.join(', ')}`);
        console.log(`  'did not finish' (3): ${finalUserBooks[3].shelves.join(', ')}`);

        console.log("The principle is fully modeled and demonstrated by these actions and queries.");
    });

    await t.step("Action: removeBook", async (testStep) => {
        console.log("\n--- Testing removeBook action ---");

        await testStep.step("1. Successfully remove an existing shelf", async () => {
            console.log(`Trace: User '${USER_1}' removes Book '${BOOK_B}' (shelf '${shelfB_user1}').`);
            const result = await shelving.removeBook({ shelf: shelfB_user1 });

            assertEquals(Object.keys(result).length, 1, "Expected removeBook to return an empty object on success.");

            // Verify effect: shelf no longer exists
            const userShelf = await shelving._getUserShelfByBook({ user: USER_1, book: BOOK_B });
            assertEquals(userShelf.length, 0, "Expected bookB to be removed from user1's shelves.");
            console.log(`Confirmation: Shelf '${shelfB_user1}' for book '${BOOK_B}' by user '${USER_1}' successfully removed.`);
        });

        await testStep.step("2. Fail to remove a non-existent shelf (requires check)", async () => {
            const nonExistentShelf = "nonexistentShelf2" as ID;
            console.log(`Trace: Attempting to remove non-existent shelf '${nonExistentShelf}'.`);
            const result = await shelving.removeBook({ shelf: nonExistentShelf });

            assertEquals((result as { error: string }).error, `book doesn't exist`, "Expected removeBook to fail for non-existent shelf.");
            console.log(`Confirmation: Attempt to remove non-existent shelf failed as expected: '${(result as { error: string }).error}'.`);
        });
    });

    await client.close();
    console.log("--- Shelving Concept Tests Finished ---");
});
