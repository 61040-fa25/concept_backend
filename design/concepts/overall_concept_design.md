
Overall, the design of the application remained largely stable, with three of the five core concepts being implemented exactly as specified. The most significant design evolution occurred in the Schedule concept, which was refactored from a simple data mirror into a more robust hybrid model. The primary implementation challenge arose in the Planner concept, leading to a key insight about writing testable, time-independent code.

- A key lesson was learning not to blindly trust the LLM's output. It was easy to assume the generated code was perfect, which led to subtle bugs like the time-dependency issue in the Planner. This highlighted the importance of acting as a critical reviewer of AI-generated code, rather than just a prompter.

- I found that asking the LLM to make small, specific changes to existing code was often harder than generating a method from scratch. However, I noticed a significant improvement in this capability when using more advanced models like Gemini 2.5 Pro over Flash, which was better at understanding the context of an existing file and making targeted edits.

- My experience confirmed the course's philosophy on "context engineering." A well-crafted prompt, complete with the concept specification, background documents on coding patterns, and clear instructions, consistently produced high-quality, working code. Vague prompts led to generic and often incorrect results. This iterative process of refining the prompt itself became a core part of my development workflow. For example, I decided to add part of the assignment description for generating test cases.

- Ultimately, I was impressed by the LLM's effectiveness when used within the structured "concept design" framework. By providing the state, actions, and logic in a clear specification, the LLM excelled at translating that design into functional TypeScript. It demonstrated that LLMs are powerful implementation tools when guided by a strong, modular architecture.

### Interesting Moments

1. **Sneaky Time-Dependent Bug:** My Planner tests were failing intermittently, and I realized it was because new Date() made them non-deterministic. This was a critical lesson in writing testable code by isolating external dependencies.
    
    - Finding the bug: [20251031_083755.f7ca65a2](../../context/design/concepts/Planner/testing.md/20251031_083755.f7ca65a2.md)
    - Test output of the working code: [20251031_093109.0c0e3f47](../../context/design/concepts/Planner/testing_results.md/20251031_093109.0c0e3f47.md)
        
2. **Major Refactoring of the Schedule Concept:** The initial Schedule design had a logical flaw where syncing would delete user-created data. The moment I realized this and redesigned it with an origin field was a turning point for the app's usability.
    
    - Old Schedule spec implementation: [20251024_082929.333fd1d4](../../context/design/concepts/Schedule/implementation.md/20251024_082929.333fd1d4.md)
    - New Schedule spec implementation: [20251030_221017.40d42fed](../../context/design/concepts/Schedule/implementation.md/20251030_221017.40d42fed.md)
        
3. **Solving the bcrypt Import Issue:** While not a design change, figuring out the technical issue with the bcrypt library was a moment of practical learning.
    
    - bcrypt used correctly in UserAccount: [20251023_212126.f92eb48b](../../context/design/concepts/UserAccount/implementation.md/20251023_212126.f92eb48b.md)
        
4. **A Perfect Prompt for the Tasks Concept:** After a few tries, the implementation for the Tasks concept was generated almost perfectly. This was surprising given the length of the concept.
    
    - Tasks concept implementation: [20251023_230826.89f97c6f](../../context/design/concepts/Tasks/implementation.md/20251023_230826.89f97c6f.md)
        
5. **Comparing LLM Models for Implementing Code:** Generally Gemini 2.5 pro was better with modifying specific parts of the code and implementations in general - it followed the prompts more closely. For instance, I had to rerun the prompt for implementing UserAccount with Gemini flash but it worked well with pro:
    
    - Working implementation from the first time using Gemini 2.5 pro: [20251021_185449.e6308c8b](../../context/design/concepts/UserAccount/implementation.md/20251021_185449.e6308c8b.md)