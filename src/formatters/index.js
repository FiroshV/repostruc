import { TextFormatter } from "./text-formatter.js";
import { JSONFormatter } from "./json-formatter.js";
import { MarkdownFormatter } from "./markdown-formatter.js";

export function getFormatter(format, options) {
    switch (format) {
        case 'json':
            return new JSONFormatter(options);
        case 'markdown':
            return new MarkdownFormatter(options);
        case 'txt':
        default:
            return new TextFormatter(options);
    }
}

export { TextFormatter, JSONFormatter, MarkdownFormatter };