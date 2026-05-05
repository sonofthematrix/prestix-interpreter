/**
 * Documentation Navigation Utilities
 * Helper functions for finding related and adjacent documentation
 */

import { readdirSync, readFileSync, existsSync, statSync } from 'fs';
import { join, dirname, basename, extname } from 'path';

export interface DocInfo {
  path: string;
  slug: string;
  title: string;
  description?: string;
}

/**
 * Get all documentation files in a directory, sorted alphabetically
 */
export function getDocsInDirectory(dirPath: string): DocInfo[] {
  if (!existsSync(dirPath)) {
    return [];
  }

  try {
    const files = readdirSync(dirPath, { withFileTypes: true })
      .filter(entry => {
        if (!entry.isFile()) return false;
        const ext = extname(entry.name);
        return ext === '.md' || ext === '.mdx';
      })
      .map(entry => {
        const fullPath = join(dirPath, entry.name);
        const content = readFileSync(fullPath, 'utf-8');
        
        // Strip frontmatter if present
        let cleanContent = content;
        if (content.startsWith('---')) {
          const frontmatterEnd = content.indexOf('---', 3);
          if (frontmatterEnd !== -1) {
            cleanContent = content.substring(frontmatterEnd + 3).trim();
          }
        }
        
        // Extract title from content
        let title = basename(entry.name, extname(entry.name));
        const titleMatch = cleanContent.match(/^#\s+(.+)$/m);
        if (titleMatch) {
          title = titleMatch[1].trim();
        }
        
        // Extract description from content
        let description: string | undefined;
        const descMatch = cleanContent.match(/^##\s+.*\n\n([^\n]+)/m);
        if (descMatch) {
          description = descMatch[1].trim();
        }
        
        // Generate slug (relative to docs directory)
        const relativePath = fullPath.replace(join(process.cwd(), 'docs'), '').replace(/^\/|\/$/g, '');
        const slug = relativePath.replace(/\.mdx?$/, '');
        
        return {
          path: fullPath,
          slug,
          title,
          description,
        };
      })
      .sort((a, b) => {
        // Sort by filename (alphabetical)
        const aName = basename(a.path);
        const bName = basename(b.path);
        return aName.localeCompare(bName);
      });

    return files;
  } catch (error) {
    console.error('Error reading directory:', error);
    return [];
  }
}

/**
 * Find next and previous documentation in the same directory
 */
export function findAdjacentDocs(currentPath: string): { next: DocInfo | null; prev: DocInfo | null } {
  const dir = dirname(currentPath);
  const allDocs = getDocsInDirectory(dir);
  
  const currentIndex = allDocs.findIndex(doc => doc.path === currentPath);
  
  if (currentIndex === -1) {
    return { next: null, prev: null };
  }
  
  const next = currentIndex < allDocs.length - 1 ? allDocs[currentIndex + 1] : null;
  const prev = currentIndex > 0 ? allDocs[currentIndex - 1] : null;
  
  return { next, prev };
}

/**
 * Find related documentation based on keywords and directory
 * Falls back to previous docs if no related docs found
 */
export function findRelatedDocs(currentPath: string, limit: number = 3): DocInfo[] {
  const dir = dirname(currentPath);
  const currentContent = readFileSync(currentPath, 'utf-8');
  
  // Strip frontmatter if present
  let cleanContent = currentContent;
  if (currentContent.startsWith('---')) {
    const frontmatterEnd = currentContent.indexOf('---', 3);
    if (frontmatterEnd !== -1) {
      cleanContent = currentContent.substring(frontmatterEnd + 3).trim();
    }
  }
  
  // Extract keywords from current document
  const titleMatch = cleanContent.match(/^#\s+(.+)$/m);
  const title = titleMatch ? titleMatch[1] : '';
  const keywords = extractKeywords(title, cleanContent);
  
  // Get all docs in the same directory
  const allDocs = getDocsInDirectory(dir).filter(doc => doc.path !== currentPath);
  
  if (allDocs.length === 0) {
    return [];
  }
  
  // Score each doc based on keyword matches
  const scoredDocs = allDocs.map(doc => {
    let score = 0;
    
    // Read doc content
    let docContent = readFileSync(doc.path, 'utf-8');
    if (docContent.startsWith('---')) {
      const frontmatterEnd = docContent.indexOf('---', 3);
      if (frontmatterEnd !== -1) {
        docContent = docContent.substring(frontmatterEnd + 3).trim();
      }
    }
    
    const docTitle = doc.title.toLowerCase();
    const docContentLower = docContent.toLowerCase();
    
    // Score based on keyword matches
    keywords.forEach(keyword => {
      if (docTitle.includes(keyword)) score += 3;
      if (docContentLower.includes(keyword)) score += 1;
    });
    
    // Bonus for same directory (already filtered)
    score += 1;
    
    return { doc, score };
  })
  .filter(item => item.score > 0)
  .sort((a, b) => b.score - a.score)
  .slice(0, limit);
  
  // If we have related docs with good scores, return them
  if (scoredDocs.length > 0 && scoredDocs[0].score > 2) {
    return scoredDocs.map(item => item.doc);
  }
  
  // Otherwise, return the most recent docs (by modification time) - these are the "previous" docs
  const recentDocs = allDocs
    .map(doc => {
      const stats = statSync(doc.path);
      return { doc, mtime: stats.mtime };
    })
    .sort((a, b) => b.mtime.getTime() - a.mtime.getTime())
    .slice(0, limit)
    .map(item => item.doc);
  
  return recentDocs;
}

/**
 * Extract keywords from title and content
 */
function extractKeywords(title: string, content: string): string[] {
  const keywords = new Set<string>();
  
  // Extract from title (common words)
  const titleWords = title.toLowerCase()
    .split(/[\s\-_]+/)
    .filter(word => word.length > 3 && !isCommonWord(word));
  
  titleWords.forEach(word => keywords.add(word));
  
  // Extract from content headings
  const headingMatches = content.matchAll(/^#+\s+(.+)$/gm);
  for (const match of headingMatches) {
    const headingWords = match[1].toLowerCase()
      .split(/[\s\-_]+/)
      .filter(word => word.length > 3 && !isCommonWord(word));
    headingWords.forEach(word => keywords.add(word));
  }
  
  return Array.from(keywords).slice(0, 10); // Limit to top 10 keywords
}

/**
 * Check if word is a common word (should be filtered out)
 */
function isCommonWord(word: string): boolean {
  const commonWords = [
    'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had',
    'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his',
    'how', 'its', 'may', 'new', 'now', 'old', 'see', 'two', 'way', 'who',
    'boy', 'did', 'let', 'put', 'say', 'she', 'too', 'use', 'guide',
    'implementation', 'complete', 'summary', 'documentation', 'system'
  ];
  return commonWords.includes(word.toLowerCase());
}

