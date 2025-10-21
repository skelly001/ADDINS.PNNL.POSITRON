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
exports.parseRenviron = parseRenviron;
exports.loadRenviron = loadRenviron;
exports.validateRenvironConfig = validateRenvironConfig;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
/**
 * Parses a .Renviron file according to the CLAUDE.md spec:
 * - Simple KEY=VALUE format
 * - Optional quotes around values
 * - Ignores empty lines and comments (lines starting with #)
 * - Trims whitespace
 * - Preserves UTF-8
 */
function parseRenviron(content) {
    const result = new Map();
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
function loadRenviron(basePath) {
    const renvironPath = path.join(basePath, '.Renviron');
    if (!fs.existsSync(renvironPath)) {
        return null;
    }
    const content = fs.readFileSync(renvironPath, 'utf8');
    const env = parseRenviron(content);
    const scriptPath = env.get('SCRIPT_PATH');
    const dataPath = env.get('DATA_PATH');
    if (!scriptPath || !dataPath) {
        throw new Error('.Renviron is missing required keys. Both SCRIPT_PATH and DATA_PATH must be defined.');
    }
    // Build result object
    const config = {
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
function validateRenvironConfig(config) {
    const errors = [];
    if (!path.isAbsolute(config.SCRIPT_PATH)) {
        errors.push(`SCRIPT_PATH must be an absolute path, got: ${config.SCRIPT_PATH}`);
    }
    if (!path.isAbsolute(config.DATA_PATH)) {
        errors.push(`DATA_PATH must be an absolute path, got: ${config.DATA_PATH}`);
    }
    return errors;
}
//# sourceMappingURL=renviron.js.map