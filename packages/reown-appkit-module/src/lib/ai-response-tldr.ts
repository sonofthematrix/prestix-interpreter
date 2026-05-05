/**
 * AI Response TLDR Generator
 * Automatically generates concise summaries of AI interactions and complex responses
 */

import { z } from 'zod';
import { mcpLogger } from './mcp-logger';

// ============================================================================
// TLDR TYPES
// ============================================================================

export interface TLDRSummary {
  id: string;
  originalContent: string;
  summary: string;
  keyPoints: string[];
  actionItems: string[];
  confidence: number; // 0-100
  complexity: 'simple' | 'moderate' | 'complex';
  category: string;
  tags: string[];
  createdAt: Date;
  metadata: {
    wordCount: number;
    originalWordCount: number;
    compressionRatio: number;
    processingTime: number;
  };
}

export interface TLDRConfig {
  maxSummaryLength: number;
  includeActionItems: boolean;
  includeKeyPoints: boolean;
  targetAudience: 'executive' | 'technical' | 'general';
  compressionLevel: 'high' | 'medium' | 'low';
}

// ============================================================================
// AI RESPONSE TLDR GENERATOR CLASS
// ============================================================================

export class AIResponseTLDRGenerator {
  private static instance: AIResponseTLDRGenerator;
  private summaries: TLDRSummary[] = [];
  private maxSummaries = 1000;
  private config: TLDRConfig;

  private constructor() {
    this.config = {
      maxSummaryLength: 200,
      includeActionItems: true,
      includeKeyPoints: true,
      targetAudience: 'general',
      compressionLevel: 'medium',
    };
  }

  static getInstance(): AIResponseTLDRGenerator {
    if (!AIResponseTLDRGenerator.instance) {
      AIResponseTLDRGenerator.instance = new AIResponseTLDRGenerator();
    }
    return AIResponseTLDRGenerator.instance;
  }

