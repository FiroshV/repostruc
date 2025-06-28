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
        this.settings = this.configManager.applyConfiguration(
            options,
            this.config
        );

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
            colorOutput: this.settings.colorFile || this.settings.colorTerminal,
        };

        const formatter = getFormatter(this.settings.format, formatterOptions);
        return formatter.format(analysisResult);
    }

    async printOutput(dir) {
        try {
            const analysisResult = await this.analyze(dir);
            this.settings.colorOutput = this.settings.colorTerminal;
            const terminalOutput =
                this.generateOutputFromAnalysis(analysisResult);

            // Print to terminal
            console.log("\n" + terminalOutput);

            // Print completion message to STDERR - THIS IS THE KEY CHANGE
            if (this.settings.colorTerminal) {
                console.error(chalk.green(`✓ Structure analysis complete`));

                if (this.errors && this.errors.length > 0) {
                    console.error(
                        chalk.yellow(
                            `⚠ ${this.errors.length} errors occurred during analysis`
                        )
                    );
                }

                if (this.warnings && this.warnings.length > 0) {
                    console.error(
                        chalk.yellow(
                            `ℹ ${this.warnings.length} warnings during analysis`
                        )
                    );
                }
            } else {
                console.error(`Structure analysis complete`);
            }
        } catch (error) {
            console.error(chalk.red(`Error during analysis: ${error.message}`));
            throw error;
        }
    }

    async saveOutput(dir) {
        try {
            // Analyze only once
            const analysisResult = await this.analyze(dir);

            // Generate output without colors for file
            this.settings.colorFile = false;
            this.settings.colorOutput = false;
            const fileOutput = this.generateOutputFromAnalysis(analysisResult);

            // Ensure output directory exists
            const outputDir = path.dirname(this.settings.outputFile);
            if (outputDir && outputDir !== "." && outputDir !== "") {
                await fsPromises.mkdir(outputDir, { recursive: true });
            }

            // Save to file FIRST
            await fsPromises.writeFile(
                this.settings.outputFile,
                stripAnsi(fileOutput),
                "utf8"
            );

            // Generate colored output for terminal if not explicitly disabled
            if (!this.options || this.options.print !== false) {
                this.settings.colorOutput = this.settings.colorTerminal;
                const terminalOutput =
                    this.generateOutputFromAnalysis(analysisResult);

                // Print to terminal and WAIT for it to complete
                process.stdout.write("\n" + terminalOutput);

                // Force flush stdout before writing status to stderr
                await new Promise((resolve) =>
                    process.stdout.write("", resolve)
                );
            }

            // NOW print status messages to stderr AFTER stdout is flushed
            setImmediate(() => {
                if (this.settings.colorTerminal) {
                    process.stderr.write(
                        chalk.green(
                            `\n✓ Structure saved to ${this.settings.outputFile}\n`
                        )
                    );

                    if (this.errors && this.errors.length > 0) {
                        process.stderr.write(
                            chalk.yellow(
                                `⚠ ${this.errors.length} errors occurred during analysis`
                            ) + "\n"
                        );
                    }

                    if (this.warnings && this.warnings.length > 0) {
                        process.stderr.write(
                            chalk.yellow(
                                `ℹ ${this.warnings.length} warnings during analysis`
                            ) + "\n"
                        );
                    }
                } else {
                    process.stderr.write(
                        `\nStructure saved to ${this.settings.outputFile}\n`
                    );
                }
            });
        } catch (error) {
            process.stderr.write(
                chalk.red(`Error saving output: ${error.message}`) + "\n"
            );
            throw error;
        }
    }

    async generateConfig() {
        await this.configManager.saveConfig(this.options);
        console.log(chalk.green(`✓ Configuration saved to .repostrucrc.json`));
    }
}
