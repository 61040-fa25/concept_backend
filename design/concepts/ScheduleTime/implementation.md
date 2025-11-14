[@concept-design-overview](../../background/concept-design-overview.md)

[@concept-design-overview](../../background/concept-design-overview.md)

[@implementing-concepts](../../background/implementing-concepts.md)

# implement: TaskCatalog
# response:

# concept: ScheduleTime
![@ScheduleTime](ScheduleTime.md)

# file: src/concepts/ScheduleTime/ScheduleTime.ts
# response:



# response:

```typescript
import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

// Declare collection prefix, use concept name
const PREFIX = "ScheduleTime" + ".";

// Generic types of this concept
type User = ID;
type TimeStamp = number; // Represents time as a Unix timestamp (milliseconds)
type TaskId = string; // Unique ID for a task

/**
 * a set of TimeBlocks with
 *   a timeBlockId String
 *   an owner User
 *   a start TimeStamp
 *   an end TimeStamp
 *   a taskIdSet set of Strings
 */
interface TimeBlockDocument {
  _id: ID; // Mapped from timeBlockId
  owner: User;
  start: TimeStamp;
  end: TimeStamp;
  taskIdSet: TaskId[];
}

export default class ScheduleTimeConcept {
  timeBlocks: Collection<TimeBlockDocument>;

  constructor(private readonly db: Db) {
    this.timeBlocks = this.db.collection(PREFIX + "timeBlocks");
  }

  /**
   * _getUserSchedule (owner: User): (timeBlock: TimeBlockDocument)[]
   *
   * **requires** exists at least one time block under this owner
   *
   * **effects** returns a set of all time blocks under this owner with end greater than the current time
   */
  async _getUserSchedule({ owner }: { owner: User }): Promise<
    Array<{ timeBlock: TimeBlockDocument }> | { error: string }
  > {
    const currentTime = Date.now();
    const blocks = await this.timeBlocks.find({
      owner,
      end: { $gte: currentTime }, // Filter for time blocks whose end is in the future
    }).toArray();

    if (blocks.length === 0) {
      return { error: `No future time blocks found for owner ${owner}` };
    }

    return blocks.map((block) => ({ timeBlock: block }));
  }

  /**
   * addTimeBlock (owner: User, start: TimeStamp, end: TimeStamp): Empty
   *
   * **requires** no time block already exists with this owner, start, and end
   *
   * **effects** create a new time block $b$ with this owner, start, and end, and empty taskIdSet
   */
  async addTimeBlock(
    { owner, start, end }: { owner: User; start: TimeStamp; end: TimeStamp },
  ): Promise<Empty | { error: string }> {
    // Check if a time block with the exact owner, start, and end already exists
    const existingBlock = await this.timeBlocks.findOne({ owner, start, end });
    if (existingBlock) {
      return {
        error:
          `Time block already exists for owner ${owner} from ${start} to ${end}`,
      };
    }

    const newTimeBlock: TimeBlockDocument = {
      _id: freshID() as ID,
      owner,
      start,
      end,
      taskIdSet: [],
    };

    await this.timeBlocks.insertOne(newTimeBlock);
    return {};
  }

  /**
   * assignTimeBlock (owner: User, taskId: String, start: TimeStamp, end: TimeStamp): (timeBlockId: String)
   *
   * **requires** if exists time block $b$ with matching (owner, start, end), then taskId is not in b.taskIdSet
   *
   * **effects** if b doesn't exist, create it with owner, start, and end (same logic as addTimeBlock);
   *             add taskId to b.taskIdSet;
   *             return b._id as timeBlockId;
   */
  async assignTimeBlock(
    {
      owner,
      taskId,
      start,
      end,
    }: { owner: User; taskId: TaskId; start: TimeStamp; end: TimeStamp },
  ): Promise<{ timeBlockId: ID } | { error: string }> {
    let block = await this.timeBlocks.findOne({ owner, start, end });

    if (block) {
      // If block exists, check if taskId is already in taskIdSet
      if (block.taskIdSet.includes(taskId)) {
        return {
          error:
            `Task ${taskId} is already assigned to time block ${block._id} for owner ${owner}`,
        };
      }
      // Add taskId to existing block
      await this.timeBlocks.updateOne(
        { _id: block._id },
        { $addToSet: { taskIdSet: taskId } }, // $addToSet ensures uniqueness
      );
      // Retrieve the updated block to ensure we return the current state
      block = await this.timeBlocks.findOne({ _id: block._id });
    } else {
      // If block doesn't exist, create it
      const newTimeBlock: TimeBlockDocument = {
        _id: freshID() as ID,
        owner,
        start,
        end,
        taskIdSet: [taskId],
      };
      await this.timeBlocks.insertOne(newTimeBlock);
      block = newTimeBlock; // Use the newly created block
    }

    if (!block) {
      // This case should ideally not happen if insertOne/findOne works as expected
      return { error: "Failed to find or create time block" };
    }

    return { timeBlockId: block._id };
  }

  /**
   * removeTask (owner: User, taskId: String, timeBlockId: String): Empty
   *
   * **requires** exists a time block $b$ with matching owner and timeBlockId;
   *              taskId exists in b.taskIdSet;
   *
   * **effects** remove taskId from b.taskIdSet
   */
  async removeTask(
    { owner, taskId, timeBlockId }: {
      owner: User;
      taskId: TaskId;
      timeBlockId: ID;
    },
  ): Promise<Empty | { error: string }> {
    const block = await this.timeBlocks.findOne({
      _id: timeBlockId,
      owner,
    });

    if (!block) {
      return {
        error:
          `No time block found with ID ${timeBlockId} for owner ${owner}`,
      };
    }

    if (!block.taskIdSet.includes(taskId)) {
      return {
        error:
          `Task ${taskId} not found in time block ${timeBlockId} for owner ${owner}`,
      };
    }

    await this.timeBlocks.updateOne(
      { _id: timeBlockId },
      { $pull: { taskIdSet: taskId } },
    );

    return {};
  }
}
```

