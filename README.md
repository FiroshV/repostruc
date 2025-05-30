# 📁 repostruc

A powerful and feature-rich CLI tool for visualizing and analyzing repository directory structures. Perfect for documentation, project analysis, and understanding complex codebases.

## ✨ Features

### Core Features
- **Smart Directory Tree Visualization**: Clean, colored output with proper Unicode tree characters
- **Intelligent Filtering**: Respects `.gitignore` with customizable ignore patterns
- **Multiple Output Formats**: Plain text, JSON, and Markdown
- **Comprehensive Statistics**: File counts, sizes, type distribution, and largest files
- **Git Integration**: Show git status inline with files
- **Configuration File Support**: Save your preferred settings in `.repostrucrc.json`

### Advanced Features
- **File Categorization**: Automatically groups files by type (code, docs, media, etc.)
- **Depth Control**: Limit traversal depth for large repositories
- **Symlink Support**: Choose to follow or ignore symbolic links
- **Permission Display**: Show Unix-style file permissions
- **Timestamp Information**: Display file modification dates
- **Empty Directory Handling**: Option to exclude empty directories
- **Hidden File Support**: Include or exclude hidden files and directories
- **Colored Output**: Beautiful terminal colors (can be disabled)
- **Error Handling**: Robust error reporting with detailed warnings

## 🚀 Installation

### Quick Usage (No Installation)
```bash
npx repostruc
```

### Global Installation
```bash
# Using npm
npm install -g repostruc

# Using yarn
yarn global add repostruc

# Using pnpm
pnpm add -g repostruc
```

## 📖 Usage

### Basic Commands

```bash
# Analyze current directory
repostruc

# Analyze specific directory
repostruc /path/to/project

# Save to custom file
repostruc -o project-structure.txt

# Initialize configuration
repostruc init

# Check configuration and environment
repostruc check
```

### Common Usage Patterns

#### 1. Quick Overview
```bash
# Basic structure with sizes
repostruc --sizes

# Include statistics
repostruc --stats

# Show everything
repostruc --stats --files --sizes
```

#### 2. Filtered Analysis
```bash
# Ignore specific patterns
repostruc --ignore "*.log,temp/**,backup/"

# Include only specific files
repostruc --include "src/**/*.js,docs/**/*.md"

# Exclude default patterns and use custom ones
repostruc --no-default-patterns --ignore "node_modules/**"
```

#### 3. Format Options
```bash
# Generate JSON output
repostruc -f json -o structure.json

# Generate Markdown documentation
repostruc -f markdown -o STRUCTURE.md

# Plain text with full details
repostruc -f txt --stats --sizes
```

#### 4. Advanced Analysis
```bash
# Show git status with files
repostruc --git-status

# Include hidden files and follow symlinks
repostruc --hidden --follow-symlinks

# Limit depth and exclude empty directories
repostruc --depth 3 --exclude-empty

# Show timestamps and permissions
repostruc --timestamps --permissions
```

## 🎨 Output Formats

### Text Format (Default)
```
Directory Structure:
============================================================
Generated: 2024-01-15T10:30:00.000Z
Directory: /home/user/project
------------------------------------------------------------

src/
├── components/
│   ├── Button.js (2.34 KB)
│   └── Header.js (3.67 KB)
├── utils/
│   └── helpers.js (1.56 KB)
└── index.js (4.23 KB)
```

### JSON Format
```json
{
  "generated": "2024-01-15T10:30:00.000Z",
  "directory": "/home/user/project",
  "structure": {
    "src": {
      "type": "directory",
      "children": {
        "components": {
          "type": "directory",
          "children": {
            "Button.js": {
              "type": "file",
              "size": 2398
            }
          }
        }
      }
    }
  }
}
```

### Markdown Format
```markdown
# Repository Structure

Generated on: 2024-01-15T10:30:00.000Z

## Directory Tree

- **src/**
  - **components/**
    - Button.js *(2.34 KB)*
    - Header.js *(3.67 KB)*
  - **utils/**
    - helpers.js *(1.56 KB)*
  - index.js *(4.23 KB)*
```

## ⚙️ Configuration

Create a `.repostrucrc.json` file in your project root:

```json
{
  "output": "structure.txt",
  "format": "markdown",
  "stats": true,
  "sizes": true,
  "gitignore": true,
  "hidden": false,
  "depth": 5,
  "groupByType": true,
  "timestamps": false,
  "permissions": false,
  "excludeEmpty": true,
  "followSymlinks": false,
  "gitStatus": false,
  "color": true,
  "ignore": ["*.log", "temp/**"],
  "include": ["src/**", "docs/**"],
  "noDefaultPatterns": false
}
```

