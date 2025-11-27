
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
    
    Please suggest a detailed itinerary with 5-8 activities per day.
    
    CRITICAL REQUIREMENTS:
    1. 'logistics': You MUST include specific logistical details for every activity. 
       - For flights/travel: "Boarding at 14:00", "Gate 4B".
       - For hotels/food: "Check-in 3 PM", "Reservation recommended".
       - For sightseeing: "Opens at 9 AM", "Last entry 17:00".
       - If no specific logic applies, provide a useful arrival tip.
    
    2. 'image_prompt': You MUST include a 'image_prompt' field.
       - Provide a short, vivid, photorealistic visual description of the activity.
       - Example: "A sunny view of the Colosseum with a blue sky", "A close up of a delicious plate of pasta".
       - This will be used to generate an image for the itinerary.

    Format details:
    - approximate_start_time/end_time: HH:MM format
    - cost: number only (estimate)
    - logistics: concise string
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
              logistics: { type: Type.STRING, description: "Check-in, boarding, or arrival details" },
              image_prompt: { type: Type.STRING, description: "Visual description for image generation" }
            },
            required: ['title', 'category', 'approximate_start_time', 'approximate_end_time', 'cost', 'notes', 'logistics', 'image_prompt']
          }
        }
      }
    });

    let text = response.text;
    if (!text) return [];

    // Sanitize the output to remove Markdown code blocks if present
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    
    const suggestions = JSON.parse(text) as GeneratedActivitySuggestion[];
    return suggestions;
  } catch (error) {
    console.error("Gemini AI generation failed:", error);
    return [];
  }
}