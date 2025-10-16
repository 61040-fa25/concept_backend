---
timestamp: 'Thu Oct 16 2025 12:47:34 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251016_124734.bb10b29d.md]]'
content_id: ccce12c9b5060a6dc43ecd507515eb371580c776b7ec007b6497513b54690d6b
---

# prompt: Given that the gemini-llm class is the below implement TripCostEstimation

```typescript
/**

 * LLM Integration for TripCostEstimation

 *

 * Handles cost estimation requests using Google's Gemini API with robust error handling,

 * timeouts, retries with exponential backoff, and comprehensive validation.

 */

  

import { GoogleGenerativeAI } from '@google/generative-ai';

  

/**

 * Configuration for API access

 */

export interface Config {

    apiKey: string;

}

  

/**

 * Configuration for retry behavior

 */

interface RetryConfig {

    maxRetries: number;

    baseDelayMs: number;

    maxDelayMs: number;

    timeoutMs: number;

}

  

export class GeminiLLM {

    private apiKey: string;

    private retryConfig: RetryConfig;

  

    constructor(config: Config) {

        this.apiKey = config.apiKey;

        this.retryConfig = {

            maxRetries: 3,

            baseDelayMs: 1000,

            maxDelayMs: 10000,

            timeoutMs: 30000

        };

    }

  

    /**

     * Execute LLM with timeout, retries, and exponential backoff

     * @requires prompt is a non-empty string

     * @returns Promise<string> containing the LLM response

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

     * Execute LLM request with timeout

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

     * Make the actual API call to Gemini

     */

    private async callGeminiAPI(prompt: string): Promise<string> {

        try {

            // Initialize Gemini AI

            const genAI = new GoogleGenerativeAI(this.apiKey);

            const model = genAI.getGenerativeModel({

                model: "gemini-2.5-flash-lite",

                generationConfig: {

                    maxOutputTokens: 1000,

                    temperature: 0.1, // Lower temperature for more consistent responses

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

     * Check if an error should not be retried

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

     * Sleep utility for delays

     */

    private sleep(ms: number): Promise<void> {

        return new Promise(resolve => setTimeout(resolve, ms));

    }

}
```
