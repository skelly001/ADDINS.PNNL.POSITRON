import * as path from 'path';
import * as vscode from 'vscode';
import { SandboxConfig, isDirectory, locate, otherSide, sidePath } from '../config/sandbox';
import { ensurePairedFolders } from '../utils/cli';
import { errorMessage } from '../utils/ui';
import { CommandContext, activeSavedFile, revealInWorkspace } from './context';

/** Folder to start from: the explorer selection if given, else the active file's folder. */
function sourceFolder(selected?: vscode.Uri): string | null {
    if (selected?.scheme === 'file') {
        return isDirectory(selected.fsPath) ? selected.fsPath : path.dirname(selected.fsPath);
    }
    const file = activeSavedFile();
    return file ? path.dirname(file) : null;
}

/**
 * Reveals the folder paired with the selected (or active) one in the
 * explorer, creating the paired folders first if needed.
 */
export async function revealPairedFolder(
    config: SandboxConfig,
    ctx: CommandContext,
    selected?: vscode.Uri
): Promise<void> {
    const { ui } = ctx;

    const source = sourceFolder(selected);
    if (!source) {
        ui.status('warning', 'No saved file or folder to reveal the pair of');
        return;
    }

    const located = locate(source, config);
    if (!located) {
        ui.status('warning', 'Path is outside the sandbox');
        return;
    }

    if (!isDirectory(config.dataPath)) {
        ui.notifyWarning(`DATA_PATH is not available (${config.dataPath}). Nothing revealed.`);
        return;
    }

    const pairedPath = sidePath(config, otherSide(located.side), located.rel);
    try {
        await ensurePairedFolders(ctx.binaryPath, config, located.rel);
        if (await revealInWorkspace(pairedPath)) {
            ui.status('success', `Revealed ${pairedPath}`);
        } else {
            ui.status(
                'warning',
                'Paired folder is not in the workspace. Run "Sandbox: Setup Paired Workspace Folders".'
            );
        }
    } catch (e) {
        ui.status('error', `Could not reveal paired folder: ${errorMessage(e)}`);
    }
}
