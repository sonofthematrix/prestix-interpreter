import { describe, expect, it, vi } from "vitest";
import {
  createSpeechOutputQueue,
  getSpeechSynthesisTimeoutMs,
  readInterpreterResponseMetadata,
  resolveWithTimeout,
} from "./clientRuntime";

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((innerResolve, innerReject) => {
    resolve = innerResolve;
    reject = innerReject;
  });

  return { promise, reject, resolve };
}

async function flushMicrotasks() {
  await Promise.resolve();
  await Promise.resolve();
}

describe("interpreter client runtime", () => {
  it("keeps speech output serialized while enqueue stays non-blocking", async () => {
    const firstSpeech = deferred<void>();
    const secondSpeech = deferred<void>();
    const spoken: string[] = [];

    const queue = createSpeechOutputQueue<{ id: string }>({
      speak: (job) => {
        spoken.push(job.id);
        return job.id === "first" ? firstSpeech.promise : secondSpeech.promise;
      },
    });

    const enqueueResult = queue.enqueue({ id: "first" });
    queue.enqueue({ id: "second" });

    expect(enqueueResult).toBeUndefined();
    await flushMicrotasks();
    expect(spoken).toEqual(["first"]);
    expect(queue.isRunning()).toBe(true);
    expect(queue.pendingCount()).toBe(1);

    firstSpeech.resolve();
    await flushMicrotasks();
    expect(spoken).toEqual(["first", "second"]);

    secondSpeech.resolve();
    await flushMicrotasks();
    expect(queue.isRunning()).toBe(false);
    expect(queue.pendingCount()).toBe(0);
  });

  it("resolves with timeout value when speech synthesis never finishes", async () => {
    vi.useFakeTimers();
    const neverFinishes = new Promise<"ended">(() => {});

    const resultPromise = resolveWithTimeout(neverFinishes, 250, "timeout");
    await vi.advanceTimersByTimeAsync(250);

    await expect(resultPromise).resolves.toBe("timeout");
    vi.useRealTimers();
  });

  it("clears pending speech output without interrupting the current job", async () => {
    const firstSpeech = deferred<void>();
    const spoken: string[] = [];

    const queue = createSpeechOutputQueue<{ id: string }>({
      speak: (job) => {
        spoken.push(job.id);
        return firstSpeech.promise;
      },
    });

    queue.enqueue({ id: "first" });
    queue.enqueue({ id: "second" });
    await flushMicrotasks();

    queue.clear();
    expect(queue.pendingCount()).toBe(0);

    firstSpeech.resolve();
    await flushMicrotasks();

    expect(spoken).toEqual(["first"]);
    expect(queue.isRunning()).toBe(false);
  });

  it("calculates a bounded timeout from text length", () => {
    expect(getSpeechSynthesisTimeoutMs("Short sentence.")).toBeGreaterThanOrEqual(4000);
    expect(getSpeechSynthesisTimeoutMs("x".repeat(1000))).toBeLessThanOrEqual(20000);
  });

  it("reads current interpreter API metadata without exposing raw payload values", () => {
    expect(
      readInterpreterResponseMetadata({
        provider: "openai",
        model: "gpt-4.1",
        fallbackUsed: true,
        learningMatchesCount: 3,
        learningTypesUsed: ["glossary", "style"],
      }),
    ).toEqual({
      conversationFallbackUsed: true,
      fallbackUsed: "true",
      learningContext: "3",
      learningMatchesCount: 3,
      learningTypesUsed: ["glossary", "style"],
      model: "gpt-4.1",
      provider: "openai",
    });
  });

  it("falls back to legacy learning metadata fields when needed", () => {
    expect(
      readInterpreterResponseMetadata({
        learningContextCount: 2,
        learningContextUsed: true,
      }),
    ).toMatchObject({
      fallbackUsed: "unknown",
      learningContext: "2",
      learningMatchesCount: 2,
      model: "unknown",
      provider: "unknown",
    });
  });
});
