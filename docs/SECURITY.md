# Security Policy

## Responsible Disclosure Policy

We take the security of Super Agent CLI seriously. If you discover a security vulnerability, please follow these guidelines:

### Reporting Vulnerabilities

**DO NOT** open a public GitHub issue for security vulnerabilities.

Instead, please report security issues via:

- **Email**: security@involvex.dev
- **Subject Line**: `[SECURITY] Super Agent CLI - [Brief Description]`

### What to Include

Please provide:

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if available)
- Your contact information for follow-up

### Response Timeline

- **Initial Response**: Within 48 hours
- **Status Update**: Within 7 days
- **Resolution Target**: Within 30 days for critical issues

### Disclosure Process

1. You report the vulnerability privately
2. We acknowledge receipt and begin investigation
3. We work on a fix and keep you updated
4. We release the fix and publicly disclose (with credit to you, if desired)
5. We may request a CVE if appropriate

## Data Handling & Privacy

### User Data Storage

Super Agent CLI stores the following data locally:

- **API Keys**: Stored in `~/.super-agent/settings.json` (file permissions: 0600)
- **Chat History**: Sessions stored in `~/.super-agent/sessions/` (per workspace)
- **Configuration**: User preferences in `~/.super-agent/settings.json`
- **File Index**: Project metadata in `.super-agent/index.json`
- **Plugins**: Third-party code in configured plugin directories

### Data Transmission

- **LLM API Calls**: Prompts and context sent to configured AI providers (OpenAI, Anthropic, etc.)
- **Update Checks**: Version information fetched from npm registry
- **WebSocket**: Local communication between CLI and web interface (localhost only by default)

### What We DON'T Collect

- No telemetry or analytics
- No tracking of usage patterns
- No personal information beyond what you configure
- No automatic file uploads to external services

## Authentication & Authorization

### API Key Management

- API keys stored in user home directory with restricted permissions
- Environment variables supported: `SUPER_AGENT_API_KEY`, `SUPER_AGENT_BASE_URL`
- Keys never logged or transmitted to unauthorized parties
- Command-line API key arguments not recommended (visible in process list)

### Web Interface Authentication

- Web server binds to localhost by default
- No authentication required for local connections
- Production deployments should use reverse proxy with authentication
- WebSocket connections restricted to same-origin

### Plugin Security

- Plugins execute with full Node.js permissions
- Only install plugins from trusted sources
- Review plugin code before installation
- Plugins have access to file system and API keys

## Dependency Security

### Automated Updates

- Dependabot configured for automated security updates
- Weekly dependency scans
- Automatic PRs for vulnerability patches
- Manual review required for major version updates

### Vulnerability Monitoring

- GitHub Security Advisories enabled
- npm audit run on CI/CD pipeline
- Dependencies regularly reviewed and updated

### Supply Chain Security

- All dependencies pinned in package-lock.json
- Lockfile integrity verified in CI
- Use of official npm registry only

## Input Validation & Sanitization

### User Input

- All user prompts sanitized before LLM submission
- File paths validated and restricted to project directory
- Command injection prevention in shell executions
- Path traversal protection in file operations

### Plugin Input

- Plugin configurations validated against schema
- Tool parameters type-checked
- File access restricted to working directory

### Web Interface

- WebSocket messages validated and parsed safely
- File content limited to 10KB for preview
- Directory listings filtered for sensitive files
- No arbitrary code execution from web UI

## Encryption

### Data at Rest

- API keys stored in plain text files with OS-level permissions (0600)
- Consider using OS keychain for sensitive credentials (planned feature)
- Session data not encrypted (stored locally only)

### Data in Transit

- HTTPS required for all external API calls
- WebSocket uses ws:// for local connections (localhost)
- wss:// (WebSocket Secure) recommended for remote deployments
- TLS 1.2+ required for all external connections

## Access Control

### File System

- Default working directory: Current directory or specified via `-d` flag
- Plugin directory: Configured in user settings
- Storage directory: `~/.super-agent/` (user-only access)
- File indexer respects `.gitignore` and common exclusions

### Network

- Web server binds to localhost:3000 by default
- Configurable hostname/port via command-line flags
- No external network access except configured LLM APIs

### Process Isolation

- CLI runs with user's permissions
- No privilege escalation
- Child processes inherit parent restrictions

## Logging & Monitoring

### What is Logged

- Error messages (without sensitive data)
- Tool execution results (sanitized)
- WebSocket connection events
- File indexer scan results

### What is NOT Logged

- API keys
- Full user prompts (unless debugging)
- File contents
- Personal information

### Log Storage

- Console output only (no persistent logs by default)
- Users can redirect output using shell redirection
- Web server logs connection events to console

## Incident Response

### In Case of Security Breach

1. **Contain**: Stop affected services immediately
2. **Assess**: Determine scope and impact
3. **Notify**: Inform affected users within 72 hours
4. **Remediate**: Deploy fix and update documentation
5. **Review**: Conduct post-mortem and improve processes

### User Actions

If you suspect your API keys are compromised:

1. Immediately revoke keys from provider dashboard
2. Generate new API keys
3. Update local configuration
4. Review recent API usage
5. Report incident if from Super Agent CLI vulnerability

## Security Audit History

### Audits Completed

- **Internal Review** (Initial Release): Basic security review of core functionality
- **Dependency Audit** (Ongoing): Automated scanning via Dependabot

### Planned Audits

- External security audit (Q2 2026)
- Penetration testing of web interface
- Plugin security framework review

## Security Standards & Compliance

### Standards Followed

- **OWASP Top 10**: Web application security risks addressed
- **CWE/SANS Top 25**: Common programming errors avoided
- **Node.js Security Best Practices**: Official guidelines followed

### Frameworks

- **Secure SDLC**: Security considered in all development phases
- **Principle of Least Privilege**: Minimal permissions by default
- **Defense in Depth**: Multiple layers of security controls

## Security Checklist for Contributors

Before submitting code:

- [ ] No hardcoded credentials or API keys
- [ ] Input validation on all user-provided data
- [ ] Path traversal protection for file operations
- [ ] Error messages don't leak sensitive information
- [ ] Dependencies are up-to-date and vulnerability-free
- [ ] Secrets not committed to version control
- [ ] Code doesn't introduce shell injection risks
- [ ] Plugin APIs have proper authorization checks

## Contact

For security concerns:

- **Email**: security@involvex.dev
- **GitHub Security Advisories**: [Create Advisory](https://github.com/involvex/super-agent-cli/security/advisories/new)

For general issues:

- **GitHub Issues**: https://github.com/involvex/super-agent-cli/issues

---

**Last Updated**: 2026-01-30  
**Version**: 1.0.0
