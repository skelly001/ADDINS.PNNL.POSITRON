import * as path from 'path';
import * as vscode from 'vscode';
import { SandboxConfig, isDirectory, locate, samePath, sidePath } from '../config/sandbox';
import { ensurePairedFolders } from '../utils/cli';
import { errorMessage } from '../utils/ui';
import { CommandContext } from './context';

interface FolderEntry {
    uri: vscode.Uri;
    name?: string;
}

/**
 * Makes the workspace show the paired folders "Scripts: <folder>" and
 * "Data: <folder>" for the project folder that is open (or for the sandbox
 * roots if the root is open). The Data folder is left out while DATA_PATH is
 * unavailable; run the command again once it is back.
 *
 * This is a manual command because changing workspace folders while the R
 * runtime is starting cancels its startup.
 */
export async function setupWorkspaceFolders(
    config: SandboxConfig,
    ctx: CommandContext
): Promise<void> {
    const { ui } = ctx;
    const current = vscode.workspace.workspaceFolders ?? [];

    // The project folder is the first open folder on the Scripts side.
    let rel = '';
    for (const folder of current) {
        const located = locate(folder.uri.fsPath, config);
        if (located?.side === 'scripts') {
            rel = located.rel;
            break;
        }
    }

    const scriptsTarget = sidePath(config, 'scripts', rel);
    const dataTarget = sidePath(config, 'data', rel);

    const dataAvailable = isDirectory(config.dataPath);
    if (dataAvailable) {
        try {
            await ensurePairedFolders(ctx.binaryPath, config, rel);
        } catch (e) {
            ui.status('error', `Could not create paired folders: ${errorMessage(e)}`);
            return;
        }
    } else {
        ui.notifyWarning(
            `DATA_PATH is not available (${config.dataPath}). Only the Scripts folder was set up.`
        );
    }

    const scriptsEntry: FolderEntry = {
        uri: vscode.Uri.file(scriptsTarget),
        name: `Scripts: ${path.basename(scriptsTarget)}`,
    };
    const dataEntry: FolderEntry = {
        uri: vscode.Uri.file(dataTarget),
        name: `Data: ${path.basename(dataTarget)}`,
    };

    // Keep every other folder as is; put the paired entries in place of any
    // existing ones, or at the end.
    const desired: FolderEntry[] = [];
    let hasScripts = false;
    let hasData = false;
    for (const folder of current) {
        if (samePath(folder.uri.fsPath, scriptsTarget)) {
            if (!hasScripts) {
                desired.push(scriptsEntry);
            }
            hasScripts = true;
        } else if (samePath(folder.uri.fsPath, dataTarget)) {
            if (dataAvailable && !hasData) {
                desired.push(dataEntry);
            }
            hasData = true;
        } else {
            desired.push({ uri: folder.uri, name: folder.name });
        }
    }
    if (!hasScripts) {
        desired.push(scriptsEntry);
    }
    if (!hasData && dataAvailable) {
        desired.push(dataEntry);
    }

    const unchanged =
        desired.length === current.length &&
        desired.every(
            (entry, i) =>
                samePath(entry.uri.fsPath, current[i].uri.fsPath) && entry.name === current[i].name
        );
    if (unchanged) {
        ui.status('success', 'Workspace folders are already set up');
        return;
    }

    // One call only: VS Code rejects back-to-back workspace folder updates.
    const accepted = vscode.workspace.updateWorkspaceFolders(0, current.length, ...desired);
    if (accepted) {
        ui.status('success', `Workspace folders set up for ${rel || 'the sandbox root'}`);
    } else {
        ui.status('error', 'Positron rejected the workspace folder update');
    }
}
