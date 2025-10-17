[@concept-design-overview](../background/concept-design-overview.md)

# question: how do concepts compare to OOP?
# response:

Concept Design, as described, shares the overarching goals of modularity, reusability, and maintainability with Object-Oriented Programming (OOP), but it approaches these goals with fundamentally different units of modularity and principles of interaction.

Here's a comparison:

### Key Differences

1.  **Primary Unit of Modularity:**
    *   **OOP:** The primary unit is the **class/object**, which typically represents an entity (a "noun" like `User`, `Product`, `Order`). An object encapsulates its own data (state) and the behaviors (methods) that operate on that data.
    *   **Concepts:** The primary unit is a **concept**, which represents a "reusable unit of user-facing functionality" or a "human behavioral protocol" (often a "verb" or a relationship, like `Upvote`, `RestaurantReservation`, `UserAuthentication`). A concept's state includes the *relationships* between different kinds of objects/entities relevant to its functionality, rather than encapsulating a single entity's full state.

2.  **Separation of Concerns:**
    *   **OOP (as critiqued by Concept Design):** Often conflates concerns around an entity. A single `User` class might handle authentication, profile data, naming, notification preferences, etc. This means one class becomes responsible for many unrelated aspects of a user.
    *   **Concepts:** Enforces a much finer-grained separation. Each concept addresses a *single, coherent aspect* of functionality. For example, all functions related to a user would be split into separate concepts like `UserAuthentication`, `Profile`, `Notification`, `Naming`, etc., each maintaining only the relevant state for its specific purpose.

3.  **Encapsulation and State:**
    *   **OOP:** An object fully encapsulates the data relevant to that specific entity.
    *   **Concepts:** A concept maintains its own state, but this state is specifically *what's needed to support its behavior*. It typically involves relationships between *different kinds of objects*. For example, the `Upvote` concept holds a relationship between `items` and `users`, but it doesn't own the full state of `Item` or `User` objects themselves, only their identities and relevant voting status.

4.  **Composition and Interaction:**
    *   **OOP:** Objects interact by making direct calls to methods of other objects, leading to direct coupling. Inheritance is a common mechanism for reuse and specialization.
    *   **Concepts:** Concepts are *mutually independent* and **cannot directly refer to or call each other**. Composition is achieved through *synchronizations (syncs)*. A sync is an external rule that *observes* actions and state changes in one or more concepts (`when`, `where` clauses) and then *triggers* actions in other concepts (`then` clause). This provides a looser, reactive form of coupling.

5.  **Independence and Reusability:**
    *   **OOP:** While classes are designed for reuse, their internal dependencies and assumptions can limit their reusability without bringing along a specific context or set of related classes.
    *   **Concepts:** Aims for extreme independence. Each concept is defined "without reference to any other concepts, and can be understood in isolation." This is critical for reuse across applications and for allowing different teams to work on concepts independently. Polymorphism is used to make concepts generic regarding their arguments, further enhancing independence.

6.  **Completeness of Functionality:**
    *   **OOP:** A method in one object might delegate parts of its functionality to other objects or services.
    *   **Concepts:** "Concepts are *complete* with respect to their functionality and don't rely on functionality from other concepts." For instance, a `Notification` concept would handle the actual delivery of a notification itself, rather than calling out to a separate emailing or texting concept.

7.  **Focus:**
    *   **OOP:** Primarily focuses on modeling the *data structures* and the operations directly associated with them.
    *   **Concepts:** Primarily focuses on modeling *user-facing behaviors and interactions* of value, even if those behaviors involve multiple types of data.

### Similarities

*   **Modularity:** Both aim to break down complex systems into smaller, manageable, and understandable parts.
*   **Reusability:** Both strive for code and design reuse to reduce development effort and improve consistency.
*   **Encapsulation:** Both involve encapsulating state and behavior within their respective units, albeit with different scopes and purposes.
*   **Abstraction:** Both rely heavily on abstraction to manage complexity and provide clear interfaces.
*   **API-driven:** Concepts are typically implemented as backend services with API specifications, similar to how many modern OOP-based microservices are exposed.

In essence, while OOP organizes around the *entities* and their intrinsic properties/behaviors, Concept Design organizes around *user-facing functionalities* or "behavioral protocols" that often span multiple entities, and it enforces a much stricter separation of concerns and a looser, event-driven composition model via synchronizations.