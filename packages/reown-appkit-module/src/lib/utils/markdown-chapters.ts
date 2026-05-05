/**
 * Markdown Chapter Extraction Utilities
 * Extract chapters/sections from markdown content for optimized loading
 */

export interface MarkdownChapter {
  title: string;
  level: number;
  startLine: number;
  endLine?: number;
  content: string;
}

/**
 * Extract all chapters/sections from markdown content
 */
export function extractChapters(content: string): MarkdownChapter[] {
  const chapters: MarkdownChapter[] = [];
  const lines = content.split('\n');
  
  let currentChapter: MarkdownChapter | null = null;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(/^(#{1,6})\s+(.+)$/);
    
    if (match) {
      // Save previous chapter if exists
      if (currentChapter) {
        currentChapter.endLine = i - 1;
        currentChapter.content = lines
          .slice(currentChapter.startLine, i)
          .join('\n');
        chapters.push(currentChapter);
      }
      
      // Start new chapter
      currentChapter = {
        title: match[2].trim(),
        level: match[1].length,
        startLine: i,
        content: '',
      };
    }
  }
  
  // Save last chapter
  if (currentChapter) {
    currentChapter.endLine = lines.length - 1;
    currentChapter.content = lines
      .slice(currentChapter.startLine)
      .join('\n');
    chapters.push(currentChapter);
  }
  
  return chapters;
}

/**
 * Extract the first chapter from markdown content
 * Returns content up to the second major heading (H1 or H2)
 */
export function extractFirstChapter(content: string): {
  firstChapter: string;
  hasMore: boolean;
  totalChapters: number;
  remainingLength: number;
} {
  const lines = content.split('\n');
  const chapters = extractChapters(content);
  
  // If no chapters found, return first 5000 characters
  if (chapters.length === 0) {
    const preview = content.substring(0, 5000);
    return {
      firstChapter: preview,
      hasMore: content.length > 5000,
      totalChapters: 0,
      remainingLength: content.length - preview.length,
    };
  }
  
  // Get first chapter (or first two chapters if first is very short)
  let firstChapterEnd = chapters[0].endLine || lines.length;
  
  // If first chapter is very short (< 100 lines), include second chapter too
  if (chapters.length > 1 && (chapters[0].endLine || 0) - chapters[0].startLine < 100) {
    firstChapterEnd = chapters[1].endLine || lines.length;
  }
  
  const firstChapterContent = lines.slice(0, firstChapterEnd + 1).join('\n');
  const remainingContent = lines.slice(firstChapterEnd + 1).join('\n');
  
  return {
    firstChapter: firstChapterContent,
    hasMore: chapters.length > 1 || remainingContent.length > 0,
    totalChapters: chapters.length,
    remainingLength: remainingContent.length,
  };
}

/**
 * Extract content up to a specific chapter index
 */
export function extractChaptersUpTo(content: string, chapterIndex: number): string {
  const chapters = extractChapters(content);
  
  if (chapterIndex >= chapters.length) {
    return content; // Return full content if index exceeds chapters
  }
  
  const targetChapter = chapters[chapterIndex];
  const lines = content.split('\n');
  
  return lines.slice(0, (targetChapter.endLine || lines.length) + 1).join('\n');
}

