import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { ImageModel } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Helper to convert file to base64
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data:image/png;base64, prefix if needed by API, 
      // but GenAI SDK usually handles raw base64 data extraction from this format or we strip it.
      // For GenAI 'inlineData', we need just the base64 string.
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = error => reject(error);
  });
};

export const enhancePrompt = async (originalPrompt: string): Promise<string> => {
  if (!originalPrompt) return "";
  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `You are an expert AI image prompt engineer. Rewrite the following user prompt to be more descriptive, artistic, and detailed to produce a high-quality image. Return ONLY the enhanced prompt, no explanation.
      
      User Prompt: "${originalPrompt}"`,
    });
    return response.text?.trim() || originalPrompt;
  } catch (error) {
    console.error("Error enhancing prompt:", error);
    return originalPrompt;
  }
};

export const generateImage = async (
  model: string,
  prompt: string,
  aspectRatio: string,
  referenceImages: File[] = []
): Promise<string[]> => {
  const images: string[] = [];

  // IMAGEN MODELS
  if (model.startsWith('imagen')) {
    try {
      // Convert reference images if supported (Imagen usually text-to-image, but keeping logic clean)
      // Note: Current GenAI SDK for Imagen via `generateImages` is primarily text-to-image.
      
      const response = await ai.models.generateImages({
        model: model,
        prompt: prompt,
        config: {
          numberOfImages: 1, // We will handle multiple by calling this function multiple times in the UI loop if needed, or pass prop. 
          // Note: To simplify the service, we return 1 image per call here, and the UI loops.
          outputMimeType: 'image/jpeg',
          aspectRatio: aspectRatio,
        },
      });
      
      if (response.generatedImages) {
        for (const img of response.generatedImages) {
           if (img.image?.imageBytes) {
             images.push(`data:image/jpeg;base64,${img.image.imageBytes}`);
           }
        }
      }
    } catch (e) {
      console.error("Imagen generation error", e);
      throw e;
    }
  } 
  // GEMINI NANO/BANANA MODELS
  else {
    try {
      const parts: any[] = [];
      
      // Add reference images
      for (const file of referenceImages) {
        const base64 = await fileToBase64(file);
        parts.push({
          inlineData: {
            data: base64,
            mimeType: file.type,
          }
        });
      }

      // Add prompt
      parts.push({ text: prompt });

      // Handle unsupported aspect ratios for Gemini by mapping to closest valid ones
      // Valid: "1:1", "3:4", "4:3", "9:16", "16:9"
      let finalAspectRatio = aspectRatio;
      if (aspectRatio === '3:2') finalAspectRatio = '4:3';
      if (aspectRatio === '2:3') finalAspectRatio = '3:4';

      // Config
      const config: any = {
         imageConfig: {
           aspectRatio: finalAspectRatio,
         }
      };
      
      // Add imageSize for Pro model
      if (model === ImageModel.GEMINI_PRO_IMAGE) {
        config.imageConfig.imageSize = "2K"; // Defaulting to high quality for Pro
      }

      const response = await ai.models.generateContent({
        model: model,
        contents: { parts },
        config: config
      });

      // Extract images from response
      if (response.candidates?.[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData && part.inlineData.data) {
             images.push(`data:image/png;base64,${part.inlineData.data}`);
          }
        }
      }
    } catch (e) {
      console.error("Gemini image generation error", e);
      throw e;
    }
  }

  return images;
};

export const editImage = async (
  baseImage: File,
  instruction: string
): Promise<string> => {
  try {
    const base64 = await fileToBase64(baseImage);
    
    // Using gemini-2.5-flash-image for editing/instruction based generation
    const response = await ai.models.generateContent({
      model: ImageModel.GEMINI_FLASH_IMAGE,
      contents: {
        parts: [
          {
            inlineData: {
              data: base64,
              mimeType: baseImage.type,
            },
          },
          {
            text: instruction,
          },
        ],
      },
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData?.data) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    throw new Error("No image returned from edit operation.");
  } catch (error) {
    console.error("Error editing image:", error);
    throw error;
  }
};

export const analyzeImageForPrompt = async (
  image: File,
  type: 'image' | 'video'
): Promise<string> => {
  try {
    const base64 = await fileToBase64(image);
    const systemPrompt = type === 'image' 
      ? "Analyze the attached image deeply. Describe the subject, lighting, composition, style, colors, and camera angle in extreme detail. Output a finalized, high-quality text-to-image prompt that could be used to recreate this exact style."
      : "Analyze the attached image. Based on this image, create a compelling cinematic video prompt. Describe the motion, camera movement, atmosphere, and event progression that would make sense starting from this frame.";

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash', // Flash is great for multimodal understanding
      contents: {
        parts: [
          {
            inlineData: {
              data: base64,
              mimeType: image.type,
            }
          },
          { text: systemPrompt }
        ]
      }
    });

    return response.text || "Failed to generate prompt.";
  } catch (error) {
    console.error("Error analyzing image:", error);
    throw error;
  }
};