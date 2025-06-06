import { promises as fsPromises } from "fs";
import path from "path";
import chalk from "chalk";
import stripAnsi from "strip-ansi";
import { ConfigManager } from "./config-manager.js";
import { Analyzer } from "./analyzer.js";
import { getFormatter } from "./formatters/index.js";

export class RepoStructure {
    constructor(options = {}) {
        this.options = options;
        this.configManager = new ConfigManager();
        this.config = this.configManager.loadConfig();
        this.settings = this.configManager.applyConfiguration(options, this.config);
        
        // Pass settings to options for backward compatibility
        Object.assign(this.options, this.settings);
        
        // Initialize warnings array
        this.warnings = this.configManager.getWarnings();
    }

    async analyze(dir) {
        const analyzer = new Analyzer(this.settings);
        const result = await analyzer.analyze(dir);
        
        // Merge errors and warnings
        this.errors = analyzer.getErrors();
        this.warnings = [...this.warnings, ...analyzer.getWarnings()];
        
        return result;
    }

    generateOutputFromAnalysis(analysisResult) {
        // Pass errors and warnings to formatter options
        const formatterOptions = {
            ...this.settings,
            errors: this.errors || [],
            warnings: this.warnings || [],
            directory: this.options.directory,
            colorOutput: this.settings.colorFile || this.settings.colorTerminal
        };
        
        const formatter = getFormatter(this.settings.format, formatterOptions);
        return formatter.format(analysisResult);
    }

    async saveOutput(dir) {
        try {
            // Analyze only once
            const analysisResult = await this.analyze(dir);
            
            // Generate output without colors for file
            const originalColorOutput = this.settings.colorFile;
            this.settings.colorFile = false;
            this.settings.colorOutput = false;
            const fileOutput = this.generateOutputFromAnalysis(analysisResult);
            
            // Ensure output directory exists
            const outputDir = path.dirname(this.settings.outputFile);
            if (outputDir && outputDir !== '.' && outputDir !== '') {
                await fsPromises.mkdir(outputDir, { recursive: true });
            }
            
            // Save to file
            await fsPromises.writeFile(this.settings.outputFile, stripAnsi(fileOutput), 'utf8');
            
            // Generate colored output for terminal if not explicitly disabled
            if (!this.options || this.options.print !== false) {
                this.settings.colorOutput = this.settings.colorTerminal;
                const terminalOutput = this.generateOutputFromAnalysis(analysisResult);
                
                // Print to terminal
                console.log('\n' + terminalOutput);
            }
            
            // Print save confirmation
            if (this.settings.colorTerminal) {
                console.log(chalk.green(`✓ Structure saved to ${this.settings.outputFile}`));
                
                if (this.errors && this.errors.length > 0) {
                    console.log(chalk.yellow(`⚠ ${this.errors.length} errors occurred during analysis`));
                }
                
                if (this.warnings && this.warnings.length > 0) {
                    console.log(chalk.yellow(`ℹ ${this.warnings.length} warnings during analysis`));
                }
            } else {
                console.log(`Structure saved to ${this.settings.outputFile}`);
            }
        } catch (error) {
            console.error(chalk.red(`Error saving output: ${error.message}`));
            throw error;
        }
    }

    async generateConfig() {
        await this.configManager.saveConfig(this.options);
        console.log(chalk.green(`✓ Configuration saved to .repostrucrc.json`));
    }
}