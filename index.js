#!/usr/bin/env node

import fs from "fs";
import { promises as fsPromises } from "fs";
import path from "path";
import chalk from "chalk";
import { Command } from "commander";
import fg from "fast-glob";
import ignore from "ignore";
import ora from "ora";
import { promisify } from "util";
import { exec } from "child_process";

const execAsync = promisify(exec);

const DEFAULT_OUTPUT = "repostruc-output.txt";
const CONFIG_FILE = ".repostrucrc.json";

// Default patterns that are always ignored unless --no-default-patterns is used
const DEFAULT_IGNORE = [
    "node_modules/**",
    ".git/**",
    "dist/**",
    "build/**",
    "*.log",
    ".DS_Store",
    "coverage/**",
    ".next/**",
    ".cache/**",
    "*.tmp",
    "*.temp",
    "*.swp",
    "*.swo",
    "Thumbs.db",
    ".vscode/**",
    ".idea/**",
    "*.sublime-*",
    ".env*",
    "package-lock.json",
    "yarn.lock",
    "pnpm-lock.yaml",
    ".nyc_output/**",
    ".pytest_cache/**",
    "__pycache__/**",
    "*.pyc",
    ".mypy_cache/**",
    ".tox/**",
    "venv/**",
    "env/**",
    ".virtualenv/**",
    "target/**",
    "out/**",
    "bin/**",
    "obj/**",
    ".gradle/**",
    ".mvn/**",
    "*.class",
    "*.jar",
    "*.war",
    "*.ear"
];

// File type categories for better organization
const FILE_CATEGORIES = {
    code: ['.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.cpp', '.c', '.h', '.go', '.rs', '.php', '.rb', '.swift', '.kt'],
    web: ['.html', '.css', '.scss', '.sass', '.less'],
    data: ['.json', '.xml', '.yaml', '.yml', '.toml', '.csv'],
    docs: ['.md', '.txt', '.rst', '.tex', '.doc', '.docx', '.pdf'],
    config: ['.config', '.conf', '.ini', '.cfg', '.rc'],
    image: ['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp', '.ico'],
    media: ['.mp4', '.mp3', '.wav', '.avi', '.mov', '.webm'],
    archive: ['.zip', '.tar', '.gz', '.rar', '.7z', '.bz2']
};

const INDENT = "  ";
const BRANCH = "├── ";
const LAST_BRANCH = "└── ";
const PIPE = "│   ";
const SPACE = "    ";

class RepoStructure {
    constructor(options = {}) {
        this.options = options;
        this.outputFile = options.output || DEFAULT_OUTPUT;
        this.ignorePatterns = [];
        this.errors = [];
        this.warnings = [];
        
        // Load configuration from file if exists
        this.config = this.loadConfig();
        
        // Apply configuration with command line overrides
        this.applyConfiguration(options);
        
        // Initialize ignore instance
        this.ig = ignore();
        this.setupIgnorePatterns();
    }

    loadConfig() {
        try {
            if (fs.existsSync(CONFIG_FILE)) {
                const configContent = fs.readFileSync(CONFIG_FILE, 'utf8');
                return JSON.parse(configContent);
            }
        } catch (error) {
            this.warnings.push(`Warning: Failed to load config file: ${error.message}`);
        }
        return {};
    }

