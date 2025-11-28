
import { GoogleGenAI, Type } from "@google/genai";

// Ensure API Key is available
const apiKey = process.env.API_KEY || "";
const ai = new GoogleGenAI({ apiKey });

// Helper for delays
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper for retrying operations on 429/Resource Exhausted
async function retryWithBackoff<T>(operation: () => Promise<T>, retries = 3, initialDelay = 2000): Promise<T> {
  try {
    return await operation();
  } catch (error: any) {
    const isRateLimit = error.toString().includes('429') || 
                        error.toString().includes('RESOURCE_EXHAUSTED') ||
                        error.status === 429;
                        
    if (retries > 0 && isRateLimit) {
      console.warn(`Rate limit hit. Retrying in ${initialDelay}ms... (${retries} left)`);
      await delay(initialDelay);
      return retryWithBackoff(operation, retries - 1, initialDelay * 2);
    }
    throw error;
  }
}

// --- Chat & Grounding ---

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  groundingMetadata?: any;
}

export async function sendChatMessage(
  history: ChatMessage[], 
  newMessage: string, 
  mode: 'general' | 'travel_guide' | 'fast'
): Promise<{ text: string; groundingMetadata?: any }> {
  
  // DEFAULT TO STABLE FLASH MODEL TO PREVENT PERMISSION ERRORS ON 'GENERAL'
  let model = 'gemini-2.5-flash';
  let tools: any[] = [];
  let toolConfig: any = undefined;

  if (mode === 'travel_guide') {
    model = 'gemini-2.5-flash';
    tools = [{ googleSearch: {} }, { googleMaps: {} }];
    
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
      });
      toolConfig = {
        retrievalConfig: {
          latLng: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          }
        }
      };
    } catch (e) {
      // Ignore location error
    }
  } else if (mode === 'fast') {
    model = 'gemini-2.5-flash-lite-latest';
  } else if (mode === 'general') {
    // Attempt Pro, but be ready to fall back if needed, or just use Flash for stability
    model = 'gemini-3-pro-preview';
  }

  return retryWithBackoff(async () => {
    try {
      const chat = ai.chats.create({
        model: model,
        config: {
          tools: tools.length > 0 ? tools : undefined,
          toolConfig: toolConfig,
          systemInstruction: "You are a helpful family travel assistant called NEST AI.",
        },
        history: history.map(h => ({
          role: h.role,
          parts: [{ text: h.text }]
        }))
      });

      const response = await chat.sendMessage({ message: newMessage });
      
      return {
        text: response.text || "I couldn't generate a response.",
        groundingMetadata: response.candidates?.[0]?.groundingMetadata
      };
    } catch (error: any) {
      console.error("Chat generation failed:", error);
      
      // Fallback for General Pro model (Permission Denied)
      if (mode === 'general') {
        console.warn("Falling back to Flash for chat due to error...");
        try {
          const fallbackChat = ai.chats.create({
            model: 'gemini-2.5-flash',
            config: { systemInstruction: "You are a helpful family travel assistant called NEST AI." },
            history: history.map(h => ({ role: h.role, parts: [{ text: h.text }] }))
          });
          const fallbackResponse = await fallbackChat.sendMessage({ message: newMessage });
          return { text: fallbackResponse.text || "I couldn't generate a response." };
        } catch (fallbackError) {
          return { text: "Sorry, I am currently unavailable." };
        }
      }
      throw error;
    }
  });
}

// --- Maps Specific (Activity Location) ---

export async function getPlaceDetails(query: string) {
  return retryWithBackoff(async () => {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Find the exact location, rating, and current status for: ${query}. Provide a summary and the map link.`,
        config: {
          tools: [{ googleMaps: {} }],
        }
      });

      return {
        text: response.text,
        groundingMetadata: response.candidates?.[0]?.groundingMetadata
      };
    } catch (error) {
      console.error("Maps grounding failed", error);
      return { text: "Could not retrieve map details.", groundingMetadata: null };
    }
  });
}

// --- Image Generation ---

// Helper for Flash fallback
async function generateImageFlash(prompt: string, aspectRatio: string): Promise<string | null> {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: prompt }] },
      config: { imageConfig: { aspectRatio } }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    return null;
  } catch (e) {
    console.error("Flash image fallback failed", e);
    return null;
  }
}

export async function generateImagePro(prompt: string, aspectRatio: string, size: string): Promise<string | null> {
  return retryWithBackoff(async () => {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: {
          parts: [{ text: prompt }]
        },
        config: {
          imageConfig: {
            aspectRatio: aspectRatio,
            imageSize: size
          }
        }
      });

      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
      return null;
    } catch (error: any) {
      // Log simple error message to avoid clutter
      console.warn("Gemini Pro Image attempt failed. Trying fallback.");
      
      // Fallback to Flash if ANY error occurs (Permission Denied, Quota, etc)
      // This is safer for stability than checking specific error codes which might change
      return generateImageFlash(prompt, aspectRatio);
    }
  });
}

// --- Image Editing (Flash Image) ---

export async function editImage(base64Image: string, prompt: string): Promise<string | null> {
  return retryWithBackoff(async () => {
    const match = base64Image.match(/^data:(image\/[a-z]+);base64,(.+)$/);
    const mimeType = match ? match[1] : 'image/png';
    const data = match ? match[2] : base64Image;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: mimeType,
                data: data
              }
            },
            { text: prompt }
          ]
        }
      });

      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
      return null;
    } catch (error) {
      console.error("Image editing failed", error);
      throw error;
    }
  });
}

// --- Image Analysis (Pro with Fallback) ---

export async function analyzeImage(base64Image: string, prompt: string): Promise<string> {
  return retryWithBackoff(async () => {
    const match = base64Image.match(/^data:(image\/[a-z]+);base64,(.+)$/);
    const mimeType = match ? match[1] : 'image/png';
    const data = match ? match[2] : base64Image;

    const tryModel = async (model: string) => {
      const response = await ai.models.generateContent({
        model: model,
        contents: {
          parts: [
            { inlineData: { mimeType, data } },
            { text: prompt || "Analyze this image and describe what you see relevant to travel." }
          ]
        }
      });
      return response.text || "";
    };

    try {
      return await tryModel('gemini-3-pro-preview');
    } catch (error: any) {
      console.error("Image analysis failed with Pro, retrying with Flash");
      return await tryModel('gemini-2.5-flash');
    }
  });
}

// --- Video Generation (Veo) ---

export async function generateVideoVeo(prompt: string, aspectRatio: string): Promise<string | null> {
  const localAi = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    let operation = await localAi.models.generateVideos({
      model: 'veo-3.1-fast-generate-preview',
      prompt: prompt,
      config: {
        numberOfVideos: 1,
        resolution: '1080p',
        aspectRatio: aspectRatio 
      }
    });

    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 5000));
      operation = await localAi.operations.getVideosOperation({ operation: operation });
    }

    const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!videoUri) return null;

    const videoResponse = await fetch(`${videoUri}&key=${process.env.API_KEY}`);
    const blob = await videoResponse.blob();
    return URL.createObjectURL(blob);
    
  } catch (error) {
    console.error("Video generation failed", error);
    throw error;
  }
}
