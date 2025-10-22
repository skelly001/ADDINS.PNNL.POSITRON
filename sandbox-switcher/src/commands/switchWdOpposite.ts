import * as vscode from 'vscode';
import * as path from 'path';
import { SandboxConfig, determinePathContext, getPairedPath } from '../config/sandbox';
import { runEnsurePath } from '../utils/cli';
import { SessionState } from '../utils/state';
import { SandboxUI } from '../utils/ui';

/**
 * Gets the current working directory path for switching.
 * Uses last set working directory from state, or falls back to active editor.
 */
function getCurrentContextPath(state: SessionState): string | null {
    // Use the last working directory we set (tracks R's actual working directory)
    const lastWd = state.getLastWorkingDirectory();
    if (lastWd) {
        return lastWd;
    }

    // Fallback to active editor file on first use
    const activeEditor = vscode.window.activeTextEditor;
    if (activeEditor) {
        const filePath = activeEditor.document.uri.fsPath;
        const dirPath = path.dirname(filePath);
        return dirPath;
    }

    return null;
}

/**
 * Implements the switchWdOpposite command per CLAUDE.md spec.
 *
 * If current context is under SCRIPT_PATH:
 * - Compute relative path
 * - Run ensure-path
 * - Send setwd(DATA_PATH/rel) to R terminal
 * - Reveal paired Data folder
 *
 * If current context is under DATA_PATH:
 * - Compute relative path
 * - Optionally run ensure-path
 * - Send setwd(SCRIPT_PATH/rel) to R terminal
 * - Reveal paired Scripts folder
 */
export async function switchWdOpposite(
    config: SandboxConfig,
    binaryPath: string,
    state: SessionState,
    ui: SandboxUI
): Promise<void> {
    // Get current context
    const contextPath = getCurrentContextPath(state);
    if (!contextPath) {
        ui.showWarning('No active file or folder to switch from');
        ui.log('switchWdOpposite: No context path found');
        return;
    }

    // Determine which sandbox we're in
    const context = determinePathContext(contextPath, config);
    if (context === null) {
        ui.showWarning('Current path is outside sandbox boundaries');
        ui.log(`switchWdOpposite: Path ${contextPath} is outside sandboxes`);
        return;
    }

    // Get the paired path
    const paired = getPairedPath(contextPath, config);
    if (!paired) {
        ui.showError('Failed to compute paired path');
        ui.log(`switchWdOpposite: Could not compute paired path for ${contextPath}`);
        return;
    }

    const { pairedPath, relativePath } = paired;

    ui.log(`switchWdOpposite: Context=${context}, Relative=${relativePath}`);

    // Check if we need to ensure the path
    const needsEnsure = !state.isPathEnsured(relativePath);

    if (needsEnsure) {
        // Run ensure-path with debouncing
        state.debounce(`ensure:${relativePath}`, async () => {
            try {
                ui.log(`Ensuring path: ${relativePath}`);
                const result = await runEnsurePath(
                    binaryPath,
                    config.scriptsPath,
                    config.dataPath,
                    relativePath
                );

                if (result.ok) {
                    state.markPathEnsured(relativePath);
                    ui.log(`Path ensured: ${relativePath} (${result.duration_ms}ms)`);
                } else {
                    ui.log(`Ensure path failed: ${result.errors.join(', ')}`);
                }
            } catch (e) {
                ui.log(`Ensure path error: ${e instanceof Error ? e.message : String(e)}`);
            }
        }, 500);
    }

    // Handle DATA_PATH availability for scripts->data switch
    if (context === 'scripts' && !config.isDataPathAvailable) {
        ui.showWarningNotification(
            'DATA_PATH is not available. Cannot switch to data sandbox.'
        );
        ui.log('switchWdOpposite: DATA_PATH unavailable, aborting switch');
        return;
    }

    // Send setwd command to R console using Positron's executeCode.console
    try {
        // Convert to forward slashes (R prefers this even on Windows)
        const forwardSlashPath = pairedPath.split(path.sep).join('/');
        const command = `setwd("${forwardSlashPath}")`;

        ui.log(`Executing command: ${command}`);

        await vscode.commands.executeCommand('workbench.action.executeCode.console', {
            code: command,
            languageId: 'r'
        });

        // Track the new working directory in state so next switch uses it
        state.setLastWorkingDirectory(pairedPath);

        ui.showSuccess(`Switched to ${context === 'scripts' ? 'data' : 'scripts'} sandbox`);
        ui.log(`setwd sent: ${pairedPath}`);
    } catch (e) {
        ui.showError('Failed to send setwd command');
        ui.log(`setwd error: ${e instanceof Error ? e.message : String(e)}`);
        return;
    }

    // Reveal paired folder in explorer
    try {
        const uri = vscode.Uri.file(pairedPath);
        await vscode.commands.executeCommand('revealInExplorer', uri);
        ui.log(`Revealed in explorer: ${pairedPath}`);
    } catch (e) {
        // Non-critical error
        ui.log(`Failed to reveal in explorer: ${e instanceof Error ? e.message : String(e)}`);
    }
}
