---
timestamp: 'Fri Oct 17 2025 16:34:36 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251017_163436.ae6456c2.md]]'
content_id: 2ca2e4bfad030e4febd2bc3ccbc21d8f52346396f5b20e81e91a2741d8bcbb41
---

# static checking error: \[ERROR]: Class 'MockGeminiLLM' incorrectly implements class 'GeminiLLM'. Did you mean to extend 'GeminiLLM' and inherit its members as a subclass?

Type 'MockGeminiLLM' is missing the following properties from type 'GeminiLLM': retryConfig, executeWithTimeout, callGeminiAPI, isNonRetryableError, sleep
class MockGeminiLLM implements GeminiLLM {
\~~~~~~~~~~~~~
at file:///C:/Users/betwo/6.104/piggy\_bankApp/src/concepts/TripCostEstimation/TripCostEstimationConcept.test.ts:19:7

error: Type checking failed.

info: The program failed type-checking, but it still might work correctly
