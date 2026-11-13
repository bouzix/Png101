'use server';

import { GoogleGenerativeAI } from '@google/generative-ai';
import { getActiveApiKey } from '@/lib/api-keys';

export async function generateImageMetadata(imageBase64: string, modelName: string) {
    try {
        const activeApiKeyRecord = await getActiveApiKey();
        const apiKey = activeApiKeyRecord?.key;

        if (!apiKey) {
            throw new Error("No active API key found. Please add and activate an API key in Settings > API Keys.");
        }

        // Map UI model selection to the fastest active upstream model endpoint for new keys
        let resolvedModel = modelName;
        if (modelName === 'gemini-3.8-flash') {
            resolvedModel = 'gemini-3-flash-preview';
        } else if (modelName === 'gemini-3.0-pro') {
            resolvedModel = 'gemini-3.1-pro-preview';
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ 
            model: resolvedModel,
            generationConfig: {
                responseMimeType: "application/json"
            }
        });

        const prompt = `You are an SEO expert for a premium PNG images website.
        Analyze the provided image and generate the following metadata to maximize search visibility and user engagement.
        The content is for a PNG image site, so focus on visual elements, transparency, and usage context.

        Required Output Format (JSON):
        {
          "title": "A catchy, descriptive, and SEO-friendly title",
          "altText": "Concise description for accessibility (similar to title)",
          "description": "Short, engaging description of the image content",
          "tags": ["tag1", "tag2", ... 20-30 tags]
        }
        `;

        // Extract mimeType if present, and strip base64 header
        const mimeMatch = imageBase64.match(/^data:(image\/\w+);base64,/);
        const mimeType = mimeMatch ? mimeMatch[1] : "image/png";
        const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");

        const result = await model.generateContent([
            prompt,
            { inlineData: { data: base64Data, mimeType } },
        ]);

        const response = await result.response;
        const text = response.text();

        return JSON.parse(text);

    } catch (error: any) {
        console.error("Error generating metadata:", error);
        // Return a structured error so the UI can show it nicely
        throw new Error(error.message || "Failed to generate metadata");
    }
}
