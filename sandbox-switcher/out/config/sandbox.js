"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectSandboxBase = detectSandboxBase;
exports.detectSandbox = detectSandbox;
exports.determinePathContext = determinePathContext;
exports.getRelativePath = getRelativePath;
exports.getPairedPath = getPairedPath;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const renviron_1 = require("./renviron");
/**
 * The canonical segment name we're looking for (case-sensitive)
 */
const SANDBOX_SEGMENT = 'r_script_sandbox';
/**
 * Check if a segment matches the sandbox pattern.
 * Matches either exact 'r_script_sandbox' or segments starting with 'r_script_sandbox'
 * (e.g., 'r_script_sandbox2', 'r_script_sandbox_test')
 */
function isSandboxSegment(segment) {
    return segment === SANDBOX_SEGMENT || segment.startsWith(SANDBOX_SEGMENT);
}
/**
 * Detects if a workspace folder path contains the r_script_sandbox segment.
 * Uses CASE-SENSITIVE exact segment matching per CLAUDE.md spec.
 *
 * Returns the derived scripts base (path up to and including r_script_sandbox).
 */
function detectSandboxBase(folderPath) {
    // Normalize the path and split into segments
    const normalized = path.normalize(folderPath);
    const segments = normalized.split(path.sep);
    // Find the r_script_sandbox segment (case-sensitive, or starting with r_script_sandbox)
    const sandboxIndex = segments.findIndex(seg => isSandboxSegment(seg));
    if (sandboxIndex === -1) {
        return null;
    }
    // Derive the base by taking segments up to and including r_script_sandbox
    const baseSegments = segments.slice(0, sandboxIndex + 1);
    const base = baseSegments.join(path.sep);
    // Handle absolute paths on Windows and Unix
    if (path.isAbsolute(normalized)) {
        return base;
    }
    else {
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
function detectSandbox() {
    const warnings = [];
    const errors = [];
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
        return {
            found: false,
            warnings,
            errors: ['No workspace folders open'],
        };
    }
    // Search for a folder containing r_script_sandbox
    let derivedBase = null;
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
    let renvironConfig;
    try {
        const config = (0, renviron_1.loadRenviron)(derivedBase);
        if (!config) {
            return {
                found: false,
                warnings,
                errors: [`.Renviron not found in ${derivedBase}`],
            };
        }
        renvironConfig = config;
    }
    catch (e) {
        return {
            found: false,
            warnings,
            errors: [`Failed to load .Renviron: ${e instanceof Error ? e.message : String(e)}`],
        };
    }
    // Validate .Renviron config
    const validationErrors = (0, renviron_1.validateRenvironConfig)(renvironConfig);
    if (validationErrors.length > 0) {
        return {
            found: false,
            warnings,
            errors: validationErrors,
        };
    }
    // Normalize both paths for comparison (case-insensitive on Windows)
    const normalizedDerived = normalizePathForComparison(derivedBase);
    const normalizedScriptPath = normalizePathForComparison(renvironConfig.SCRIPT_PATH);
    // Check if SCRIPT_PATH matches derived base
    if (normalizedDerived !== normalizedScriptPath) {
        warnings.push(`SCRIPT_PATH from .Renviron (${renvironConfig.SCRIPT_PATH}) does not match derived base (${derivedBase}). Using .Renviron values.`);
    }
    // Check DATA_PATH availability
    const isDataPathAvailable = fs.existsSync(renvironConfig.DATA_PATH) &&
        fs.statSync(renvironConfig.DATA_PATH).isDirectory();
    if (!isDataPathAvailable) {
        warnings.push(`DATA_PATH (${renvironConfig.DATA_PATH}) is not available or not accessible`);
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
 * Normalizes a path for comparison, handling case-insensitivity on Windows.
 */
function normalizePathForComparison(p) {
    const normalized = path.normalize(p);
    // On Windows, paths are case-insensitive, so lowercase for comparison
    if (process.platform === 'win32') {
        return normalized.toLowerCase();
    }
    return normalized;
}
/**
 * Determines which sandbox (scripts or data) a given path belongs to.
 * Returns 'scripts', 'data', or null if outside both.
 */
function determinePathContext(filePath, config) {
    const normalizedPath = normalizePathForComparison(filePath);
    const normalizedScripts = normalizePathForComparison(config.scriptsPath);
    const normalizedData = normalizePathForComparison(config.dataPath);
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
function getRelativePath(base, target) {
    const normalizedBase = path.normalize(base);
    const normalizedTarget = path.normalize(target);
    // Use case-insensitive comparison on Windows
    const baseForComparison = normalizePathForComparison(base);
    const targetForComparison = normalizePathForComparison(target);
    if (!targetForComparison.startsWith(baseForComparison)) {
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
function getPairedPath(sourcePath, config) {
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
    }
    else if (context === 'data') {
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
//# sourceMappingURL=sandbox.js.map