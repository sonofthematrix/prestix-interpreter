export function getSpeechSynthesisTimeoutMs(text: string): number {
  const estimatedMs = text.trim().length * 75;
  return Math.min(20000, Math.max(4000, estimatedMs));
}

export function resolveWithTimeout<T, TTimeout>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutValue: TTimeout,
): Promise<T | TTimeout> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      resolve(timeoutValue);
    }, timeoutMs);

    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

export function createSpeechOutputQueue<TJob>({
  speak,
}: {
  speak: (job: TJob) => Promise<void>;
}) {
  const pendingJobs: TJob[] = [];
  let running = false;

  const drain = () => {
    if (running) {
      return;
    }

    running = true;

    void (async () => {
      try {
        while (pendingJobs.length > 0) {
          const job = pendingJobs.shift();
          if (job !== undefined) {
            await speak(job);
          }
        }
      } finally {
        running = false;

        if (pendingJobs.length > 0) {
          drain();
        }
      }
    })();
  };

  return {
    enqueue(job: TJob): void {
      pendingJobs.push(job);
      drain();
    },
    pendingCount(): number {
      return pendingJobs.length;
    },
    isRunning(): boolean {
      return running;
    },
    clear(): void {
      pendingJobs.length = 0;
    },
  };
}

function stringField(value: unknown, field: string): string | null {
  if (typeof value !== "object" || value === null || !(field in value)) {
    return null;
  }

  const record = value as Record<string, unknown>;
  return typeof record[field] === "string" ? record[field] : null;
}

function numberField(value: unknown, field: string): number | null {
  if (typeof value !== "object" || value === null || !(field in value)) {
    return null;
  }

  const record = value as Record<string, unknown>;
  return typeof record[field] === "number" && Number.isFinite(record[field])
    ? record[field]
    : null;
}

function booleanField(value: unknown, field: string): boolean | null {
  if (typeof value !== "object" || value === null || !(field in value)) {
    return null;
  }

  const record = value as Record<string, unknown>;
  return typeof record[field] === "boolean" ? record[field] : null;
}

function stringArrayField(value: unknown, field: string): string[] {
  if (typeof value !== "object" || value === null || !(field in value)) {
    return [];
  }

  const record = value as Record<string, unknown>;
  return Array.isArray(record[field])
    ? record[field].filter((item): item is string => typeof item === "string")
    : [];
}

export function readInterpreterResponseMetadata(data: unknown) {
  const fallbackUsedRaw = booleanField(data, "fallbackUsed");
  const learningMatchesCount =
    numberField(data, "learningMatchesCount") ?? numberField(data, "learningContextCount");
  const legacyLearningUsed = booleanField(data, "learningContextUsed");

  return {
    conversationFallbackUsed: fallbackUsedRaw ?? undefined,
    fallbackUsed: fallbackUsedRaw === null ? "unknown" : String(fallbackUsedRaw),
    learningContext:
      learningMatchesCount !== null
        ? String(learningMatchesCount)
        : legacyLearningUsed === null
          ? "unknown"
          : String(legacyLearningUsed),
    learningMatchesCount: learningMatchesCount ?? undefined,
    learningTypesUsed: stringArrayField(data, "learningTypesUsed"),
    model: stringField(data, "model") ?? "unknown",
    provider: stringField(data, "provider") ?? "unknown",
  };
}
