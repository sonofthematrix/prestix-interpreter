export const PRIMARY_INTERPRETER_ROUTE = "/voice" as const;

export function getVoiceSurfaceIntro(): {
  badge: string;
  hint: string;
} {
  return {
    badge: "Primary voice room",
    hint: "Assistant + interpreter on one screen.",
  };
}
