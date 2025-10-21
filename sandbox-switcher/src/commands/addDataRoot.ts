import * as vscode from 'vscode';
import * as fs from 'fs';
import { SandboxConfig } from '../config/sandbox';
import { SandboxUI } from '../utils/ui';

/**
 * Manually adds the Data workspace root.
 * Useful if DATA_PATH wasn't available at extension activation.
 */
export async function addDataRoot(
    config: SandboxConfig,
    ui: SandboxUI
): Promise<void> {
    // Check if DATA_PATH exists now
    if (!fs.existsSync(config.dataPath)) {
        ui.showErrorNotification(
            `DATA_PATH does not exist: ${config.dataPath}`
        );
        ui.log(`addDataRoot: DATA_PATH not found: ${config.dataPath}`);
        return;
    }

    if (!fs.statSync(config.dataPath).isDirectory()) {
        ui.showErrorNotification(
            `DATA_PATH is not a directory: ${config.dataPath}`
        );
        ui.log(`addDataRoot: DATA_PATH is not a directory: ${config.dataPath}`);
        return;
    }

    // Check if already added
    const currentFolders = vscode.workspace.workspaceFolders || [];
    const hasData = currentFolders.some(
        (f) => f.uri.fsPath === config.dataPath
    );

    if (hasData) {
        ui.showInfo('Data workspace root is already added');
        ui.log('addDataRoot: Data root already present');
        return;
    }

    // Add the root
    const dataName = `Data: ${config.dataPath.split(/[/\\]/).pop() || 'data_sandbox'}`;
    const success = vscode.workspace.updateWorkspaceFolders(
        currentFolders.length,
        0,
        {
            uri: vscode.Uri.file(config.dataPath),
            name: dataName,
        }
    );

    if (success) {
        ui.showSuccess('Data workspace root added');
        ui.log(`addDataRoot: Added Data root: ${config.dataPath}`);
    } else {
        ui.showError('Failed to add Data workspace root');
        ui.log('addDataRoot: Failed to add Data root');
    }
}
