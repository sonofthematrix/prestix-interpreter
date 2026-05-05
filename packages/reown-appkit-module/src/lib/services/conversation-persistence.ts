/**
 * Conversation Persistence Service
 * Syncs conversation history from Qdrant to Neon PostgreSQL
 * Provides MCP file system integration for conversation summaries
 */

import { QdrantClient } from "@qdrant/js-client-rest";
import { createClient } from "@/lib/db";
import { AuthUser } from "..";
import { cuid } from "zod/v4";

export interface ConversationMessage {
  id: string;
  sessionId: string;
  userId?: string;
  role: "user" | "assistant" | "system";
  content: string;
  audioUrl?: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface ConversationSummary {
  sessionId: string;
  userId?: string;
  title: string;
  summary: string;
  messageCount: number;
  startTime: Date;
  endTime: Date;
  topics: string[];
  sentiment?: "positive" | "neutral" | "negative";
}

class ConversationPersistenceService {
  private qdrantClient: QdrantClient;
  private readonly COLLECTION_NAME = "documentation_conversations";

  constructor() {
    const url = process.env.QDRANT_URL || "http://localhost:6333";
    const apiKey = process.env.QDRANT_API_KEY;

    this.qdrantClient = new QdrantClient({
      url,
      apiKey,
    });
  }

  /**
   * Sync conversation from Qdrant to PostgreSQL
   * Called after user confirms to persist the conversation
   */
  async syncConversationToPostgres(
    sessionId: string,
    userId?: string
  ): Promise<{ success: boolean; conversationId?: string; error?: string }> {
    try {
      // 1. Retrieve conversation from Qdrant
      const messages = await this.getConversationFromQdrant(sessionId);

      if (messages.length === 0) {
        return {
          success: false,
          error: "No messages found in Qdrant for this session",
        };
      }

      // 2. Generate conversation summary
      const summary = await this.generateConversationSummary(messages);

      // 3. Save to PostgreSQL using ZenStack
      const db = await createClient({ id: userId || '', email: userId || '', name: userId || '' , role: 'user' } as AuthUser);


      // Create message records
      await db.conversationMessage.createMany({
        data: messages.map((msg) => ({
          id: cuid() as unknown as string,
          conversationId: cuid() as unknown as string,
          sessionId,
          userId,
          role: msg.role,
          content: msg.content,
          audioUrl: msg.audioUrl,
          timestamp: msg.timestamp,
          metadata: msg.metadata,
        })),
      });

      // 4. Write summary to MCP file system
      await this.writeSummaryToMCP(cuid() as unknown as string, summary);

      return {
        success: true,
        conversationId: cuid() as unknown as string,
      };
    } catch (error) {
      console.error("Failed to sync conversation to Postgres:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Retrieve conversation messages from Qdrant
   */
  private async getConversationFromQdrant(
    sessionId: string
  ): Promise<ConversationMessage[]> {
    try {
      const result = await this.qdrantClient.scroll(this.COLLECTION_NAME, {
        filter: {
          must: [
            {
              key: "sessionId",
              match: { value: sessionId },
            },
          ],
        },
        limit: 1000,
        with_payload: true,
      });

      return result.points
        .map((point: any) => ({
          id: point.id,
          sessionId: point.payload.sessionId,
          userId: point.payload.userId,
          role: point.payload.role,
          content: point.payload.content,
          audioUrl: point.payload.audioUrl,
          timestamp: new Date(point.payload.timestamp),
          metadata: point.payload.metadata,
        }))
        .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    } catch (error) {
      console.error("Failed to retrieve conversation from Qdrant:", error);
      return [];
    }
  }

  /**
   * Generate conversation summary using AI
   */
  private async generateConversationSummary(
    messages: ConversationMessage[]
  ): Promise<ConversationSummary> {
    try {
      // Use Groq to generate summary
      const conversationText = messages
        .map((msg) => `${msg.role}: ${msg.content}`)
        .join("\n");

      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            {
              role: "system",
              content:
                "You are a conversation summarizer. Generate a concise title (max 50 chars), a detailed summary (max 200 words), extract 3-5 key topics, and determine sentiment (positive/neutral/negative).",
            },
            {
              role: "user",
              content: `Summarize this conversation:\n\n${conversationText}\n\nProvide response in JSON format: {"title": "...", "summary": "...", "topics": ["..."], "sentiment": "..."}`,
            },
          ],
          temperature: 0.3,
          max_tokens: 500,
        }),
      });

      if (!response.ok) {
        throw new Error(`Groq API error: ${response.status}`);
      }

      const data = await response.json();
      const summaryText = data.choices[0]?.message?.content || "{}";

      // Parse JSON response
      const parsed = JSON.parse(summaryText);

