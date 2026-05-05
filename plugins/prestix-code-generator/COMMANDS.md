# Prestix Code Generator — Commands Reference

**Version**: 1.2.0

## Skill Commands (Slash Commands)

These commands are invoked in Claude chat with `/` prefix.

### /generate

Generate API endpoints, React components, hooks, and types for ZenStack entities.

```
/generate <entity-name> [options]
/generate User --all
/generate Product --api --table --form
```

| Option | Description |
|--------|-------------|
| `--api` | Generate API endpoints only |
| `--components` | Generate React components |
| `--hooks` | Generate React hooks |
| `--types` | Generate TypeScript types |
| `--all` | Generate everything |
| `--form` | Include form component |
| `--table` | Include table component |
| `--card` | Include card component |
| `--modal` | Include modal component |
| `--force` | Overwrite existing files |
| `--dry-run` | Preview without writing |

### /analyze-schema

Analyze ZenStack schema and get AI-powered recommendations.

```
/analyze-schema [options]
/analyze-schema --detailed
/analyze-schema --suggest-generation
```

| Option | Description |
|--------|-------------|
| `--detailed` | Full field details and relationships |
| `--suggest-generation` | Recommend what to generate per entity |
| `--missing-models` | Show entities referenced but not defined |
| `--relationships` | Analyze relationship patterns |
| `--operations` | Analyze supported operations per entity |

### /sync-state

Synchronize app state with generation templates.

```
/sync-state [options]
/sync-state --full
/sync-state --routes-only --report
```

| Option | Description |
|--------|-------------|
| `--full` | Full sync (routes, components, services, stores) |
| `--routes-only` | Sync API route patterns only |
| `--components-only` | Sync component patterns only |
| `--services-only` | Sync service layer patterns |
| `--stores-only` | Sync Zustand store patterns |
| `--report` | Generate report without changes |

### /validate-schema

Validate ZenStack schema syntax and structure.

```
/validate-schema [options]
/validate-schema --strict
/validate-schema --report
```

| Option | Description |
|--------|-------------|
| `--strict` | Enable strict validation with warnings |
| `--fix` | Auto-fix common issues |
| `--report` | Generate detailed report |

### /generate-navigation

Generate navigation configuration and route files.

```
/generate-navigation [options]
/generate-navigation --all
/generate-navigation --routes --sidebar
```

| Option | Description |
|--------|-------------|
| `--all` | Generate all navigation assets |
| `--routes` | Route configuration only |
| `--sidebar` | Sidebar menu only |
| `--breadcrumbs` | Breadcrumb configuration |
| `--roles` | Include role-based access |
| `--force` | Overwrite existing files |
| `--dry-run` | Preview without writing |

## Management Commands (Chat Triggers)

Type these phrases in Claude chat for plugin management:

| Trigger | Action |
|---------|--------|
| `status` | View plugin status, version, config, last activity |
| `settings` | Manage plugin configuration |
| `help` or `commands` | View help and command reference |
| `health` or `diagnostics` | Run plugin diagnostics |

## MCP Tools (Programmatic)

When the MCP server is connected, these tools are available to Claude:

| Tool | Purpose |
|------|---------|
| `zenstack_analyze_schema` | Schema analysis |
| `zenstack_list_entities` | List entity names |
| `zenstack_validate_schema` | Schema validation |
| `zenstack_generate_entity` | Code generation |
| `zenstack_sync_state` | App state sync |
| `zenstack_generate_navigation` | Navigation generation |
| `zenstack_get_plugin_status` | Plugin status |
| `zenstack_get_settings` | View settings |
| `zenstack_update_setting` | Update setting |
| `zenstack_run_diagnostics` | Run diagnostics |

## Configuration

All commands respect settings from **Plugin Management**:

- **Output Directory**: Where generated files are saved
- **Schema Path**: ZenStack schema location
- **Generation Defaults**: What to generate (UI, API, hooks, types, navigation)
- **Skills Management**: Enable/disable individual commands
- **Advanced**: Overwrite, backup, verbose logging