    applyConfiguration(options) {
        // Merge config file settings with command line options (CLI takes precedence)
        this.outputFile = options.output || this.config.output || DEFAULT_OUTPUT;
        this.showStats = options.stats !== undefined ? options.stats : (this.config.stats || false);
        this.showFiles = options.files !== undefined ? options.files : (this.config.files || false);
        this.showSizes = options.sizes !== undefined ? options.sizes : (this.config.sizes || false);
        this.useGitignore = options.gitignore !== false && (this.config.gitignore !== false);
        this.showHidden = options.hidden || this.config.hidden || false;
        this.maxDepth = options.depth || this.config.depth || Infinity;
        this.format = options.format || this.config.format || 'txt';
        this.groupByType = options.groupByType || this.config.groupByType || false;
        this.showTimestamps = options.timestamps || this.config.timestamps || false;
        this.showPermissions = options.permissions || this.config.permissions || false;
        this.excludeEmpty = options.excludeEmpty || this.config.excludeEmpty || false;
        this.followSymlinks = options.followSymlinks || this.config.followSymlinks || false;
        this.showGitStatus = options.gitStatus || this.config.gitStatus || false;
        
        // Disable color in file output by default, but allow override
        this.colorOutput = options.colorFile || false;
        this.colorTerminal = options.color !== false && (this.config.color !== false);
        
        // Handle ignore patterns
        const cliIgnore = options.ignore ? options.ignore.split(",") : [];
        const configIgnore = this.config.ignore || [];
        this.ignorePatterns = [...new Set([...configIgnore, ...cliIgnore])];
        
        // Add default patterns only if not explicitly disabled
        if (!options.noDefaultPatterns && !this.config.noDefaultPatterns) {
            this.ignorePatterns.push(...DEFAULT_IGNORE);
        }
        
        // Handle include patterns
        const cliInclude = options.include ? options.include.split(",") : [];
        const configInclude = this.config.include || [];
        this.includePatterns = [...new Set([...configInclude, ...cliInclude])];
        if (this.includePatterns.length === 0) {
            this.includePatterns = ["**/*"];
        }
    }

    setupIgnorePatterns() {
        try {
            // Add .gitignore patterns
            if (this.useGitignore && fs.existsSync(".gitignore")) {
                const gitignore = fs.readFileSync(".gitignore", "utf8");
                this.ig.add(gitignore);
            }
            
            // Add custom ignore patterns
            if (this.ignorePatterns.length > 0) {
                this.ig.add(this.ignorePatterns);
            }
            
            // Add output file to ignore patterns
            this.ig.add(this.outputFile);
            
            // Add config file to ignore patterns if requested
            if (this.config.hideConfig) {
                this.ig.add(CONFIG_FILE);
            }
        } catch (error) {
            this.errors.push(`Error setting up ignore patterns: ${error.message}`);
        }
    }

    async getGitStatus() {
        if (!this.showGitStatus) return {};
        
        try {
            const { stdout } = await execAsync('git status --porcelain');
            const statusMap = {};
            stdout.split('\n').forEach(line => {
                if (line.trim()) {
                    const status = line.substring(0, 2);
                    const file = line.substring(3);
                    statusMap[file] = this.parseGitStatus(status);
                }
            });
            return statusMap;
        } catch (error) {
            this.warnings.push('Git status unavailable: Not a git repository or git not installed');
            return {};
        }
    }

    parseGitStatus(status) {
        const statusMap = {
            'M ': 'modified',
            'MM': 'modified',
            'A ': 'added',
            'AM': 'added',
            'D ': 'deleted',
            'R ': 'renamed',
            'C ': 'copied',
            '??': 'untracked',
            '!!': 'ignored'
        };
        return statusMap[status] || 'unknown';
    }

