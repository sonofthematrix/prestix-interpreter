# Archived Plugin Files

This directory contains plugin files that were moved from the main plugins directory because they are no longer actively used in the current application.

## Archived Files and Reasons

### `complete-entity-generator-patch.ts`
- **Reason**: Patch file that appears to be outdated
- **Date Archived**: 2024-10-22
- **Status**: Not referenced in any active scripts or configurations

### `enhanced-form-generator.ts` - **RESTORED**
- **Reason**: Was not referenced in index.ts or any package.json scripts
- **Date Archived**: 2024-10-22
- **Date Restored**: 2024-10-22
- **Status**: Moved back to active plugins - required by complete-entity-generator.ts

### `marketplace-generator-integration.ts`
- **Reason**: Only used by potentially stale script (generate-marketplace-docs.ts)
- **Date Archived**: 2024-10-22
- **Status**: Marketplace functionality handled by other generators

### `theme-generator-integration.ts`
- **Reason**: Not referenced anywhere in the codebase
- **Date Archived**: 2024-10-22
- **Status**: Theme functionality handled by other systems

### `theme-integration-mixin.ts`
- **Reason**: Not referenced anywhere in the codebase
- **Date Archived**: 2024-10-22
- **Status**: Mixin approach not currently used

### `marketplace-templates.ts`
- **Reason**: Only used by archived marketplace-generator-integration.ts
- **Date Archived**: 2024-10-22
- **Status**: Templates handled by other template systems

## Recovery Instructions

If any of these files are needed in the future:

1. Move the file back to the main plugins directory
2. Add appropriate exports to `plugins/index.ts` if needed
3. Update package.json scripts if the plugin should be executable
4. Update this README to reflect the restoration

## Active Plugin Files (Not Archived)

The following files remain active and are used by the application:

- `index.ts` - Main plugin registry
- `entity-mutation-hooks.ts` - Database mutation hooks
- `query-api-hooks.ts` - API query hooks
- `component-generator.ts` - UI component generation
- `auto-generator.ts` - Auto-generation system
- `enhanced-auto-generator.ts` - Enhanced auto-generation
- `enhanced-production-generator.ts` - Production-ready generation
- `enhanced-content-editor-integration.ts` - Content editor integration
- `deployment-config-generator.ts` - Deployment configuration
- `complete-entity-generator.ts` - Complete entity generation
- `config/documentation-routing-config.ts` - Documentation routing
- `templates/enhanced-content-editor-template.ts` - Content editor templates
- `utils/content-field-detector.ts` - Content field utilities
