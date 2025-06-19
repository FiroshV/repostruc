import fs from "fs";
import { promises as fsPromises } from "fs";
import { CONFIG_FILE, DEFAULT_OUTPUT, DEFAULT_IGNORE, DEFAULT_CONFIG } from "./constants.js";

export class ConfigManager {
    constructor() {
        this.warnings = [];
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

    applyConfiguration(options, config = {}) {
        const result = {
            outputFile: options.output || config.output || DEFAULT_OUTPUT,
            showStats: options.stats !== undefined ? options.stats : (config.stats || false),
            showFiles: options.files !== undefined ? options.files : (config.files || false),
            showSizes: options.sizes !== undefined ? options.sizes : (config.sizes || false),
            useGitignore: options.gitignore !== false && (config.gitignore !== false),
            showHidden: options.hidden || config.hidden || false,
            maxDepth: options.depth || config.depth || Infinity,
            format: options.format || config.format || 'txt',
            groupByType: options.groupByType || config.groupByType || false,
            showTimestamps: options.timestamps || config.timestamps || false,
            showPermissions: options.permissions || config.permissions || false,
            excludeEmpty: options.excludeEmpty || config.excludeEmpty || false,
            followSymlinks: options.followSymlinks || config.followSymlinks || false,
            showGitStatus: options.gitStatus || config.gitStatus || false,
            colorFile: options.colorFile || false,
            colorTerminal: options.color !== false && (config.color !== false),
            hideConfig: config.hideConfig || false,
            file: options.file !== false && (config.file !== false)
        };

        // Handle ignore patterns
        const cliIgnore = options.ignore ? options.ignore.split(",") : [];
        const configIgnore = config.ignore || [];
        result.ignorePatterns = [...new Set([...configIgnore, ...cliIgnore])];
        
        // Add default patterns only if not explicitly disabled
        if (!options.noDefaultPatterns && !config.noDefaultPatterns) {
            result.ignorePatterns.push(...DEFAULT_IGNORE);
        }
        
        // Handle include patterns
        const cliInclude = options.include ? options.include.split(",") : [];
        const configInclude = config.include || [];
        result.includePatterns = [...new Set([...configInclude, ...cliInclude])];
        if (result.includePatterns.length === 0) {
            result.includePatterns = ["**/*"];
        }

        return result;
    }

    async saveConfig(options) {
        const config = {
            output: options.output || DEFAULT_CONFIG.output,
            stats: options.stats || DEFAULT_CONFIG.stats,
            files: options.files || DEFAULT_CONFIG.files,
            sizes: options.sizes || DEFAULT_CONFIG.sizes,
            gitignore: options.gitignore !== false,
            hidden: options.hidden || DEFAULT_CONFIG.hidden,
            depth: options.depth || DEFAULT_CONFIG.depth,
            format: options.format || DEFAULT_CONFIG.format,
            groupByType: options.groupByType || DEFAULT_CONFIG.groupByType,
            timestamps: options.timestamps || DEFAULT_CONFIG.timestamps,
            permissions: options.permissions || DEFAULT_CONFIG.permissions,
            excludeEmpty: options.excludeEmpty || DEFAULT_CONFIG.excludeEmpty,
            followSymlinks: options.followSymlinks || DEFAULT_CONFIG.followSymlinks,
            gitStatus: options.gitStatus || DEFAULT_CONFIG.gitStatus,
            color: options.color !== false,
            ignore: options.ignore ? options.ignore.split(",") : DEFAULT_CONFIG.ignore,
            include: options.include ? options.include.split(",") : DEFAULT_CONFIG.include,
            noDefaultPatterns: options.noDefaultPatterns || DEFAULT_CONFIG.noDefaultPatterns,
            noFile: options.file !== false
        };

        await fsPromises.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2));
    }

    getWarnings() {
        return this.warnings;
    }
}