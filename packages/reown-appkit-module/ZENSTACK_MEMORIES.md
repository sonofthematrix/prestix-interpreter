# ZenStack Integration Memories

## Critical Patterns

### 1. Server-Side Only Database Client
- **NEVER** import `createClient` in client components or client-side code
- **ALWAYS** use API routes (`/app/api/**`) for database operations
- `createClient` is async: `const db = await createClient(user)`
- Check `typeof window === 'undefined'` before database operations

### 2. Dynamic Imports for pg/kysely
- `pg` and `kysely` are dynamically imported to prevent client bundling
- These modules use Node.js built-ins (`dns`, `net`) that don't exist in browsers
- Webpack excludes `pg` from client bundles via externals configuration

### 3. User Context Pattern
Always pass user context for access control:
```typescript
const systemUser: AuthUser = {
  id: 'xronr0y2ule1my2abd0wfulc',
  email: 'system@tigerpalacepro.com',
  name: 'System Admin',
  role: 'ADMIN',
};
const db = await createClient(systemUser);
```

### 4. Schema Location
- Schema loaded from workspace root: `../../../../schema` or `../../../schema`
- Schema file: `schema.ts` in workspace root
- Lazy loading on first database operation

## Common Code Patterns

### Find or Create User
```typescript
const db = await createClient(systemUser);
let user = await db.user.findFirst({
  where: { walletAddress: checksummedAddress },
});
if (!user) {
  user = await db.user.create({ data: { ... } });
}
```

### Create Wallet Session
```typescript
const session = await db.walletSession.create({
  data: {
    userId,
    walletAddress: checksummedAddress,
    chainId,
    authMethod: 'wallet',
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
  },
});
```

### Query with Relations
```typescript
const user = await db.user.findUnique({
  where: { id: userId },
  include: {
    accounts: true,
    preferences: true,
    userQtechAccount: true,
  },
});
```

## File Locations

- **Database Client**: `src/lib/db.ts`
- **SIWE Integration**: `src/lib/siwe.ts`
- **SIWE Config**: `src/lib/siwe-config.ts`
- **Schema**: Workspace root `schema.ts`

## Environment Requirements

- `DATABASE_URL` must be set for ZenStack connection
- PostgreSQL with SSL in production
- Schema must exist in workspace root

## Error Prevention

- Always use try-catch around database operations
- Never expose database errors to client-side
- Check server-side before database operations
- Use async/await for all database calls

## Client-Safe Functions

### Making Database Functions Client-Safe
If a function might be imported in client components, make it client-safe:
```typescript
export async function getSIWESession(walletAddress: string) {
  // Only check database on server-side
  if (typeof window === 'undefined') {
    const db = await createClient(systemUser);
    // ... database operations
  }
  // Fallback to localStorage (works on both client and server)
  if (typeof window !== 'undefined') {
    // ... localStorage operations
  }
}
```

This prevents `pg`/`kysely` from being bundled in client code.

