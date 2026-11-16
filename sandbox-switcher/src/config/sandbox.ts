import * as fs from 'fs';
import * as path from 'path';
import { loadRenviron } from './renviron';

/**
 * A folder is the scripts sandbox root if its name starts with this
 * (case-sensitive), e.g. `r_script_sandbox`, `r_script_sandbox2`.
 */
export const SANDBOX_PREFIX = 'r_script_sandbox';

export type Side = 'scripts' | 'data';

/** The two sandbox roots, as clean absolute paths. */
export interface SandboxConfig {
    scriptsPath: string;
    dataPath: string;
}

/** Outcome of looking for a sandbox among the open workspace folders. */
export type Detection =
    | { kind: 'none' }
    | { kind: 'invalid'; base: string; error: string }
    | { kind: 'ok'; config: SandboxConfig; warnings: string[] };

export function otherSide(side: Side): Side {
    return side === 'scripts' ? 'data' : 'scripts';
}

/** Normalizes a path and removes trailing separators (except on a root). */
export function cleanPath(p: string): string {
    const normalized = path.normalize(p);
    const root = path.parse(normalized).root;
    let end = normalized.length;
    while (end > root.length && (normalized[end - 1] === path.sep || normalized[end - 1] === '/')) {
        end--;
    }
    return normalized.substring(0, end);
}

/** Form of a path used for comparisons: case-insensitive on Windows. */
function comparable(p: string): string {
    return process.platform === 'win32' ? p.toLowerCase() : p;
}

/** True if two paths point at the same location after cleaning. */
export function samePath(a: string, b: string): boolean {
    return comparable(cleanPath(a)) === comparable(cleanPath(b));
}

/**
 * Returns `target` relative to `base` ('' if they are the same folder), or
 * null if `target` is not inside `base`.
 */
export function relativeWithin(base: string, target: string): string | null {
    const cleanBase = cleanPath(base);
    const cleanTarget = cleanPath(target);

    if (comparable(cleanTarget) === comparable(cleanBase)) {
        return '';
    }

    const prefix = cleanBase.endsWith(path.sep) ? cleanBase : cleanBase + path.sep;
    if (!comparable(cleanTarget).startsWith(comparable(prefix))) {
        return null;
    }
    return cleanTarget.substring(prefix.length);
}

/** Finds which sandbox a path is in and its path relative to that root. */
export function locate(p: string, config: SandboxConfig): { side: Side; rel: string } | null {
    const scriptsRel = relativeWithin(config.scriptsPath, p);
    if (scriptsRel !== null) {
        return { side: 'scripts', rel: scriptsRel };
    }
    const dataRel = relativeWithin(config.dataPath, p);
    if (dataRel !== null) {
        return { side: 'data', rel: dataRel };
    }
    return null;
}

/** Absolute path of a relative folder on the given side. */
export function sidePath(config: SandboxConfig, side: Side, rel: string): string {
    const root = side === 'scripts' ? config.scriptsPath : config.dataPath;
    return rel ? path.join(root, rel) : root;
}

export function isDirectory(p: string): boolean {
    try {
        return fs.statSync(p).isDirectory();
    } catch {
        return false;
    }
}

/**
 * If a folder path contains a segment starting with `r_script_sandbox`
 * (case-sensitive), returns the path truncated at that segment (inclusive).
 */
export function detectSandboxBase(folderPath: string): string | null {
    const segments = cleanPath(folderPath).split(path.sep);
    const index = segments.findIndex((segment) => segment.startsWith(SANDBOX_PREFIX));
    if (index === -1) {
        return null;
    }
    return segments.slice(0, index + 1).join(path.sep);
}

/**
 * Detects the sandbox from the open workspace folders:
 * the first folder inside an `r_script_sandbox*` folder gives the scripts
 * root, and the .Renviron in that root gives DATA_PATH.
 */
export function detectSandbox(folderPaths: string[]): Detection {
    let base: string | null = null;
    for (const folderPath of folderPaths) {
        base = detectSandboxBase(folderPath);
        if (base) {
            break;
        }
    }
    if (!base) {
        return { kind: 'none' };
    }

    let renviron;
    try {
        renviron = loadRenviron(base);
    } catch (e) {
        return { kind: 'invalid', base, error: e instanceof Error ? e.message : String(e) };
    }

    const warnings: string[] = [];
    let scriptsPath = base;
    if (renviron.scriptPath !== undefined && !samePath(renviron.scriptPath, base)) {
        warnings.push(
            `SCRIPT_PATH in .Renviron (${renviron.scriptPath}) differs from the detected ` +
                `sandbox root (${base}). Using the .Renviron value.`
        );
        scriptsPath = renviron.scriptPath;
    }

    return {
        kind: 'ok',
        config: { scriptsPath: cleanPath(scriptsPath), dataPath: cleanPath(renviron.dataPath) },
        warnings,
    };
}