# my revised implementation

```
import { Collection, Db } from "npm:mongodb"; // Removed FindAndModifyResult import

import { Empty, ID } from "@utils/types.ts";

import { freshID } from "@utils/database.ts";

  

// Declare collection prefix, use concept name

const PREFIX = "RoutineLog" + ".";

  

// Generic types of this concept

type User = ID;

type SessionId = ID;

type LinkedTaskId = ID;

  

/**

* A set of Sessions with

* an owner User

* a sessionName String

* a sessionId String (unique ID)

* an isPaused Flag

* an isActive Flag

* a start TimeStamp (optional)

* an end TimeStamp (optional)

* a linkedTaskId String (optional)

* an interruptReason String (optional)

*/

interface Session {

_id: SessionId; // Use _id for sessionId as it's a unique ID for MongoDB

owner: User;

sessionName: string;

isPaused: boolean;

isActive: boolean;

start?: string; // ISO 8601 string for TimeStamp

end?: string; // ISO 8601 string for TimeStamp

linkedTaskId?: LinkedTaskId;

interruptReason?: string;

}

  

/**

* RoutineLog Concept

*

* purpose: Records what actually happened throughout the day as time-stamped sessions,

* optionally linked to planned tasks. Allow users to reflect on their planned

* schedule by comparing with logged routine sessions.

*

* principle: After a user starts and finishes a session, the system records its

* actual duration and possible reasons of interruption.

*/

export default class RoutineLogConcept {

sessions: Collection<Session>;

  

constructor(private readonly db: Db) {

this.sessions = this.db.collection<Session>(PREFIX + "sessions");

}

  

/**

* getUserSessions (owner: User): (sessionTable: set of Sessions)

*

* **requires** exists at least one session with this owner

*

* **effects** return ALL sessions under this owner

*/

async getUserSessions(

{ owner }: { owner: User },

): Promise<{ sessionTable: Session[] } | { error: string }> {

console.log(`Action: getUserSessions for owner: ${owner}`);

const userSessions = await this.sessions.find({ owner }).toArray();

  

// The 'requires' clause strictly implies an error if no sessions exist.

// However, for queries, returning an empty array is generally more robust

// and allows the consumer to handle "no results" gracefully.

// If strict adherence to 'requires' is needed, uncomment the following block:

/*

if (userSessions.length === 0) {

console.log(`Error: No sessions found for user ${owner} (strict requirement).`);

return { error: `No sessions found for user ${owner}` };

}

*/

console.log(

`Effect: Found ${userSessions.length} sessions for owner ${owner}.`,

);

return { sessionTable: userSessions };

}

  

/**

* createSession(owner: User, sessionName: String, linkedTaskId?: String): (session: Session)

*

* **effects**

* generate a unique sessionId;

* create a session owned by owner with sessionName;

* if linkedTaskId is provided, assign it to this session;

* assign start and end for this session as None;

* assign isPaused as False and isActive as False;

* assign interruptReason as None;

* return this newly created session;

*/

async createSession(

{ owner, sessionName, linkedTaskId }: {

owner: User;

sessionName: string;

linkedTaskId?: LinkedTaskId;

},

): Promise<{ session: Session } | { error: string }> {

console.log(

`Action: createSession by owner: ${owner}, name: "${sessionName}", linkedTaskId: ${

linkedTaskId || "None"

}`,

);

const newSessionId = freshID() as SessionId;

const newSession: Session = {

_id: newSessionId,

owner,

sessionName,

isPaused: false,

isActive: false,

start: undefined,

end: undefined,

linkedTaskId: linkedTaskId,

interruptReason: undefined,

};

  

try {

await this.sessions.insertOne(newSession);

console.log(`Effect: Session created with ID: ${newSession._id}`);

return { session: newSession };

} catch (e: any) {

console.error("Error creating session:", e.message);

return { error: `Failed to create session: ${e.message}` };

}

}

  

/**

* startSession(owner: User, session: { _id: SessionId }): Empty

*

* **requires**

* session exists and is owned by owner and has isActive as False

*

* **effects**

* get the current TimeStamp;

* set session.start = current TimeStamp;

* set session.isActive as True

*/

async startSession(

{ owner, session: { _id: sessionId } }: {

owner: User;

session: { _id: SessionId };

},

): Promise<Empty | { error: string }> {

console.log(

`Action: startSession for owner: ${owner}, sessionId: ${sessionId}`,

);

const currentTime = new Date().toISOString();

  

// The result is inferred as WithId<Session> | null by Deno's npm:mongodb types.

const result = await this.sessions.findOneAndUpdate(

{ _id: sessionId, owner, isActive: false }, // Requirements: exists, owned by owner, not active

{ $set: { start: currentTime, isActive: true } },

{ returnDocument: "after" }, // Return the updated document

);

  

if (!result) { // Check if result itself is null (no document found/updated)

console.log(

`Error: startSession failed. Session not found, not owned by user, or already active.`,

);

return {

error: "Session not found, not owned by user, or already active.",

};

}

  

console.log(`Effect: Session ${sessionId} started at ${currentTime}.`);

return {};

}

  

/**

* endSession(owner: User, session: { _id: SessionId }): Empty

*

* **requires**

* session exists and is owned by owner and has isActive as True

*

* **effects**

* get the current TimeStamp;

* set session.end = current TimeStamp;

* set session.isActive as False;

*/

async endSession(

{ owner, session: { _id: sessionId } }: {

owner: User;

session: { _id: SessionId };

},

): Promise<Empty | { error: string }> {

console.log(

`Action: endSession for owner: ${owner}, sessionId: ${sessionId}`,

);

const currentTime = new Date().toISOString();

  

// The result is inferred as WithId<Session> | null by Deno's npm:mongodb types.

const result = await this.sessions.findOneAndUpdate(

{ _id: sessionId, owner, isActive: true }, // Requirements: exists, owned by owner, currently active

{ $set: { end: currentTime, isActive: false } },

{ returnDocument: "after" },

);

  

if (!result) { // Check if result itself is null (no document found/updated)

console.log(

`Error: endSession failed. Session not found, not owned by user, or not currently active.`,

);

return {

error: "Session not found, not owned by user, or not currently active.",

};

}

  

console.log(`Effect: Session ${sessionId} ended at ${currentTime}.`);

return {};

}

  

/**

* interruptSession(owner: User, session: { _id: SessionId }, interruptReason: String): Empty

*

* **requires**

* session exists and is owned by owner and has isActive as True;

* session has isPaused as False;

*

* **effects**

* get the current TimeStamp;

* set session.end = current TimeStamp;

* set session.isPaused = True;

* set session.interruptReason = interruptReason;

*/

async interruptSession(

{ owner, session: { _id: sessionId }, interruptReason }: {

owner: User;

session: { _id: SessionId };

interruptReason: string;

},

): Promise<Empty | { error: string }> {

console.log(

`Action: interruptSession for owner: ${owner}, sessionId: ${sessionId}, reason: "${interruptReason}"`,

);

const currentTime = new Date().toISOString();

  

// The result is inferred as WithId<Session> | null by Deno's npm:mongodb types.

const result = await this.sessions.findOneAndUpdate(

{ _id: sessionId, owner, isActive: true, isPaused: false }, // Requirements: exists, owned by owner, active, not paused

{

$set: {

end: currentTime,

isPaused: true,

interruptReason: interruptReason,

isActive: false,

},

}, // Also set isActive to false as it's an end event

{ returnDocument: "after" },

);

  

if (!result) { // Check if result itself is null (no document found/updated)

console.log(

`Error: interruptSession failed. Session not found, not owned by user, not active, or already paused.`,

);

return {

error:

"Session not found, not owned by user, not active, or already paused.",

};

}

  

console.log(

`Effect: Session ${sessionId} interrupted at ${currentTime} with reason: "${interruptReason}".`,

);

return {};

}

}
```