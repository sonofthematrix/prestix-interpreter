# Optional Database Models & Graceful Degradation

This document explains how the application handles optional database models and implements graceful degradation patterns.

## Overview

Some database models in the ZenStack schema are **optional** - the application is designed to work correctly even when these models don't exist in the database schema. This allows for:

- ✅ Flexible schema evolution during development
- ✅ No breaking changes during migrations
- ✅ Core functionality always works
- ✅ Clear warnings when optional features are unavailable

## Optional Models

### Session Models

**Models**: `session` (preferred) or `walletSession` (legacy)

**Purpose**: Persistent session storage across devices

**Fallback**: NextAuth.js cookie-based sessions work independently

**Implementation**: See `src/lib/siwe.ts` and `src/app/api/auth/sessions/route.ts`

```typescript
// Check for session models
const hasSessionModel = typeof db.session !== 'undefined' && typeof db.session.create === 'function';
const hasWalletSessionModel = typeof db.walletSession !== 'undefined' && typeof db.walletSession.create === 'function';

if (hasSessionModel) {
  // Use generic session model
  await db.session.create({ data: { ... } });
} else if (hasWalletSessionModel) {
  // Fallback to walletSession for backward compatibility
  await db.walletSession.create({ data: { ... } });
} else {
  // No session models - NextAuth cookies handle sessions
  console.warn('⚠️ Session models not found - using cookie-based sessions only');
}
```

### Audit Logging Models

**Models**: `auditLog` and `userActivity`

**Purpose**: Compliance logging and user activity tracking

**Fallback**: Console logging

**Implementation**: See `src/lib/services/audit-activity-logger.ts`

```typescript
// Helper function to check model existence
function hasAuditModels(db: any): { hasAuditLog: boolean; hasUserActivity: boolean } {
  return {
    hasAuditLog: typeof db.auditLog !== 'undefined' && typeof db.auditLog.create === 'function',
    hasUserActivity: typeof db.userActivity !== 'undefined' && typeof db.userActivity.create === 'function',
  };
}

// Usage
const db = await createClient(systemUser);
const { hasAuditLog, hasUserActivity } = hasAuditModels(db);

if (!hasAuditLog && !hasUserActivity) {
  console.warn('⚠️ Audit models not found - skipping database logging');
  return; // Gracefully exit without error
}

if (hasAuditLog) {
  await db.auditLog.create({ data: { ... } });
}
```

## Implementation Pattern

### Step 1: Check Model Existence

Always check if a model exists before using it:

```typescript
function hasModel(db: any, modelName: string): boolean {
  return typeof db[modelName] !== 'undefined' && typeof db[modelName].create === 'function';
}
```

### Step 2: Graceful Degradation

Provide fallback behavior when models don't exist:

```typescript
if (hasModel(db, 'auditLog')) {
  // Use database logging
  await db.auditLog.create({ data: { ... } });
} else {
  // Fallback to console logging
  console.warn('⚠️ Audit model not found - using console logging');
  console.log('Audit event:', { ... });
}
```

### Step 3: Non-Blocking Operations

Never throw errors when optional models are missing:

```typescript
try {
  if (hasModel(db, 'session')) {
    await db.session.create({ data: { ... } });
  } else {
    console.warn('⚠️ Session model not found - session will be cookie-only');
  }
} catch (error) {
  // Even if model check passes, handle errors gracefully
  console.error('Failed to create session:', error);
  // Don't block authentication flow
}
```

## Benefits

### 1. Schema Migration Safety

During schema migrations, the application continues to work:

```typescript
// Before migration: walletSession exists
// After migration: session exists
// During migration: Both might exist or neither might exist
// Result: Application works in all states
```

### 2. Development Flexibility

Developers can work without all models:

```typescript
// Developer A: Has full schema with all models
// Developer B: Has minimal schema with only User model
// Result: Both can develop and test successfully
```

### 3. Production Resilience

Production deployments are more resilient:

```typescript
// If a model is accidentally removed or not migrated
// Application continues to work with fallback behavior
// Clear warnings help identify issues quickly
```

## Best Practices

### ✅ DO

- Always check model existence before use
- Provide clear console warnings when models are missing
- Use fallback behavior (console logging, cookies, etc.)
- Make optional operations non-blocking
- Document which models are optional

### ❌ DON'T

- Assume models always exist
- Throw errors when optional models are missing
- Block core functionality for optional features
- Use try-catch as the primary check (check existence first)
- Expose model existence checks to client-side code

## Examples

### Example 1: Session Creation

```typescript
// src/lib/siwe.ts
export async function createSession(options: CreateSessionOptions) {
  const db = await createClient(systemUser);
  
  // Check for session models
  const hasSessionModel = typeof db.session !== 'undefined' && typeof db.session.create === 'function';
  const hasWalletSessionModel = typeof db.walletSession !== 'undefined' && typeof db.walletSession.create === 'function';
  
  if (!hasSessionModel && !hasWalletSessionModel) {
    console.warn('⚠️ [SIWE] Neither session nor walletSession model found in schema. Session will not be stored in database.');
    console.warn('⚠️ [SIWE] NextAuth will handle session management via cookies. Database session storage is optional.');
    
    // Return mock session for compatibility
    return {
      id: `mock-${Date.now()}`,
      userId: options.userId,
      // ... other fields
    };
  }
  
  // Use appropriate model
  if (hasSessionModel) {
    return await db.session.create({ data: { ... } });
  } else {
    return await db.walletSession.create({ data: { ... } });
  }
}
```

### Example 2: Audit Logging

```typescript
// src/lib/services/audit-activity-logger.ts
static async logLogin(userId: string, metadata?: any): Promise<void> {
  try {
    const db = await createClient(systemUser);
    const { hasAuditLog, hasUserActivity } = hasAuditModels(db);
    
    if (!hasAuditLog && !hasUserActivity) {
      console.warn(`⚠️ [Audit] Audit models not found in schema. Skipping LOGIN log for user ${userId}`);
      console.log(`✅ [Audit] LOGIN: user ${userId} via ${metadata?.authMethod || 'unknown'} (logged to console only)`);
      return; // Gracefully exit
    }
    
    // Proceed with logging if models exist
    if (hasAuditLog) {
      await db.auditLog.create({ data: { ... } });
    }
    // ... rest of logging logic
  } catch (error) {
    console.error(`❌ [Audit] Failed to log LOGIN for user ${userId}:`, error);
  }
}
```

## Migration Guide

When adding optional models to your schema:

1. **Add model to schema** (`zenstack/schema.zmodel`)
2. **Run migration** (`bun run db:push` or equivalent)
3. **Code automatically detects** the new model
4. **No code changes needed** - graceful degradation handles it

When removing optional models:

1. **Remove from schema**
2. **Run migration**
3. **Code automatically falls back** to console/cookie behavior
4. **No breaking changes** - application continues to work

## Related Files

- `src/lib/siwe.ts` - Session management with optional models
- `src/lib/services/audit-activity-logger.ts` - Audit logging with optional models
- `src/app/api/auth/sessions/route.ts` - Session API with fallback logic
- `.cursorrules` - Development rules and patterns
- `README.md` - Project documentation

## Summary

The optional models pattern ensures that:

1. **Core functionality always works** - Authentication, user management, etc.
2. **Optional features gracefully degrade** - Sessions, audit logs, etc.
3. **Clear warnings** help developers understand what's available
4. **No breaking changes** during schema evolution
5. **Better developer experience** with flexible development environments

This pattern makes the application more resilient, flexible, and easier to develop and maintain.

