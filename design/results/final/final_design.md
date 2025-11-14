Complete your design document. Turn your design notes (recording your ideas, changes, and observations) into a coherent document of one to two pages in length that summarizes how your final design differs from your initial concept design in Assignment 2 and your visual design in Assignment 4b. Be succinct and to the point, and use bullets and subheadings to make it easy to navigate. Feel free to use diagrams and screenshots to illustrate your points if helpful. To refer to particular versions of concept specifications and prompts, use links to the immutable snapshots.
# Concepts
## TaskCatalog
Initial version (4a) is here: [[20251107_224007.34689672]]. The final version is here:[[design/concepts/TaskCatalog/TaskCatalog]]. If we go further back, we have [Assignment 2's version](https://github.com/Avril-Cui/61040-portfolio/blob/main/assignments/assignment2.md)
### Key changes to highlight
- Minor improvements in type naming consistency — e.g., string vs String in assignSchedule and deleteSchedule parameters are now consistent. Fixed other typos
- Most things remain unchanged. TaskCatalog is one of the earliest finalized concept.
- Adopted consistent action naming conventions (underscore prefix for internal queries like _getUserTasks and _getTask).
- **taskId** **casing standardized** — replaced all inconsistent forms (taskID, TaskID) with one uniform style (taskId).
- **slack** **type corrected** — changed from a vague String to a clear **Number**, explicitly defined as “buffer margin in minutes.”
- **Clarified timeBlockSet meaning** — note now says “unique ids for timeBlocks,” matching system-wide ID standards.
- **Improved optional attribute semantics** — optional fields are clearly labeled and consistently formatted.
- Added **_getTask(owner, taskId)** → enables retrieval of a single task (was missing before).
- Added **deleteSchedule(...)** → allows removing a time block, completing the scheduling lifecycle (old version only allowed assignment).
- Added **addPreDependence** **/** **removePreDependence** → explicitly manage dependencies, instead of embedding this logic inside a vague updateTask.
## RoutineLog
Initial version is here: [[20251107_223957.edd33927]]. The final version is here: [[design/concepts/RoutineLog/RoutineLog]]. If we go further back, we have [Assignment 2's version](https://github.com/Avril-Cui/61040-portfolio/blob/main/assignments/assignment2.md)
## Key changes
- Clarifies that linkedTaskId references a Task only by ID, not by object.
- Highlights that RoutineLog is non-intrusive to TaskCatalog -> modularity.
- **Simplified dependencies: **RoutineLog now references tasks only by **task ID**, not by the entire Task object.
- Clearly stated the design goal and principle: to record what actually happens and support reflection by comparing real vs planned schedules.
- Added **isComplete** **Flag** to explicitly mark when a session is finished — previously absent.
- Changed start and end from Time → **TimeStamp**, aligning with standard time types across your system.
- Replaced linkedTask Task (optional) with **linkedTaskId String (optional)**, clarifying that sessions only store task references, not full objects.
- Improved the comment for sessionId (“unique ID”) and standardized double slashes to // for all inline notes.
- Added a **new action** **completeTask(...)** to mark sessions as complete when their linked task is done — this didn’t exist before.
- Introduced a more structured **endSession(owner, session, isDone: Flag)**: Adds explicit completion flag control (isDone). Includes stronger “requires” and “effect” clauses.
- Renamed pauseSession → **interruptSession**, improving semantics (it now reflects both pause and reason tracking).
## AdaptiveSchedule
Initial version is here: [[20251107_224002.73cac963]]. The final version is here: [[design/concepts/AdaptiveSchedule/AdaptiveSchedule]]. If we go further back, we have [Assignment 2's version](https://github.com/Avril-Cui/61040-portfolio/blob/main/assignments/assignment2.md)
## Key changes
- **Refined concept scope:**
	- Old version depended on [User, Task, Schedule, Routine].   
    - Final version only depends on [User, GeminiLLM], reflecting a **modular and AI-augmented architecture** rather than tight coupling with other systems.
- Clarified that **AdaptiveSchedule reacts to reality** — not just adjusts plans — emphasizing the connection between _routine outcomes_ and _future planning_. 
- Expanded principle into two clear operational modes:
    - **Manual mode** (human adjustment).
    - **AI-augmented mode** (LLM-assisted rescheduling).
- **Expanded state model** with two distinct sets:
    1. **AdaptiveBlocks:** represent flexible time intervals with assigned tasks.
    2. **droppedTasks:** record tasks that cannot be fit into the new schedule (includes reasons).
- Introduced a **GeminiLLM object** for AI-powered reasoning and rescheduling.
- Replaced ambiguous Time with **TimeStamp** for precise temporal consistency.
- Added **taskIdSet** explicitly as a set of Strings (unique task identifiers), ensuring each adaptive block maintains well-defined links to tasks.
- Added an explicit **invariants section**, missing in the old version.
    - Ensures unique timeBlockId.
    - Validates that start < end.
    - Enforces single ownership per block.
    - Prevents duplicate adaptive blocks for the same (owner, start, end).
    - Guarantees task uniqueness within each block.
	- These invariants make the design **mathematically consistent** and easier to reason about during implementation.
- Added _getAdaptiveSchedule and _getDroppedTask queries for read operations. 
- Introduced **assignAdaptiveSchedule** for assigning tasks to blocks with ownership and duplication checks.        
- Added **unassignBlock** to symmetrically remove a task from a block.
- Added **deleteTimeBlock** and **deleteDroppedTask** for cleanup operations.
- Replaced generic “createAdaptiveSchedule” with explicit, modular operations (query, assign, AI request).
- Standardized all type names: TimeStamp, String, Flag, User, etc.
- Introduced a fully defined **requestAdaptiveScheduleAI** action:
    - Sends a structured prompt to the **GeminiLLM**.
    - LLM returns structured JSON containing adaptive blocks and dropped tasks.
    - The system integrates these results into the state automatically.
    - Returns both data (adaptiveBlocks, droppedTasks) and AI reasoning output.

## ScheduleTime
Initial version is here: [[20251107_224012.ba3b2deb]]. The final version is here: [[design/concepts/ScheduleTime/ScheduleTime]]. If we go further back, we have [Assignment 2's version](https://github.com/Avril-Cui/61040-portfolio/blob/main/assignments/assignment2.md)
## Key changes
- Refined **principle** section:
    - Old version gave two short lines; the final version expands with clear meaning—each user “owns” a set of time blocks representing daily schedule chunks.
    - Explicitly describes that users allocate tasks into these blocks, reinforcing user ownership and intent representation.
- Changed all time variables from **Time** **→** **TimeStamp**, ensuring precision and consistency across my ecosystem.
- Clarified taskIdSet comment to “unique ids identifying tasks” (explicit about reference type).
- Introduced **two query actions** for better modular access:
    - _getTaskSchedule(owner, timeBlockId) — fetches a specific time block (new).
    - _getUserSchedule(owner) — now clearly labeled as a query, returning all relevant blocks before the day’s end.
- Maintained and refined the **main mutating actions** (addTimeBlock, assignTimeBlock, removeTask):
    - Added stricter “requires” clauses (ensuring non-duplicate blocks and valid ownership).
    - Clarified “effect” statements with logical flow (create, add, return).
    - Renamed variables with $b$ notation for readability in effects.
- Fixed several subtle issues:
    - Replaced ambiguous Time type with TimeStamp for consistency.
    - Clarified that tasks are referenced **by IDs (Strings)**, not by internal task objects.
    - Ensured every action has a clear ownership condition (owner match).

# Design
1. My original UI design in 4b was for mobile use-cases. I redesigned the layout in the current version so it works well for desktop/website too.

2. I added a new page called Tasks, where users can view all tasks they created. The Tasks page gives a complete overview of everything on their "plate" — categorized, prioritized, and ready to be scheduled. Users can filter by date, category, or priority to focus only on what’s most important today.

3. I redesigned how AI is generating the schedule and analysis, so that the user can clear see the AI's thought process.

4. I revised some coloring so my theme aligns with my visual study in 4b.

5. I added a "DAG" display of task dependencies, as it was never shown in the previous version. Now, users can understand more clearly the dependency relationships between tasks.

My original UI is found in /visual folder.