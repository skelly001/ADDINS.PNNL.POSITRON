import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Result from sandbox-sync sync-full command
 */
export interface SyncFullResult {
    ok: boolean;
    created_in_scripts: number;
    created_in_data: number;
    created_total: number;
    existing_total: number;
    duration_ms: number;
    scripts_path: string;
    data_path: string;
    warnings: string[];
    errors: string[];
}

/**
 * Result from sandbox-sync ensure-path command
 */
export interface EnsurePathResult {
    ok: boolean;
    ensured_relative: string;
    ensured_scripts_path: string;
    ensured_data_path: string;
    created_in_scripts_chain: number;
    created_in_data_chain: number;
    duration_ms: number;
    scripts_path: string;
    data_path: string;
    warnings: string[];
    errors: string[];
}

/**
 * Finds the sandbox-sync binary.
 * Looks in:
 * 1. Bundled bin directory (extension/bin/{platform}/sandbox-sync)
 * 2. PATH
 */
export function findSandboxSyncBinary(extensionPath: string): string | null {
    // Determine platform-specific binary name and path
    const platform = process.platform;
    let binaryName = 'sandbox-sync';
    let platformDir = '';

    if (platform === 'win32') {
        binaryName = 'sandbox-sync.exe';
        platformDir = 'win32-x64';
    } else if (platform === 'darwin') {
        platformDir = 'darwin-x64';
    } else {
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
async function executeSandboxSync(
    binaryPath: string,
    args: string[],
    timeoutMs: number = 60000
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    return new Promise((resolve, reject) => {
        const child = spawn(binaryPath, args);

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
export async function runSyncFull(
    binaryPath: string,
    scriptsPath: string,
    dataPath: string
): Promise<SyncFullResult> {
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
        const output: SyncFullResult = JSON.parse(result.stdout);
        return output;
    } catch (e) {
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
export async function runEnsurePath(
    binaryPath: string,
    scriptsPath: string,
    dataPath: string,
    relativePath: string
): Promise<EnsurePathResult> {
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
        const output: EnsurePathResult = JSON.parse(result.stdout);
        return output;
    } catch (e) {
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
