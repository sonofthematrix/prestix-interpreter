# /sync-state - Synchronize App State

Synchronize your application state with generation templates and update patterns.

## Usage

```
/sync-state [options]
/sync-state --full
/sync-state --routes-only
/sync-state --components-only
```

## Description

This skill analyzes your current application implementation and synchronizes generation templates to match your patterns. It ensures generated code follows your project's conventions.

## Available Options

| Option | Description |
|--------|-------------|
| `--full` | Full synchronization (routes, components, services, stores) |
| `--routes-only` | Sync API route patterns only |
| `--components-only` | Sync component patterns only |
| `--services-only` | Sync service layer patterns |
| `--stores-only` | Sync Zustand store patterns |
| `--report` | Generate detailed report without changes |
| `--test-failures` | Sync test failure patterns to generation |

## Examples

### Full Synchronization
```
/sync-state --full
```

Output:
```
🔄 Starting Full App State Synchronization

📡 Analyzing API Routes...
  ✓ Found 12 routes
  ✓ Detected auth pattern: getCurrentUser()
  ✓ Detected validation: Zod schemas
  ✓ Detected error handling: NextResponse.json()

🎨 Analyzing Components...
  ✓ Found 24 components
  ✓ Detected UI library: shadcn/ui
  ✓ Detected styling: Tailwind CSS
  ✓ Detected responsive: mobile-first approach

📦 Analyzing Services...
  ✓ Found 8 service files
  ✓ Detected patterns: user context injection
  ✓ Detected database: ZenStack ORM

🏪 Analyzing Stores...
  ✓ Found 5 Zustand stores
  ✓ Detected middleware: devtools, persist
  ✓ Detected state: immer middleware

✅ Synchronization Complete!

📊 Report:
  ✓ Route patterns extracted: 4
  ✓ Component patterns extracted: 6
  ✓ Service patterns extracted: 3
  ✓ Store patterns extracted: 2

🔧 Templates Updated:
  ✓ route-template.ts
  ✓ component-template.tsx
  ✓ service-template.ts
  ✓ store-template.ts

💡 Next Steps:
  /generate User --all          # Generate with updated patterns
  /generate Product --all       # All code now follows your style
```

### Generate Report Without Changes
```
/sync-state --report
```

Shows analysis without modifying templates.

### Sync Only Routes
```
/sync-state --routes-only
```

Analyzes only API route patterns, updates route template.

## What Gets Synchronized

### API Routes
- Authentication pattern (how user context is obtained)
- Validation approach (Zod, custom validators)
- Error handling (response format, status codes)
- Pagination patterns
- Search/filter implementation

### Components
- UI library (shadcn/ui, Material-UI, etc.)
- Styling approach (Tailwind, CSS modules, etc.)
- Responsive design patterns
- Form handling patterns
- State management integration

### Services/Utilities
- Database access patterns
- User context injection
- Error handling strategies
- Logging patterns
- Caching strategies

### State Management (Zustand)
- Middleware usage (devtools, persist)
- State structure conventions
- Action naming patterns
- Async operation handling
- TypeScript strict mode

## Generated Report Example

```
📋 Synchronization Report
═════════════════════════

📡 API Routes Analysis
┌─────────────────────────────────────────────────────┐
│ Pattern Detected: getCurrentUser Pattern            │
│ Count: 12/12 routes use this                        │
│ Confidence: VERY HIGH                               │
│ Template Updated: ✓                                 │
└─────────────────────────────────────────────────────┘

Pattern Template:
```typescript
// Extracted from: src/app/api/users/route.ts
const currentUser = await getCurrentUser(request);
if (!currentUser) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

🎨 Component Analysis
┌─────────────────────────────────────────────────────┐
│ Pattern: shadcn/ui Components + Tailwind            │
│ Count: 24/24 components use this                    │
│ Confidence: VERY HIGH                               │
│ Template Updated: ✓                                 │
└─────────────────────────────────────────────────────┘

Pattern Template:
```typescript
// Extracted from: src/components/forms/ProductForm.tsx
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export function ProductForm(...) {
  return (
    <Card className="...">
      {/* shadcn/ui components with Tailwind */}
    </Card>
  );
}
```

...more patterns...

📊 Summary
──────────
Routes analyzed:        12
Components analyzed:    24
Services analyzed:      8
Stores analyzed:        5

Patterns extracted:     15
Confidence (avg):       94%
Templates updated:      4

⚠️ Inconsistencies Found
  - 1 component uses custom styling (not Tailwind)
    Location: src/components/legacy/OldChart.tsx
    Action: Consider refactoring or exclude from generation
```

## Typical Workflow

1. **Build out your API and components**
   ```
   - Create a few endpoints manually
   - Build sample components
   - Establish patterns
   ```

2. **Sync state**
   ```
   /sync-state --full
   ```

3. **Generate rest with your patterns**
   ```
   /generate User --all
   /generate Product --all
   ```

4. **Verify consistency**
   - Generated code follows your patterns
   - No manual adjustments needed

5. **When patterns change**
   ```
   /sync-state --full
   ```
   Re-sync to update templates with new patterns.

## When to Use /sync-state

✅ **Use when:**
- Starting a new generation session after code changes
- Your patterns have evolved
- You've introduced new libraries or approaches
- Getting inconsistent generated code
- Onboarding team members with different patterns

❌ **Not needed when:**
- Just running generation for first time
- Only generating one or two entities
- Your patterns haven't changed since last sync

## Advanced Usage

### Exclude Certain Files
Some files shouldn't influence templates (legacy code, experiments):

Create `.claude-plugin/config/sync-ignore.json`:
```json
{
  "excludePaths": [
    "src/components/legacy/**",
    "src/app/api/old-routes/**",
    "src/experimental/**"
  ],
  "excludePatterns": [
    "**/test/**",
    "**/*.stories.tsx"
  ]
}
```

### Force Pattern Detection
If a pattern isn't detected automatically:

Create `.claude-plugin/config/pattern-hints.json`:
```json
{
  "patterns": [
    {
      "name": "authValidation",
      "description": "How we validate auth",
      "example": "const user = await requireAuth(request)"
    }
  ]
}
```

## Troubleshooting

### Patterns not detected
- Run `/sync-state --report` to see analysis
- Verify you have at least 3-4 examples of the pattern
- Check file structure matches expectations

### Templates not updating
- Check permissions on `plugins/templates/` directory
- Verify template files exist
- Try `--routes-only` to isolate the issue

### Getting inconsistent results
- Ensure similar files follow the same pattern
- Fix outliers before re-running sync
- Check `.claude-plugin/config/sync-ignore.json`

## Related Skills

- `/generate` - Generate using synchronized patterns
- `/analyze-schema` - Understand your schema
- `/validate-schema` - Check schema validity