    async analyze(dir = ".") {
        const spinner = ora('Analyzing repository structure...').start();
        
        try {
            // Get git status if requested
            const gitStatus = await this.getGitStatus();
            
            const files = await fg(this.includePatterns, {
                ignore: this.ignorePatterns,
                dot: this.showHidden,
                cwd: dir,
                onlyDirectories: false,
                onlyFiles: false,
                followSymbolicLinks: this.followSymlinks,
                deep: this.maxDepth === Infinity ? Infinity : this.maxDepth + 1,
                suppressErrors: true
            });

            // Filter using ignore instance
            const filteredFiles = files.filter(file => !this.ig.ignores(file));

            const stats = {
                totalFiles: 0,
                totalDirs: 0,
                totalSize: 0,
                byExtension: {},
                byCategory: {},
                largestFiles: [],
                errors: this.errors.length,
                warnings: this.warnings.length
            };

            const structureMap = new Map();
            const fileInfoMap = new Map();

            for (const file of filteredFiles) {
                try {
                    const fullPath = path.resolve(dir, file);
                    let stat;
                    try {
                        stat = await fsPromises.stat(fullPath);
                    } catch (statError) {
                        this.warnings.push(`Could not stat file ${file}: ${statError.message}`);
                        continue;
                    }
                    
                    const isDirectory = stat.isDirectory();
                    
                    // Skip empty directories if requested
                    if (this.excludeEmpty && isDirectory) {
                        try {
                            const contents = await fsPromises.readdir(fullPath);
                            if (contents.length === 0) continue;
                        } catch (readError) {
                            this.warnings.push(`Could not read directory ${file}: ${readError.message}`);
                        }
                    }
                    
                    // Collect file info
                    const fileInfo = {
                        path: file,
                        size: stat.size,
                        isDirectory,
                        modified: stat.mtime,
                        permissions: stat.mode,
                        isSymlink: stat.isSymbolicLink(),
                        gitStatus: gitStatus[file] || null
                    };
                    
                    fileInfoMap.set(file, fileInfo);
                    
                    // Update statistics
                    if (isDirectory) {
                        stats.totalDirs++;
                    } else {
                        stats.totalFiles++;
                        stats.totalSize += stat.size;
                        
                        // Track by extension
                        const ext = path.extname(file) || "(no extension)";
                        if (!stats.byExtension[ext]) {
                            stats.byExtension[ext] = { count: 0, size: 0 };
                        }
                        stats.byExtension[ext].count++;
                        stats.byExtension[ext].size += stat.size;
                        
                        // Track by category
                        const category = this.getFileCategory(ext);
                        if (!stats.byCategory[category]) {
                            stats.byCategory[category] = { count: 0, size: 0 };
                        }
                        stats.byCategory[category].count++;
                        stats.byCategory[category].size += stat.size;
                        
                        // Track largest files
                        stats.largestFiles.push({ path: file, size: stat.size });
                        stats.largestFiles.sort((a, b) => b.size - a.size);
                        stats.largestFiles = stats.largestFiles.slice(0, 10);
                    }
                    
                    // Build structure map
                    const parts = file.split(path.sep);
                    let current = structureMap;
                    parts.forEach((part, i) => {
                        if (!current.has(part)) {
                            current.set(part, new Map());
                        }
                        if (i < parts.length - 1) {
                            current = current.get(part);
                        }
                    });
                } catch (error) {
                    this.errors.push(`Error processing ${file}: ${error.message}`);
                }
            }
            
            spinner.succeed('Analysis complete!');
            return { files: filteredFiles, stats, structureMap, fileInfoMap, gitStatus };
        } catch (error) {
            spinner.fail('Analysis failed!');
            throw error;
        }
    }

    getFileCategory(extension) {
        for (const [category, extensions] of Object.entries(FILE_CATEGORIES)) {
            if (extensions.includes(extension.toLowerCase())) {
                return category;
            }
        }
        return 'other';
    }

