---
timestamp: 'Tue Oct 21 2025 00:39:22 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251021_003922.a15866c7.md]]'
content_id: bff3fa6b890187ed983f1775ca29827f8c3ddfc2cd6a5fc331a916fc1fe809d2
---

# concept: RoutineLog

```
concept RoutineLog [User]

purpose: Records what actually happened throughout the day as time-stamped sessions, optionally linked to planned tasks. Allow users to reflect on their planned schedule by comparing with logged routine sessions.

principle: After a user starts and finishes a session, the system records its actual duration and possible reasons of interruption.

state
    a set of Sessions with
        an owner User
        a sessionName String
        a sessionId String    // this is an unique ID
        an isPaused Flag
        an isActive Flag
        a start TimeStamp (optional)
        an end TimeStamp (optional)
        a linkedTaskId String (optional)  // this is the unique id identifying tasks
        an interruptReason String (optional)
    
actions
    _getUserSessions (owner: User): (sessionTable: set of Sessions)
	    // this is a query
        requires: exists at least one session with this owner
        effect: return ALL sessions under this owner

    createSession(owner: User, sessionName: String, linkedTaskId?: String): (session: Session)
        effect:
            generate a unique sessionId;
            create a session owned by owner with sessionName;
            if linkedTaskId is provided, assign it to this session;
            assign start and end for this session as None;
            assign isPaused as False and isActive as False;
            assign interruptReason as None;
            return this newly created session;
    
    startSession(owner: User, session: Session)
        requires:
            session exists and is owned by owner and has isActive as False
        effect:
            get the current TimeStamp;
            set session.start = current TimeStamp;
            set session.isActive as True
    
    endSession(owner: User, session: Session)
        requires:
            session exists and is owned by owner and has isActive as True
        effect:
            get the current TimeStamp;
            set session.end = current TimeStamp;
            set session.isActive as False;
    
    interruptSession(owner: User, session: Session, interruptReason: String)
        requires:
            session exists and is owned by owner and has isActive as True;
            session has isPaused as False;
        effect:
            get the current TimeStamp;
            set session.end = current TimeStamp;
            set session.isPaused = True;
            set session.interruptReason = interruptReason;

```

**Note:** The RoutineLog concept captures what actually happens in real time as timestamped sessions, enabling reflections as users can compare planned schedule vs actual routine. Sessions may optionally link back to tasks. Tasks are referenced by their IDs (i.e., a string representing their unique identifier), not by internal details, ensuring that recording actual activity is modular and does not interfere with task definitions.
