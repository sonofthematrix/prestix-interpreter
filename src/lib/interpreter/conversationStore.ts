import type { ConversationSegment, ConversationStore } from "./types";

export class InMemoryConversationStore implements ConversationStore {
  private readonly segments: ConversationSegment[] = [];

  async appendSegment(segment: ConversationSegment): Promise<void> {
    this.segments.unshift(segment);
    this.segments.splice(100);
  }

  async listRecent(limit: number): Promise<ConversationSegment[]> {
    return this.segments.slice(0, Math.max(0, limit));
  }
}

// Future adapter: ZenStackConversationStore via createClient(authUser).
export const conversationStore = new InMemoryConversationStore();
