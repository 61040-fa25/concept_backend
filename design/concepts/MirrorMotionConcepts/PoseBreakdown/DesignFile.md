Fully decoupled from User and Video concepts.

Concept focuses solely on pose extraction, storing structured pose data for later use.

Modular design allows reuse for Feedback analysis or future features.

Update PoseData to match what the pose extraction AI returns, just a coordinate of (x,y,z)

Update PartData to match what the pose extraction AI returns, a landmark label, allong with the coordinate (PoseData)