    formatBytes(bytes) {
        const units = ["B", "KB", "MB", "GB", "TB"];
        let size = bytes;
        let unitIndex = 0;
        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }
        return `${size.toFixed(2)} ${units[unitIndex]}`;
    }

    formatPermissions(mode) {
        const perms = (mode & parseInt('777', 8)).toString(8);
        return perms.padStart(3, '0');
    }

    formatTimestamp(date) {
        return date.toISOString().split('T')[0];
    }

    getColorForFile(name, fileInfo) {
        if (!this.colorOutput || !name || typeof name !== 'string') return name || '';
        
        if (fileInfo && fileInfo.isDirectory) return chalk.blue.bold(name);
        if (fileInfo && fileInfo.isSymlink) return chalk.magenta(name);
        
        const ext = path.extname(name);
        const category = this.getFileCategory(ext);
        
        const colorMap = {
            code: chalk.green,
            web: chalk.cyan,
            data: chalk.yellow,
            docs: chalk.white,
            config: chalk.gray,
            image: chalk.magenta,
            media: chalk.red,
            archive: chalk.blue
        };
        
        const colorFn = colorMap[category] || chalk.white;
        return colorFn(name);
    }

    generateSimpleStructureText(map, fileInfoMap, prefix = "", parentPath = "") {
        let output = "";
        const entries = Array.from(map.entries());
        
        // Sort entries: directories first, then files
        entries.sort(([nameA, subMapA], [nameB, subMapB]) => {
            const pathA = parentPath ? path.join(parentPath, nameA) : nameA;
            const pathB = parentPath ? path.join(parentPath, nameB) : nameB;
            const infoA = fileInfoMap.get(pathA);
            const infoB = fileInfoMap.get(pathB);
            
            if (infoA && infoB) {
                if (infoA.isDirectory && !infoB.isDirectory) return -1;
                if (!infoA.isDirectory && infoB.isDirectory) return 1;
            }
            
            return nameA.localeCompare(nameB);
        });

        entries.forEach(([name, subMap], index) => {
            const isLast = index === entries.length - 1;
            const branch = isLast ? LAST_BRANCH : BRANCH;
            const newPrefix = prefix + (isLast ? SPACE : PIPE);
            const currentPath = parentPath ? path.join(parentPath, name) : name;

            output += `${prefix}${branch}${name}\n`;
            
            if (subMap.size > 0) {
                const depth = currentPath.split('/').length;
                if (depth < this.maxDepth) {
                    output += this.generateSimpleStructureText(subMap, fileInfoMap, newPrefix, currentPath);
                }
            }
        });

        return output;
    }

    generateStructureText(map, fileInfoMap, prefix = "", parentPath = "") {
        let output = "";
        const entries = Array.from(map.entries());
        
        // Sort entries: directories first, then files
        entries.sort(([nameA, subMapA], [nameB, subMapB]) => {
            const pathA = parentPath ? path.join(parentPath, nameA) : nameA;
            const pathB = parentPath ? path.join(parentPath, nameB) : nameB;
            const infoA = fileInfoMap.get(pathA);
            const infoB = fileInfoMap.get(pathB);
            
            if (infoA && infoB) {
                if (infoA.isDirectory && !infoB.isDirectory) return -1;
                if (!infoA.isDirectory && infoB.isDirectory) return 1;
            }
            
            return nameA.localeCompare(nameB);
        });

        entries.forEach(([name, subMap], index) => {
            const isLast = index === entries.length - 1;
            const branch = isLast ? LAST_BRANCH : BRANCH;
            const newPrefix = prefix + (isLast ? SPACE : PIPE);
            const currentPath = parentPath ? path.join(parentPath, name) : name;
            const fileInfo = fileInfoMap.get(currentPath);
            
            let displayName = this.getColorForFile(name, fileInfo || {});
            
            // Add additional info based on options
            const extras = [];
            
            if (this.showSizes && fileInfo && !fileInfo.isDirectory) {
                extras.push(chalk.gray(`(${this.formatBytes(fileInfo.size)})`));
            }
            
            if (this.showTimestamps && fileInfo) {
                extras.push(chalk.gray(`[${this.formatTimestamp(fileInfo.modified)}]`));
            }
            
            if (this.showPermissions && fileInfo) {
                extras.push(chalk.gray(`<${this.formatPermissions(fileInfo.permissions)}>`));
            }
            
            if (this.showGitStatus && fileInfo && fileInfo.gitStatus) {
                const statusColors = {
                    modified: chalk.yellow('M'),
                    added: chalk.green('A'),
                    deleted: chalk.red('D'),
                    untracked: chalk.gray('?'),
                    renamed: chalk.blue('R')
                };
                extras.push(statusColors[fileInfo.gitStatus] || chalk.gray('?'));
            }
            
            if (fileInfo && fileInfo.isSymlink) {
                extras.push(chalk.magenta('→'));
            }
            
            if (extras.length > 0) {
                displayName += ' ' + extras.join(' ');
            }

            output += `${prefix}${branch}${displayName}\n`;
            
            if (subMap.size > 0) {
                const depth = currentPath.split('/').length;
                if (depth < this.maxDepth) {
                    output += this.generateStructureText(subMap, fileInfoMap, newPrefix, currentPath);
                } else if (depth === this.maxDepth) {
                    output += `${newPrefix}${BRANCH}${chalk.gray('...')}\n`;
                }
            }
        });

        return output;
    }

    generateMarkdownStructure(map, fileInfoMap, level = 0, parentPath = "") {
        let output = "";
        const entries = Array.from(map.entries());
        
        entries.sort(([nameA, subMapA], [nameB, subMapB]) => {
            const pathA = parentPath ? path.join(parentPath, nameA) : nameA;
            const pathB = parentPath ? path.join(parentPath, nameB) : nameB;
            const infoA = fileInfoMap.get(pathA);
            const infoB = fileInfoMap.get(pathB);
            
            if (infoA && infoB) {
                if (infoA.isDirectory && !infoB.isDirectory) return -1;
                if (!infoA.isDirectory && infoB.isDirectory) return 1;
            }
            
            return nameA.localeCompare(nameB);
        });

        entries.forEach(([name, subMap]) => {
            const currentPath = parentPath ? path.join(parentPath, name) : name;
            const fileInfo = fileInfoMap.get(currentPath);
            const indent = "  ".repeat(level);
            
            let displayName = name;
            if (fileInfo && fileInfo.isDirectory) {
                displayName = `**${name}/**`;
            }
            
            output += `${indent}- ${displayName}`;
            
            if (this.showSizes && fileInfo && !fileInfo.isDirectory) {
                output += ` *(${this.formatBytes(fileInfo.size)})*`;
            }
            
            output += '\n';
            
            if (subMap.size > 0 && level < this.maxDepth - 1) {
                output += this.generateMarkdownStructure(subMap, fileInfoMap, level + 1, currentPath);
            }
        });

        return output;
    }

    generateJSONStructure(map, fileInfoMap, parentPath = "") {
        const result = {};
        
        map.forEach((subMap, name) => {
            const currentPath = parentPath ? path.join(parentPath, name) : name;
            const fileInfo = fileInfoMap.get(currentPath);
            
            if (subMap.size > 0) {
                result[name] = {
                    type: 'directory',
                    children: this.generateJSONStructure(subMap, fileInfoMap, currentPath)
                };
            } else {
                result[name] = {
                    type: fileInfo && fileInfo.isDirectory ? 'directory' : 'file'
                };
            }
            
            if (fileInfo) {
                if (this.showSizes && !fileInfo.isDirectory) {
                    result[name].size = fileInfo.size;
                }
                if (this.showTimestamps) {
                    result[name].modified = fileInfo.modified;
                }
                if (this.showPermissions) {
                    result[name].permissions = this.formatPermissions(fileInfo.permissions);
                }
                if (this.showGitStatus && fileInfo.gitStatus) {
                    result[name].gitStatus = fileInfo.gitStatus;
                }
            }
        });
        
        return result;
    }

    async generateOutput(dir) {
        const analysisResult = await this.analyze(dir);
        return this.generateOutputFromAnalysis(analysisResult);
    }

    generateOutputFromAnalysis(analysisResult) {
        const { files, stats, structureMap, fileInfoMap, gitStatus } = analysisResult;
        let output = "";

        if (this.format === 'json') {
            const jsonOutput = {
                generated: new Date().toISOString(),
                directory: path.resolve(this.options.directory || '.'),
                structure: this.generateJSONStructure(structureMap, fileInfoMap),
                stats: this.showStats ? stats : undefined,
                errors: this.errors.length > 0 ? this.errors : undefined,
                warnings: this.warnings.length > 0 ? this.warnings : undefined
            };
            return JSON.stringify(jsonOutput, null, 2);
        }

        if (this.format === 'markdown') {
            output += `# Repository Structure\n\n`;
            output += `Generated on: ${new Date().toISOString()}\n\n`;
            output += `## Directory Tree\n\n`;
            output += this.generateMarkdownStructure(structureMap, fileInfoMap);
            
            if (this.showStats) {
                output += `\n## Statistics\n\n`;
                output += `- **Total Files**: ${stats.totalFiles}\n`;
                output += `- **Total Directories**: ${stats.totalDirs}\n`;
                output += `- **Total Size**: ${this.formatBytes(stats.totalSize)}\n\n`;
                
                if (Object.keys(stats.byCategory).length > 0) {
                    output += `### Files by Category\n\n`;
                    Object.entries(stats.byCategory)
                        .sort(([, a], [, b]) => b.count - a.count)
                        .forEach(([category, data]) => {
                            output += `- **${category}**: ${data.count} files (${this.formatBytes(data.size)})\n`;
                        });
                }
            }
            
            return output;
        }

        // Default text format - simple tree structure
        const simpleFormat = !this.showStats && !this.showFiles && !this.showSizes && 
                           !this.showTimestamps && !this.showPermissions && !this.showGitStatus;
        
        if (simpleFormat) {
            // Simple format like the original
            output += path.basename(path.resolve(this.options.directory || '.')) + "\n";
            output += this.generateSimpleStructureText(structureMap, fileInfoMap);
        } else {
            // Detailed format with headers
            output += "Directory Structure:\n";
            output += "=".repeat(60) + "\n";
            output += `Generated: ${new Date().toISOString()}\n`;
            output += `Directory: ${path.resolve(this.options.directory || '.')}\n`;
            output += "-".repeat(60) + "\n\n";
            
            output += this.generateStructureText(structureMap, fileInfoMap);
            output += "\n";

            // Optional Statistics
            if (this.showStats) {
                output += "Statistics:\n";
                output += "=".repeat(60) + "\n";
                output += `Total Files: ${stats.totalFiles}\n`;
                output += `Total Directories: ${stats.totalDirs}\n`;
                output += `Total Size: ${this.formatBytes(stats.totalSize)}\n\n`;

                if (Object.keys(stats.byCategory).length > 0) {
                    output += "Files by Category:\n";
                    output += "-".repeat(40) + "\n";
                    Object.entries(stats.byCategory)
                        .sort(([, a], [, b]) => b.count - a.count)
                        .forEach(([category, data]) => {
                            output += `${category}: ${data.count} files (${this.formatBytes(data.size)})\n`;
                        });
                    output += "\n";
                }

                output += "Files by Extension:\n";
                output += "-".repeat(40) + "\n";
                Object.entries(stats.byExtension)
                    .sort(([, a], [, b]) => b.count - a.count)
                    .slice(0, 15) // Show top 15 extensions
                    .forEach(([ext, data]) => {
                        output += `${ext}: ${data.count} files (${this.formatBytes(data.size)})\n`;
                    });
                output += "\n";

                if (stats.largestFiles.length > 0) {
                    output += "Largest Files:\n";
                    output += "-".repeat(40) + "\n";
                    stats.largestFiles.forEach(file => {
                        output += `${file.path} (${this.formatBytes(file.size)})\n`;
                    });
                    output += "\n";
                }
            }

            // Optional File List
            if (this.showFiles) {
                output += "File List:\n";
                output += "=".repeat(60) + "\n";
                
                if (this.groupByType) {
                    const filesByCategory = {};
                    files.forEach(file => {
                        const fileInfo = fileInfoMap.get(file);
                        if (fileInfo && !fileInfo.isDirectory) {
                            const ext = path.extname(file);
                            const category = this.getFileCategory(ext);
                            if (!filesByCategory[category]) {
                                filesByCategory[category] = [];
                            }
                            filesByCategory[category].push(file);
                        }
                    });
                    
                    Object.entries(filesByCategory)
                        .sort(([catA], [catB]) => catA.localeCompare(catB))
                        .forEach(([category, categoryFiles]) => {
                            output += `\n${category.toUpperCase()} FILES:\n`;
                            output += "-".repeat(40) + "\n";
                            categoryFiles.sort().forEach(file => {
                                const fileInfo = fileInfoMap.get(file);
                                const size = this.showSizes && fileInfo ? ` (${this.formatBytes(fileInfo.size)})` : "";
                                output += `${file}${size}\n`;
                            });
                        });
                } else {
                    files.sort().forEach(file => {
                        const fileInfo = fileInfoMap.get(file);
                        if (fileInfo && !fileInfo.isDirectory) {
                            const size = this.showSizes ? ` (${this.formatBytes(fileInfo.size)})` : "";
                            const timestamp = this.showTimestamps ? ` [${this.formatTimestamp(fileInfo.modified)}]` : "";
                            output += `${file}${size}${timestamp}\n`;
                        }
                    });
                }
            }

            // Errors and Warnings
            if (this.errors.length > 0 || this.warnings.length > 0) {
                output += "\nIssues:\n";
                output += "=".repeat(60) + "\n";
                
                if (this.errors.length > 0) {
                    output += `Errors (${this.errors.length}):\n`;
                    this.errors.forEach(error => {
                        output += `  - ${error}\n`;
                    });
                }
                
                if (this.warnings.length > 0) {
                    output += `\nWarnings (${this.warnings.length}):\n`;
                    this.warnings.forEach(warning => {
                        output += `  - ${warning}\n`;
                    });
                }
            }
        }

        return output;
    }

    async saveOutput(dir) {
        try {
            // Analyze only once
            const analysisResult = await this.analyze(dir);
            
            // Generate output without colors for file
            const fileOutput = await this.generateOutputFromAnalysis(analysisResult);
            
            // Ensure output directory exists
            const outputDir = path.dirname(this.outputFile);
            if (outputDir && outputDir !== '.' && outputDir !== '') {
                await fsPromises.mkdir(outputDir, { recursive: true });
            }
            
            // Save to file
            await fsPromises.writeFile(this.outputFile, fileOutput, 'utf8');
            
            // Generate colored output for terminal if not explicitly disabled
            if (!this.options || this.options.print !== false) {
                const originalColorOutput = this.colorOutput;
                this.colorOutput = this.colorTerminal;
                const terminalOutput = await this.generateOutputFromAnalysis(analysisResult);
                this.colorOutput = originalColorOutput;
                
                // Print to terminal
                console.log('\n' + terminalOutput);
            }
            
            // Print save confirmation
            if (this.colorTerminal) {
                console.log(chalk.green(`✓ Structure saved to ${this.outputFile}`));
                
                if (this.errors.length > 0) {
                    console.log(chalk.yellow(`⚠ ${this.errors.length} errors occurred during analysis`));
                }
                
                if (this.warnings.length > 0) {
                    console.log(chalk.yellow(`ℹ ${this.warnings.length} warnings during analysis`));
                }
            } else {
                console.log(`Structure saved to ${this.outputFile}`);
            }
        } catch (error) {
            console.error(chalk.red(`Error saving output: ${error.message}`));
            throw error;
        }
    }

    async generateConfig(options) {
        const config = {
            output: options.output || DEFAULT_OUTPUT,
            stats: options.stats || false,
            files: options.files || false,
            sizes: options.sizes || false,
            gitignore: options.gitignore !== false,
            hidden: options.hidden || false,
            depth: options.depth || null,
            format: options.format || 'txt',
            groupByType: options.groupByType || false,
            timestamps: options.timestamps || false,
            permissions: options.permissions || false,
            excludeEmpty: options.excludeEmpty || false,
            followSymlinks: options.followSymlinks || false,
            gitStatus: options.gitStatus || false,
            color: options.color !== false,
            ignore: options.ignore ? options.ignore.split(",") : [],
            include: options.include ? options.include.split(",") : [],
            noDefaultPatterns: options.noDefaultPatterns || false
        };

        try {
            await fsPromises.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2));
            console.log(chalk.green(`✓ Configuration saved to ${CONFIG_FILE}`));
        } catch (error) {
            console.error(chalk.red(`Error saving configuration: ${error.message}`));
        }
    }
}

