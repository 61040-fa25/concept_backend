# MirrorMotion Design Updates

## Major Architectural Changes

### 1. PoseBreakdown Migration to Frontend
- Moved PoseBreakdown functionality from backend to frontend (Vue)
- Reason: MediaPipe requires document/DOM setup which is only available in browser environment
- Implementation now lives in Vue components using MediaPipe's browser SDK
- Broken code is in the “draft not working version with mediapipe in backend api" commit for reference

### 2. Feedback System Enhancement
#### Updated FeedbackDoc Interface
```typescript
interface FeedbackDoc {
  _id: Feedback;
  referenceVideo: string;  // Changed from Video type to string
  practiceVideo: string;   // Changed from Video type to string
  feedbackText: string;    
  accuracyValue: number;   // Added: 0-100 score
  frameScores: number[];   // Added: per-frame accuracy
  worstFrames: number[];   // Added: problematic frame indices
}
```

### 3. Video Synchronization Support
#### New Types for Frame Matching
```typescript
export type MatchingFrames = {
  referenceStartFrame: number;
  referenceEndFrame: number;
  practiceStartFrame: number;
  practiceEndFrame: number;
};
```

## Implementation Details

### Feedback Generation
- Added frame-by-frame comparison logic
- Implemented worst frame detection for more detailed feedback
- Enhanced feedback text generation with specific frame timestamps

### Video Management
- Added support for frame synchronization between reference and practice videos
- Use MatchingFrames to make sure the videos start play at the same part of the audio

## API Changes

### ManageVideo Concept
- Added frame matching support
- Updated video retrieval to include synchronization data

### Feedback Concept
- Improved accuracy calculation
- Added frame scoring system
- Implemented worst frame detection