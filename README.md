# Mirror Motion Backend

This repository contains the backend implementation for **Mirror Motion**, a project designed to help users manage their videos and receive feedback on their choreography practice. The backend is built with **TypeScript** using **Deno** and stores data in **MongoDB** and video files in **Google Cloud Storage**
## Setup

### Install Dependencies

`npm install`

> Note: Although this project uses Deno, some helper scripts may require `npm` packages. Ensure you have Node.js installed.

### Running Concept Tests

    To verify that the Mirror Motion concepts are functioning correctly, tests are provided using Deno’s testing framework. Test files end with `.test.ts`.

Run all tests using:

`deno test -A`

- The `-A` flag grants all permissions (useful for development). Be mindful of Deno’s security model in production.
    

---

### PoseBreakdown UI Test

Due to an error discussed [here](https://piazza.com/class/melw05erqym3qt/post/174), testing the PoseBreakdown concept requires using a UI.

**Instructions:**

1. Open `poseBreakdownTest.html` in a browser.
    
2. Follow the on-page instructions:
    
    - Click on an image to run `extractPoses`.
        
    - Click `Get Pose Data` to retrieve the corresponding `getPoseData`.
        

> Note: For simplicity, the UI currently works with single images instead of full videos. Since a video is a sequence of images, testing with images demonstrates that pose extraction will also work for videos.
> 
**Confirming your setup:**  
After running the tests, check your MongoDB Atlas console. Temporary collections are created in the `test-mirror-motion` database and are automatically wiped with each new test run to ensure a clean state.