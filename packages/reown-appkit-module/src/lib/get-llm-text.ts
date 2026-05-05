import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";

/**
 * Generate text using OpenAI's GPT model
 */
export async function getLLMText(prompt: string, options?: {
  model?: string;
  temperature?: number;
  maxTokens?: number;
}): Promise<string> {
  try {
    const result = await generateText({
      model: openai(options?.model || "gpt-4o") as any,
      prompt,
      temperature: options?.temperature || 0.7
    });

    return result.text;
  } catch (error) {
    console.error("Error generating LLM text:", error);
    throw new Error("Failed to generate text");
  }
}

/**
 * Generate schema-related text using OpenAI's GPT model
 */
export async function getSchemaLLMText(prompt: string, schema?: string): Promise<string> {
  const fullPrompt = schema 
    ? `${prompt}\n\nSchema context:\n${schema}`
    : prompt;

  return getLLMText(fullPrompt, {
    model: "gpt-4o",
    temperature: 0.3,
    maxTokens: 2000,
  });
}
