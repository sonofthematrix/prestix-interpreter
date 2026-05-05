# Template-Based Auto-Generation System

## Overview

The auto-generation system now supports template-based code generation. Templates are synchronized from actual codebase patterns using `/sync` command and can be used by generators to produce consistent, maintainable code.

## How It Works

### 1. Template Synchronization (`/sync`)

The `AppStateSyncGenerator` analyzes your codebase and updates templates:

```bash
bun run sync:app-state
```

This command:
- Analyzes all API routes and components
- Extracts common patterns
- Updates `plugins/templates/route-template.ts` and `plugins/templates/component-template.tsx`
- Generates a sync report

### 2. Template Loading

Templates are loaded using the `TemplateLoader` utility:

```typescript
import { templateLoader } from './utils/template-loader';

// Load a template
const routeTemplate = templateLoader.loadTemplate('route-template.ts');

// Process template with variables
const processed = templateLoader.processTemplate(routeTemplate, {
  modelName: 'User',
  lowerModelName: 'user',
  authRequired: 'true'
});
```

### 3. Generator Integration

Generators now check for templates first, then fall back to hardcoded logic:

```typescript
// In CompleteEntityGenerator
private generateApiRoute(model: ModelConfig): string {
  // Try template first
  if (templateLoader.templateExists('route-template.ts')) {
    const template = templateLoader.loadTemplate('route-template.ts');
    if (template) {
      const baseRoute = templateLoader.processTemplate(template, {
        modelName: name,
        lowerModelName: lowerName,
        authRequired: !accessControl.publicRead ? 'true' : 'false',
      });
      return this.enhanceRouteFromTemplate(baseRoute, model);
    }
  }
  
  // Fallback to hardcoded generation
  return this.generateHardcodedRoute(model);
}
```

## Template Variables

Templates support variable substitution using `{{variableName}}` syntax:

- `{{modelName}}` - Model name (e.g., "User")
- `{{lowerModelName}}` - Lowercase model name (e.g., "user")
- `{{authRequired}}` - Whether authentication is required ("true" or "false")
- `{{userContext}}` - Whether to use user context ("true" or "false")

## Available Templates

### Route Template (`route-template.ts`)

Base template for Next.js API routes with:
- ZenStack v3 ORM patterns (`createClient(user)`)
- Proper authentication checks
- Error handling
- Response formatting

### Component Template (`component-template.tsx`)

Base template for React components with:
- TypeScript interfaces
- React hooks (useState, useEffect, useCallback)
- Dark mode support
- Responsive design

### Admin page template (`admin-page-template.tsx`)

Synced from `src/app/admin/enumDefinition/page.tsx`. **Admin layout rule (critical):**

- **Do not use** `DashboardLayout` or `AppLayout` in admin page templates or generated admin pages.
- Admin layout (`src/app/admin/layout.tsx`) wraps all `/admin` routes with `AdminShell` → `DashboardLayout`, so adding either wrapper in the page causes **duplicate sidebar and header**.
- Generated admin pages must render only content (e.g. `<div className="container ...">` with table/form). Same for any template used to generate admin pages.

### App header template (`app-header-template.tsx`)

Synced from `src/components/navigation/app-header.tsx`. **Header logo rule:**

- **Use PrestixLogo only** — the main app header must use the PRESTIX.VIP text wordmark from `@/components/brand-assets/PrestixLogo` (e.g. `size="2xl"`, `ariaLabel="PRESTIX.VIP Home"`).
- **Do not use** `HeaderLogo` or any image/asset logo in the header; the wordmark (PRESTIX. white, .VIP red) is required for brand consistency.
- After editing the real app header, run `bun run sync:app-state` to update this template.

## Usage

### Enable Template-Based Generation

Templates are automatically used when:
1. Templates exist in `plugins/templates/`
2. `CompleteEntityGenerator` or other generators are configured to use templates
3. Templates are synced with `/sync` command

### Generate Code Using Templates

```bash
# Sync templates first
bun run sync:app-state

# Generate entities (will use templates)
bun run generate:entities
```

## Customization

### Updating Templates

1. Run `/sync` to update templates from codebase patterns
2. Manually edit templates if needed
3. Templates will be used in next generation

### Adding New Templates

1. Create template file in `plugins/templates/`
2. Use `{{variableName}}` for substitution
3. Generators can load and use the template

## Benefits

- **Consistency**: All generated code follows same patterns
- **Maintainability**: Update templates once, affects all generation
- **Evolution**: Templates evolve with codebase patterns
- **Flexibility**: Fallback to hardcoded generation if templates unavailable

## File Structure

```
plugins/
├── templates/
│   ├── route-template.ts           # API route template
│   ├── component-template.tsx      # Component template
│   ├── app-header-template.tsx     # Main app header (PrestixLogo only, no image logo)
│   ├── header-wagmi-dependent-template.tsx
│   ├── admin-page-template.tsx
│   ├── admin-table-template.tsx   # Canonical: venueProfile (Logo column for logo/coverImage/gallery)
│   └── ...
├── utils/
│   └── template-loader.ts          # Template loading utility
└── complete-entity-generator.ts    # Generator using templates
```

### Admin Table Logo Column

When a model has `logo`, `coverImage`, `cover`, `imageUrl`, `image`, or `gallery` (Json array), the generator adds a Logo column as the first column. Fallback order: logo → coverImage → cover → imageUrl → image → gallery[0]. Uses `CachedImage` for thumbnails and `Building2` icon when no image exists.

### Stripe Payment Option

Entities that use Stripe Payment Intents for paid creation are configured in `plugins/config/entity-generation-config.ts`.

**Configuration:**
- `STRIPE_PAYMENT_ENTITIES`: Models that use Stripe (e.g. `VenueBooking`)
- Add new models to this list when they use `/api/payment/create-intent`

**Auto-generation behavior when entity is in STRIPE_PAYMENT_ENTITIES:**
- **Admin create page**: Shows an Alert with notice that paid records use Stripe checkout
- **API route**: JSDoc comment points to `/api/payment/create-intent` for paid creation

**App state sync detection:**
- `bun run sync:app-state` detects models with `paymentIntentId`, `stripePaymentId`, or `stripeChargeId`
- Sync report lists "Stripe Payment Entities" and suggests adding them to `entity-generation-config.ts`

**Docs:** `docs/implementation/features/VENUE-BOOKINGS-STRIPE-PAYMENT.md`

## Next Steps

1. ✅ Templates synchronized with `/sync`
2. ✅ Template loader created
3. ✅ Generators updated to use templates
4. 🔄 Test generation with templates
5. 🔄 Add more template types as needed

