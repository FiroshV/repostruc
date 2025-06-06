import { promisify } from "util";
import { exec } from "child_process";
import { GIT_STATUS_MAP } from "./constants.js";

const execAsync = promisify(exec);

export async function getGitStatus() {
    try {
        const { stdout } = await execAsync('git status --porcelain');
        const statusMap = {};
        stdout.split('\n').forEach(line => {
            if (line.trim()) {
                const status = line.substring(0, 2);
                const file = line.substring(3);
                statusMap[file] = parseGitStatus(status);
            }
        });
        return statusMap;
    } catch (error) {
        throw new Error('Git status unavailable: Not a git repository or git not installed');
    }
}

export function parseGitStatus(status) {
    return GIT_STATUS_MAP[status] || 'unknown';
}

export async function checkGitRepository() {
    try {
        await execAsync('git status');
        return true;
    } catch {
        return false;
    }
}