/**
 * Claude Plugin Hook: On Chat Message
 *
 * Handles chat messages and provides plugin status/management information
 * Enables comprehensive plugin management capabilities
 */

export async function onChatMessage(message: string) {
  console.log('📨 Chat message received:', message.substring(0, 50));

  // Handle special management commands
  if (message.toLowerCase().includes('status')) {
    return {
      type: 'management',
      action: 'status',
      data: await getPluginStatus()
    };
  }

  if (message.toLowerCase().includes('settings') || message.toLowerCase().includes('configure')) {
    return {
      type: 'management',
      action: 'settings',
      data: await getPluginSettings()
    };
  }

  if (message.toLowerCase().includes('help') || message.toLowerCase().includes('commands')) {
    return {
      type: 'management',
      action: 'help',
      data: await getPluginHelp()
    };
  }

  if (message.toLowerCase().includes('health') || message.toLowerCase().includes('diagnostics')) {
    return {
      type: 'management',
      action: 'diagnostics',
      data: await runDiagnostics()
    };
  }

  // Return default handling
  return {
    type: 'message',
    action: 'processed',
    message: 'Chat message processed by Prestix Code Generator Plugin'
  };
}

/**
 * Get plugin status
 */
async function getPluginStatus() {
  return {
    pluginName: 'Prestix Code Generator',
    version: '1.2.0',
    status: 'active',
    timestamp: new Date().toISOString(),
    skills: {
      total: 5,
      active: 5,
      commands: [
        '/generate - Generate code for ZenStack entities',
        '/analyze-schema - Analyze schema and get recommendations',
        '/sync-state - Synchronize app state with patterns',
        '/validate-schema - Validate schema syntax',
        '/generate-navigation - Generate navigation config'
      ]
    },
    configuration: {
      outputDir: 'src/generated',
      templateDir: 'plugins/templates',
      configDir: 'plugins/config',
      schemaPath: 'zenstack/schema.zmodel'
    },
    uptime: 'running',
    lastActivity: new Date().toISOString()
  };
}

/**
 * Get plugin settings for management
 */
async function getPluginSettings() {
  return {
    management: {
      title: 'Prestix Code Generator - Plugin Settings',
      sections: [
        {
          name: 'Output Configuration',
          settings: [
            {
              key: 'outputDir',
              label: 'Generated Files Directory',
              current: 'src/generated',
              type: 'path',
              editable: true,
              description: 'Where to save generated code files'
            },
            {
              key: 'templateDir',
              label: 'Templates Directory',
              current: 'plugins/templates',
              type: 'path',
              editable: true,
              description: 'Location of code templates'
            },
            {
              key: 'schemaPath',
              label: 'Schema File Path',
              current: 'zenstack/schema.zmodel',
              type: 'path',
              editable: true,
              description: 'Path to ZenStack schema (zenstack.zmodel, zenstack/schema.zmodel, schema.zmodel, prisma/schema.zmodel)'
            }
          ]
        },
        {
          name: 'Generation Defaults',
          settings: [
            {
              key: 'generateUI',
              label: 'Generate UI Components',
              current: true,
              type: 'boolean',
              editable: true
            },
            {
              key: 'generateAPI',
              label: 'Generate API Endpoints',
              current: true,
              type: 'boolean',
              editable: true
            },
            {
              key: 'generateHooks',
              label: 'Generate React Hooks',
              current: true,
              type: 'boolean',
              editable: true
            },
            {
              key: 'generateTypes',
              label: 'Generate TypeScript Types',
              current: true,
              type: 'boolean',
              editable: true
            },
            {
              key: 'generateNavigation',
              label: 'Generate Navigation Config',
              current: true,
              type: 'boolean',
              editable: true
            }
          ]
        },
        {
          name: 'Skills Management',
          settings: [
            {
              key: 'generate_enabled',
              label: '/generate Command',
              current: true,
              type: 'boolean',
              editable: true,
              description: 'Enable/disable code generation'
            },
            {
              key: 'analyze_enabled',
              label: '/analyze-schema Command',
              current: true,
              type: 'boolean',
              editable: true,
              description: 'Enable/disable schema analysis'
            },
            {
              key: 'sync_enabled',
              label: '/sync-state Command',
              current: true,
              type: 'boolean',
              editable: true,
              description: 'Enable/disable state synchronization'
            },
            {
              key: 'validate_enabled',
              label: '/validate-schema Command',
              current: true,
              type: 'boolean',
              editable: true,
              description: 'Enable/disable schema validation'
            },
            {
              key: 'nav_enabled',
              label: '/generate-navigation Command',
              current: true,
              type: 'boolean',
              editable: true,
              description: 'Enable/disable navigation generation'
            }
          ]
        },
        {
          name: 'Advanced Options',
          settings: [
            {
              key: 'overwriteExisting',
              label: 'Overwrite Existing Files',
              current: false,
              type: 'boolean',
              editable: true,
              description: 'Auto-overwrite when regenerating'
            },
            {
              key: 'backupOnGenerate',
              label: 'Backup Before Generation',
              current: true,
              type: 'boolean',
              editable: true,
              description: 'Create backups of generated files'
            },
            {
              key: 'verboseLogging',
              label: 'Verbose Logging',
              current: false,
              type: 'boolean',
              editable: true,
              description: 'Show detailed generation logs'
            }
          ]
        }
      ]
    },
    actions: {
      title: 'Plugin Actions',
      available: [
        {
          action: 'status',
          label: 'View Plugin Status',
          description: 'See real-time plugin status and configuration'
        },
        {
          action: 'health',
          label: 'Run Diagnostics',
          description: 'Check plugin health and schema validity'
        },
        {
          action: 'reset',
          label: 'Reset to Defaults',
          description: 'Reset all settings to default values'
        },
        {
          action: 'export',
          label: 'Export Configuration',
          description: 'Export current settings as JSON'
        }
      ]
    }
  };
}

