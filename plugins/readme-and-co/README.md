# readme-and-co Plugin

Generate comprehensive GitHub repository documentation following best practices. This plugin helps you create professional documentation files including README, LICENSE, CONTRIBUTING, SECURITY, CODE_OF_CONDUCT, and GitHub templates.

## Features

- **Conversational workflow**: Interactive agent guides you through documentation creation
- **Project-aware**: Analyzes your repository to provide contextual recommendations
- **Comprehensive license library**: 21 licenses including all GitHub licenses, Creative Commons, and FSL-1.1-MIT
- **Template system**: 70+ templates for customizable documentation
- **Smart defaults**: Detects project type, languages, frameworks, and existing documentation
- **Best practices**: Built-in guidance following industry standards

## Installation

This plugin is part of the agent-foundry. Install via Claude Code:

```bash
cc --plugin-dir /Users/aaronbassett/Projects/agent-foundry/plugins/readme-and-co
```

Or add to your project's `.claude-plugin/` directory.

## Usage

### Interactive Mode

Launch the conversational workflow to create documentation:

```bash
/readme-and-co:create
```

The agent will:
1. Analyze your project structure
2. Ask about your documentation needs (basic, expanded, comprehensive, or custom)
3. Guide you through license selection with decision tree
4. Generate customized documentation files
5. Report what was created and suggest next steps

### Quick File Generation

Create specific files directly:

```bash
/readme-and-co:create --file README.md
/readme-and-co:create --file LICENSE
/readme-and-co:create --file CONTRIBUTING.md
```

### Update Existing Files

Update existing documentation with missing sections:

```bash
/readme-and-co:create
# Agent detects existing files and offers to update them
```

## Documentation Files Supported

### Core Documentation
- **README.md**: Project overview, installation, usage, features
- **LICENSE**: 21 license options including GitHub licenses, Creative Commons, FSL-1.1-MIT
- **CONTRIBUTING.md**: Contribution guidelines, development setup, PR process
- **SECURITY.md**: Security policy, vulnerability reporting
- **CODE_OF_CONDUCT.md**: Community guidelines (Contributor Covenant 3.0, Django)
- **SUPPORT.md**: Support resources and channels

### GitHub Templates
- **Issue Templates**: Bug reports, feature requests, questions, documentation improvements
- **Pull Request Templates**: Standard and detailed variants
- **CODEOWNERS**: Code ownership and review assignments

### Project Governance
- **GOVERNANCE.md**: Project governance structure and decision-making
- **FUNDING.yml**: Sponsorship and funding information

## License Selection

The plugin includes comprehensive license guidance:

### For Code Projects
- **Recommended**: GitHub-approved licenses (MIT, Apache-2.0, GPL-3.0, etc.)
- **Special option**: FSL-1.1-MIT for commercial projects (automatic MIT transition after 2 years)
- **Advanced**: Multi-licensing for commercial + open source models

### For Documentation/Media
- **Recommended**: Creative Commons licenses (CC-BY-4.0, CC-BY-SA-4.0, CC0-1.0)

### License Decision Tree
The agent uses a decision tree to help you choose:
- Maximum adoption? → MIT
- Patent protection needed? → Apache-2.0
- Want copyleft? → GPL-3.0 or AGPL-3.0
- Commercial SaaS? → FSL-1.1-MIT

See `LICENSES.md` for detailed license guidance.

## Template System

The plugin uses a template-based architecture:

- **70+ templates**: Organized by document type with minimal, standard, and comprehensive variants
- **Variable substitution**: Smart defaults with project detection
- **No context overhead**: Templates are rendered by Python scripts, never loaded into agent context

See `TEMPLATES.md` for complete template reference.

## Skills Included

### documentation-standards
Triggers when creating README, CONTRIBUTING, or core documentation. Provides best practices, structure patterns, and essential sections.

### license-selection
Triggers when choosing licenses. Includes decision trees, use cases, multi-licensing guidance, and FSL-1.1-MIT advocacy.

### github-templates
Triggers when creating issue templates, PR templates, or CODEOWNERS. Covers both Markdown and YAML formats.

## Scripts

All scripts use Python standard library only (no dependencies):

- **detect_project_info.py**: Analyzes repository structure
- **render_template.py**: Template variable substitution
- **populate_license.py**: License template generation with smart defaults
- **fetch_licenses.py**: Downloads license templates from APIs (manual refresh only)

## Examples

### Basic Setup
```
User: /readme-and-co:create
Agent: "I detected this is a Python/FastAPI project. What documentation do you need?"
User: "Basic files"
Agent: Creates README, LICENSE (MIT), CONTRIBUTING, SECURITY
```

### Custom License Selection
```
User: /readme-and-co:create
Agent: "This appears to be a commercial SaaS project. Consider FSL-1.1-MIT?"
User: "What's that?"
Agent: [Explains FSL with 2-year automatic MIT transition]
User: "Yes, use FSL"
Agent: Creates LICENSE.md with FSL-1.1-MIT
```

### Update Existing Documentation
```
User: /readme-and-co:create
Agent: "README.md exists but missing Contributing and Support sections. Update?"
User: "Yes"
Agent: Adds missing sections to existing README
```

## Configuration

No configuration required. The plugin works out of the box with sensible defaults.

For project-specific preferences, you can create `.claude/readme-and-co.local.md` (optional).

## Requirements

- Claude Code
- Python 3.9+ (for template rendering)
- Git (for project detection)

## License

MIT License - See LICENSE file for details.

## Contributing

Contributions welcome! See CONTRIBUTING.md for guidelines.

## Support

For issues or questions:
- GitHub Issues: [agent-foundry issues](https://github.com/aaronbassett/agent-foundry/issues)
- Plugin documentation: See `TEMPLATES.md` and `LICENSES.md`
