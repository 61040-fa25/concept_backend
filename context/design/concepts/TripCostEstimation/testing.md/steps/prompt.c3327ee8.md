---
timestamp: 'Thu Oct 16 2025 13:22:00 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251016_132200.667d136f.md]]'
content_id: c3327ee8ecce51fc7cbfa05abd2d754f25e7cd0e8f942478ce3bec4d3a870179
---

# prompt: given helper gemini-llm.ts file, change the tests to use functions from gemini-llm.ts

```typescript
  

import { GoogleGenerativeAI } from 'npm:@google/generative-ai'; // Use qualified import for Deno

import "jsr:@std/dotenv/load"; // Import dotenv to load environment variables

  

/**

 * Configuration for retry behavior

 */

interface RetryConfig {

    maxRetries: number;

    baseDelayMs: number;

    maxDelayMs: number;

    timeoutMs: number;

}

  

/**

 * Interface for the structured cost estimate output that the LLM is expected to generate.

 * This defines the target structure for the parsing logic in the Concept class.

 */

export interface CostEstimateResponse {

    flight?: number;

    roomsPerNight?: number;

    foodDaily?: number;

}

  

/**

 * LLM Integration for TripCostEstimation

 *

 * Handles raw LLM text generation requests using Google's Gemini API with robust error handling,

 * timeouts, retries with exponential backoff, and comprehensive validation.

 * It does NOT perform any parsing of the LLM's output.

 */

export class GeminiLLM {

    // Removed private apiKey: string; as it's now fetched from environment

    private retryConfig: RetryConfig;

  

    // Constructor no longer takes config, as API key is from environment

    constructor() {

        this.retryConfig = {

            maxRetries: 3,

            baseDelayMs: 1000,

            maxDelayMs: 10000,

            timeoutMs: 30000

        };

    }

  

    /**

     * Public method to interact with the LLM, acting as the "specialized tool".

     * It handles LLM interaction, retries, and timeouts, but *not* parsing the content.

     * @param prompt The prompt string to send to the LLM. This prompt should instruct the LLM to return JSON.

     * @returns Promise<string> The raw LLM text response (expected to be a JSON string).

     * @throws Error if the prompt is empty or if the LLM API call fails after retries.

     */

    async executeLLM(prompt: string): Promise<string> {

        if (!prompt || prompt.trim().length === 0) {

            throw new Error('Prompt cannot be empty or null');

        }

  

        let lastError: Error | null = null;

        for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {

            try {

                const result = await this.executeWithTimeout(prompt);

                return result;

            } catch (error) {

                lastError = error as Error;

                // Don't retry on certain types of errors

                if (this.isNonRetryableError(error as Error)) {

                    throw new Error(`Non-retryable error: ${(error as Error).message}`);

                }

                // If this is the last attempt, throw the error

                if (attempt === this.retryConfig.maxRetries) {

                    break;

                }

                // Calculate delay with exponential backoff

                const delay = Math.min(

                    this.retryConfig.baseDelayMs * Math.pow(2, attempt),

                    this.retryConfig.maxDelayMs

                );

                console.log(`❌ Attempt ${attempt + 1} failed: ${(error as Error).message}. Retrying in ${delay}ms...`);

                await this.sleep(delay);

            }

        }

        throw new Error(`LLM request failed after ${this.retryConfig.maxRetries + 1} attempts. Last error: ${lastError?.message}`);

    }

  

    /**

     * Execute LLM request with timeout.

     */

    private async executeWithTimeout(prompt: string): Promise<string> {

        const timeoutPromise = new Promise<never>((_, reject) => {

            setTimeout(() => {

                reject(new Error(`LLM request timed out after ${this.retryConfig.timeoutMs}ms`));

            }, this.retryConfig.timeoutMs);

        });

  

        const llmPromise = this.callGeminiAPI(prompt);

        return Promise.race([llmPromise, timeoutPromise]);

    }

  

    /**

     * Make the actual API call to Gemini.

     */

    private async callGeminiAPI(prompt: string): Promise<string> {

        try {

            // Get API key and model from environment variables

            const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

            const GEMINI_MODEL = Deno.env.get("GEMINI_MODEL");

  

            if (!GEMINI_API_KEY) {

                throw new Error("Missing GEMINI_API_KEY environment variable.");

            }

            if (!GEMINI_MODEL) {

                throw new Error("Missing GEMINI_MODEL environment variable. Please specify a model (e.g., 'gemini-1.5-flash').");

            }

  

            // Initialize Gemini AI

            const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

            const model = genAI.getGenerativeModel({

                model: GEMINI_MODEL,

                generationConfig: {

                    maxOutputTokens: 1000,

                    temperature: 0.1, // Lower temperature for more consistent responses

                    responseMimeType: "application/json", // Explicitly request JSON output

                }

            });

            // Execute the LLM

            const result = await model.generateContent(prompt);

            const response = await result.response;

            const text = response.text();

            if (!text || text.trim().length === 0) {

                throw new Error('LLM returned empty response');

            }

            return text;

        } catch (error) {

            const errorMessage = (error as Error).message;

            // Provide more specific error messages

            if (errorMessage.includes('API_KEY_INVALID')) {

                throw new Error('Invalid API key provided');

            } else if (errorMessage.includes('QUOTA_EXCEEDED')) {

                throw new Error('API quota exceeded - please try again later');

            } else if (errorMessage.includes('SAFETY')) {

                throw new Error('Request blocked by safety filters - please modify your prompt');

            } else if (errorMessage.includes('PERMISSION_DENIED')) {

                throw new Error('Permission denied - check your API key permissions');

            } else {

                throw new Error(`Gemini API error: ${errorMessage}`);

            }

        }

    }

  

    /**

     * Check if an error should not be retried.

     */

    private isNonRetryableError(error: Error): boolean {

        const message = error.message.toLowerCase();

        return message.includes('invalid api key') ||

            message.includes('permission denied') ||

            message.includes('quota exceeded') ||

            message.includes('safety') ||

            message.includes('prompt cannot be empty');

    }

  

    /**

     * Sleep utility for delays.

     */

    private sleep(ms: number): Promise<void> {

        return new Promise(resolve => setTimeout(resolve, ms));

    }

}
```
