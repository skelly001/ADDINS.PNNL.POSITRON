import * as vscode from 'vscode';
import { SideMemory } from '../core/switchTarget';
import { SandboxUI } from '../utils/ui';

/** Things every command needs, created once at activation. */
export interface CommandContext {
    ui: SandboxUI;
    binaryPath: string;
    memory: SideMemory;
}

/** Path of the active editor's file if it is saved on disk, else null. */
export function activeSavedFile(): string | null {
    const document = vscode.window.activeTextEditor?.document;
    if (!document || document.isUntitled || document.uri.scheme !== 'file') {
        return null;
    }
    return document.uri.fsPath;
}

/**
 * Reveals a folder in the explorer if it is inside an open workspace folder.
 * Returns false if it is not (the explorer cannot show it).
 */
export async function revealInWorkspace(folderPath: string): Promise<boolean> {
    const uri = vscode.Uri.file(folderPath);
    if (!vscode.workspace.getWorkspaceFolder(uri)) {
        return false;
    }
    await vscode.commands.executeCommand('revealInExplorer', uri);
    return true;
}
