## Concept: Feedback  
**Purpose**: highlight differences between practice video and reference choreography  
**Principle**: after a video is broken into different poses, we can generate feedback on different body parts  

**State**  
A set of **Feedback** with:  
- a feedbackID String  
- a referencePoseData PoseData  
- a practicePoseData PoseData  
- a feedback String  
- a accuracyValue Number  

**Actions**  
- `analyze(referencePoseData: PoseData, practicePoseData: PoseData): (feedbackID: String)`  
  - Requires: both PoseData exist  
  - Effect: compares practice PoseData to reference PoseData, creates and stores Feedback  

- `getFeedback(feedbackID: String): (feedback: String, accuracyValue: Number)`  
  - Requires: feedback exists  
  - Effect: returns mismatched body parts with suggestions and accuracy score  
