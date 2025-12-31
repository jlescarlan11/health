import { GoogleGenerativeAI, GenerativeModel } from "@google/generative-ai";
import Constants from "expo-constants";
import { SYMPTOM_ASSESSMENT_PROMPT } from "../constants/prompts";

const API_KEY = Constants.expoConfig?.extra?.geminiApiKey || "";
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const MAX_RETRIES = 3;
const RATE_LIMIT_RPM = 15;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;

interface CacheEntry {
  data: any;
  timestamp: number;
}

interface AssessmentInput {
  symptoms: string;
  age: string | number;
  severity: string | number;
}

export interface AssessmentResponse {
  recommended_level: "Self-Care" | "Health Center" | "Hospital" | "Emergency";
  reasoning: string;
  red_flags: string[];
  nearest_facility_type: string;
}

class GeminiClient {
  private genAI: GoogleGenerativeAI;
  private model: GenerativeModel;
  private cache: Map<string, CacheEntry>;
  private requestTimestamps: number[];

  constructor() {
    if (!API_KEY) {
      console.warn("Gemini API Key is missing. Check your .env or app.json configuration.");
    }
    this.genAI = new GoogleGenerativeAI(API_KEY);
    this.model = this.genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    this.cache = new Map();
    this.requestTimestamps = [];
  }

  /**
   * Enforces rate limiting (15 requests per minute).
   */
  private async checkRateLimit() {
    const now = Date.now();
    // Filter out timestamps older than the window
    this.requestTimestamps = this.requestTimestamps.filter(
      (t) => now - t < RATE_LIMIT_WINDOW_MS
    );

    if (this.requestTimestamps.length >= RATE_LIMIT_RPM) {
      const oldestRequest = this.requestTimestamps[0];
      const waitTime = RATE_LIMIT_WINDOW_MS - (now - oldestRequest) + 100; // Buffer
      console.warn(`Rate limit reached. Waiting ${waitTime}ms...`);
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }

    this.requestTimestamps.push(Date.now());
  }

  /**
   * Generates a cache key based on input.
   */
  private getCacheKey(input: AssessmentInput): string {
    return `${input.symptoms.toLowerCase().trim()}|${input.age}|${input.severity}`;
  }

  /**
   * Parses JSON from the model response, handling potential code block markers.
   */
  private parseJSONResponse(text: string): any {
    try {
      // Remove markdown code blocks if present
      let cleanText = text.replace(/```json/g, "").replace(/```/g, "").trim();
      return JSON.parse(cleanText);
    } catch (error) {
      console.error("Failed to parse Gemini response as JSON:", text);
      throw new Error("Invalid response format from AI.");
    }
  }

  /**
   * Main method to assess symptoms with retry logic and caching.
   */
  public async assessSymptoms(input: AssessmentInput): Promise<AssessmentResponse> {
    const cacheKey = this.getCacheKey(input);
    const cached = this.cache.get(cacheKey);

    if (cached) {
      const isExpired = Date.now() - cached.timestamp > CACHE_TTL_MS;
      if (!isExpired) {
        console.log("Returning cached Gemini response");
        return cached.data;
      } else {
        this.cache.delete(cacheKey);
      }
    }

    const prompt = SYMPTOM_ASSESSMENT_PROMPT
      .replace("{{symptoms}}", input.symptoms)
      .replace("{{age}}", String(input.age))
      .replace("{{severity}}", String(input.severity));

    let attempt = 0;
    while (attempt < MAX_RETRIES) {
      try {
        await this.checkRateLimit();
        
        console.log(`Sending request to Gemini (Attempt ${attempt + 1})...`);
        const result = await this.model.generateContent(prompt);
        const responseText = result.response.text();
        
        const parsedResponse = this.parseJSONResponse(responseText);

        // Update cache
        this.cache.set(cacheKey, {
          data: parsedResponse,
          timestamp: Date.now(),
        });

        return parsedResponse;
      } catch (error: any) {
        attempt++;
        console.error(`Gemini request failed (Attempt ${attempt}/${MAX_RETRIES}):`, error.message);

        if (attempt === MAX_RETRIES) {
          throw new Error("Failed to reach Health Assistant after multiple attempts. Please check your connection or try again later.");
        }

        // Exponential backoff: 1s, 2s, 4s...
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw new Error("Unexpected error in Gemini client.");
  }
}

export const geminiClient = new GeminiClient();
