/**
 * Documentation Synchronization Plugin
 * 
 * Consolidates documentation and synchronizes it with the database.
 * Part of the application state synchronization system.
 * 
 * ⚠️ CRITICAL: Source directory is latest-docs/ (not docs/) per documentation-management.mdc rule
 * 
 * Features:
 * - Consolidates documents from latest-docs/ into major categories
 * - Cleans and organizes consolidated docs
 * - Synchronizes with database using MD5 hash tracking
 * - Identifies documents needing regeneration
 * 
 * Usage: Integrated into /sync command
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';

export interface DocumentationSyncResult {
  consolidated: number;
  cleaned: number;
  synced: number;
  skipped: number;
  needsRegeneration: string[];
  errors: string[];
}

export class DocumentationSyncPlugin {
  private projectRoot: string;

  constructor(projectRoot: string = process.cwd()) {
    this.projectRoot = projectRoot;
  }

  /**
   * Main synchronization entry point
   * @param skipDatabaseSync - Skip database synchronization (relational sync) to speed up execution
   */
  async sync(skipDatabaseSync: boolean = false): Promise<DocumentationSyncResult> {
    console.log('📚 Starting Documentation Synchronization...\n');

    const result: DocumentationSyncResult = {
      consolidated: 0,
      cleaned: 0,
      synced: 0,
      skipped: 0,
      needsRegeneration: [],
      errors: [],
    };

    try {
      // Step 1: Consolidate documents
      console.log('📚 Step 1: Consolidating documents...');
      try {
        execSync('bun run docs:consolidate', {
          cwd: this.projectRoot,
          stdio: 'pipe',
          encoding: 'utf-8',
        });
        result.consolidated = 8; // Always 8 consolidated docs
        console.log('   ✅ Documents consolidated');
      } catch (error: any) {
        const errorMsg = error.message || String(error);
        result.errors.push(`Consolidation failed: ${errorMsg}`);
        console.log(`   ⚠️  Consolidation warning: ${errorMsg}`);
      }

      // Step 2: Clean and organize
      console.log('\n🧹 Step 2: Cleaning and organizing...');
      try {
        execSync('bun run docs:clean', {
          cwd: this.projectRoot,
          stdio: 'pipe',
          encoding: 'utf-8',
        });
        result.cleaned = 8; // Always 8 cleaned docs
        console.log('   ✅ Documents cleaned');
      } catch (error: any) {
        const errorMsg = error.message || String(error);
        result.errors.push(`Cleanup failed: ${errorMsg}`);
        console.log(`   ⚠️  Cleanup warning: ${errorMsg}`);
      }

      // Step 2.5: Reorganize consolidated docs into chapters (prevents large file sizes)
      console.log('\n📖 Step 2.5: Reorganizing consolidated docs into chapters...');
      try {
        const reorganizeScript = join(this.projectRoot, 'scripts/reorganize-docs-into-chapters.ts');
        if (existsSync(reorganizeScript)) {
          execSync('bun run docs:chapters', {
            cwd: this.projectRoot,
            stdio: 'pipe',
            encoding: 'utf-8',
          });
          console.log('   ✅ Consolidated docs split into chapters');
        } else {
          console.log('   ⚠️  Chapter reorganization script not found, skipping');
          result.errors.push('Chapter reorganization script not found');
        }
      } catch (error: any) {
        const errorMsg = error.message || String(error);
        result.errors.push(`Chapter reorganization failed: ${errorMsg}`);
        console.log(`   ⚠️  Chapter reorganization warning: ${errorMsg}`);
      }

      // Step 3: Sync with database (using relational seeding)
      if (skipDatabaseSync) {
        console.log('\n⏭️  Step 3: Skipping database synchronization (relational sync disabled)');
        console.log('   ℹ️  Use --db-sync flag to enable database synchronization');
      } else {
        console.log('\n🔄 Step 3: Synchronizing with database (relational)...');
        try {
          const output = execSync('bun run seed:docs:relational', {
            cwd: this.projectRoot,
            stdio: 'pipe',
            encoding: 'utf-8',
          });

          // Parse output to extract stats
          const seededMatch = output.match(/✅ Seeded: (\d+) documents/);
          const updatedMatch = output.match(/🔄 Updated: (\d+) documents/);
          const skippedMatch = output.match(/⏭️  Skipped: (\d+) documents/);

          result.synced = parseInt(seededMatch?.[1] || '0') + parseInt(updatedMatch?.[1] || '0');
          result.skipped = parseInt(skippedMatch?.[1] || '0');

          // Extract documents needing regeneration
          const regenerationMatch = output.match(/🔄 Documents Requiring Regeneration \((\d+)\):/);
          if (regenerationMatch) {
            const lines = output.split('\n');
            const regenerationIndex = lines.findIndex(line => line.includes('Documents Requiring Regeneration'));
            if (regenerationIndex >= 0) {
              for (let i = regenerationIndex + 1; i < lines.length; i++) {
                const line = lines[i].trim();
                if (line.startsWith('•')) {
                  const slugMatch = line.match(/•\s+(.+?)\s+\(v\d+\.\d+\.\d+\)/);
                  if (slugMatch) {
                    result.needsRegeneration.push(slugMatch[1]);
                  }
                } else if (line && !line.startsWith('═')) {
                  break; // Stop at next section
                }
              }
            }
          }

          console.log(`   ✅ Synced: ${result.synced} documents`);
          console.log(`   ⏭️  Skipped: ${result.skipped} documents (no changes)`);
          if (result.needsRegeneration.length > 0) {
            console.log(`   🔄 Needs regeneration: ${result.needsRegeneration.length} documents`);
          }
        } catch (error: any) {
          const errorMsg = error.message || String(error);
          result.errors.push(`Database sync failed: ${errorMsg}`);
          console.log(`   ⚠️  Database sync warning: ${errorMsg}`);
        }
      }

      console.log('\n✅ Documentation synchronization completed!');
      return result;

    } catch (error: any) {
      const errorMsg = error.message || String(error);
      result.errors.push(`Documentation sync failed: ${errorMsg}`);
      console.error('❌ Documentation synchronization failed:', errorMsg);
      return result;
    }
  }

  /**
   * Check if documentation sync is available
   */
  static isAvailable(): boolean {
    const projectRoot = process.cwd();
    const consolidateScript = join(projectRoot, 'scripts/consolidate-documentation.js');
    const cleanScript = join(projectRoot, 'scripts/clean-documentation.js');
    const enhancedSeedScript = join(projectRoot, 'scripts/seed-docs-enhanced.js');
    const relationalSeedScript = join(projectRoot, 'scripts/seed-docs-enhanced-relational.ts');

    return (
      existsSync(consolidateScript) &&
      existsSync(cleanScript) &&
      (existsSync(enhancedSeedScript) || existsSync(relationalSeedScript))
    );
  }
}

// Export singleton instance
export const documentationSyncPlugin = new DocumentationSyncPlugin();