/**
 * Get help information
 */
async function getPluginHelp() {
  return {
    title: 'Prestix Code Generator - Help & Documentation',
    sections: [
      {
        title: 'Getting Started',
        content: `
The Prestix Code Generator plugin helps you automatically generate code for your ZenStack entities.

Quick Start:
1. Run /analyze-schema to understand your entities
2. Run /generate User --all to generate your first entity
3. Review generated code in src/generated/
4. Customize with /sync-state if needed
        `
      },
      {
        title: 'Available Commands',
        content: `
/generate [entity] [options]
  - Generate API, components, hooks, and types
  - Options: --all, --api, --components, --hooks, --types, --force

/analyze-schema [options]
  - Analyze your ZenStack schema
  - Options: --detailed, --suggest-generation

/sync-state [options]
  - Synchronize patterns from your code
  - Options: --full, --routes-only, --report

/validate-schema [options]
  - Validate your schema
  - Options: --strict, --fix

/generate-navigation
  - Generate navigation and route configuration
        `
      },
      {
        title: 'Management Commands',
        content: `
Type any of these in chat for plugin management:
- "status" - View current plugin status
- "settings" - Manage plugin configuration
- "help" - Show this help message
- "health" / "diagnostics" - Check plugin health
        `
      },
      {
        title: 'Documentation',
        content: `
Full documentation available in:
- START_HERE.md - Quick start guide
- CLAUDE_PLUGIN_INTEGRATION_GUIDE.md - Detailed how-to
- PLUGIN_ANALYSIS_AND_CONVERSION_PLAN.md - Technical details
        `
      }
    ]
  };
}

/**
 * Run plugin diagnostics
 */
async function runDiagnostics() {
  const fs = await import('fs/promises');
  const path = require('path');

  const diagnostics: any = {
    timestamp: new Date().toISOString(),
    checks: []
  };

  // Check required directories
  const requiredDirs = [
    { name: 'plugins/utils', critical: true },
    { name: 'plugins/templates', critical: true },
    { name: 'plugins/config', critical: true },
    { name: 'src/generated', critical: false }
  ];

  for (const dir of requiredDirs) {
    try {
      await fs.access(dir.name);
      diagnostics.checks.push({
        name: `Directory: ${dir.name}`,
        status: '✅ OK',
        severity: 'info'
      });
    } catch {
      diagnostics.checks.push({
        name: `Directory: ${dir.name}`,
        status: '❌ MISSING',
        severity: dir.critical ? 'error' : 'warning',
        critical: dir.critical
      });
    }
  }

  // Check schema file (discovery order)
  const schemaCandidates = ['zenstack.zmodel', 'zenstack/schema.zmodel', 'schema.zmodel', 'prisma/schema.zmodel'];
  let schemaFound = false;
  for (const candidate of schemaCandidates) {
    try {
      await fs.access(candidate);
      diagnostics.checks.push({
        name: `Schema file: ${candidate}`,
        status: '✅ OK',
        severity: 'info'
      });
      schemaFound = true;
      break;
    } catch {
      /* continue */
    }
  }
  if (!schemaFound) {
    diagnostics.checks.push({
      name: 'Schema file',
      status: '❌ NOT FOUND',
      severity: 'error',
      hint: 'Check: zenstack.zmodel, zenstack/schema.zmodel, schema.zmodel, prisma/schema.zmodel'
    });
  }

  // Summary
  const errors = diagnostics.checks.filter((c: any) => c.severity === 'error');
  const warnings = diagnostics.checks.filter((c: any) => c.severity === 'warning');

  diagnostics.summary = {
    totalChecks: diagnostics.checks.length,
    passed: diagnostics.checks.filter((c: any) => c.status === '✅ OK').length,
    warnings: warnings.length,
    errors: errors.length,
    health: errors.length === 0 ? '✅ Healthy' : '⚠️ Issues detected'
  };

  return diagnostics;
}

/**
 * Handle setting changes
 */
export async function onSettingsChange(settingKey: string, newValue: any) {
  console.log(`⚙️  Setting changed: ${settingKey} = ${newValue}`);

  return {
    success: true,
    message: `Setting '${settingKey}' updated to ${JSON.stringify(newValue)}`,
    requiresRestart: false
  };
}

/**
 * Handle plugin uninstall
 */
export async function onUninstall() {
  console.log('👋 Plugin being uninstalled');

  return {
    success: true,
    message: 'Prestix Code Generator plugin uninstalled. Your generated code remains in src/generated/'
  };
}
