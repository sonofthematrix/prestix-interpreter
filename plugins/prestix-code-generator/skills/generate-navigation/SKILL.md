# /generate-navigation - Prestix Code Generator

Generate navigation configuration, route files, and sidebar menus from your ZenStack entities.

## Usage

```
/generate-navigation [options]
/generate-navigation --all
/generate-navigation --routes --sidebar
```

## Description

This skill generates navigation structure for your application based on ZenStack entity definitions. It automatically creates:

- **Route Configuration** - Next.js route definitions for all entities
- **Sidebar Navigation** - Menu items with icons, labels, and access roles
- **Breadcrumb Config** - Hierarchical navigation paths
- **Navigation Types** - TypeScript interfaces for nav structures

## Available Options

| Option | Description | Default |
|--------|-------------|---------|
| `--all` | Generate all navigation assets | false |
| `--routes` | Generate route configuration only | false |
| `--sidebar` | Generate sidebar menu only | false |
| `--breadcrumbs` | Generate breadcrumb configuration | false |
| `--roles` | Include role-based access in nav | false |
| `--force` | Overwrite existing navigation files | false |
| `--dry-run` | Preview changes without writing | false |

## Examples

### Generate full navigation
```
/generate-navigation --all
```
Creates all navigation files based on your schema entities.

### Generate routes only
```
/generate-navigation --routes
```
Creates: `src/generated/navigation/routes.ts`

### Generate with role-based access
```
/generate-navigation --all --roles
```
Maps ZenStack `@@allow` policies to navigation visibility.

### Preview before generating
```
/generate-navigation --all --dry-run
```
Shows what would be generated without writing files.

## Generated File Structure

```
src/generated/navigation/
├── routes.ts              # Route constants and definitions
├── sidebar.ts             # Sidebar navigation config
├── breadcrumbs.ts         # Breadcrumb path definitions
└── navigation-types.ts    # TypeScript interfaces
```

## Example Output

### Route Configuration
```typescript
// Generated: src/generated/navigation/routes.ts

export const ROUTES = {
  USER: {
    LIST: '/admin/users',
    CREATE: '/admin/users/create',
    DETAIL: (id: string) => `/admin/users/${id}`,
    EDIT: (id: string) => `/admin/users/${id}/edit`,
  },
  PRODUCT: {
    LIST: '/admin/products',
    CREATE: '/admin/products/create',
    DETAIL: (id: string) => `/admin/products/${id}`,
    EDIT: (id: string) => `/admin/products/${id}/edit`,
  },
  // ... more entities
} as const;
```

### Sidebar Navigation
```typescript
// Generated: src/generated/navigation/sidebar.ts

export const SIDEBAR_NAVIGATION = [
  {
    label: 'Users',
    icon: 'Users',
    href: ROUTES.USER.LIST,
    roles: ['ADMIN', 'OPERATIONS'],
    children: [
      { label: 'All Users', href: ROUTES.USER.LIST },
      { label: 'Add User', href: ROUTES.USER.CREATE },
    ],
  },
  {
    label: 'Products',
    icon: 'Package',
    href: ROUTES.PRODUCT.LIST,
    roles: ['ADMIN', 'OPERATIONS', 'USER'],
  },
  // ... more entities
];
```

## Configuration

Generated navigation respects your `plugin.json` config:

- **Entities**: Derived from ZenStack schema models
- **Roles**: Mapped from `@@allow` / `@@deny` policies
- **Route prefix**: Configurable (defaults to `/admin`)
- **Icons**: Auto-assigned based on entity names (Lucide icon set)

## Integration with Existing Navigation

After generating, import into your app layout:

```typescript
// app/layout.tsx
import { SIDEBAR_NAVIGATION } from '@/generated/navigation/sidebar';
import { ROUTES } from '@/generated/navigation/routes';
```

## Related Skills

- `/generate` - Generate full CRUD interface for entities
- `/analyze-schema` - Review entities before generating navigation
- `/sync-state` - Sync navigation with latest app patterns
- `/validate-schema` - Ensure schema is valid before generation

## Troubleshooting

### Routes not matching your structure
Edit `plugins/config/entity-configs.json` to override route prefixes per entity.

### Missing icons
Icons are auto-assigned from Lucide icon set. To customize, edit the generated `sidebar.ts` after generation.

### Role mapping incorrect
Run `/analyze-schema --detailed` to review detected access policies before generating navigation.
