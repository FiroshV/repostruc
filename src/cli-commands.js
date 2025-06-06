import fs from "fs";
import { promises as fsPromises } from "fs";
import chalk from "chalk";
import { CONFIG_FILE, DEFAULT_CONFIG } from "./constants.js";
import { checkGitRepository } from "./git-utils.js";

export async function initCommand() {
    try {
        const exists = await fsPromises.access(CONFIG_FILE).then(() => true).catch(() => false);
        if (exists) {
            console.log(chalk.yellow(`Configuration file ${CONFIG_FILE} already exists.`));
            return;
        }
        
        await fsPromises.writeFile(CONFIG_FILE, JSON.stringify(DEFAULT_CONFIG, null, 2));
        console.log(chalk.green(`✓ Created ${CONFIG_FILE} with default configuration`));
    } catch (error) {
        console.error(chalk.red("Error creating config file:"), error.message);
        process.exit(1);
    }
}

export async function checkCommand() {
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
        const isGitRepo = await checkGitRepository();
        if (isGitRepo) {
            console.log(chalk.green("✓"), "Git repository detected");
        } else {
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
}