import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { loadRenviron, validateRenvironConfig, RenvironConfig } from './renviron';

/**
 * The canonical segment name we're looking for (case-sensitive)
 */
const SANDBOX_SEGMENT = 'r_script_sandbox';

/**
 * Sandbox configuration and state
 */
export interface SandboxConfig {
    scriptsPath: string;
    dataPath: string;
    derivedScriptsBase: string;
    isDataPathAvailable: boolean;
    renvironConfig: RenvironConfig;
}

/**
 * Result of sandbox detection
 */
export interface SandboxDetectionResult {
    found: boolean;
    config?: SandboxConfig;
    warnings: string[];
    errors: string[];
}

/**
 * Detects if a workspace folder path contains the r_script_sandbox segment.
 * Uses CASE-SENSITIVE exact segment matching per CLAUDE.md spec.
 *
 * Returns the derived scripts base (path up to and including r_script_sandbox).
 */
export function detectSandboxBase(folderPath: string): string | null {
    // Normalize the path and split into segments
    const normalized = path.normalize(folderPath);
    const segments = normalized.split(path.sep);

    // Find the r_script_sandbox segment (case-sensitive)
    const sandboxIndex = segments.findIndex(seg => seg === SANDBOX_SEGMENT);

    if (sandboxIndex === -1) {
        return null;
    }

    // Derive the base by taking segments up to and including r_script_sandbox
    const baseSegments = segments.slice(0, sandboxIndex + 1);
    const base = baseSegments.join(path.sep);

    // Handle absolute paths on Windows and Unix
    if (path.isAbsolute(normalized)) {
        return base;
    } else {
        // This shouldn't happen with workspace folders, but handle it gracefully
        return path.resolve(base);
    }
}

/**
 * Detects sandbox configuration from workspace folders.
 *
 * Per CLAUDE.md spec:
 * 1. Find a workspace folder with r_script_sandbox segment (case-sensitive)
 * 2. Derive scripts base by truncating at r_script_sandbox (inclusive)
 * 3. Load .Renviron from derived scripts base
 * 4. Validate SCRIPT_PATH from .Renviron matches derived base
 * 5. Check DATA_PATH availability
 */
export function detectSandbox(): SandboxDetectionResult {
    const warnings: string[] = [];
    const errors: string[] = [];

    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
        return {
            found: false,
            warnings,
            errors: ['No workspace folders open'],
        };
    }

    // Search for a folder containing r_script_sandbox
    let derivedBase: string | null = null;
    for (const folder of workspaceFolders) {
        const base = detectSandboxBase(folder.uri.fsPath);
        if (base) {
            derivedBase = base;
            break;
        }
    }

    if (!derivedBase) {
        return {
            found: false,
            warnings,
            errors: ['No workspace folder contains "r_script_sandbox" segment (case-sensitive)'],
        };
    }

    // Load .Renviron from derived base
    let renvironConfig: RenvironConfig;
    try {
        const config = loadRenviron(derivedBase);
        if (!config) {
            return {
                found: false,
                warnings,
                errors: [`.Renviron not found in ${derivedBase}`],
            };
        }
        renvironConfig = config;
    } catch (e) {
        return {
            found: false,
            warnings,
            errors: [`Failed to load .Renviron: ${e instanceof Error ? e.message : String(e)}`],
        };
    }

    // Validate .Renviron config
    const validationErrors = validateRenvironConfig(renvironConfig);
    if (validationErrors.length > 0) {
        return {
            found: false,
            warnings,
            errors: validationErrors,
        };
    }

    // Normalize both paths for comparison
    const normalizedDerived = path.normalize(derivedBase);
    const normalizedScriptPath = path.normalize(renvironConfig.SCRIPT_PATH);

    // Check if SCRIPT_PATH matches derived base
    if (normalizedDerived !== normalizedScriptPath) {
        warnings.push(
            `SCRIPT_PATH from .Renviron (${normalizedScriptPath}) does not match derived base (${normalizedDerived}). Using .Renviron values.`
        );
    }

    // Check DATA_PATH availability
    const isDataPathAvailable = fs.existsSync(renvironConfig.DATA_PATH) &&
        fs.statSync(renvironConfig.DATA_PATH).isDirectory();

    if (!isDataPathAvailable) {
        warnings.push(
            `DATA_PATH (${renvironConfig.DATA_PATH}) is not available or not accessible`
        );
    }

    return {
        found: true,
        config: {
            scriptsPath: renvironConfig.SCRIPT_PATH,
            dataPath: renvironConfig.DATA_PATH,
            derivedScriptsBase: derivedBase,
            isDataPathAvailable,
            renvironConfig,
        },
        warnings,
        errors,
    };
}

/**
 * Determines which sandbox (scripts or data) a given path belongs to.
 * Returns 'scripts', 'data', or null if outside both.
 */
export function determinePathContext(
    filePath: string,
    config: SandboxConfig
): 'scripts' | 'data' | null {
    const normalizedPath = path.normalize(filePath);
    const normalizedScripts = path.normalize(config.scriptsPath);
    const normalizedData = path.normalize(config.dataPath);

    if (normalizedPath.startsWith(normalizedScripts + path.sep) ||
        normalizedPath === normalizedScripts) {
        return 'scripts';
    }

    if (normalizedPath.startsWith(normalizedData + path.sep) ||
        normalizedPath === normalizedData) {
        return 'data';
    }

    return null;
}

/**
 * Computes the relative path from a base to a target.
 * Returns null if target is not within base.
 */
export function getRelativePath(base: string, target: string): string | null {
    const normalizedBase = path.normalize(base);
    const normalizedTarget = path.normalize(target);

    if (!normalizedTarget.startsWith(normalizedBase)) {
        return null;
    }

    const rel = path.relative(normalizedBase, normalizedTarget);

    // Check if the relative path tries to escape (contains ..)
    if (rel.includes('..')) {
        return null;
    }

    return rel;
}

/**
 * Computes the paired path in the opposite sandbox.
 * E.g., scripts/analysis -> data/analysis
 */
export function getPairedPath(
    sourcePath: string,
    config: SandboxConfig
): { pairedPath: string; relativePath: string } | null {
    const context = determinePathContext(sourcePath, config);

    if (context === 'scripts') {
        const rel = getRelativePath(config.scriptsPath, sourcePath);
        if (rel === null) {
            return null;
        }
        return {
            pairedPath: path.join(config.dataPath, rel),
            relativePath: rel,
        };
    } else if (context === 'data') {
        const rel = getRelativePath(config.dataPath, sourcePath);
        if (rel === null) {
            return null;
        }
        return {
            pairedPath: path.join(config.scriptsPath, rel),
            relativePath: rel,
        };
    }

    return null;
}
