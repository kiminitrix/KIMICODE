
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { ImageModel } from "../types";

// Helper to convert file to base64
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = error => reject(error);
  });
};

export const enhancePrompt = async (originalPrompt: string): Promise<string> => {
  if (!originalPrompt) return "";
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
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
  referenceImages: File[] = [],
  count: number = 1
): Promise<string[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const images: string[] = [];

  // IMAGEN MODELS
  if (model.startsWith('imagen')) {
    try {
      const response = await ai.models.generateImages({
        model: model,
        prompt: prompt,
        config: {
          numberOfImages: count, 
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
  // GEMINI MODELS
  else {
    try {
      // For Gemini models, we typically generate one by one or in a single turn.
      // Since generateContent for nano-banana doesn't have a 'count', we simulate if count > 1 
      // or just return what the model provides (usually 1).
      
      const parts: any[] = [];
      
      for (const file of referenceImages) {
        const base64 = await fileToBase64(file);
        parts.push({
          inlineData: {
            data: base64,
            mimeType: file.type,
          }
        });
      }

      parts.push({ text: prompt });

      let finalAspectRatio = aspectRatio;
      // Map unsupported ratios to nearest supported ones if necessary
      if (aspectRatio === '3:2') finalAspectRatio = '4:3';
      if (aspectRatio === '2:3') finalAspectRatio = '3:4';

      const config: any = {
         imageConfig: {
           aspectRatio: finalAspectRatio,
         }
      };
      
      if (model === ImageModel.GEMINI_PRO_IMAGE) {
        config.imageConfig.imageSize = "2K"; 
      }

      // If count > 1 for Gemini, we would ideally loop, but usually generateContent returns one candidate.
      // To keep it performant, we generate the requested amount if using a model that supports candidates, 
      // but nano-banana models currently return parts.
      
      const response = await ai.models.generateContent({
        model: model,
        contents: { parts },
        config: config
      });

      if (response.candidates?.[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData && part.inlineData.data) {
             images.push(`data:image/png;base64,${part.inlineData.data}`);
          }
        }
      }
      
      // If we need specifically 'count' images and model returned fewer, we could retry or just return.
      // Most Gemini image outputs return 1 image part per generation.
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
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const base64 = await fileToBase64(baseImage);
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

export const upscaleImage = async (
  base64Url: string,
  aspectRatio: string = '1:1'
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const mimeMatch = base64Url.match(/data:([^;]+);/);
    const mimeType = mimeMatch ? mimeMatch[1] : 'image/png';
    const base64 = base64Url.includes(',') ? base64Url.split(',')[1] : base64Url;
    const model = ImageModel.GEMINI_PRO_IMAGE;
    
    let finalAspectRatio = aspectRatio;
    if (aspectRatio === '3:2') finalAspectRatio = '4:3';
    if (aspectRatio === '2:3') finalAspectRatio = '3:4';

    const response = await ai.models.generateContent({
      model: model,
      contents: {
        parts: [
          {
            inlineData: {
              data: base64,
              mimeType: mimeType, 
            }
          },
          {
            text: "Upscale this image to 2K resolution. Enhance fine details, textures, and sharpness while maintaining the original composition and artistic style."
          }
        ]
      },
      config: {
        imageConfig: {
          aspectRatio: finalAspectRatio,
          imageSize: '2K' 
        }
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData?.data) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    throw new Error("Upscaling failed.");
  } catch (error) {
    console.error("Error upscaling image:", error);
    throw error;
  }
};

export const analyzeImageForPrompt = async (
  image: File,
  type: 'image' | 'video'
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const base64 = await fileToBase64(image);
    const systemPrompt = type === 'image' 
      ? "Analyze the attached image deeply. Describe the subject, lighting, composition, style, colors, and camera angle in extreme detail. Output a finalized, high-quality text-to-image prompt."
      : "Analyze the attached image. Based on this image, create a cinematic video prompt. Describe the motion, camera movement, and event progression starting from this frame.";

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview', 
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

export const extractTextFromFile = async (file: File): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const base64 = await fileToBase64(file);
    let prompt = "Extract all visible text from this content. Return ONLY the extracted text content.";
    
    if (file.type.startsWith('audio')) {
      prompt = "Transcribe the following audio file. Return ONLY the transcription text.";
    } else if (file.type.startsWith('video')) {
      prompt = "Transcribe the audio from this video and describe any prominent on-screen text. Return ONLY the text/transcription.";
    } else if (file.type === 'application/pdf') {
      prompt = "Read this PDF document and extract all text. Return ONLY the text content.";
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          {
            inlineData: {
              data: base64,
              mimeType: file.type,
            }
          },
          { text: prompt }
        ]
      }
    });
    
    return response.text || "No text detected.";
  } catch (error) {
    console.error("Error extracting text:", error);
    throw error;
  }
};
