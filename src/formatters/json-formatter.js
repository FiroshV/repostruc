import path from "path";
import { formatPermissions } from "../utils.js";

export class JSONFormatter {
    constructor(options) {
        this.options = options;
    }

    format(analysisResult) {
        const { stats, structureMap, fileInfoMap } = analysisResult;
        
        const jsonOutput = {
            generated: new Date().toISOString(),
            directory: path.resolve(this.options.directory || '.'),
            structure: this.generateJSONStructure(structureMap, fileInfoMap),
            stats: this.options.showStats ? stats : undefined,
            errors: this.options.errors.length > 0 ? this.options.errors : undefined,
            warnings: this.options.warnings.length > 0 ? this.options.warnings : undefined
        };
        
        return JSON.stringify(jsonOutput, null, 2);
    }

    generateJSONStructure(map, fileInfoMap, parentPath = "") {
        const result = {};
        
        map.forEach((subMap, name) => {
            const currentPath = parentPath ? path.join(parentPath, name) : name;
            const fileInfo = fileInfoMap.get(currentPath);
            
            if (subMap.size > 0) {
                result[name] = {
                    type: 'directory',
                    children: this.generateJSONStructure(subMap, fileInfoMap, currentPath)
                };
            } else {
                result[name] = {
                    type: fileInfo && fileInfo.isDirectory ? 'directory' : 'file'
                };
            }
            
            if (fileInfo) {
                if (this.options.showSizes && !fileInfo.isDirectory) {
                    result[name].size = fileInfo.size;
                }
                if (this.options.showTimestamps) {
                    result[name].modified = fileInfo.modified;
                }
                if (this.options.showPermissions) {
                    result[name].permissions = formatPermissions(fileInfo.permissions);
                }
                if (this.options.showGitStatus && fileInfo.gitStatus) {
                    result[name].gitStatus = fileInfo.gitStatus;
                }
            }
        });
        
        return result;
    }
}