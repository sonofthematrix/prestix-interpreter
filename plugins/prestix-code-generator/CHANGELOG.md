# Changelog — Prestix Code Generator Plugin

## [1.2.0] - 2026-02-18

### Added
- **Full Plugin Management configurability** — All attributes configurable from Claude Plugin Management
- **Output Configuration** — outputDir, schemaPath, templateDir, configDir
- **Entity Operations** — Configurable default CRUD operations (create, read, update, delete, list)
- **MCP Server settings** — Enable/disable, runtime (node/bun)
- **CONNECTORS.md** — Documentation for ZenStack Generator MCP connector
- **COMMANDS.md** — Complete command reference
- **Status indicator** — MCP Server health in status dashboard

### Changed
- **Schema discovery** — Hooks use multi-path discovery (zenstack.zmodel, zenstack/schema.zmodel, schema.zmodel, prisma/schema.zmodel)
- **Diagnostics** — runDiagnostics checks all schema candidate paths
- **Settings** — templateDir now editable; schemaPath added to Output Configuration
- **Default schema path** — zenstack/schema.zmodel (was zenstack.zmodel)

### Fixed
- Schema path consistency across plugin.json, hooks, and adapter

---

## [1.1.0]

### Added
- Compiled MCP server with 10 tools
- skills/generate-navigation/SKILL.md
- Settings persistence via .claude-plugin-settings.json
- Inline navigation generation

### Fixed
- All hook files present (on-chat-message.ts)
- Management page load

---

## [1.0.0]

### Added
- Initial Claude plugin release
- /generate, /analyze-schema, /sync-state, /validate-schema commands
- Plugin adapter bridge to Prestix plugin system
- on-init and on-chat-message hooks
