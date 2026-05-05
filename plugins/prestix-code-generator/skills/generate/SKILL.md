# /generate - Prestix Code Generator

Generate API endpoints, React components, hooks, and types for ZenStack entities with a single command.

## Usage

```
/generate <entity-name> [options]
/generate User --api --components --hooks --types
/generate Product --api --table --form
```

## Description

This skill generates complete CRUD interfaces for your ZenStack entities. It automatically creates:

- **API Endpoints** - `/api/[entity]` routes with auth, validation, and error handling
- **React Components** - Forms, tables, cards with full interactivity
- **React Hooks** - Data fetching, mutations, state management
- **TypeScript Types** - Interfaces for API responses and form data

## Available Options

| Option | Alias | Description | Default |
|--------|-------|-------------|---------|
| `--api` | `-a` | Generate API endpoints | false |
| `--components` | `-c` | Generate React components | false |
| `--hooks` | `-h` | Generate React hooks | false |
| `--types` | `-t` | Generate TypeScript types | false |
| `--all` | `-A` | Generate all (API, components, hooks, types) | false |
| `--form` | `-f` | Include form component | depends on config |
| `--table` | `--tbl` | Include table component | depends on config |
| `--card` | `-k` | Include card component | depends on config |
| `--modal` | `-m` | Include modal component | depends on config |
| `--force` | `-F` | Overwrite existing files | false |
| `--dry-run` | `-d` | Preview changes without writing | false |

## Examples

### Generate API endpoint only
```
/generate User --api
```
Creates: `src/generated/api/users.ts`

### Generate complete component set
```
/generate Product --all --form --table --card
```
Creates:
- `src/generated/api/products.ts`
- `src/generated/components/ProductForm.tsx`
- `src/generated/components/ProductTable.tsx`
- `src/generated/components/ProductCard.tsx`
- `src/generated/hooks/useProduct.ts`
- `src/generated/types/product-types.ts`

### Preview before generating
```
/generate Order --all --dry-run
```
Shows what would be generated without writing files.

### Force regenerate with new patterns
```
/generate Category --all --force
```
Overwrites existing generated files with updated templates.

## Generated File Structure

```
src/generated/
├── api/
│   └── {entity}s.ts           # Next.js API routes
├── components/
│   ├── {Entity}Form.tsx       # Create/update form
│   ├── {Entity}Table.tsx      # List view with CRUD actions
│   ├── {Entity}Card.tsx       # Summary card view
│   └── {Entity}Modal.tsx      # Modal wrapper (optional)
├── hooks/
│   └── use{Entity}.ts         # Data fetching and mutations
└── types/
    └── {entity}-types.ts      # TypeScript interfaces
```

## Example Output

### API Endpoint
```typescript
// Generated: src/generated/api/users.ts

export async function GET(request: NextRequest) {
  // Auto-generated with:
  // - User authentication
  // - Input validation
  // - Error handling
  // - Pagination support
}

export async function POST(request: NextRequest) {
  // Create with validated data
  // Access control via ZenStack policies
}
```

### React Component
```typescript
// Generated: src/generated/components/UserForm.tsx

export function UserForm({ initialData, onSubmit, loading }) {
  // Auto-generated form with:
  // - Field mapping to schema
  // - Validation feedback
  // - Loading states
  // - Error handling
}
```

### React Hook
```typescript
// Generated: src/generated/hooks/useUser.ts

export function useUser() {
  // Auto-generated hook with:
  // - Fetch multiple records
  // - Create new record
  // - Update existing record
  // - Delete record
  // - Error and loading states
}
```

## Configuration

Generated code respects your configuration:

- **Output directory**: `src/generated` (configurable)
- **UI components**: Based on your UI library (shadcn/ui, etc.)
- **API patterns**: Follows your existing route conventions
- **Type system**: Matches your Zod schemas

## Common Patterns

### Generate for Multiple Entities
```
/generate User Product Order Category --all
```

### Update Existing Components
```
/generate User --components --form --table --force
```
Re-generates components with latest patterns.

### Generate Only Types
```
/generate BlogPost --types
```
Useful for sharing type definitions without full component generation.

## Tips & Best Practices

✅ **DO**:
- Run `/analyze-schema` first to understand your entities
- Use `--dry-run` to preview changes before committing
- Generate type-only for shared interfaces
- Use `--force` when updating generation patterns

❌ **DON'T**:
- Manually edit generated files (they'll be overwritten)
- Generate files you don't need (keep codebase clean)
- Forget to commit generated code to version control
- Skip API validation in generated endpoints

## Troubleshooting

### Entity not found
Check entity name matches ZenStack schema (case-sensitive):
```
/analyze-schema
```

### Generation failed
Verify schema is valid:
```
/validate-schema
```

### Existing files not overwritten
Use the `--force` flag:
```
/generate User --all --force
```

## Related Skills

- `/analyze-schema` - Understand your schema before generating
- `/sync-state` - Sync app state with generation templates
- `/validate-schema` - Verify schema syntax
- `/generate-navigation` - Generate route configuration

