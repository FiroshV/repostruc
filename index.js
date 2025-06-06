#!/usr/bin/env node

import chalk from "chalk";
import { Command } from "commander";
import { DEFAULT_OUTPUT } from "./src/constants.js";
import { RepoStructure } from "./src/repo-structure.js";
import { initCommand, checkCommand } from "./src/cli-commands.js";

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
                await analyzer.generateConfig();
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
    .action(initCommand);

program
    .command("check")
    .description("Check configuration and analyze potential issues")
    .action(checkCommand);

program.parse();