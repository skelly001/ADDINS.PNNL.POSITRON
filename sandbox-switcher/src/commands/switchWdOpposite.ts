import * as path from 'path';
import * as vscode from 'vscode';
import { SandboxConfig, isDirectory } from '../config/sandbox';
import { decideSwitch, setwdCommand } from '../core/switchTarget';
import { ensurePairedFolders } from '../utils/cli';
import { errorMessage } from '../utils/ui';
import { CommandContext, activeSavedFile, revealInWorkspace } from './context';

/**
 * Switches the R working directory to the opposite sandbox for the current
 * project folder (see decideSwitch for how the folder and side are chosen).
 *
 * The paired folders are created first if needed, and the R session is only
 * ever sent a single setwd() call.
 */
export async function switchWdOpposite(config: SandboxConfig, ctx: CommandContext): Promise<void> {
    const { ui } = ctx;

    const decision = decideSwitch({
        config,
        editorFile: activeSavedFile(),
        workspaceFolders: (vscode.workspace.workspaceFolders ?? []).map((f) => f.uri.fsPath),
        memory: ctx.memory,
    });

    if (decision.kind === 'none') {
        ui.status('warning', decision.message);
        return;
    }

    const { rel, side, targetPath } = decision;

    if (isDirectory(config.dataPath)) {
        try {
            await ensurePairedFolders(ctx.binaryPath, config, rel);
        } catch (e) {
            ui.status('error', `Could not create paired folders for ${rel}: ${errorMessage(e)}`);
            return;
        }
    } else if (side === 'data' || !isDirectory(targetPath)) {
        ui.notifyWarning(
            `DATA_PATH is not available (${config.dataPath}). R working directory not changed.`
        );
        return;
    }

    const command = setwdCommand(targetPath);
    try {
        await vscode.commands.executeCommand('workbench.action.executeCode.console', {
            code: command,
            languageId: 'r',
        });
    } catch (e) {
        ui.status('error', `Could not send ${command} to the R console: ${errorMessage(e)}`);
        return;
    }

    ctx.memory.set(rel, side);
    const label = side === 'data' ? 'Data' : 'Scripts';
    ui.status('success', `R working directory → ${label}: ${path.basename(targetPath)}`);
    ui.log(`Sent ${command}`);

    try {
        await revealInWorkspace(targetPath);
    } catch (e) {
        ui.log(`Could not reveal ${targetPath}: ${errorMessage(e)}`);
    }
}
