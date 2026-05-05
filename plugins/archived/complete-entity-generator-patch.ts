/**
 * Patch file for complete-entity-generator.ts
 * Add this import at the top of the file (after other imports):
 * 
 * import { enhanceMarketplaceEntity } from './marketplace-generator-integration';
 * 
 * Then add this code block after line 3892 (after component generation):
 */

// ============================================================================
// MARKETPLACE INTEGRATION PATCH
// Insert after line 3892 in complete-entity-generator.ts
// ============================================================================

/*

      // === MARKETPLACE ENHANCEMENT ===
      // Generate marketplace-specific components for applicable entities
      if (components) {
        try {
          enhanceMarketplaceEntity(model.name, model.fields);
        } catch (error) {
          console.warn(`⚠️  Could not enhance ${model.name} with marketplace features:`, error);
        }
      }
      // === END MARKETPLACE ENHANCEMENT ===

*/

// ============================================================================
// FULL CONTEXT (Lines 3859-3893 with patch)
// ============================================================================

/*

      if (components) {
        const componentCode = this.generateComponent(model);
        this.writeFile(`components/${lowerName}-component.tsx`, componentCode);
        
        // Generate admin table component (now with page links instead of dialogs)
        const adminTableCode = this.generateAdminTableComponent(model);
        this.writeFile(`../components/admin/${lowerName}-admin-table.tsx`, adminTableCode);
        
        // Generate form component (reusable across pages)
        const formCode = this.generateFormComponent(model);
        this.writeFile(`../components/admin/${lowerName}-form.tsx`, formCode);
        
        // === MARKETPLACE ENHANCEMENT ===
        // Generate marketplace-specific components for applicable entities
        try {
          enhanceMarketplaceEntity(model.name, model.fields);
        } catch (error) {
          console.warn(`⚠️  Could not enhance ${model.name} with marketplace features:`, error);
        }
        // === END MARKETPLACE ENHANCEMENT ===
      }

      if (pages) {
        // Generate admin list page
        const listPageCode = this.generateAdminListPage(model);
        this.writeFile(`../app/admin/${lowerName}/page.tsx`, listPageCode);
        
        // Generate create page
        const createPageCode = this.generateCreatePage(model);
        this.writeFile(`../app/admin/${lowerName}/create/page.tsx`, createPageCode);
        
        // Generate view page
        const viewPageCode = this.generateViewPage(model);
        this.writeFile(`../app/admin/${lowerName}/[id]/page.tsx`, viewPageCode);
        
        // Generate edit page
        const editPageCode = this.generateEditPage(model);
        this.writeFile(`../app/admin/${lowerName}/[id]/edit/page.tsx`, editPageCode);
        
        // Generate delete page
        const deletePageCode = this.generateDeletePage(model);
        this.writeFile(`../app/admin/${lowerName}/[id]/delete/page.tsx`, deletePageCode);
      }

*/

// ============================================================================
// ALTERNATIVE: Directory Creation Patch
// Add to ensureDirectories() method around line 3911
// ============================================================================

/*

  private ensureDirectories() {
    const dirs = [
      this.baseDir,
      `${this.baseDir}/types`,
      `${this.baseDir}/hooks`,
      `${this.baseDir}/api`,
      `${this.baseDir}/components`,
      'src/app/api',
      'src/app/admin',
      'src/components/admin',
      'src/components/marketplace'  // ADD THIS LINE
    ];

    for (const dir of dirs) {
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
    }
  }

*/

export const patchInstructions = {
  file: 'plugins/complete-entity-generator.ts',
  changes: [
    {
      location: 'Top of file (after imports)',
      add: "import { enhanceMarketplaceEntity } from './marketplace-generator-integration';",
    },
    {
      location: 'Line 3870 (after formCode generation)',
      add: `
        // === MARKETPLACE ENHANCEMENT ===
        // Generate marketplace-specific components for applicable entities
        try {
          enhanceMarketplaceEntity(model.name, model.fields);
        } catch (error) {
          console.warn(\`⚠️  Could not enhance \${model.name} with marketplace features:\`, error);
        }
        // === END MARKETPLACE ENHANCEMENT ===
      `,
    },
    {
      location: 'ensureDirectories() method (line 3911)',
      add: "'src/components/marketplace'  // Add to dirs array",
    },
  ],
};

