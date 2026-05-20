import { learningStore, jsonLearningStore } from "./interpreter/learningStore";
import type {
  CorrectionMemory,
  GlossaryMemory,
  InterpreterMode,
  LearningContext,
  LearningEntry,
  LearningType,
  StyleMemory,
} from "./interpreter/types";

export type { InterpreterMode };
export type InterpreterLearningType = LearningType;
export type InterpreterCorrectionMemory = CorrectionMemory;
export type InterpreterGlossaryMemory = GlossaryMemory;
export type InterpreterStyleMemory = StyleMemory;
export type InterpreterLearningMemory = LearningEntry;
export type InterpreterLearningContext = LearningContext;

export { JsonLearningStore, jsonLearningStore, learningStore } from "./interpreter/learningStore";

export async function appendInterpreterLearningMemory(
  memory:
    | Omit<CorrectionMemory, "createdAt">
    | Omit<GlossaryMemory, "createdAt">
    | Omit<StyleMemory, "createdAt">,
): Promise<LearningEntry> {
  return jsonLearningStore.addMemory(memory);
}

export async function appendInterpreterCorrection(
  correction: Omit<CorrectionMemory, "createdAt" | "type">,
): Promise<CorrectionMemory> {
  return learningStore.addCorrection(correction);
}

export async function getInterpreterLearningContext({
  input,
  mode,
}: {
  input: string;
  mode: InterpreterMode;
}): Promise<LearningContext> {
  return learningStore.listRelevant(input, mode);
}
