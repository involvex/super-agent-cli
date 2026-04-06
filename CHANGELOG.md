# Changelog

All notable changes to Super Agent CLI will be documented in this file.

## [Unreleased]

### Added

- **New LLM Providers**: Added support for three new OpenAI-compatible providers:
  - **Kilo Gateway** (`https://api.kilo.ai/api/gateway`)
  - **OpenCode Zen** (`https://opencode.ai/zen/v1/`)
  - **Cline** (`https://api.cline.bot/api/v1`)

- **Unified Provider/Model Selection**: Enhanced picker with hotkey navigation:
  - `Shift+P` - Switch to providers view
  - `Shift+M` - Switch to models view
  - `Esc` in models view switches back to providers

- **Pricing API Integration**: Added pricing data fetching from models.dev:
  - Automatic caching of pricing data (24-hour TTL)
  - Local cache at `~/.super-agent/pricing-cache.json`
  - Model metadata includes input/output pricing and context window info

### Changed

- **Dependency Updates**: Updated core runtime and dev dependencies:
  - `@types/node` and related packages bumped to latest versions
  - Security patches for axios and minimatch vulnerabilities

- **VSCode Extension**: Updated to VSCode engine 1.109.0 with latest devDependencies

### Security

- Fixed high severity vulnerabilities in axios and minimatch via dependency overrides
- Refactored command execution to prevent shell injection vulnerabilities

## [0.0.94] - 2026-02-22

### Dependencies

- Security patches for axios and minimatch

## [0.0.93] - 2026-02-22

### Dependencies

- General dependency updates

## [0.0.92] - 2026-02-06

### VSCode Extension

- Simplified icon for theming support

## [0.0.91] - 2026-02-06

### Build

- Switched to bun for VSCode extension build process
- Added SVG icon support

## [0.0.90] - 2026-02-06

### Security

- Refactored command execution to prevent shell injection

## [0.0.89] - 2026-02-06

### Features

- Enhanced CLI-VSCode integration
- Replaced enquirer with inquirer for better compatibility

## [0.0.88] - 2026-02-06

### Features

- Added status bar configuration command (`/config set ui.statusbar_config`)

## [0.0.87] - 2026-02-06

### VSCode Extension

- Added command to start CLI server from extension

## [0.0.86] - 2026-02-05

### VSCode Extension

- Enhanced VSCode integration

---

For older releases, please see the [GitHub releases](https://github.com/involvex/super-agent-cli/releases) page.
