/**
 * Claude Plugin Hook: On Initialize
 *
 * Runs when the plugin is first loaded in Claude.
 * Initializes plugin state and validates environment.
 */

export async function onInit() {
  console.log('🚀 Prestix Code Generator Plugin Initialized');

  try {
    // Verify plugin structure
    const fs = await import('fs/promises');
    const path = require('path');

    // Check for essential files
    const requiredDirs = ['plugins/utils', 'plugins/templates', 'plugins/config'];

    for (const dir of requiredDirs) {
      try {
        await fs.access(dir);
        console.log(`✅ Found ${dir}`);
      } catch {
        console.warn(`⚠️  Missing directory: ${dir}`);
      }
    }

    // Check for schema file
    try {
      await fs.access('zenstack.zmodel');
      console.log('✅ ZenStack schema found');
    } catch {
      console.warn('⚠️  zenstack.zmodel not found - schema analysis unavailable');
    }

    console.log('✅ Plugin initialization complete');

    return {
      success: true,
      message: 'Prestix Code Generator ready. Use /generate, /analyze-schema, or /sync-state commands.',
      capabilities: [
        'Generate API endpoints for ZenStack entities',
        'Generate React components (forms, tables, cards)',
        'Generate React hooks for data fetching',
        'Analyze ZenStack schema',
        'Synchronize app state',
        'Generate navigation configuration'
      ]
    };
  } catch (error) {
    console.error('❌ Plugin initialization failed:', error);
    throw error;
  }
}
