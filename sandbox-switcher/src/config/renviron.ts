import * as fs from 'fs';
import * as path from 'path';

/**
 * Sandbox settings read from the project-root .Renviron file.
 * DATA_PATH is required. SCRIPT_PATH is optional because the scripts root is
 * the folder that holds the .Renviron file.
 */
export interface RenvironConfig {
    scriptPath?: string;
    dataPath: string;
}

/**
 * Parses .Renviron content: KEY=VALUE lines with optional quotes around the
 * value. Empty lines, comments and lines without '=' are ignored.
 */
export function parseRenviron(content: string): Map<string, string> {
    const result = new Map<string, string>();

    for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (trimmed.length === 0 || trimmed.startsWith('#')) {
            continue;
        }

        const equalIndex = trimmed.indexOf('=');
        if (equalIndex === -1) {
            continue;
        }

        const key = trimmed.substring(0, equalIndex).trim();
        let value = trimmed.substring(equalIndex + 1).trim();

        const quote = value[0];
        if (value.length >= 2 && (quote === '"' || quote === "'") && value.endsWith(quote)) {
            value = value.substring(1, value.length - 1);
        }

        if (key.length > 0) {
            result.set(key, value);
        }
    }

    return result;
}

/**
 * Loads the sandbox settings from `<basePath>/.Renviron`.
 * Throws an Error with a user-readable message if the file is missing,
 * unreadable, or does not define a usable DATA_PATH.
 */
export function loadRenviron(basePath: string): RenvironConfig {
    const renvironPath = path.join(basePath, '.Renviron');

    let content: string;
    try {
        content = fs.readFileSync(renvironPath, 'utf8');
    } catch (e) {
        const code = (e as NodeJS.ErrnoException).code;
        throw new Error(
            code === 'ENOENT'
                ? `.Renviron not found in ${basePath}`
                : `Cannot read ${renvironPath}: ${(e as Error).message}`
        );
    }

    const env = parseRenviron(content);
    const dataPath = env.get('DATA_PATH');
    const scriptPath = env.get('SCRIPT_PATH') || undefined;

    if (!dataPath) {
        throw new Error(`${renvironPath} must define DATA_PATH`);
    }
    if (!path.isAbsolute(dataPath)) {
        throw new Error(`DATA_PATH must be an absolute path, got: ${dataPath}`);
    }
    if (scriptPath !== undefined && !path.isAbsolute(scriptPath)) {
        throw new Error(`SCRIPT_PATH must be an absolute path, got: ${scriptPath}`);
    }

    return { scriptPath, dataPath };
}
