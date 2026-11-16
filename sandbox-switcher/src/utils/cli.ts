import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { SandboxConfig, isDirectory, sidePath } from '../config/sandbox';

/** Result from `sandbox-sync sync-full --json` */
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

/** Result from `sandbox-sync ensure-path --json` */
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
 * Finds the sandbox-sync binary: the copy bundled with the extension for this
 * platform and architecture (bin/<platform>-<arch>/), otherwise the bare
 * name, which is resolved through PATH when run.
 */
export function findSandboxSyncBinary(extensionPath: string): string {
    const binaryName = process.platform === 'win32' ? 'sandbox-sync.exe' : 'sandbox-sync';
    const bundled = path.join(
        extensionPath,
        'bin',
        `${process.platform}-${process.arch}`,
        binaryName
    );

    if (fs.existsSync(bundled)) {
        if (process.platform !== 'win32') {
            // Extension packaging can drop the executable bit.
            try {
                fs.chmodSync(bundled, 0o755);
            } catch {
                // Not fatal: the file may already be executable.
            }
        }
        return bundled;
    }

    return binaryName;
}

/** Runs sandbox-sync with `--json` and returns its parsed output. */
function runJson<T>(binaryPath: string, args: string[], timeoutMs = 60000): Promise<T> {
    return new Promise((resolve, reject) => {
        const child = spawn(binaryPath, [...args, '--json']);
        let stdout = '';
        let stderr = '';

        child.stdout.on('data', (data) => (stdout += data.toString()));
        child.stderr.on('data', (data) => (stderr += data.toString()));

        const timeout = setTimeout(() => {
            child.kill();
            reject(new Error(`sandbox-sync timed out after ${timeoutMs}ms`));
        }, timeoutMs);

        child.on('error', (err) => {
            clearTimeout(timeout);
            const notFound = (err as NodeJS.ErrnoException).code === 'ENOENT';
            reject(
                notFound
                    ? new Error(
                          `sandbox-sync binary not found (${binaryPath}). ` +
                              'Install it on PATH or in the extension bin folder.'
                      )
                    : err
            );
        });

        child.on('close', (code) => {
            clearTimeout(timeout);
            try {
                resolve(JSON.parse(stdout) as T);
            } catch {
                reject(
                    new Error(
                        `sandbox-sync exited with code ${code} and no JSON output. ` +
                            `stderr: ${stderr.trim() || '(empty)'}`
                    )
                );
            }
        });
    });
}

function baseArgs(config: SandboxConfig): string[] {
    return ['--scripts', config.scriptsPath, '--data', config.dataPath];
}

export function runSyncFull(binaryPath: string, config: SandboxConfig): Promise<SyncFullResult> {
    return runJson(binaryPath, ['sync-full', ...baseArgs(config)]);
}

/**
 * Makes sure a relative folder exists on both sides (the "micro-sync").
 * Does nothing if both folders are already there. Throws if it fails.
 */
export async function ensurePairedFolders(
    binaryPath: string,
    config: SandboxConfig,
    rel: string
): Promise<void> {
    if (isDirectory(sidePath(config, 'scripts', rel)) && isDirectory(sidePath(config, 'data', rel))) {
        return;
    }

    const result = await runJson<EnsurePathResult>(binaryPath, [
        'ensure-path',
        ...baseArgs(config),
        '--relative',
        rel,
    ]);
    if (!result.ok) {
        throw new Error(result.errors.join('; ') || 'ensure-path failed');
    }
}
