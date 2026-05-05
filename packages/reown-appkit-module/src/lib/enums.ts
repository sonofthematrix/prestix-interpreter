/**
 * Centralized Enum Definitions
 * Auto-generated from schema.zmodel
 * 
 * This file contains all enum types used throughout the application.
 * Enums are defined here to provide type safety and consistency.
 * 
 * NOTE: This file re-exports from the root lib/enums.ts to maintain compatibility
 * with the @/lib/enums import path used throughout the codebase.
 * 
 * For runtime enum access, use the enum store: @/stores/enum-store
 */

// Re-export all enums from root lib/enums.ts
// Path: packages/reown-appkit-module/src/lib/enums.ts -> src/lib/enums.ts (relative to workspace root)
// Note: This import should be resolved at runtime by the consuming application
// @ts-expect-error - Dynamic import path resolved at runtime by bundler
export * from '../../../../src/lib/enums';

// Re-export store utilities for enum access
export {
    getAvailableEnumNames, getEnumLabel as getEnumLabelFromStore, getEnumValues as getEnumValuesFromStore, isValidEnumValue as isValidEnumValueFromStore, useEnum, useEnums, useEnumStore
} from '../stores/enum-store';
