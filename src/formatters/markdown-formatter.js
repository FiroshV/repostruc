import path from "path";
import { formatBytes, sortEntries } from "../utils.js";

export class MarkdownFormatter {
    constructor(options) {
        this.options = options;
    }

    format(analysisResult) {
        const { stats, structureMap, fileInfoMap } = analysisResult;
        let output = "";

        output += `# Repository Structure\n\n`;
        output += `Generated on: ${new Date().toISOString()}\n\n`;
        output += `## Directory Tree\n\n`;
        output += this.generateMarkdownStructure(structureMap, fileInfoMap);
        
        if (this.options.showStats) {
            output += `\n## Statistics\n\n`;
            output += `- **Total Files**: ${stats.totalFiles}\n`;
            output += `- **Total Directories**: ${stats.totalDirs}\n`;
            output += `- **Total Size**: ${formatBytes(stats.totalSize)}\n\n`;
            
            if (Object.keys(stats.byCategory).length > 0) {
                output += `### Files by Category\n\n`;
                Object.entries(stats.byCategory)
                    .sort(([, a], [, b]) => b.count - a.count)
                    .forEach(([category, data]) => {
                        output += `- **${category}**: ${data.count} files (${formatBytes(data.size)})\n`;
                    });
                output += "\n";
            }

            if (Object.keys(stats.byExtension).length > 0) {
                output += `### Top File Extensions\n\n`;
                Object.entries(stats.byExtension)
                    .sort(([, a], [, b]) => b.count - a.count)
                    .slice(0, 10)
                    .forEach(([ext, data]) => {
                        output += `- **${ext}**: ${data.count} files (${formatBytes(data.size)})\n`;
                    });
                output += "\n";
            }

            if (stats.largestFiles.length > 0) {
                output += `### Largest Files\n\n`;
                output += "| File | Size |\n";
                output += "|------|------|\n";
                stats.largestFiles.forEach(file => {
                    output += `| ${file.path} | ${formatBytes(file.size)} |\n`;
                });
                output += "\n";
            }
        }

        if (this.options.errors.length > 0 || this.options.warnings.length > 0) {
            output += `## Issues\n\n`;
            
            if (this.options.errors.length > 0) {
                output += `### Errors (${this.options.errors.length})\n\n`;
                this.options.errors.forEach(error => {
                    output += `- ${error}\n`;
                });
                output += "\n";
            }
            
            if (this.options.warnings.length > 0) {
                output += `### Warnings (${this.options.warnings.length})\n\n`;
                this.options.warnings.forEach(warning => {
                    output += `- ${warning}\n`;
                });
                output += "\n";
            }
        }
        
        return output;
    }

    generateMarkdownStructure(map, fileInfoMap, level = 0, parentPath = "") {
        let output = "";
        const entries = Array.from(map.entries());
        
        const sortedEntries = sortEntries(entries, fileInfoMap, parentPath);

        sortedEntries.forEach(([name, subMap]) => {
            const currentPath = parentPath ? path.join(parentPath, name) : name;
            const fileInfo = fileInfoMap.get(currentPath);
            const indent = "  ".repeat(level);
            
            let displayName = name;
            if (fileInfo && fileInfo.isDirectory) {
                displayName = `**${name}/**`;
            }
            
            output += `${indent}- ${displayName}`;
            
            // Add additional info based on options
            const extras = [];
            
            if (this.options.showSizes && fileInfo && !fileInfo.isDirectory) {
                extras.push(`*${formatBytes(fileInfo.size)}*`);
            }
            
            if (this.options.showTimestamps && fileInfo) {
                const timestamp = fileInfo.modified.toISOString().split('T')[0];
                extras.push(`\`${timestamp}\``);
            }
            
            if (this.options.showGitStatus && fileInfo && fileInfo.gitStatus) {
                const statusBadge = this.getGitStatusBadge(fileInfo.gitStatus);
                extras.push(statusBadge);
            }
            
            if (fileInfo && fileInfo.isSymlink) {
                extras.push('`→ symlink`');
            }
            
            if (extras.length > 0) {
                output += ' ' + extras.join(' ');
            }
            
            output += '\n';
            
            if (subMap.size > 0) {
                const depth = currentPath.split('/').length;
                if (depth < this.options.maxDepth) {
                    output += this.generateMarkdownStructure(subMap, fileInfoMap, level + 1, currentPath);
                } else if (depth === this.options.maxDepth) {
                    output += `${indent}  - *...*\n`;
                }
            }
        });

        return output;
    }

    getGitStatusBadge(status) {
        const badges = {
            modified: '`[M]`',
            added: '`[A]`',
            deleted: '`[D]`',
            untracked: '`[?]`',
            renamed: '`[R]`'
        };
        return badges[status] || '`[?]`';
    }
}