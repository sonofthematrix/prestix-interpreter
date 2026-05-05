# /validate-schema - Schema Validation

Validate your ZenStack schema syntax and structure.

## Usage

```
/validate-schema
/validate-schema --strict
```

## Description

This skill validates your `zenstack.zmodel` file for:
- Syntax errors
- Missing required fields
- Invalid model definitions
- Duplicate entity names
- Invalid relation configurations
- Access control rule syntax

## Available Options

| Option | Description |
|--------|-------------|
| `--strict` | Enable strict validation with warnings |
| `--fix` | Auto-fix common issues (if possible) |
| `--report` | Generate detailed report |

## Examples

### Quick Validation
```
/validate-schema
```

Output:
```
✅ Schema Validation
═════════════════════

✓ Syntax is valid
✓ All models properly defined
✓ All relations valid
✓ No circular dependencies detected
✓ Access control rules properly formatted

Schema Status: ✅ VALID
```

### Strict Validation
```
/validate-schema --strict
```

Shows warnings for common issues:
```
⚠️  Warnings:
   - Model 'User' has no @@allow rules (everyone can access)
   - Field 'BlogPost.content' is very large string (consider pagination)
   - Relation 'User.orders' could have cascade delete policy
```

### Generate Report
```
/validate-schema --report
```

Generates detailed report file: `schema-validation-report.json`

## When to Run

✅ **Run when:**
- After editing zenstack.zmodel
- Before generating code
- When generation fails
- During code review

## Common Issues & Fixes

### Syntax Errors
```
❌ Error: Unexpected token at line 42
   Expected: model Xit { ... }

Fix: Check closing braces and field definitions
```

### Missing Access Control
```
⚠️  Warning: Model 'User' has no @@allow rules

Fix: Add to your model:
@@allow('all', auth() != null)
```

### Invalid Relations
```
❌ Error: Relation 'Post.author' references undefined 'User.posts'

Fix: Ensure both sides of relation are defined
```

## Related Skills

- `/analyze-schema` - Analyze schema in detail
- `/generate` - Generate code (runs validation automatically)

