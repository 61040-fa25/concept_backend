/**
 * LLM Integration for DayPlanner
 * 
 * Handles the suggestAlternatives functionality using Google's Gemini API.
 * The LLM prompt is hardwired with user preferences in the terms of the prompt variant
 * and doesn't take external hints.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * Configuration for API access
 */
export interface Config {
    apiKey: string;
}

export class GeminiLLM {
    private apiKey: string;

    constructor(config: Config) {
        this.apiKey = config.apiKey;
    }

    async executeLLM (prompt: string): Promise<string> {
        try {
            // Initialize Gemini AI
            const genAI = new GoogleGenerativeAI(this.apiKey);
            const model = genAI.getGenerativeModel({ 
                model: "gemini-2.5-pro",

            });
            // Execute the LLM
            
            // Not printing out the prompt due to large amount of course information given to LLM via the prompt
            // console.log(prompt);
            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();
            return text;            
        } catch (error) {
            console.error('❌ Error calling Gemini API:', (error as Error).message);
            throw error;
        }    }
}
