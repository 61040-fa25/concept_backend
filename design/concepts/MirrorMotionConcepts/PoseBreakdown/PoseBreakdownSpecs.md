## Concept: PoseBreakdown  
**Purpose**: extract poses from videos and represent them as collections of parts and points, which can later be compared  
**Principle**: after a video is processed, poses for each frame are stored as structured data  

**State**  
A set of **PoseData** with:  
- a poseID String  
- a partData of Set of PartData  

A set of **PartData** with:  
- a part Enum (Arm, Leg, etc.)  
- a pointData Set of PointData  

A set of **PointData** with:  
- a orderID Number  
- a location Number  

**Actions**  
- `extractPoses(videoID: String): (poseIDs: Set of String)`  
  - Requires: video exists  
  - Effect: processes each frame of the video, creates PoseData for each, and stores/returns their IDs  

- `getPoseData(poseID: String): (PoseData)`  
  - Requires: pose exists  
  - Effect: returns stored PoseData for inspection  
