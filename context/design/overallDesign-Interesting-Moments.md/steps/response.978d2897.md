---
timestamp: 'Wed Oct 15 2025 22:52:15 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251015_225215.048e1ccc.md]]'
content_id: 978d2897b54f766e029924656948e8a615ac832902b5941d86422797d1e87711
---

# response:

Here's a concise summary of the critical lessons learned from our interactions, focusing on both general best practices and the specific challenges related to context management:

1. **Strict Representation Independence in Tests:** Tests must operate purely as an "external user," interacting *only* with the concept's public API (actions and queries). This means:
   * No direct access to internal data structures or database representations (`NotificationDoc`).
   * Queries should return minimal, public-facing identifiers (e.g., `Notification` IDs) rather than full internal objects, even if the internal system uses a more complex structure.
   * This enforces a clean separation between the concept's implementation and its public contract.

2. **Paramount Test Isolation & Resource Management:**
   * Each logical test scenario should run in a clean, isolated environment (e.g., dedicated database instances, proper resource cleanup like `client.close()` in `finally` blocks). This prevents state leakage and ensures determinism.
   * Deno's strict resource leak detection requires careful handling of asynchronous operations (e.g., `await new Promise((resolve) => setTimeout(resolve, ms));`) and sometimes heuristic delays before closing connections to prevent warnings.

3. **Legible & Comprehensive Testing:**
   * Employ structured logging (`[Trace]`, `[Requirement Confirmation]`, `[Effect Confirmation]`) to enhance clarity and debuggability.
   * Thoroughly test *all* aspects: successful `effects` (post-conditions), failure `requires` (pre-conditions), and queries across various scenarios.
   * Utilize modern module resolution (e.g., `jsr:` imports) where appropriate.

4. **Robust Error Handling:** Always use type guards (`e instanceof Error ? e.message : String(e)`) when catching `unknown` errors to safely extract and report error messages.

5. **Critical Inconsistency in Iterative Context Application (LLM Challenge):**
   * **Observation:** While external file references (like `../context/...`) are effective for providing *initial* context, the AI demonstrated a challenge in consistently applying *new or iteratively refined context* to its *already generated output*.
   * **Example from PasswordAuthentication:** The AI *itself* introduced a requirement for usernames to be `>= 8` characters but later, in a subsequent step of the *same interaction*, generated an "interesting case" test with a 7-character username ("userBob"), forgetting its own recent recommendation.
   * **Lesson Regarding Context Injection:** This highlights that merely providing additional context after an initial generation doesn't guarantee a re-evaluation and modification of previous outputs. The expectation is that new context, even if provided iteratively, should trigger a re-assessment of the *entire* concept's implementation and associated tests to maintain consistency, especially when context is linked via external files. This emphasizes a need for more continuous and dynamic context awareness for robust iterative development.