  /**
   * Generate TLDR summary for content
   */
  async generateTLDR(
    content: string,
    category: string = 'general',
    customConfig?: Partial<TLDRConfig>
  ): Promise<TLDRSummary> {
    const startTime = Date.now();
    const config = { ...this.config, ...customConfig };

    try {
      // Analyze content complexity
      const complexity = this.analyzeComplexity(content);
      const wordCount = content.split(/\s+/).length;

      // Generate summary based on complexity and config
      const summary = await this.createSummary(content, config);
      const keyPoints = config.includeKeyPoints ? await this.extractKeyPoints(content) : [];
      const actionItems = config.includeActionItems ? await this.extractActionItems(content) : [];

      // Calculate confidence and compression
      const confidence = this.calculateConfidence(content, summary);
      const compressionRatio = wordCount > 0 ? (summary.split(/\s+/).length / wordCount) * 100 : 0;

      const tldrSummary: TLDRSummary = {
        id: `tldr-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        originalContent: content,
        summary,
        keyPoints,
        actionItems,
        confidence,
        complexity,
        category,
        tags: this.generateTags(content, category),
        createdAt: new Date(),
        metadata: {
          wordCount: summary.split(/\s+/).length,
          originalWordCount: wordCount,
          compressionRatio,
          processingTime: Date.now() - startTime,
        },
      };

      this.summaries.push(tldrSummary);

      // Maintain size limit
      if (this.summaries.length > this.maxSummaries) {
        this.summaries = this.summaries.slice(-this.maxSummaries);
      }

      // Log generation
      mcpLogger.info('TLDR_GENERATION', `Generated TLDR summary for ${category}`, {
        summaryLength: summary.length,
        compressionRatio: compressionRatio.toFixed(1) + '%',
        confidence: confidence.toFixed(1) + '%',
        processingTime: Date.now() - startTime,
      }, 'generate_tldr');

      return tldrSummary;

    } catch (error) {
      mcpLogger.error('TLDR_GENERATION', 'Failed to generate TLDR summary', error, 'generate_tldr');

      // Return basic summary on error
      const basicSummary = content.length > config.maxSummaryLength
        ? content.substring(0, config.maxSummaryLength) + '...'
        : content;

      return {
        id: `tldr-error-${Date.now()}`,
        originalContent: content,
        summary: basicSummary,
        keyPoints: [],
        actionItems: [],
        confidence: 50,
        complexity: 'simple',
        category,
        tags: ['error'],
        createdAt: new Date(),
        metadata: {
          wordCount: basicSummary.split(/\s+/).length,
          originalWordCount: content.split(/\s+/).length,
          compressionRatio: 100,
          processingTime: Date.now() - startTime,
        },
      };
    }
  }

  /**
   * Generate executive summary for business interactions
   */
  async generateExecutiveSummary(
    interactions: Array<{ role: string; content: string; timestamp: Date }>,
    businessContext: string
  ): Promise<TLDRSummary> {
    const combinedContent = interactions
      .map(i => `[${i.role.toUpperCase()}] ${i.content}`)
      .join('\n\n');

    const contextPrompt = `Business Context: ${businessContext}\n\nConversation:\n${combinedContent}`;

    return this.generateTLDR(contextPrompt, 'executive', {
      targetAudience: 'executive',
      maxSummaryLength: 300,
      includeActionItems: true,
      includeKeyPoints: true,
    });
  }

  /**
   * Generate technical summary for development tasks
   */
  async generateTechnicalSummary(
    codeChanges: string[],
    requirements: string[],
    issues: string[]
  ): Promise<TLDRSummary> {
    const technicalContent = `
Code Changes:
${codeChanges.join('\n')}

Requirements:
${requirements.join('\n')}

Issues/Considerations:
${issues.join('\n')}
    `.trim();

    return this.generateTLDR(technicalContent, 'technical', {
      targetAudience: 'technical',
      maxSummaryLength: 250,
      includeActionItems: true,
      includeKeyPoints: true,
    });
  }

  /**
   * Get summaries for analysis
   */
  getSummaries(options: {
    category?: string;
    minConfidence?: number;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  } = {}): TLDRSummary[] {
    let filtered = this.summaries;

    if (options.category) {
      filtered = filtered.filter(s => s.category === options.category);
    }
    if (options.minConfidence !== undefined) {
      filtered = filtered.filter(s => s.confidence >= options.minConfidence);
    }
    if (options.startDate) {
      filtered = filtered.filter(s => s.createdAt >= options.startDate!);
    }
    if (options.endDate) {
      filtered = filtered.filter(s => s.createdAt <= options.endDate!);
    }

    if (options.limit) {
      filtered = filtered.slice(-options.limit);
    }

    return filtered;
  }

  /**
   * Get summary statistics
   */
  getStatistics(timeRange?: { start: Date; end: Date }): {
    totalSummaries: number;
    averageConfidence: number;
    averageCompression: number;
    categoryBreakdown: Record<string, number>;
    complexityBreakdown: Record<string, number>;
    averageProcessingTime: number;
  } {
    const summaries = timeRange
      ? this.summaries.filter(s => s.createdAt >= timeRange.start && s.createdAt <= timeRange.end)
      : this.summaries;

    const totalSummaries = summaries.length;
    const averageConfidence = totalSummaries > 0
      ? summaries.reduce((sum, s) => sum + s.confidence, 0) / totalSummaries
      : 0;

    const averageCompression = totalSummaries > 0
      ? summaries.reduce((sum, s) => sum + s.metadata.compressionRatio, 0) / totalSummaries
      : 0;

    const averageProcessingTime = totalSummaries > 0
      ? summaries.reduce((sum, s) => sum + s.metadata.processingTime, 0) / totalSummaries
      : 0;

    const categoryBreakdown = summaries.reduce((acc, s) => {
      acc[s.category] = (acc[s.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const complexityBreakdown = summaries.reduce((acc, s) => {
      acc[s.complexity] = (acc[s.complexity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalSummaries,
      averageConfidence,
      averageCompression,
      categoryBreakdown,
      complexityBreakdown,
      averageProcessingTime,
    };
  }

  /**
   * Export summaries to markdown
   */
  exportToMarkdown(options: {
    category?: string;
    startDate?: Date;
    endDate?: Date;
    includeOriginalContent?: boolean;
  } = {}): string {
    const summaries = this.getSummaries(options);

    const header = `# AI Response TLDR Summaries\n\nGenerated on: ${new Date().toISOString()}\n\n`;

    const summarySections = summaries.map(summary => {
      const section = `## ${summary.category} - ${summary.createdAt.toLocaleDateString()}

**Summary:** ${summary.summary}

**Confidence:** ${summary.confidence.toFixed(1)}%
**Complexity:** ${summary.complexity}
**Tags:** ${summary.tags.join(', ')}

### Key Points
${summary.keyPoints.map(point => `- ${point}`).join('\n')}

### Action Items
${summary.actionItems.map(item => `- ${item}`).join('\n')}

**Metadata:**
- Original Word Count: ${summary.metadata.originalWordCount}
- Summary Word Count: ${summary.metadata.wordCount}
- Compression Ratio: ${summary.metadata.compressionRatio.toFixed(1)}%
- Processing Time: ${summary.metadata.processingTime}ms

${options.includeOriginalContent ? `### Original Content\n${summary.originalContent}\n` : ''}
---
`;

      return section;
    }).join('\n');

    return header + summarySections;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<TLDRConfig>): void {
    this.config = { ...this.config, ...config };
    mcpLogger.info('TLDR_CONFIG', 'Updated TLDR configuration', config);
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private analyzeComplexity(content: string): 'simple' | 'moderate' | 'complex' {
    const wordCount = content.split(/\s+/).length;
    const sentenceCount = content.split(/[.!?]+/).length;
    const avgWordsPerSentence = wordCount / sentenceCount;

    // Technical indicators
    const technicalTerms = (content.match(/\b(function|class|interface|async|await|promise|api|database|query)\b/gi) || []).length;
    const codeBlocks = (content.match(/```[\s\S]*?```/g) || []).length;

    if (wordCount > 1000 || technicalTerms > 10 || codeBlocks > 2 || avgWordsPerSentence > 25) {
      return 'complex';
    } else if (wordCount > 500 || technicalTerms > 5 || avgWordsPerSentence > 20) {
      return 'moderate';
    } else {
      return 'simple';
    }
  }

  private async createSummary(content: string, config: TLDRConfig): Promise<string> {
    // Simple extractive summarization based on content analysis
    const sentences = content.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 0);

    if (sentences.length <= 3) {
      return content.length > config.maxSummaryLength
        ? content.substring(0, config.maxSummaryLength) + '...'
        : content;
    }

    // Score sentences based on position, length, and keywords
    const scoredSentences = sentences.map((sentence, index) => {
      let score = 0;

      // Position scoring (first and last sentences often important)
      if (index === 0 || index === sentences.length - 1) score += 2;

      // Length scoring (prefer substantial sentences)
      const wordCount = sentence.split(/\s+/).length;
      if (wordCount > 5 && wordCount < 30) score += 1;

      // Keyword scoring
      const keywords = ['important', 'key', 'summary', 'conclusion', 'result', 'therefore', 'thus', 'finally'];
      keywords.forEach(keyword => {
        if (sentence.toLowerCase().includes(keyword)) score += 1;
      });

      return { sentence, score, index };
    });

    // Sort by score and select top sentences
    scoredSentences.sort((a, b) => b.score - a.score);
    const selectedSentences = scoredSentences.slice(0, 3).sort((a, b) => a.index - b.index);

    let summary = selectedSentences.map(s => s.sentence).join('. ') + '.';

    // Ensure length constraints
    if (summary.length > config.maxSummaryLength) {
      summary = summary.substring(0, config.maxSummaryLength - 3) + '...';
    }

    return summary;
  }

  private async extractKeyPoints(content: string): Promise<string[]> {
    // Extract bullet points, numbered lists, and important statements
    const lines = content.split('\n');
    const keyPoints: string[] = [];

    lines.forEach(line => {
      const trimmed = line.trim();
      if (trimmed.match(/^[-*•]\s/) || trimmed.match(/^\d+\.\s/) || trimmed.match(/^[A-Z][^.!?]*:/)) {
        keyPoints.push(trimmed.replace(/^[-*•]\s*/, '').replace(/^\d+\.\s*/, ''));
      }
    });

    // If no explicit lists found, extract sentences with keywords
    if (keyPoints.length === 0) {
      const sentences = content.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 0);
      const keywords = ['important', 'key', 'note', 'remember', 'critical', 'essential'];

      sentences.forEach(sentence => {
        if (keywords.some(keyword => sentence.toLowerCase().includes(keyword))) {
          keyPoints.push(sentence);
        }
      });
    }

    return keyPoints.slice(0, 5); // Limit to 5 key points
  }

  private async extractActionItems(content: string): Promise<string[]> {
    const actionItems: string[] = [];
    const lines = content.split('\n');

    // Look for action-oriented language
    const actionPatterns = [
      /\b(should|must|need to|required to|implement|create|add|remove|update|fix|resolve)\b/gi,
      /\b(TODO|FIXME|NOTE)\b/gi,
      /\b(action|task|step)\b.*:/gi
    ];

    lines.forEach(line => {
      const trimmed = line.trim();
      if (actionPatterns.some(pattern => pattern.test(trimmed))) {
        actionItems.push(trimmed.replace(/^[-*•]\s*/, '').replace(/^\d+\.\s*/, ''));
      }
    });

    return actionItems.slice(0, 5); // Limit to 5 action items
  }

  private calculateConfidence(content: string, summary: string): number {
    // Simple confidence calculation based on content coverage
    const contentWords = new Set(content.toLowerCase().split(/\s+/));
    const summaryWords = new Set(summary.toLowerCase().split(/\s+/));

    const intersection = new Set([...contentWords].filter(x => summaryWords.has(x)));
    const coverage = intersection.size / contentWords.size;

    // Convert to 0-100 scale with some base confidence
    return Math.min(100, Math.max(60, coverage * 100 + 20));
  }

  private generateTags(content: string, category: string): string[] {
    const tags = [category];

    // Content-based tags
    if (content.includes('error') || content.includes('fail')) tags.push('error');
    if (content.includes('security') || content.includes('auth')) tags.push('security');
    if (content.includes('performance') || content.includes('speed')) tags.push('performance');
    if (content.includes('database') || content.includes('query')) tags.push('database');
    if (content.includes('API') || content.includes('endpoint')) tags.push('api');
    if (content.includes('UI') || content.includes('component')) tags.push('ui');

    return [...new Set(tags)]; // Remove duplicates
  }
}

// ============================================================================
// EXPORT
// ============================================================================

export const aiResponseTLDR = AIResponseTLDRGenerator.getInstance();

// Convenience functions
export const generateTLDR = (
  content: string,
  category?: string,
  config?: Partial<TLDRConfig>
) => aiResponseTLDR.generateTLDR(content, category, config);

export const generateExecutiveSummary = (
  interactions: Array<{ role: string; content: string; timestamp: Date }>,
  businessContext: string
) => aiResponseTLDR.generateExecutiveSummary(interactions, businessContext);

export const generateTechnicalSummary = (
  codeChanges: string[],
  requirements: string[],
  issues: string[]
) => aiResponseTLDR.generateTechnicalSummary(codeChanges, requirements, issues);
