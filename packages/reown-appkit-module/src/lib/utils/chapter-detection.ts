/**
 * Chapter Detection Utilities
 * Detects and groups chapter-based documentation into books
 */

export interface Chapter {
  slug: string;
  title: string;
  chapterNumber: number;
  totalChapters: number;
}

export interface Book {
  baseSlug: string;
  title: string;
  description?: string;
  chapters: Chapter[];
  totalChapters: number;
  category?: string;
  coverImage?: string;
  tags: string[];
}

/**
 * Extract base slug and chapter number from a chapter slug
 * Examples:
 * - "architecture-01" -> { base: "architecture", chapter: 1 }
 * - "feature-implementation-02" -> { base: "feature-implementation", chapter: 2 }
 * - "setup-configuration" -> { base: "setup-configuration", chapter: null }
 */
export function parseChapterSlug(slug: string): { base: string; chapter: number | null } {
  const match = slug.match(/^(.+)-(\d{2})$/);
  if (match) {
    return {
      base: match[1],
      chapter: parseInt(match[2], 10)
    };
  }
  return {
    base: slug,
    chapter: null
  };
}

/**
 * Detect if a slug is a chapter (has numeric suffix)
 */
export function isChapterSlug(slug: string): boolean {
  return /-\d{2}$/.test(slug);
}

/**
 * Group documentation items into books based on chapter patterns
 */
export function groupDocsIntoBooks(docs: Array<{ slug: string; title: string; [key: string]: any }>): {
  books: Book[];
  standaloneDocs: Array<{ slug: string; title: string; [key: string]: any }>;
} {
  const chapterMap = new Map<string, Array<{ slug: string; title: string; chapter: number; [key: string]: any }>>();
  const standaloneDocs: Array<{ slug: string; title: string; [key: string]: any }> = [];

  // First pass: identify chapters and standalone docs
  docs.forEach(doc => {
    const { base, chapter } = parseChapterSlug(doc.slug);
    
    if (chapter !== null) {
      // This is a chapter
      if (!chapterMap.has(base)) {
        chapterMap.set(base, []);
      }
      chapterMap.get(base)!.push({
        ...doc,
        chapter
      });
    } else {
      // Standalone document
      standaloneDocs.push(doc);
    }
  });

  // Second pass: build books from chapters
  const books: Book[] = [];
  
  chapterMap.forEach((chapters, baseSlug) => {
    // Sort chapters by number
    chapters.sort((a, b) => a.chapter - b.chapter);
    
    // Find the first chapter (usually chapter 01) to get book metadata
    const firstChapter = chapters[0];
    
    // Extract book title from chapter title (remove "Chapter X:" prefix)
    const bookTitle = firstChapter.title
      .replace(/^Chapter \d+:\s*/, '')
      .replace(/\s*\(Part \d+ of \d+\)$/, '')
      .trim();
    
    books.push({
      baseSlug,
      title: bookTitle,
      description: firstChapter.description,
      category: firstChapter.category,
      coverImage: firstChapter.coverImage,
      tags: firstChapter.tags || [],
      chapters: chapters.map(ch => ({
        slug: ch.slug,
        title: ch.title,
        chapterNumber: ch.chapter,
        totalChapters: chapters.length
      })),
      totalChapters: chapters.length
    });
  });

  // Sort books by base slug
  books.sort((a, b) => a.baseSlug.localeCompare(b.baseSlug));

  return { books, standaloneDocs };
}

/**
 * Get chapter navigation links
 */
export function getChapterNavigation(
  currentChapter: number,
  totalChapters: number,
  baseSlug: string
): { prev: string | null; next: string | null } {
  const prev = currentChapter > 1
    ? `${baseSlug}-${String(currentChapter - 1).padStart(2, '0')}`
    : null;
  
  const next = currentChapter < totalChapters
    ? `${baseSlug}-${String(currentChapter + 1).padStart(2, '0')}`
    : null;
  
  return { prev, next };
}

