import fs from "fs";
import { promises as fsPromises } from "fs";
import path from "path";
import fg from "fast-glob";
import ignore from "ignore";
import ora from "ora";
import { getGitStatus } from "./git-utils.js";
import { getFileCategory } from "./utils.js";

export class Analyzer {
    constructor(options) {
        this.options = options;
        this.errors = [];
        this.warnings = [];
        this.ig = ignore();
        this.setupIgnorePatterns();
    }

    setupIgnorePatterns() {
        try {
            // Add .gitignore patterns
            if (this.options.useGitignore && fs.existsSync(".gitignore")) {
                const gitignore = fs.readFileSync(".gitignore", "utf8");
                this.ig.add(gitignore);
            }
            
            // Add custom ignore patterns
            if (this.options.ignorePatterns.length > 0) {
                this.ig.add(this.options.ignorePatterns);
            }
            
            // Add output file to ignore patterns
            this.ig.add(this.options.outputFile);
            
            // Add config file to ignore patterns if requested
            if (this.options.hideConfig) {
                this.ig.add(".repostrucrc.json");
            }
        } catch (error) {
            this.errors.push(`Error setting up ignore patterns: ${error.message}`);
        }
    }

    async analyze(dir = ".") {
        const spinner = ora('Analyzing repository structure...').start();
        
        try {
            // Get git status if requested
            let gitStatus = {};
            if (this.options.showGitStatus) {
                try {
                    gitStatus = await getGitStatus();
                } catch (error) {
                    this.warnings.push(error.message);
                }
            }
            
            const files = await fg(this.options.includePatterns, {
                ignore: this.options.ignorePatterns,
                dot: this.options.showHidden,
                cwd: dir,
                onlyDirectories: false,
                onlyFiles: false,
                followSymbolicLinks: this.options.followSymlinks,
                deep: this.options.maxDepth === Infinity ? Infinity : this.options.maxDepth + 1,
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
                    if (this.options.excludeEmpty && isDirectory) {
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
                        const category = getFileCategory(ext);
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

    getErrors() {
        return this.errors;
    }

    getWarnings() {
        return this.warnings;
    }
}