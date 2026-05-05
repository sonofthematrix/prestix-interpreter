# Plugin Management Guide

**Prestix Code Generator v1.2.0 — Comprehensive Management**

## Overview

The plugin includes full management capabilities. All attributes are configurable from **Claude Plugin Management** in the settings UI.

## Management Features

### 1. Status Dashboard

Type `status` or `show status` in Claude chat to see:
- Plugin version and status
- Active skills/commands count
- Configuration paths (outputDir, schemaPath, templateDir, configDir)
- MCP server status
- Last activity timestamp

### 2. Settings Management (Plugin Management UI)

All settings are configurable via **Plugin Management → Settings**:

#### Output Configuration
- **Output Directory** — Where generated files are saved (default: `src/generated`)
- **Schema File Path** — ZenStack schema location (default: `zenstack/schema.zmodel`)
- **Templates Directory** — Code templates (default: `plugins/templates`)
- **Config Directory** — Entity config (default: `plugins/config`)

#### Generation Defaults
- Generate UI, API, Hooks, Types, Navigation

#### Entity Operations
- Default CRUD: create, read, update, delete, list

#### Skills Management
- Enable/disable: /generate, /analyze-schema, /sync-state, /validate-schema, /generate-navigation

#### MCP Server
- Enable/disable MCP
- Runtime (node, bun)

#### Advanced Options
- Overwrite Existing Files
- Backup Before Generation
- Verbose Logging

### 3. Health Diagnostics

Type `health` or `diagnostics` to run checks:
- Required directories (plugins/utils, plugins/templates, plugins/config)
- Schema file (discovery: zenstack.zmodel, zenstack/schema.zmodel, schema.zmodel, prisma/schema.zmodel)
- Optional: src/generated

### 4. Help

Type `help` or `commands` for command reference and getting started.

## Schema Discovery

The plugin checks for schema in this order:
1. `zenstack.zmodel`
2. `zenstack/schema.zmodel`
3. `schema.zmodel`
4. `prisma/schema.zmodel`

Configure the default in **Plugin Management → Settings → Output Configuration → Schema File Path**.

## Support

- **Quick help** — Type `help` in Claude
- **Status** — Type `status`
- **Diagnostics** — Type `diagnostics`
- **Email** — support@tokenizin.com
