import path from "path";
import chalk from "chalk";
import { TREE_CHARS } from "../constants.js";
import { getFileCategory, formatBytes, formatTimestamp, formatPermissions, sortEntries } from "../utils.js";

export class TextFormatter {
    constructor(options) {
        this.options = options;
    }

    format(analysisResult) {
        const { files, stats, structureMap, fileInfoMap, gitStatus } = analysisResult;
        let output = "";

        // Simple format if no extra options are enabled
        const simpleFormat = !this.options.showStats && !this.options.showFiles && !this.options.showSizes && 
                           !this.options.showTimestamps && !this.options.showPermissions && !this.options.showGitStatus;
        
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
            if (this.options.showStats) {
                output += this.generateStats(stats);
            }

            // Optional File List
            if (this.options.showFiles) {
                output += this.generateFileList(files, fileInfoMap);
            }

            // Errors and Warnings
            if (this.options.errors.length > 0 || this.options.warnings.length > 0) {
                output += this.generateIssues(this.options.errors, this.options.warnings);
            }
        }

        return output;
    }

    generateSimpleStructureText(map, fileInfoMap, prefix = "", parentPath = "") {
        let output = "";
        const entries = Array.from(map.entries());
        
        const sortedEntries = sortEntries(entries, fileInfoMap, parentPath);

        sortedEntries.forEach(([name, subMap], index) => {
            const isLast = index === entries.length - 1;
            const branch = isLast ? TREE_CHARS.LAST_BRANCH : TREE_CHARS.BRANCH;
            const newPrefix = prefix + (isLast ? TREE_CHARS.SPACE : TREE_CHARS.PIPE);
            const currentPath = parentPath ? path.join(parentPath, name) : name;

            output += `${prefix}${branch}${name}\n`;
            
            if (subMap.size > 0) {
                const depth = currentPath.split('/').length;
                if (depth < this.options.maxDepth) {
                    output += this.generateSimpleStructureText(subMap, fileInfoMap, newPrefix, currentPath);
                }
            }
        });

        return output;
    }

    generateStructureText(map, fileInfoMap, prefix = "", parentPath = "") {
        let output = "";
        const entries = Array.from(map.entries());
        
        const sortedEntries = sortEntries(entries, fileInfoMap, parentPath);

        sortedEntries.forEach(([name, subMap], index) => {
            const isLast = index === entries.length - 1;
            const branch = isLast ? TREE_CHARS.LAST_BRANCH : TREE_CHARS.BRANCH;
            const newPrefix = prefix + (isLast ? TREE_CHARS.SPACE : TREE_CHARS.PIPE);
            const currentPath = parentPath ? path.join(parentPath, name) : name;
            const fileInfo = fileInfoMap.get(currentPath);
            
            let displayName = this.getColorForFile(name, fileInfo || {});
            
            // Add additional info based on options
            const extras = [];
            
            if (this.options.showSizes && fileInfo && !fileInfo.isDirectory) {
                extras.push(chalk.gray(`(${formatBytes(fileInfo.size)})`));
            }
            
            if (this.options.showTimestamps && fileInfo) {
                extras.push(chalk.gray(`[${formatTimestamp(fileInfo.modified)}]`));
            }
            
            if (this.options.showPermissions && fileInfo) {
                extras.push(chalk.gray(`<${formatPermissions(fileInfo.permissions)}>`));
            }
            
            if (this.options.showGitStatus && fileInfo && fileInfo.gitStatus) {
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
                if (depth < this.options.maxDepth) {
                    output += this.generateStructureText(subMap, fileInfoMap, newPrefix, currentPath);
                } else if (depth === this.options.maxDepth) {
                    output += `${newPrefix}${TREE_CHARS.BRANCH}${chalk.gray('...')}\n`;
                }
            }
        });

        return output;
    }

    getColorForFile(name, fileInfo) {
        if (!this.options.colorOutput || !name || typeof name !== 'string') return name || '';
        
        if (fileInfo && fileInfo.isDirectory) return chalk.blue.bold(name);
        if (fileInfo && fileInfo.isSymlink) return chalk.magenta(name);
        
        const ext = path.extname(name);
        const category = getFileCategory(ext);
        
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

    generateStats(stats) {
        let output = "Statistics:\n";
        output += "=".repeat(60) + "\n";
        output += `Total Files: ${stats.totalFiles}\n`;
        output += `Total Directories: ${stats.totalDirs}\n`;
        output += `Total Size: ${formatBytes(stats.totalSize)}\n\n`;

        if (Object.keys(stats.byCategory).length > 0) {
            output += "Files by Category:\n";
            output += "-".repeat(40) + "\n";
            Object.entries(stats.byCategory)
                .sort(([, a], [, b]) => b.count - a.count)
                .forEach(([category, data]) => {
                    output += `${category}: ${data.count} files (${formatBytes(data.size)})\n`;
                });
            output += "\n";
        }

        output += "Files by Extension:\n";
        output += "-".repeat(40) + "\n";
        Object.entries(stats.byExtension)
            .sort(([, a], [, b]) => b.count - a.count)
            .slice(0, 15) // Show top 15 extensions
            .forEach(([ext, data]) => {
                output += `${ext}: ${data.count} files (${formatBytes(data.size)})\n`;
            });
        output += "\n";

        if (stats.largestFiles.length > 0) {
            output += "Largest Files:\n";
            output += "-".repeat(40) + "\n";
            stats.largestFiles.forEach(file => {
                output += `${file.path} (${formatBytes(file.size)})\n`;
            });
            output += "\n";
        }

        return output;
    }

    generateFileList(files, fileInfoMap) {
        let output = "File List:\n";
        output += "=".repeat(60) + "\n";
        
        if (this.options.groupByType) {
            const filesByCategory = {};
            files.forEach(file => {
                const fileInfo = fileInfoMap.get(file);
                if (fileInfo && !fileInfo.isDirectory) {
                    const ext = path.extname(file);
                    const category = getFileCategory(ext);
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
                        const size = this.options.showSizes && fileInfo ? ` (${formatBytes(fileInfo.size)})` : "";
                        output += `${file}${size}\n`;
                    });
                });
        } else {
            files.sort().forEach(file => {
                const fileInfo = fileInfoMap.get(file);
                if (fileInfo && !fileInfo.isDirectory) {
                    const size = this.options.showSizes ? ` (${formatBytes(fileInfo.size)})` : "";
                    const timestamp = this.options.showTimestamps ? ` [${formatTimestamp(fileInfo.modified)}]` : "";
                    output += `${file}${size}${timestamp}\n`;
                }
            });
        }

        return output;
    }

    generateIssues(errors, warnings) {
        let output = "\nIssues:\n";
        output += "=".repeat(60) + "\n";
        
        if (errors.length > 0) {
            output += `Errors (${errors.length}):\n`;
            errors.forEach(error => {
                output += `  - ${error}\n`;
            });
        }
        
        if (warnings.length > 0) {
            output += `\nWarnings (${warnings.length}):\n`;
            warnings.forEach(warning => {
                output += `  - ${warning}\n`;
            });
        }

        return output;
    }
}