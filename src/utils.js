import path from "path";
import { FILE_CATEGORIES } from "./constants.js";

export function getFileCategory(extension) {
    for (const [category, extensions] of Object.entries(FILE_CATEGORIES)) {
        if (extensions.includes(extension.toLowerCase())) {
            return category;
        }
    }
    return 'other';
}

export function formatBytes(bytes) {
    const units = ["B", "KB", "MB", "GB", "TB"];
    let size = bytes;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024;
        unitIndex++;
    }
    return `${size.toFixed(2)} ${units[unitIndex]}`;
}

export function formatPermissions(mode) {
    const perms = (mode & parseInt('777', 8)).toString(8);
    return perms.padStart(3, '0');
}

export function formatTimestamp(date) {
    return date.toISOString().split('T')[0];
}

export function sortEntries(entries, fileInfoMap, parentPath) {
    return entries.sort(([nameA, subMapA], [nameB, subMapB]) => {
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
}