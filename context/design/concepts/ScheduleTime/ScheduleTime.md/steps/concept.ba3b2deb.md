---
timestamp: 'Fri Nov 07 2025 22:40:12 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251107_224012.ba3b2deb.md]]'
content_id: ba3b2deb7eda107debcd2faa099780e6eb9086b77350a29b63f6f665422a0ed1
---

# concept: ScheduleTime

```
concept ScheduleTime [User]

purpose: Manages users' intended schedule of future tasks by allowing them to assign tasks to each time block

principle: Each user owns a set of time blocks reflecting chunks of time during the day. Users can allocate tasks to one or more time blocks. The time blocks reflect the user's intended schedule of the day.

state
	a set of TimeBlocks with
		a timeBlockId String // this is a unique id
		an owner User
		a start TimeStamp
		an end TimeStamp
		a taskIdSet set of Strings // contains unique ids identifying tasks

actions
	_getTaskSchedule (owner: User, timeBlockId: String): (timeBlock: TimeBlock)
		// this is a query
		requires:
			exists at least one time block under this owner with matching timeBlockId
		effect:
			return this time block
		
	_getUserSchedule (owner: User): (timeBlockTable: set of TimeBlocks)
		// this is a query
		requires:
			exists at least one time block under this owner
		effect:
			return a set of all time blocks under this owner with end before the end of the day

	addTimeBlock (owner: User, start: TimeStamp, end: TimeStamp)
		requires:
			no time block already exists with this owner, start, and end
		effect:
			create a new time block $b$ with this owner, start, and end, and empty taskIdSet

	assignTimeBlock (owner: User, taskId: String, start: TimeStamp, end: TimeStamp): (timeBlockId: String)
		requires:
			if exists time block $b$ with matching (owner, start, end), then taskId is not in b.taskIdSet
		effect:
			if b doesn't exist, create it with owner, start, and end (same logic as addTimeBlock);
			add taskId to b.taskIdSet;
			return b.timeBlockId;

	removeTask (owner: User, taskId: String, timeBlockId: String)
		requires:
			exists a time block $b$ with matching owner and timeBlockId;
			taskId exists in b.taskIdSet;
		effect:
			remove taskId from b.taskIdSet
```

**Note:** The ScheduleTime concept manages the user's intended allocation of tasks onto their calendar. Tasks are referenced by their IDs (i.e., a string representing their unique identifier), not by internal details, ensuring that time blocks remain independent containers.
