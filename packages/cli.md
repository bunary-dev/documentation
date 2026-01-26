
# @bunary/cli

Command-line interface for the Bunary framework. Provides project scaffolding and development tools.

## Installation

```bash
bun add -g @bunary/cli
```

Or use directly with `bunx`:

```bash
bunx @bunary/cli init my-app
```

## Commands

### `bunary init [name]`

Create a new Bunary project.

```bash
# Create a new project in a directory
bunary init my-app

# Create a project in the current directory
bunary init .
```

This command creates a new directory with a Bunary project scaffold including:

- Pre-configured `bunary.config.ts`
- Entry point at `src/index.ts`
- Package.json with Bunary dependencies
