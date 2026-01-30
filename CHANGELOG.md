## [0.0.37](https://github.com/involvex/super-agent-cli/compare/v0.0.36...v0.0.37) (2026-01-30)

### Code Refactoring

- **core:** refactor LLM client to provider pattern with Gemini default ([45c5d95](https://github.com/involvex/super-agent-cli/commit/45c5d95301dd9f6a19d497261a7789fe2c1f6a11))

### BREAKING CHANGES

- **core:** Configuration format changed from single API key/model to provider-based structure. Users need to update their ~/.super-agent/settings.json to use the new format with providers object.

## [0.0.36](https://github.com/involvex/super-agent-cli/compare/v0.0.35...v0.0.36) (2026-01-30)

### Features

- **cli:** add about and plugins management commands ([dc966c1](https://github.com/involvex/super-agent-cli/commit/dc966c14a4919fd9984219054f168e136b9dbd33))

## [0.0.35](https://github.com/involvex/super-agent-cli/compare/07ec1540c3e1049c8b5653f73af1a2d7e620aba6...v0.0.35) (2026-01-30)

### Bug Fixes

- improve diff generation and multi-line string replacement for large files ([#23](https://github.com/involvex/super-agent-cli/issues/23)) ([e662dd3](https://github.com/involvex/super-agent-cli/commit/e662dd32f8b04380196b0d06da00b3913af8e616))
- migrate to bun ([#78](https://github.com/involvex/super-agent-cli/issues/78)) ([9180c4b](https://github.com/involvex/super-agent-cli/commit/9180c4b02e11a9cc58ac0372ca53a51f445d1cf8))
- re-enable vibekit by resolving runtime crash when using grok cli ([#77](https://github.com/involvex/super-agent-cli/issues/77)) ([bd78e9e](https://github.com/involvex/super-agent-cli/commit/bd78e9e8456818e45578fbeb9f540064ecc2797b))

### Features

- add configurable base URL support ([#19](https://github.com/involvex/super-agent-cli/issues/19)) ([07ec154](https://github.com/involvex/super-agent-cli/commit/07ec1540c3e1049c8b5653f73af1a2d7e620aba6))
- add model parameter support for CLI ([#29](https://github.com/involvex/super-agent-cli/issues/29)) ([6f8f9cf](https://github.com/involvex/super-agent-cli/commit/6f8f9cf8394ef9b4608211f4e8493f713882e27b))
- add support for auto-edit toggle ([#24](https://github.com/involvex/super-agent-cli/issues/24)) ([5183e4d](https://github.com/involvex/super-agent-cli/commit/5183e4d3b58ab7b16b32087b54e6639b871cdb97))
- add support for mcp ([#44](https://github.com/involvex/super-agent-cli/issues/44)) ([9c1d82b](https://github.com/involvex/super-agent-cli/commit/9c1d82be3c1022262eb229501123f2776c39189a))
- git commands ([#41](https://github.com/involvex/super-agent-cli/issues/41)) ([9642bda](https://github.com/involvex/super-agent-cli/commit/9642bdaeef1cbccb4adb9429062052f1d5477a43))
- improve model configuration and settings management ([#59](https://github.com/involvex/super-agent-cli/issues/59)) ([5a4b2c8](https://github.com/involvex/super-agent-cli/commit/5a4b2c8e25337c6ec013baf4295dbb520712e501))
- save selected model ([#39](https://github.com/involvex/super-agent-cli/issues/39)) ([c00feda](https://github.com/involvex/super-agent-cli/commit/c00feda72802e7aef02b11ca72a1274ca5c6db7d))

### Styles

- apply prettier formatting and rename package ([9ef7633](https://github.com/involvex/super-agent-cli/commit/9ef7633f35568d18bb617a2e266487cb7875f539))

### BREAKING CHANGES

- package renamed from @vibe-kit/grok-cli to @involvex/super-agent-cli
