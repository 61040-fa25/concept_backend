## Concept: ManageVideo[User, Feedback, PoseData]  
**Purpose**: allow dancers and choreographers to upload and manage practice/reference videos  
**Principle**: after uploading a video, it can be retrieved for analysis, syncing, or feedback  

**State**  
A set of **Videos** with:  
- a videoID String  
- a videoType of type practice or reference  
- a videoFile File  
- a owner User  
- a feedback Set of Feedback  
- a poseData Set of PoseData

**Actions**  
- `upload(videoFile, videoType: String, owner: User): (videoID: String)`  
  - Requires: videoType is practice or reference  
  - Effect: creates a new video entry with videoFile and videoType, stores it associated with the owner, and returns the unique videoID  

- `retrieve(videoID: String, caller: User): (videoType, videoFile, feedback)`  
  - Requires: video exists and the caller is the owner of the video
  - Effect: returns the stored videoType, videoFile, and associated feedback  

- `delete(videoID: String, caller: User)`  
  - Requires: video exists and the caller is the owner of the video
  - Effect: removes the video and its metadata  

- `addPosesToVideo(videoID: String, poses: PoseData[])`  
  - Requires: video and all PoseData in poses exists 
  - Effect: add poses to the video
