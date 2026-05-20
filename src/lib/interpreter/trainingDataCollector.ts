/**
 * Training data collector for personal assistant fine-tuning.
 * Collects conversations from Prestix and exports to ChatML format.
 */

import type { AssistantHistoryTurn, InterpreterMode } from "./types";

export type TrainingExample = {
  messages: Array<{
    role: "system" | "user" | "assistant";
    content: string;
  }>;
};

// Hermes-3 system prompt for personal assistant
const PERSONAL_ASSISTANT_SYSTEM = `You are a personal AI assistant. Be direct, warm, practical, and lightly playful. Sound plainspoken and sharp, never stiff or corporate. Do the obvious helpful thing first instead of listing options. If something is unclear or uncertain, say that plainly instead of bluffing. Keep answers concise unless the user asks for more detail.`;

export function historyToTrainingExample(
  history: AssistantHistoryTurn[],
  mode: InterpreterMode
): TrainingExample | null {
  if (history.length < 2) return null;

  const messages: TrainingExample["messages"] = [
    { role: "system", content: PERSONAL_ASSISTANT_SYSTEM },
  ];

  for (const turn of history) {
    messages.push({
      role: turn.role,
      content: turn.content,
    });
  }

  return { messages };
}

export function exportToChatML(examples: TrainingExample[]): string {
  return examples
    .map((ex) => {
      const parts: string[] = [];
      for (const msg of ex.messages) {
        if (msg.role === "system") {
          parts.push(`<|im_start|>system\n${msg.content}<|im_end|>`);
        } else if (msg.role === "user") {
          parts.push(`<|im_start|>user\n${msg.content}<|im_end|>`);
        } else if (msg.role === "assistant") {
          parts.push(`<|im_start|>assistant\n${msg.content}<|im_end|>`);
        }
      }
      return parts.join("\n");
    })
    .join("\n\n");
}

export function exportToJSONL(examples: TrainingExample[]): string {
  return examples.map((ex) => JSON.stringify(ex)).join("\n");
}

// Collect training data from localStorage (client-side) or memory store (server-side)
export async function collectTrainingData(): Promise<TrainingExample[]> {
  // TODO: Implement based on where conversation history is stored
  // For now, return empty - will be populated from actual usage
  return [];
}

export function saveTrainingData(
  examples: TrainingExample[],
  format: "chatml" | "jsonl" = "jsonl"
): string {
  if (format === "chatml") {
    return exportToChatML(examples);
  }
  return exportToJSONL(examples);
}
