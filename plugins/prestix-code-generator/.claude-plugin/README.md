# Prestix Code Generator — Claude Plugin

AI-powered code generation for ZenStack entities, APIs, components, and infrastructure.

## What This Plugin Does

Generates complete CRUD interfaces for your ZenStack entities:

```
/generate User --all
```

Creates:
- ✅ API endpoints with auth and validation
- ✅ React components (forms, tables, cards)
- ✅ React hooks for data fetching
- ✅ TypeScript type definitions
- ✅ Navigation configuration

## Plugin Version

**v1.2.0** — Full Plugin Management configurability. All attributes (outputDir, schemaPath, templateDir, configDir, entity operations, generation defaults, skills, MCP) are configurable from Claude Plugin Management.

## Quick Start

### Available Commands

| Command | Description |
|---------|-------------|
| `/analyze-schema` | Analyze your ZenStack schema |
| `/generate <Entity> --all` | Generate full CRUD for an entity |
| `/validate-schema` | Validate schema syntax |
| `/sync-state` | Sync app state with patterns |
| `/generate-navigation` | Generate route/navigation config |

### Management (Chat Triggers)

| Trigger | Action |
|---------|--------|
| `status` | View plugin status |
| `settings` | Configure plugin |
| `help` | Show help |
| `diagnostics` | Run health check |

### MCP Server Tools

The plugin includes a pre-compiled MCP server with 10 tools:

| Tool | Description |
|------|-------------|
| `zenstack_analyze_schema` | Parse schema, list entities |
| `zenstack_list_entities` | Quick entity list |
| `zenstack_validate_schema` | Validate schema |
| `zenstack_generate_entity` | Run code generation |
| `zenstack_sync_state` | Sync app state |
| `zenstack_generate_navigation` | Generate navigation |
| `zenstack_get_plugin_status` | Plugin health |
| `zenstack_get_settings` | View settings |
| `zenstack_update_setting` | Update setting |
| `zenstack_run_diagnostics` | Full diagnostics |

## Plugin Structure

```
prestix-code-generator/
├── .claude-plugin/
│   ├── plugin.json              # Plugin manifest (v1.2.0)
│   ├── README.md
│   ├── MANAGEMENT_GUIDE.md
│   ├── hooks/
│   │   ├── on-init.ts
│   │   └── on-chat-message.ts
│   └── adapter/
│       └── plugin-adapter.ts
├── skills/
│   ├── generate/SKILL.md
│   ├── analyze-schema/SKILL.md
│   ├── sync-state/SKILL.md
│   ├── generate-navigation/SKILL.md
│   └── validate-schema/SKILL.md
├── mcp/
│   └── zenstack-generator/
│       ├── package.json
│       └── dist/index.js
├── CONNECTORS.md
├── COMMANDS.md
└── CHANGELOG.md
```

## Configuration (Plugin Management)

All settings are configurable via **Plugin Management → Settings**:

### Output Configuration
- **Output Directory** — Where generated files are saved
- **Schema File Path** — ZenStack schema location (discovery: zenstack.zmodel, zenstack/schema.zmodel, schema.zmodel, prisma/schema.zmodel)
- **Templates Directory** — Code generation templates
- **Config Directory** — Entity and template config

### Generation Defaults
- Generate UI, API, Hooks, Types, Navigation

### Entity Operations
- Default CRUD: create, read, update, delete, list

### Skills Management
- Enable/disable each command (/generate, /analyze-schema, etc.)

### MCP Server
- Enable/disable MCP
- Runtime (node, bun)

### Advanced
- Overwrite existing files
- Backup before generation
- Verbose logging

## Requirements

- Node.js 18+ (for MCP server)
- Cowork/Claude Code with plugin support
- ZenStack project with schema at one of: zenstack.zmodel, zenstack/schema.zmodel, schema.zmodel, prisma/schema.zmodel

## Changelog

### v1.2.0
- Full Plugin Management configurability
- All config attributes exposed in settings (outputDir, schemaPath, templateDir, configDir)
- Entity operations configurable
- MCP server configurable (enable/disable, runtime)
- Schema discovery in hooks (diagnostics check all candidate paths)
- Added CONNECTORS.md, COMMANDS.md
- Status indicator: MCP Server health

### v1.1.0
- Added compiled MCP server with 10 tools
- Fixed: All hook files present
- Added: Settings persistence

### v1.0.0
- Initial Claude plugin release
