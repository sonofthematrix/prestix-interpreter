# Prestix Code Generator — Connectors

**Version**: 1.2.0

## Overview

Connectors are integration points that extend the plugin's capabilities. The Prestix Code Generator plugin provides one primary connector: the **ZenStack Generator MCP Server**.

## Available Connectors

### 1. ZenStack Generator MCP (zenstack-generator)

| Attribute | Value |
|-----------|-------|
| **Type** | Model Context Protocol (MCP) |
| **ID** | zenstack-generator |
| **Runtime** | Node.js |
| **Configurable** | Yes (via Plugin Management) |

#### Description

The ZenStack Generator MCP server provides programmatic access to schema analysis, code generation, validation, and plugin management. It is automatically started when the plugin loads and exposes these tools:

| Tool | Description |
|------|-------------|
| `zenstack_analyze_schema` | Parse schema, list entities with fields and policies |
| `zenstack_list_entities` | Quick list of all entity names |
| `zenstack_validate_schema` | Validate schema for errors and warnings |
| `zenstack_generate_entity` | Run code generation for an entity |
| `zenstack_sync_state` | Sync app state with generation templates |
| `zenstack_generate_navigation` | Generate routes.ts and sidebar.ts |
| `zenstack_get_plugin_status` | Check plugin health and project setup |
| `zenstack_get_settings` | View current plugin settings |
| `zenstack_update_setting` | Update a plugin setting |
| `zenstack_run_diagnostics` | Full diagnostic health check |

#### Configuration

Configure the MCP connector via **Plugin Management → Settings → MCP Server**:

- **MCP Server Enabled**: Toggle the connector on/off
- **MCP Runtime**: Change runtime (default: `node`, alternative: `bun`)

#### Path

The MCP server is located at:
```
mcp/zenstack-generator/dist/index.js
```

Relative to the plugin root. Pre-compiled — no `npm install` required.

## Connector Requirements

- **Node.js 18+** (or Bun) for MCP server execution
- **Project structure**: `plugins/`, `zenstack/` (or schema at configured path)
- **ZenStack schema**: One of `zenstack.zmodel`, `zenstack/schema.zmodel`, `schema.zmodel`, `prisma/schema.zmodel`

## Troubleshooting

### MCP server not starting

1. Run **Plugin Management → Health** to check diagnostics
2. Verify Node.js is available: `node --version`
3. Check plugin path: MCP dist must exist at `mcp/zenstack-generator/dist/index.js`

### Connector disabled

Enable via **Plugin Management → Settings → MCP Server → MCP Server Enabled**
