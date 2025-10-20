## Major Design Choices

1. **Removed ProgressTracker Concept**
    
    - Based on Assignment 2 feedback, ProgressTracker was removed as a separate concept.
        
    - Practice tracking is now handled by examining videos associated with users and reference videos, maintaining separation of concerns.
        
2. **UI Required for Testing PoseBreakdown**
    
    - Due to an error discussed [here](https://piazza.com/class/melw05erqym3qt/post/174), testing PoseBreakdownSpecs required a UI.
        
    - This led to adjusting the test setup to run through a UI interface rather than purely backend scripts.
        
3. **Simplified UI for Testing with Images**
    
    - Videos were initially intended for testing, but a full video UI proved overly complex.
        
    - Instead, tests use single images to validate `extractPoses`, since a video is essentially multiple images; this ensures correctness while keeping tests manageable.
        
4. **MongoDB Context Issue in Deno Tests**
    
    - When using context to generate Deno tests based on the initial survey concept test, the AI kept wanting to use a mock MongoDB instance instead of the real database.
        
    - Context response reference: `..\..\context\design\brainstorming\questioning.md\steps\response.fafbe041.md`
        
    - This required adjustments to ensure tests connect to the real database.
        
5. **Integrating Google Cloud Storage**
    
    - Context initially struggled to work with Google Cloud Storage rather than a mock system.
        
    - Context response reference: `..\..\context\design\brainstorming\questioning.md\steps\response.4608b575.md`
        
    - Through iterative prompt engineering, a working solution was produced that integrates with GCS in a usable way for the application.
        

---

## Interesting Development Moments

1. **Separation of Concerns Realization**
    
    - Removing video actions from the User concept clarified the architecture and reduced coupling.
2. **Revising Concept Hierarchy**
    
    - Reassessing concepts vs. features clarified which elements are reusable concepts (User, Video, PoseBreakdown, Feedback) and which are features built on top of them (Progress tracking).
        
3. **Testing Pose Extraction via Images**
    
    - Simplifying the test to use images highlighted how conceptual understanding (video = sequence of images) can simplify implementation.
        
4. **Debugging Deno Test Contexts**
    
    - Encountered unexpected mock MongoDB creation, which prompted a deeper understanding of context setup and test scaffolding.
        
5. **Prompt Engineering for GCS Integration**
    
    - The challenge of connecting context to real Google Cloud Storage was solved by iteratively refining instructions to generate usable integration code.
        
6. **UI-Based Validation**
    
    - Running PoseBreakdown through a UI, despite initial intention for backend-only testing, provided a practical and visual confirmation of functionality.
        
