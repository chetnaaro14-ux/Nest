
import { GoogleGenAI, Type } from "@google/genai";

// Ensure API Key is available
const apiKey = process.env.API_KEY || "";
const ai = new GoogleGenAI({ apiKey });

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
  
  // Model selection based on feature request
  // 'general' -> Chatbot -> gemini-3-pro-preview
  // 'travel_guide' -> Search/Maps -> gemini-2.5-flash
  // 'fast' -> Fast responses -> gemini-2.5-flash-lite
  
  let model = 'gemini-3-pro-preview';
  let tools: any[] = [];
  let toolConfig: any = undefined;

  if (mode === 'travel_guide') {
    model = 'gemini-2.5-flash';
    tools = [{ googleSearch: {} }, { googleMaps: {} }];
    
    // Attempt to get user location for better maps grounding
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
      // Ignore location error, proceed without it
    }
  } else if (mode === 'fast') {
    model = 'gemini-2.5-flash-lite-latest';
  }

  // Construct chat history for the SDK
  // Note: The SDK chat helper manages history statefully, but here we are stateless wrapper 
  // or we can recreate the chat history each time. For simplicity in this functional wrapper:
  
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
}

// --- Image Generation (Pro) ---

export async function generateImagePro(prompt: string, aspectRatio: string, size: string): Promise<string | null> {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: {
        parts: [{ text: prompt }]
      },
      config: {
        imageConfig: {
          aspectRatio: aspectRatio, // "1:1", "3:4", "4:3", "9:16", "16:9"
          imageSize: size // "1K", "2K", "4K"
        }
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    return null;
  } catch (error) {
    console.error("Image generation failed", error);
    throw error;
  }
}

// --- Image Editing (Flash Image) ---

export async function editImage(base64Image: string, prompt: string): Promise<string | null> {
  // mimeType is usually image/png or image/jpeg. We'll strip the prefix if it exists.
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
}

// --- Image Analysis (Pro) ---

export async function analyzeImage(base64Image: string, prompt: string): Promise<string> {
  const match = base64Image.match(/^data:(image\/[a-z]+);base64,(.+)$/);
  const mimeType = match ? match[1] : 'image/png';
  const data = match ? match[2] : base64Image;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: data
            }
          },
          { text: prompt || "Analyze this image and describe what you see relevant to travel." }
        ]
      }
    });
    return response.text || "";
  } catch (error) {
    console.error("Image analysis failed", error);
    throw error;
  }
}

// --- Video Generation (Veo) ---

export async function generateVideoVeo(prompt: string, aspectRatio: string): Promise<string | null> {
  // Veo requires the user to select their own API Key
  // We assume the caller checks window.aistudio.hasSelectedApiKey()
  
  // Re-instantiate AI with the potentially updated key context (handled internally by the browser environment if injected, 
  // but strictly following instructions: "Create a new GoogleGenAI instance right before making an API call")
  const localAi = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    let operation = await localAi.models.generateVideos({
      model: 'veo-3.1-fast-generate-preview',
      prompt: prompt,
      config: {
        numberOfVideos: 1,
        resolution: '1080p', // Can be 720p or 1080p
        aspectRatio: aspectRatio // '16:9' or '9:16'
      }
    });

    // Poll for completion
    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // Poll every 5s
      operation = await localAi.operations.getVideosOperation({ operation: operation });
    }

    const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!videoUri) return null;

    // Fetch the actual video bytes using the key
    const videoResponse = await fetch(`${videoUri}&key=${process.env.API_KEY}`);
    const blob = await videoResponse.blob();
    return URL.createObjectURL(blob);
    
  } catch (error) {
    console.error("Video generation failed", error);
    throw error;
  }
}