const program = new Command();

program
    .name("repostruc")
    .description("Advanced CLI tool to visualize and analyze repository structure")
    .version("1.0.0")
    .argument("[directory]", "directory to analyze", ".")
    .option("-o, --output <file>", "output file name", DEFAULT_OUTPUT)
    .option("-i, --ignore <patterns>", "comma-separated patterns to ignore")
    .option("--include <patterns>", "comma-separated patterns to include")
    .option("--stats", "show detailed statistics")
    .option("--files", "show complete file list")
    .option("--sizes", "show file/directory sizes")
    .option("--no-gitignore", "disable .gitignore support")
    .option("--no-default-patterns", "disable default ignore patterns")
    .option("--hidden", "include hidden files and directories")
    .option("-d, --depth <number>", "maximum depth to traverse", parseInt)
    .option("-f, --format <type>", "output format (txt, json, markdown)", "txt")
    .option("--group-by-type", "group files by type in file list")
    .option("--timestamps", "show file modification timestamps")
    .option("--permissions", "show file permissions (Unix-style)")
    .option("--exclude-empty", "exclude empty directories")
    .option("--follow-symlinks", "follow symbolic links")
    .option("--git-status", "show git status for files")
    .option("--no-color", "disable colored output")
    .option("--color-file", "enable colors in output file (may show ANSI codes)")
    .option("--no-print", "don't print structure to terminal")
    .option("--save-config", "save current options as default configuration")
    .option("--debug", "enable debug output")
    .action(async (directory, options) => {
        try {
            if (options.debug) {
                console.log(chalk.gray('Debug: Options received:'), options);
                console.log(chalk.gray('Debug: Directory:', directory));
            }
            
            // Store directory in options for later use
            options.directory = directory;
            
            const analyzer = new RepoStructure(options);
            
            if (options.saveConfig) {
                await analyzer.generateConfig(options);
                return;
            }
            
            await analyzer.saveOutput(directory);
        } catch (error) {
            console.error(chalk.red("Error:"), error.message);
            if (options.debug) {
                console.error(chalk.gray("Stack trace:"), error.stack);
            }
            process.exit(1);
        }
    });