      return {
        sessionId: messages[0].sessionId,
        userId: messages[0].userId,
        title: parsed.title || "Conversation",
        summary: parsed.summary || "No summary available",
        messageCount: messages.length,
        startTime: messages[0].timestamp,
        endTime: messages[messages.length - 1].timestamp,
        topics: parsed.topics || [],
        sentiment: parsed.sentiment || "neutral",
      };
    } catch (error) {
      console.error("Failed to generate conversation summary:", error);

      // Fallback summary
      return {
        sessionId: messages[0].sessionId,
        userId: messages[0].userId,
        title: `Conversation ${messages[0].sessionId.substring(0, 8)}`,
        summary: `Conversation with ${messages.length} messages`,
        messageCount: messages.length,
        startTime: messages[0].timestamp,
        endTime: messages[messages.length - 1].timestamp,
        topics: ["general"],
        sentiment: "neutral",
      };
    }
  }

  /**
   * Write conversation summary to MCP file system
   */
  private async writeSummaryToMCP(
    conversationId: string,
    summary: ConversationSummary
  ): Promise<void> {
    try {
      const summaryContent = `# Conversation Summary

**ID:** ${conversationId}
**Session:** ${summary.sessionId}
**Title:** ${summary.title}
**Date:** ${summary.startTime.toISOString()}
**Duration:** ${Math.round((summary.endTime.getTime() - summary.startTime.getTime()) / 60000)} minutes
**Messages:** ${summary.messageCount}
**Topics:** ${summary.topics.join(", ")}
**Sentiment:** ${summary.sentiment}

## Summary

${summary.summary}

## Metadata

- **Start Time:** ${summary.startTime.toISOString()}
- **End Time:** ${summary.endTime.toISOString()}
- **User ID:** ${summary.userId || "Anonymous"}

---

*Generated by Tokenizin Conversation Persistence Service*
*Synced from Qdrant to Neon PostgreSQL*
`;

      // Write to MCP file system (conversation-summaries directory)
      const fs = await import("fs/promises");
      const path = await import("path");

      const summariesDir = path.join(
        process.cwd(),
        "conversation-summaries"
      );

      // Ensure directory exists
      try {
        await fs.mkdir(summariesDir, { recursive: true });
      } catch (error) {
        // Directory might already exist
      }

      const filename = `${conversationId}_${Date.now()}.md`;
      const filepath = path.join(summariesDir, filename);

      await fs.writeFile(filepath, summaryContent, "utf-8");

      console.log(`✅ Conversation summary written to: ${filepath}`);
    } catch (error) {
      console.error("Failed to write summary to MCP file system:", error);
      // Don't throw - this is a non-critical operation
    }
  }

  /**
   * Get conversation history from PostgreSQL
   */
  async getConversationHistory(
    userId?: string,
    limit: number = 50
  ): Promise<any[]> {
    try {
      const db = await createClient();

      const conversations = await db.conversation.findMany({
        where: userId ? { userId } : {},
        orderBy: { startTime: "desc" },
        take: limit,
        include: {
          messages: {
            orderBy: { timestamp: "asc" },
            take: 10, // Include first 10 messages as preview
          },
        },
      });

      return conversations;
    } catch (error) {
      console.error("Failed to get conversation history:", error);
      return [];
    }
  }

  /**
   * Get full conversation with all messages
   */
  async getFullConversation(conversationId: string): Promise<any | null> {
    try {
      const db = await createClient();

      const conversation = await db.conversation.findUnique({
        where: { id: conversationId },
        include: {
          messages: {
            orderBy: { timestamp: "asc" },
          },
        },
      });

      return conversation;
    } catch (error) {
      console.error("Failed to get full conversation:", error);
      return null;
    }
  }

  /**
   * Delete conversation from both Qdrant and PostgreSQL
   */
  async deleteConversation(conversationId: string): Promise<boolean> {
    try {
      const db = await createClient();

      // Get session ID before deleting
      const conversation = await db.conversation.findUnique({
        where: { id: conversationId },
        select: { sessionId: true },
      });

      if (!conversation) {
        return false;
      }

      // Delete from PostgreSQL (cascade will delete messages)
      await db.conversation.delete({
        where: { id: conversationId },
      });

      // Delete from Qdrant
      await this.qdrantClient.delete(this.COLLECTION_NAME, {
        filter: { must: [
          { should: [ { key: "sessionId", match: { value: conversation.sessionId } } ] } as any,
        ]} as any,
      } as any);

      return true;
    } catch (error) {
      console.error("Failed to delete conversation:", error);
      return false;
    }
  }

  /**
   * Search conversations by content
   */
  async searchConversations(
    query: string,
    userId?: string,
    limit: number = 20
  ): Promise<any[]> {
    try {
      const db = await createClient();

      const conversations = await db.conversation.findMany({
        where: {
          AND: [
            userId ? { userId } : {},
            {
              OR: [
                { title: { contains: query, mode: "insensitive" } },
                { summary: { contains: query, mode: "insensitive" } },
                { topics: { has: query } },
              ],
            },
          ],
        },
        orderBy: { startTime: "desc" },
        take: limit,
        include: {
          messages: {
            orderBy: { timestamp: "asc" },
            take: 5,
          },
        },
      });

      return conversations;
    } catch (error) {
      console.error("Failed to search conversations:", error);
      return [];
    }
  }
}

// Export singleton instance
export const conversationPersistence = new ConversationPersistenceService();

