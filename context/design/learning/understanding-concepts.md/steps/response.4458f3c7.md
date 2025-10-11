---
timestamp: 'Fri Oct 10 2025 20:16:21 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251010_201621.4a3fbcc1.md]]'
content_id: 4458f3c765150d61a7014068372aa60a8341343be0805586f707ed5f2a117ec1
---

# response:

Concept independence in concept design is ensured through several key principles and mechanisms outlined in the text:

1. **No Direct References or Coupling:** The most significant distinguishing feature is that "Each concept is defined without reference to any other concepts, and can be understood in isolation." This means designers explicitly avoid creating direct dependencies or coupling between concepts.

2. **Completeness of Functionality:** Concepts are designed to be "complete with respect to their functionality and don't rely on functionality from other concepts." If a concept needs a particular piece of functionality, it must contain it itself rather than calling out to another concept. For example, a `Notification` concept would include emailing or texting functionality directly, not delegate it to a separate emailing concept.

3. **Strict Separation of Concerns:** Each concept addresses "only a single, coherent aspect of the functionality of the application, and does not conflate aspects of functionality that could easily be separated." By isolating distinct concerns (e.g., authentication, profiles, and naming for a user into separate concepts), the concepts themselves become naturally independent.

4. **Independent State Management:** "Each concept maintains its own state." This state is precisely what's needed for the concept's behavior and no richer, ensuring it doesn't implicitly rely on or expose excessive data that might tempt other concepts into dependency.

5. **Polymorphism for Action Arguments:** To further prevent coupling, designers should strive to make concepts "as free as possible of any assumptions about the content and interpretation of objects passed as action arguments." This allows concepts to interact with generic "targets" or "items" without knowing their specific types or how they are managed by other concepts.

6. **Composition by External Synchronization (Syncs):** Since concepts are fully independent and cannot refer to each other or use each other's services, their interaction is managed exclusively through external "synchronizations" (syncs). Syncs are rules that observe actions and state properties in one or more concepts and then trigger actions in others. The concepts themselves remain unaware of these interactions, preserving their independence.
