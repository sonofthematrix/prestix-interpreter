# /analyze-schema - Schema Analysis & Recommendations

Analyze your ZenStack schema and receive AI-powered recommendations for code generation.

## Usage

```
/analyze-schema [options]
/analyze-schema --detailed
/analyze-schema --suggest-generation
```

## Description

This skill reads your `zenstack.zmodel` file and provides:

- **Schema Overview** - All models, fields, and relationships
- **Statistics** - Count of entities, fields, relations, operations
- **Patterns** - Detected patterns and conventions
- **Recommendations** - Generation suggestions based on schema analysis
- **Issues** - Potential problems or missing models

## Available Options

| Option | Description |
|--------|-------------|
| `--detailed` | Show full field details and relationships |
| `--suggest-generation` | Recommend what to generate for each entity |
| `--missing-models` | Show entities referenced but not defined |
| `--relationships` | Analyze relationship patterns |
| `--operations` | Analyze supported operations per entity |

## Examples

### Quick Overview
```
/analyze-schema
```

Output:
```
📊 ZenStack Schema Analysis
═══════════════════════════════════════

📦 Entities (7):
  ✓ User
  ✓ Product
  ✓ Order
  ✓ Category
  ✓ Review
  ✓ BlogPost
  ✓ Comment

🔗 Relationships:
  - User → Products (1-to-many)
  - Product → Category (many-to-one)
  - Order → User (many-to-one)

⚙️ Operations:
  CRUD operations available on all entities
  Advanced: Pagination, Filtering, Sorting

🤖 Recommendations:
  /generate User --all              # Core entity
  /generate Product --all           # E-commerce
  /generate Order --api --table     # Business critical
```

### Detailed Analysis
```
/analyze-schema --detailed --suggest-generation
```

Shows:
```
Entity: User
├── Fields (8):
│   ├── id: String (primary key)
│   ├── email: String (unique)
│   ├── name: String
│   ├── bio: String? (optional)
│   ├── status: String (enum)
│   ├── role: String (enum)
│   ├── createdAt: DateTime
│   └── updatedAt: DateTime
├── Relations (5):
│   ├── preferences: UserPreferences
│   ├── addresses: Address[]
│   ├── orders: Order[]
│   ├── reviews: Review[]
│   └── blogPosts: BlogPost[]
├── Access Control: @@allow rules defined
└── 🚀 Recommendation:
    Generate full set: /generate User --all
    Priority: HIGH (core entity)
```

### Find Relationships
```
/analyze-schema --relationships
```

Output:
```
🔗 Relationship Map
═══════════════════

One-to-One:
  User ↔ UserPreferences

One-to-Many:
  User → Orders (via userId)
  Product → Reviews (via productId)
  Category → Products (via categoryId)

Many-to-Many:
  [Implicit through junction tables]

⚠️ Circular Dependencies:
  None detected ✓

Potential Issues:
  - Review references both Product and Vendor
  - Consider denormalizing vendor data
```

### Missing Models
```
/analyze-schema --missing-models
```

## Output Interpretation

### Access Control Status
```
✓ @@allow rules defined      - Access control configured
✗ No rules defined           - All users have full access
⚠ Partial coverage          - Some models missing rules
```

### Operation Support
```
CREATE    - Create new records
READ      - Fetch single record
READ_MANY - List with filtering
UPDATE    - Modify existing records
DELETE    - Remove records
```

### Recommendations

#### Generation Priority
- **🔴 CRITICAL** - Authentication, core business logic
- **🟠 HIGH** - Primary entities with relations
- **🟡 MEDIUM** - Secondary entities
- **🟢 LOW** - Utility/reference entities

#### UI Components
- Forms for entities with CREATE operations
- Tables for entities with READ_MANY operations
- Cards for display-heavy entities
- Modals for related entity management

#### API Patterns
- Standard CRUD endpoints
- Search/filter parameters
- Pagination for large datasets
- Batch operations where appropriate

## Typical Workflow

1. **Analyze Schema**
   ```
   /analyze-schema
   ```

2. **Review Recommendations**
   - See suggested generation order
   - Understand relationships
   - Check for missing access control

3. **Generate in Order**
   ```
   /generate User --all
   /generate Category --all
   /generate Product --all
   /generate Order --all
   ```

4. **Test Generated Code**
   - Verify API endpoints
   - Test component interactions
   - Check access control

5. **Sync with Schema Updates**
   ```
   /sync-state
   ```

## Understanding the Analysis

### Schema Health Indicators

✅ **Healthy Schema**
- Entities have clear purposes
- Relationships make sense
- Access control defined
- Naming conventions consistent

⚠️ **Potential Issues**
- Circular dependencies
- Missing access control
- Inconsistent naming
- Too many relations per entity

### Generation Readiness

After analysis, you should be able to:
- [ ] Name all your entities
- [ ] Describe entity purposes
- [ ] Identify critical relationships
- [ ] Plan access control
- [ ] Decide on UI components needed

## Related Skills

- `/generate` - Generate code based on schema
- `/validate-schema` - Check schema syntax
- `/sync-state` - Update templates based on analysis
- `/generate-navigation` - Create navigation from analysis

## Integration with /generate

The analysis directly informs generation:

```
Analysis shows:  User (CRITICAL, CRUD)
            ↓
Recommendation: /generate User --all
            ↓
Generates:     API, Components, Hooks, Types
            ↓
Integration:   Complete CRUD interface
```

