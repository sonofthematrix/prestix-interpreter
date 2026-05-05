/**
 * File Verification System for Code Generation
 * Compares generated files with existing files before committing
 */

import { existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'fs';
import { join } from 'path';

interface FileComparison {
  path: string;
  status: 'identical' | 'different' | 'new' | 'missing';
  existingContent?: string;
  generatedContent?: string;
  differences?: string[];
}

interface VerificationResult {
  identical: FileComparison[];
  different: FileComparison[];
  new: FileComparison[];
  missing: FileComparison[];
  totalFiles: number;
  identicalCount: number;
  differentCount: number;
  newCount: number;
  missingCount: number;
}

export class FileVerificationSystem {
  private tempDir: string;
  private baseDir: string;
  private projectRoot: string;

  constructor(projectRoot: string = process.cwd(), baseDir: string = 'src/generated') {
    this.projectRoot = projectRoot;
    this.baseDir = baseDir;
    this.tempDir = join(projectRoot, '.temp-generated');
  }

  /**
   * Initialize temporary directory for generated files
   */
  initializeTempDir(): void {
    // Clean up any existing temp directory
    if (existsSync(this.tempDir)) {
      this.cleanupTempDir();
    }
    
    // Create temp directory structure matching baseDir
    mkdirSync(this.tempDir, { recursive: true });
    console.log(`📁 Created temporary directory: ${this.tempDir}`);
  }

  /**
   * Write file to temporary directory instead of final location
   * Handles paths that go outside baseDir (e.g., ../app/api)
   */
  writeToTemp(relativePath: string, content: string): void {
    // Normalize path - handle ../ paths
    let normalizedPath = relativePath;
    if (normalizedPath.startsWith('../')) {
      // Remove ../ prefix and write relative to project root
      normalizedPath = normalizedPath.replace(/^\.\.\//, '');
    }
    
    const fullPath = join(this.tempDir, normalizedPath);
    const dir = fullPath.substring(0, fullPath.lastIndexOf('/'));
    
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    
    writeFileSync(fullPath, content, 'utf-8');
  }

  /**
   * Compare temporary directory files with existing files
   * Handles both baseDir files and files outside baseDir (e.g., ../app/api)
   */
  compareFiles(): VerificationResult {
    console.log('\n🔍 Comparing generated files with existing files...\n');
    
    const tempFiles = this.getAllFiles(this.tempDir);
    const existingFiles: string[] = [];
    
    // Collect files from baseDir
    const baseDirPath = join(this.projectRoot, this.baseDir);
    if (existsSync(baseDirPath)) {
      existingFiles.push(...this.getAllFiles(baseDirPath));
    }
    
    // Collect files from paths that go outside baseDir (e.g., ../app/api)
    const outsidePaths = ['src/app/api', 'src/app/admin', 'src/components/admin'];
    for (const outsidePath of outsidePaths) {
      const fullPath = join(this.projectRoot, outsidePath);
      if (existsSync(fullPath)) {
        existingFiles.push(...this.getAllFiles(fullPath));
      }
    }
    
    const comparisons: FileComparison[] = [];
    
    // Compare all temp files
    for (const tempFile of tempFiles) {
      const relativePath = tempFile.replace(this.tempDir + '/', '');
      
      // Find corresponding existing file
      let existingPath: string | null = null;
      
      // Check in baseDir first
      const checkBaseDirPath = join(this.projectRoot, this.baseDir, relativePath);
      if (existsSync(checkBaseDirPath)) {
        existingPath = checkBaseDirPath;
      } else {
        // Check in outside paths
        for (const outsidePath of outsidePaths) {
          const checkPath = join(this.projectRoot, outsidePath, relativePath);
          if (existsSync(checkPath)) {
            existingPath = checkPath;
            break;
          }
        }
      }
      
      const tempContent = readFileSync(tempFile, 'utf-8');
      
      if (existingPath) {
        const existingContent = readFileSync(existingPath, 'utf-8');
        
        if (this.filesAreIdentical(tempContent, existingContent)) {
          comparisons.push({
            path: relativePath,
            status: 'identical',
            existingContent,
            generatedContent: tempContent
          });
        } else {
          comparisons.push({
            path: relativePath,
            status: 'different',
            existingContent,
            generatedContent: tempContent,
            differences: this.getDifferences(existingContent, tempContent)
          });
        }
      } else {
        comparisons.push({
          path: relativePath,
          status: 'new',
          generatedContent: tempContent
        });
      }
    }
    
    // Check for files that exist but weren't generated (missing)
    for (const existingFile of existingFiles) {
      // Get relative path from project root
      let relativePath: string | null = null;
      
      if (existingFile.startsWith(baseDirPath)) {
        relativePath = existingFile.replace(baseDirPath + '/', '');
      } else {
        // Find which outside path it belongs to
        for (const outsidePath of outsidePaths) {
          const fullOutsidePath = join(this.projectRoot, outsidePath);
          if (existingFile.startsWith(fullOutsidePath)) {
            relativePath = existingFile.replace(fullOutsidePath + '/', '');
            break;
          }
        }
      }
      
      if (!relativePath) continue;
      
      const tempPath = join(this.tempDir, relativePath);
      
      if (!existsSync(tempPath)) {
        comparisons.push({
          path: relativePath,
          status: 'missing',
          existingContent: readFileSync(existingFile, 'utf-8')
        });
      }
    }
    
    const result: VerificationResult = {
      identical: comparisons.filter(c => c.status === 'identical'),
      different: comparisons.filter(c => c.status === 'different'),
      new: comparisons.filter(c => c.status === 'new'),
      missing: comparisons.filter(c => c.status === 'missing'),
      totalFiles: comparisons.length,
      identicalCount: comparisons.filter(c => c.status === 'identical').length,
      differentCount: comparisons.filter(c => c.status === 'different').length,
      newCount: comparisons.filter(c => c.status === 'new').length,
      missingCount: comparisons.filter(c => c.status === 'missing').length
    };
    
    return result;
  }

  /**
   * Get all files recursively from a directory
   */
  private getAllFiles(dir: string, fileList: string[] = []): string[] {
    if (!existsSync(dir)) {
      return fileList;
    }
    
    const files = require('fs').readdirSync(dir);
    
    for (const file of files) {
      const filePath = join(dir, file);
      const stat = statSync(filePath);
      
      if (stat.isDirectory()) {
        this.getAllFiles(filePath, fileList);
      } else {
        fileList.push(filePath);
      }
    }
    
    return fileList;
  }

  /**
   * Check if two files are identical (ignoring whitespace differences)
   */
  private filesAreIdentical(content1: string, content2: string): boolean {
    // Normalize whitespace
    const normalized1 = content1.replace(/\r\n/g, '\n').trim();
    const normalized2 = content2.replace(/\r\n/g, '\n').trim();
    
    return normalized1 === normalized2;
  }

  /**
   * Get differences between two files
   */
  private getDifferences(content1: string, content2: string): string[] {
    const lines1 = content1.split('\n');
    const lines2 = content2.split('\n');
    const differences: string[] = [];
    
    const maxLines = Math.max(lines1.length, lines2.length);
    
    for (let i = 0; i < maxLines; i++) {
      const line1 = lines1[i] || '';
      const line2 = lines2[i] || '';
      
      if (line1.trim() !== line2.trim()) {
        differences.push(`Line ${i + 1}: "${line1.substring(0, 50)}" vs "${line2.substring(0, 50)}"`);
        
        // Limit to first 10 differences
        if (differences.length >= 10) {
          differences.push(`... and ${Math.max(0, maxLines - i - 1)} more differences`);
          break;
        }
      }
    }
    
    return differences;
  }

  /**
   * Print verification report
   */
  printReport(result: VerificationResult): void {
    console.log('═'.repeat(80));
    console.log('📊 FILE VERIFICATION REPORT');
    console.log('═'.repeat(80));
    console.log(`\nTotal files: ${result.totalFiles}`);
    console.log(`✅ Identical: ${result.identicalCount}`);
    console.log(`⚠️  Different: ${result.differentCount}`);
    console.log(`🆕 New files: ${result.newCount}`);
    console.log(`❌ Missing: ${result.missingCount}`);
    
    if (result.different.length > 0) {
      console.log('\n📝 DIFFERENT FILES:');
      console.log('─'.repeat(80));
      for (const file of result.different.slice(0, 10)) {
        console.log(`\n${file.path}`);
        if (file.differences) {
          file.differences.slice(0, 3).forEach(diff => {
            console.log(`  ${diff}`);
          });
        }
      }
      if (result.different.length > 10) {
        console.log(`\n... and ${result.different.length - 10} more different files`);
      }
    }
    
    if (result.new.length > 0) {
      console.log('\n🆕 NEW FILES:');
      console.log('─'.repeat(80));
      result.new.slice(0, 10).forEach(file => {
        console.log(`  ${file.path}`);
      });
      if (result.new.length > 10) {
        console.log(`\n... and ${result.new.length - 10} more new files`);
      }
    }
    
    if (result.missing.length > 0) {
      console.log('\n❌ MISSING FILES (exist but not generated):');
      console.log('─'.repeat(80));
      result.missing.slice(0, 10).forEach(file => {
        console.log(`  ${file.path}`);
      });
      if (result.missing.length > 10) {
        console.log(`\n... and ${result.missing.length - 10} more missing files`);
      }
    }
    
    console.log('\n' + '═'.repeat(80));
  }

  /**
   * Copy files from temp directory to final location
   * Handles paths that go outside baseDir (e.g., ../app/api)
   */
  copyTempToFinal(): void {
    console.log('\n📋 Copying files from temporary directory to final location...\n');
    
    const tempFiles = this.getAllFiles(this.tempDir);
    let copiedCount = 0;
    
    for (const tempFile of tempFiles) {
      const relativePath = tempFile.replace(this.tempDir + '/', '');
      
      // Determine final path based on relative path
      let finalPath: string;
      if (relativePath.startsWith('app/') || relativePath.startsWith('components/')) {
        // Files that should go to src/app or src/components
        finalPath = join(this.projectRoot, 'src', relativePath);
      } else {
        // Files that go to baseDir
        finalPath = join(this.projectRoot, this.baseDir, relativePath);
      }
      
      const dir = finalPath.substring(0, finalPath.lastIndexOf('/'));
      
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
      
      const content = readFileSync(tempFile, 'utf-8');
      writeFileSync(finalPath, content, 'utf-8');
      copiedCount++;
      
      console.log(`  ✓ Copied ${relativePath}`);
    }
    
    console.log(`\n✅ Copied ${copiedCount} files to final location`);
  }

  /**
   * Clean up temporary directory
   */
  cleanupTempDir(): void {
    if (existsSync(this.tempDir)) {
      try {
        rmSync(this.tempDir, { recursive: true, force: true });
        console.log(`🧹 Cleaned up temporary directory: ${this.tempDir}`);
      } catch (error) {
        console.warn(`⚠️  Could not clean up temporary directory: ${error}`);
      }
    }
  }

  /**
   * Check if verification passed (all files identical or confirmed)
   */
  verificationPassed(result: VerificationResult, allowDifferences: boolean = false): boolean {
    if (allowDifferences) {
      return true; // Always pass if differences are allowed
    }
    
    // Pass if all files are identical or new
    return result.differentCount === 0 && result.missingCount === 0;
  }

  /**
   * Get temp directory path
   */
  getTempDir(): string {
    return this.tempDir;
  }
}