// Add additional commands
program
    .command("init")
    .description("Initialize a .repostrucrc.json configuration file")
    .action(async () => {
        try {
            const exists = await fsPromises.access(CONFIG_FILE).then(() => true).catch(() => false);
            if (exists) {
                console.log(chalk.yellow(`Configuration file ${CONFIG_FILE} already exists.`));
                return;
            }
            
            const defaultConfig = {
                output: "repostruc-output.txt",
                stats: false,
                files: false,
                sizes: false,
                gitignore: true,
                hidden: false,
                depth: null,
                format: "txt",
                groupByType: false,
                timestamps: false,
                permissions: false,
                excludeEmpty: false,
                followSymlinks: false,
                gitStatus: false,
                color: true,
                ignore: [],
                include: [],
                noDefaultPatterns: false
            };
            
            await fsPromises.writeFile(CONFIG_FILE, JSON.stringify(defaultConfig, null, 2));
            console.log(chalk.green(`✓ Created ${CONFIG_FILE} with default configuration`));
        } catch (error) {
            console.error(chalk.red("Error creating config file:"), error.message);
            process.exit(1);
        }
    });

program
    .command("check")
    .description("Check configuration and analyze potential issues")
    .action(async () => {
        try {
            console.log(chalk.blue("Checking repostruc configuration...\n"));
            
            // Check for config file
            if (fs.existsSync(CONFIG_FILE)) {
                console.log(chalk.green("✓"), "Configuration file found:", CONFIG_FILE);
                try {
                    const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
                    console.log(chalk.gray("  Current configuration:"));
                    Object.entries(config).forEach(([key, value]) => {
                        console.log(chalk.gray(`    ${key}:`), value);
                    });
                } catch (error) {
                    console.log(chalk.red("✗"), "Invalid configuration file:", error.message);
                }
            } else {
                console.log(chalk.yellow("!"), "No configuration file found");
            }
            
            // Check for .gitignore
            if (fs.existsSync(".gitignore")) {
                console.log(chalk.green("✓"), ".gitignore file found");
                const gitignoreLines = fs.readFileSync(".gitignore", 'utf8').split('\n').filter(line => line.trim() && !line.startsWith('#'));
                console.log(chalk.gray(`  ${gitignoreLines.length} active patterns`));
            } else {
                console.log(chalk.yellow("!"), "No .gitignore file found");
            }
            
            // Check git repository
            try {
                await execAsync('git status');
                console.log(chalk.green("✓"), "Git repository detected");
            } catch {
                console.log(chalk.yellow("!"), "Not a git repository");
            }
            
            // Check write permissions
            try {
                const testFile = '.repostruc-test-' + Date.now();
                fs.writeFileSync(testFile, '');
                fs.unlinkSync(testFile);
                console.log(chalk.green("✓"), "Write permissions OK");
            } catch {
                console.log(chalk.red("✗"), "No write permissions in current directory");
            }
            
            console.log(chalk.blue("\nAll checks complete!"));
        } catch (error) {
            console.error(chalk.red("Error during check:"), error.message);
            process.exit(1);
        }
    });

program.parse();