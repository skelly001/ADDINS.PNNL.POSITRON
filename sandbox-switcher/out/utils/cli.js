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
exports.findSandboxSyncBinary = findSandboxSyncBinary;
exports.runSyncFull = runSyncFull;
exports.runEnsurePath = runEnsurePath;
const child_process_1 = require("child_process");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
/**
 * Finds the sandbox-sync binary.
 * Looks in:
 * 1. Bundled bin directory (extension/bin/{platform}/sandbox-sync)
 * 2. PATH
 */
function findSandboxSyncBinary(extensionPath) {
    // Determine platform-specific binary name and path
    const platform = process.platform;
    let binaryName = 'sandbox-sync';
    let platformDir = '';
    if (platform === 'win32') {
        binaryName = 'sandbox-sync.exe';
        platformDir = 'win32-x64';
    }
    else if (platform === 'darwin') {
        platformDir = 'darwin-x64';
    }
    else {
        platformDir = 'linux-x64';
    }
    // Check bundled binary
    const bundledPath = path.join(extensionPath, 'bin', platformDir, binaryName);
    if (fs.existsSync(bundledPath)) {
        return bundledPath;
    }
    // Fallback to PATH
    return binaryName; // spawn will search PATH
}
/**
 * Executes sandbox-sync command and returns parsed JSON output
 */
async function executeSandboxSync(binaryPath, args, timeoutMs = 60000) {
    return new Promise((resolve, reject) => {
        const child = (0, child_process_1.spawn)(binaryPath, args);
        let stdout = '';
        let stderr = '';
        child.stdout.on('data', (data) => {
            stdout += data.toString();
        });
        child.stderr.on('data', (data) => {
            stderr += data.toString();
        });
        const timeout = setTimeout(() => {
            child.kill();
            reject(new Error(`Command timed out after ${timeoutMs}ms`));
        }, timeoutMs);
        child.on('close', (code) => {
            clearTimeout(timeout);
            resolve({
                stdout,
                stderr,
                exitCode: code ?? -1,
            });
        });
        child.on('error', (err) => {
            clearTimeout(timeout);
            reject(err);
        });
    });
}
/**
 * Runs sync-full command
 */
async function runSyncFull(binaryPath, scriptsPath, dataPath) {
    const args = [
        'sync-full',
        '--scripts',
        scriptsPath,
        '--data',
        dataPath,
        '--json',
    ];
    const result = await executeSandboxSync(binaryPath, args);
    // Parse JSON output
    try {
        const output = JSON.parse(result.stdout);
        return output;
    }
    catch (e) {
        // JSON parsing failed, return error result
        return {
            ok: false,
            created_in_scripts: 0,
            created_in_data: 0,
            created_total: 0,
            existing_total: 0,
            duration_ms: 0,
            scripts_path: scriptsPath,
            data_path: dataPath,
            warnings: [],
            errors: [
                `Failed to parse JSON output: ${e instanceof Error ? e.message : String(e)}`,
                `stdout: ${result.stdout}`,
                `stderr: ${result.stderr}`,
            ],
        };
    }
}
/**
 * Runs ensure-path command
 */
async function runEnsurePath(binaryPath, scriptsPath, dataPath, relativePath) {
    const args = [
        'ensure-path',
        '--scripts',
        scriptsPath,
        '--data',
        dataPath,
        '--relative',
        relativePath,
        '--json',
    ];
    const result = await executeSandboxSync(binaryPath, args);
    // Parse JSON output
    try {
        const output = JSON.parse(result.stdout);
        return output;
    }
    catch (e) {
        // JSON parsing failed, return error result
        return {
            ok: false,
            ensured_relative: relativePath,
            ensured_scripts_path: path.join(scriptsPath, relativePath),
            ensured_data_path: path.join(dataPath, relativePath),
            created_in_scripts_chain: 0,
            created_in_data_chain: 0,
            duration_ms: 0,
            scripts_path: scriptsPath,
            data_path: dataPath,
            warnings: [],
            errors: [
                `Failed to parse JSON output: ${e instanceof Error ? e.message : String(e)}`,
                `stdout: ${result.stdout}`,
                `stderr: ${result.stderr}`,
            ],
        };
    }
}
//# sourceMappingURL=cli.js.map