Initialize with defaults:
```bash
repostruc init
```

## 📊 Statistics Output

When using `--stats`, you'll get:
- Total file and directory counts
- Total repository size
- File distribution by category (code, docs, media, etc.)
- File distribution by extension
- Top 10 largest files
- Error and warning counts

## 🎯 Command Reference

### Options

| Option | Short | Description | Default |
|--------|-------|-------------|---------|
| `--output <file>` | `-o` | Output file name | `repostruc-output.txt` |
| `--ignore <patterns>` | `-i` | Comma-separated ignore patterns | See default patterns |
| `--include <patterns>` | | Comma-separated include patterns | `**/*` |
| `--stats` | | Show detailed statistics | `false` |
| `--files` | | Show complete file list | `false` |
| `--sizes` | | Show file/directory sizes | `false` |
| `--format <type>` | `-f` | Output format (txt/json/markdown) | `txt` |
| `--depth <number>` | `-d` | Maximum traversal depth | `Infinity` |
| `--hidden` | | Include hidden files | `false` |
| `--timestamps` | | Show modification timestamps | `false` |
| `--permissions` | | Show file permissions | `false` |
| `--git-status` | | Show git status for files | `false` |
| `--group-by-type` | | Group files by type in list | `false` |
| `--exclude-empty` | | Exclude empty directories | `false` |
| `--follow-symlinks` | | Follow symbolic links | `false` |
| `--no-gitignore` | | Disable .gitignore support | |
| `--no-default-patterns` | | Disable default ignore patterns | |
| `--no-color` | | Disable colored output | |
| `--color-file` | | Include colors in output file | `false` |
| `--no-print` | | Don't print structure to terminal | |
| `--save-config` | | Save current options to config | |

### Default Ignore Patterns

The following patterns are ignored by default (unless `--no-default-patterns` is used):
- `node_modules/**`, `.git/**`, `dist/**`, `build/**`
- `*.log`, `.DS_Store`, `Thumbs.db`
- `coverage/**`, `.next/**`, `.cache/**`
- `*.tmp`, `*.temp`, `*.swp`, `*.swo`
- `.vscode/**`, `.idea/**`, `*.sublime-*`
- `.env*`, `package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`
- Python: `__pycache__/**`, `*.pyc`, `.mypy_cache/**`, `venv/**`
- Java/JVM: `.gradle/**`, `.mvn/**`, `*.class`, `*.jar`
- And more...

## 🎨 File Categories

Files are automatically categorized into:
- **code**: Programming language files (.js, .py, .java, etc.)
- **web**: Web files (.html, .css, .scss)
- **data**: Data files (.json, .xml, .csv)
- **docs**: Documentation (.md, .txt, .pdf)
- **config**: Configuration files
- **image**: Image files
- **media**: Audio/video files
- **archive**: Compressed files
- **other**: Everything else

## 🔍 Examples

### Documentation Structure
```bash
repostruc --include "docs/**/*,README.md,*.md" -f markdown -o DOCS_STRUCTURE.md
```

### Source Code Analysis
```bash
repostruc --include "src/**/*" --stats --group-by-type --sizes
```

### Full Project Analysis
```bash
repostruc --stats --files --sizes --git-status --timestamps -o full-analysis.txt
```

### CI/CD Integration
```bash
# Generate JSON for programmatic use
repostruc -f json --stats -o structure.json

# Generate markdown for documentation
repostruc -f markdown --sizes -o STRUCTURE.md
```

## 🐛 Troubleshooting

### Check your setup
```bash
repostruc check
```

This will verify:
- Configuration file validity
- .gitignore presence
- Git repository status
- Write permissions

### Common Issues

1. **Large repositories**: Use `--depth` to limit traversal
2. **Permission errors**: Check file permissions or use `--ignore` for problematic paths
3. **Memory issues**: Use `--exclude-empty` and specific `--include` patterns
4. **Slow performance**: Disable `--git-status` for non-git directories

## 📝 License

MIT License - feel free to use in your projects!

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 🌟 Tips

- Use `repostruc init` to create a configuration file with your preferred defaults
- Combine with other tools: `repostruc -f json | jq '.structure'`
- Add to your project documentation workflow
- Use in CI/CD to track structure changes
- Create multiple configs for different views of your project