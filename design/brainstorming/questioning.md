# questioning
<!-- [@Example LikertSurveyConcept concept](../../src/initialCode/concepts/LikertSurvey/LikertSurveyConcept.ts)
[@Example LikertSurveyConcept test](../../src/initialCode/concepts/LikertSurvey/LikertSurveyConcept.test.ts) -->

<!-- [@User concept to implement](../concepts/MirrorMotionConcepts/User/UserSpecs.md) -->

[@User concept](../../src/mirrorMotionConcepts/UserConcept.ts)

[@Feedback concept](../../src/mirrorMotionConcepts/FeedbackConcept.ts)
[@ManageVideo concept](../../src/mirrorMotionConcepts/ManageVideoConcept.ts)
<!-- [@Feedback concept](../../src/mirrorMotionConcepts/) -->

<!-- [@ManageVideo  concept idea](../../context/design/brainstorming/questioning.md/steps/response.4608b575.md) -->

[@User test](../../src/mirrorMotionConcepts/User.test.ts)

[@curr readme](../../README.md)
# prompt: Update the readme given the concepts we're wokring with/the general idea of this new file. keep info on how to setup the mirror motion specific concept tests w deno. remove everything else having to do with general recitatioon excercise.
# response:

# Mirror Motion Backend

This repository contains the backend implementation for Mirror Motion, a project designed to help users manage their videos and receive AI-generated feedback on their practice choreography. The backend is built using TypeScript with Deno and utilizes MongoDB for data storage.

## Project Concepts

The core of this backend is structured around several concepts:

*   **UserConcept**: Manages user registration, login, and secure access to their own video content. Its purpose is to let users securely manage and access their own videos.
*   **FeedbackConcept**: Compares practice video pose data against reference choreography to generate textual feedback and an accuracy score. Its purpose is to highlight differences between practice video and reference choreography.
*   **ManageVideoConcept** (Assumed/Upcoming): This concept is responsible for handling video uploads, storage, and retrieval, providing the `Video` entities referenced by the `FeedbackConcept`.

# Setup

## 0. Fork this repository

First, [fork](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/working-with-forks/fork-a-repo#forking-a-repository) this repository, and **rename** it to your desired project name, and give a description of your project.

## 1. Install Deno

[Install from Deno's website](https://deno.com)

Deno is a secure runtime for JavaScript, TypeScript, and WebAssembly. It greatly simplifies tooling and offers a modern development experience.

**Note:** when importing from `npm` packages, prefix with `npm:` as in:

```typescript
import { MongoClient } from "npm:mongo"
```

For VSCode users, consider also installing the Deno [extension](https://marketplace.visualstudio.com/items?itemName=denoland.vscode-deno) for enhanced IDE support.

## 2. Compile Context

Context is a simple CLI tool that can be used to collaborate with LLMs and drive design. To create a convenient binary, run the following command from the root of the directory:

```shell
deno compile -A --output ctx .ctx/context.ts
```

## 3. Setup Gemini

Copy or change `.env.template` to the environment file: `.env` and insert your Gemini API key:

```env
GEMINI_API_KEY=YOUR_KEY_HERE
GEMINI_MODEL=gemini-2.5-flash
```

You can choose any [models](https://ai.google.dev/gemini-api/docs/models) using `GEMINI_MODEL`, such as `gemini-2.5-flash-lite` for faster responses, or `gemini-2.5-pro` for higher quality.

## 4. Setup your MongoDB Atlas Cluster (free)

For this project, we'll be using MongoDB as the database.

### Instructions

1.  Create your [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register) account.
2.  When selecting a template, choose the **free** option, M0.
3.  At the Security Quickstart page, select how you want to authenticate your connection and allow access to all IPs as shown in [this slide](https://docs.google.com/presentation/d/1DBOWIQ2AAGQPDRgmnad8wN9S9M955LcHYZQlnbu-QCs/edit?usp=sharing).
4.  Once created, click the **CONNECT** button, select **driver**, and copy the srv connection string. If using username and password, the URL should look something like this: `mongodb+srv://<username>:<password>@cluster0.p82ijqd.mongodb.net/?retryWrites=true&w=majority`. Make sure to replace username and password with your actual values.
5.  Add your connection URL (without `<` and `>`) to `MONGODB_URL=<connection url>` to your `.env` file.
6.  Give your database a name under `DB_NAME=<your database name>`.

# Running Mirror Motion Concept Tests

To ensure the Mirror Motion concepts are functioning correctly, you can run the provided tests using the Deno testing framework.

Tests are defined by any file with the name `filename.test.ts` in your directory. To run all tests for the Mirror Motion concepts (and any other `.test.ts` files), simply run:

```shell
deno test -A
```

The `-A` flag means to give all permissions. This is convenient for development but be mindful of Deno's security model for production environments.

**Confirming your setup:** After running the tests, check your MongoDB Atlas console. You should see temporary collections created within the test database (`test-mirror-motion`). These are automatically wiped every time you start a new test run, ensuring a clean state for each test.