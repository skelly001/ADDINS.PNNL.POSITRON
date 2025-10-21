import * as vscode from 'vscode';
import * as path from 'path';
import { SandboxConfig, getPairedPath } from '../config/sandbox';
import { runEnsurePath } from '../utils/cli';
import { SessionState } from '../utils/state';
import { SandboxUI } from '../utils/ui';

/**
 * Implements the revealPairedFolder command per CLAUDE.md spec.
 *
 * Computes the paired folder path and reveals it in the explorer.
 * Runs ensure-path to guarantee the paired folder exists.
 */
export async function revealPairedFolder(
    config: SandboxConfig,
    binaryPath: string,
    state: SessionState,
    ui: SandboxUI,
    contextPath?: string
): Promise<void> {
    // Use provided context or get from active editor
    let sourcePath = contextPath;
    if (!sourcePath) {
        const activeEditor = vscode.window.activeTextEditor;
        if (activeEditor) {
            sourcePath = path.dirname(activeEditor.document.uri.fsPath);
        }
    }

    if (!sourcePath) {
        ui.showWarning('No active file or folder');
        return;
    }

    // Get paired path
    const paired = getPairedPath(sourcePath, config);
    if (!paired) {
        ui.showWarning('Path is outside sandbox boundaries');
        ui.log(`revealPairedFolder: ${sourcePath} is outside sandboxes`);
        return;
    }

    const { pairedPath, relativePath } = paired;

    // Ensure the path exists
    if (!state.isPathEnsured(relativePath)) {
        try {
            ui.log(`Ensuring path for reveal: ${relativePath}`);
            const result = await runEnsurePath(
                binaryPath,
                config.scriptsPath,
                config.dataPath,
                relativePath
            );

            if (result.ok) {
                state.markPathEnsured(relativePath);
                ui.log(`Path ensured: ${relativePath}`);
            } else {
                ui.showError(`Failed to ensure path: ${result.errors[0]}`);
                ui.log(`Ensure path failed: ${result.errors.join(', ')}`);
                return;
            }
        } catch (e) {
            ui.showError('Failed to ensure path');
            ui.log(`Ensure path error: ${e instanceof Error ? e.message : String(e)}`);
            return;
        }
    }

    // Reveal in explorer
    try {
        const uri = vscode.Uri.file(pairedPath);
        await vscode.commands.executeCommand('revealInExplorer', uri);
        ui.showSuccess('Revealed paired folder');
        ui.log(`Revealed: ${pairedPath}`);
    } catch (e) {
        ui.showError('Failed to reveal folder');
        ui.log(`Reveal error: ${e instanceof Error ? e.message : String(e)}`);
    }
}
