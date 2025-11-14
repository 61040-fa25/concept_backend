---
timestamp: 'Mon Oct 20 2025 16:53:00 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251020_165300.cd4a9639.md]]'
content_id: 79914e4afdd9b1aef82e8c248e2f663e3b963aea0705860f70c5bd45645578c7
---

# concept: AdaptiveSchedule

```
concept AdaptiveSchedule [User, GeminiLLM]

purpose: Keeps the schedule responsive by moving, canceling, or creating tasks scheduled at future time blocks when reality diverges, ensuring that highest-priority tasks are achieved first while preserving user productivity.

principle:
	When actual sessions overrun or diverge from the plan, the adaptive scheduler adjusts subsequent planned tasks into adaptive time blocks.
	This process can operate in two modes:
		(1) Manual mode — user reviews deviations and adjusts future time blocks;
		(2) AI-augmented mode — provide necessary context to the LLM, then the LLM analyzes deviations, infers likely causes, and automatically proposes a revised schedule.

state
	a set of AdaptiveBlocks with
		a timeBlockId String // this is a unique id
		an owner User
		a start TimeStamp
		an end TimeStamp
		a taskIdSet set of Strings // contains unique ids identifying tasks

	a set of droppedTasks with
		a taskId String // unique id identifying tasks
		an owner User
		a reason String
  
	an llm GeminiLLM

invariants
	every adaptive block has a unique timeBlockId;
	start time of every adaptive block is before end time;
	every adaptive block has exactly one owner;
	only one adaptive block exists given (owner, start, end);
	every taskId in each adaptive block's taskIdSet is unique;

actions
	_getAdaptiveSchedule (owner: User): (adaptiveBlockTable: set of AdaptiveBlocks)
		// this is a query
		requires:
			exists at least one adaptive block under this user
		effect:
			return a set of all adaptive blocks under this owner with end before the end of the day
	
	_getDroppedTask(owner: User): (droppedTaskSet: set of droppedTasks)
		// this is a query
		requires:
			exists at least one dropped task with this owner
		effect:
			returns all dropped tasks for the user (tasks that couldn't be scheduled due to insufficient time)
	
	addTimeBlock (owner: User, start: TimeStamp, end: TimeStamp) : (timeBlockId: String)
		requires:
			start and end are valid TimeStamps;
			start is before end;
			no adaptive time block exists with this owner, start, and end;
		effect:
			create a new adaptive time block $b$ with this owner, start, and end;
			assign $b$ an empty taskIdSet;
			return b.timeBlockId;
   
	assignAdaptiveSchedule (owner: User, taskId: String, start: TimeStamp, end: TimeStamp): (timeBlockId: String)
		requires:
			if exists adaptive block $b$ with matching (owner, start, end), then taskId is not in b.taskIdSet;
		effect:
			if b doesn't exist, create it with owner, start, and end (same logic as addTimeBlock);
			add taskId to this adaptive block's taskIdSet;
	
	async requestAdaptiveScheduleAI (owner: User, contexted_prompt: String): (adaptiveBlockTable: set of AdaptiveBlocks, droppedTaskSet: set of droppedTasks)
		effect:
			send the structured contexted_prompt to the llm;
			llm returns a structured JSON response including:
				- adaptiveBlocks (with start/end times and assigned task ids)
				- droppedTasks (tasks removed due to insufficient time)
				  - each droppedTask has a task id and a reason for dropping
			for each adaptive block in llm's returned adaptiveBlocks, assign the task id to the corresponding adaptive block with matching (owner, start, end) using the same logic as assignAdaptiveSchedule;
			for each dropped task in droppedTasks, add to state with (taskId, owner, reason) 
			return the set of all AdaptiveBlocks and the set of all droppedTasks under this owner;

	unassignBlock (owner: User, taskId: String, timeBlockId: String)
		requires:
			 exists an adaptive block with matching owner and timeBlockId;
			 taskId exists in this time block's taskIdSet;
		effect:
			remove taskId from that block's taskIdSet
```
