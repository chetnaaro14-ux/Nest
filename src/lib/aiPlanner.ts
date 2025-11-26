import { GoogleGenAI, Type } from "@google/genai";
import { Trip, Day, Activity, GeneratedActivitySuggestion } from "../types";

export async function generateAiActivitiesForTrip(params: {
  trip: Trip;
  days: Day[];
  existingActivities: Activity[];
}): Promise<GeneratedActivitySuggestion[]> {
  // The API key must be obtained exclusively from the environment variable process.env.API_KEY.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const prompt = `
    I am planning a family trip to ${params.trip.destination}.
    The trip dates are from ${params.trip.start_date} to ${params.trip.end_date}.
    
    Please suggest a list of 5-8 diverse activities suitable for a family.
    Include a mix of sightseeing, food, and rest.
    Keep costs reasonable.
    
    Provide specific approximate times in HH:MM format.
    Provide estimated cost in local currency or USD (just the number).
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              category: { 
                type: Type.STRING, 
                enum: ['food', 'sightseeing', 'rest', 'travel', 'kids'] 
              },
              approximate_start_time: { type: Type.STRING },
              approximate_end_time: { type: Type.STRING },
              cost: { type: Type.NUMBER },
              notes: { type: Type.STRING },
            },
            required: ['title', 'category', 'approximate_start_time', 'approximate_end_time', 'cost', 'notes']
          }
        }
      }
    });

    const text = response.text;
    if (!text) return [];
    
    const suggestions = JSON.parse(text) as GeneratedActivitySuggestion[];
    return suggestions;
  } catch (error) {
    console.error("Gemini AI generation failed:", error);
    return [];
  }
}