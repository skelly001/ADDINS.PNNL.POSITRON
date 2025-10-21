import * as fs from 'fs';
import * as path from 'path';

/**
 * Configuration loaded from .Renviron file
 */
export interface RenvironConfig {
    SCRIPT_PATH: string;
    DATA_PATH: string;
    [key: string]: string;
}

/**
 * Parses a .Renviron file according to the CLAUDE.md spec:
 * - Simple KEY=VALUE format
 * - Optional quotes around values
 * - Ignores empty lines and comments (lines starting with #)
 * - Trims whitespace
 * - Preserves UTF-8
 */
export function parseRenviron(content: string): Map<string, string> {
    const result = new Map<string, string>();
    const lines = content.split('\n');

    for (const line of lines) {
        // Trim whitespace
        const trimmed = line.trim();

        // Skip empty lines
        if (trimmed.length === 0) {
            continue;
        }

        // Skip comments
        if (trimmed.startsWith('#')) {
            continue;
        }

        // Parse KEY=VALUE
        const equalIndex = trimmed.indexOf('=');
        if (equalIndex === -1) {
            // Invalid line, skip it
            continue;
        }

        const key = trimmed.substring(0, equalIndex).trim();
        let value = trimmed.substring(equalIndex + 1).trim();

        // Remove surrounding quotes if present
        if (value.length >= 2) {
            if ((value.startsWith('"') && value.endsWith('"')) ||
                (value.startsWith("'") && value.endsWith("'"))) {
                value = value.substring(1, value.length - 1);
            }
        }

        if (key.length > 0) {
            result.set(key, value);
        }
    }

    return result;
}

/**
 * Loads and parses a .Renviron file from the given directory.
 * Returns null if the file doesn't exist.
 * Throws an error if the file exists but can't be read.
 */
export function loadRenviron(basePath: string): RenvironConfig | null {
    const renvironPath = path.join(basePath, '.Renviron');

    if (!fs.existsSync(renvironPath)) {
        return null;
    }

    const content = fs.readFileSync(renvironPath, 'utf8');
    const env = parseRenviron(content);

    const scriptPath = env.get('SCRIPT_PATH');
    const dataPath = env.get('DATA_PATH');

    if (!scriptPath || !dataPath) {
        throw new Error(
            '.Renviron is missing required keys. Both SCRIPT_PATH and DATA_PATH must be defined.'
        );
    }

    // Build result object
    const config: RenvironConfig = {
        SCRIPT_PATH: scriptPath,
        DATA_PATH: dataPath,
    };

    // Include any other keys that were found
    env.forEach((value, key) => {
        if (key !== 'SCRIPT_PATH' && key !== 'DATA_PATH') {
            config[key] = value;
        }
    });

    return config;
}

/**
 * Validates that the SCRIPT_PATH and DATA_PATH are absolute paths.
 */
export function validateRenvironConfig(config: RenvironConfig): string[] {
    const errors: string[] = [];

    if (!path.isAbsolute(config.SCRIPT_PATH)) {
        errors.push(`SCRIPT_PATH must be an absolute path, got: ${config.SCRIPT_PATH}`);
    }

    if (!path.isAbsolute(config.DATA_PATH)) {
        errors.push(`DATA_PATH must be an absolute path, got: ${config.DATA_PATH}`);
    }

    return errors;
}
