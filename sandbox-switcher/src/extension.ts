import * as vscode from 'vscode';
import { SandboxConfig, detectSandbox } from './config/sandbox';
import { SideMemory } from './core/switchTarget';
import { CommandContext } from './commands/context';
import { revealPairedFolder } from './commands/revealPairedFolder';
import { setupWorkspaceFolders } from './commands/setupWorkspaceFolders';
import { switchWdOpposite } from './commands/switchWdOpposite';
import { syncNow } from './commands/syncNow';
import { findSandboxSyncBinary } from './utils/cli';
import { SandboxUI } from './utils/ui';

type SandboxCommand = (config: SandboxConfig, ctx: CommandContext, ...args: any[]) => Promise<void>;

/**
 * Looks for the sandbox among the open workspace folders. The .Renviron is
 * re-read on every call, so edits to it, new workspace folders and a
 * DATA_PATH that comes back are picked up without reloading.
 *
 * - Not in a sandbox: returns null silently (a status bar note if a command
 *   asked).
 * - In a sandbox whose .Renviron is missing or invalid: warns with a popup.
 */
function resolveSandbox(ui: SandboxUI, fromCommand: boolean): SandboxConfig | null {
    const folders = (vscode.workspace.workspaceFolders ?? []).map((f) => f.uri.fsPath);
    const detection = detectSandbox(folders);

    void vscode.commands.executeCommand('setContext', 'sandbox.active', detection.kind === 'ok');

    switch (detection.kind) {
        case 'none':
            if (fromCommand) {
                ui.status('warning', 'Not inside an r_script_sandbox folder');
            }
            return null;
        case 'invalid':
            ui.notifyWarning(`Sandbox Switcher: ${detection.error}`);
            return null;
        case 'ok':
            detection.warnings.forEach((warning) => ui.log(`Warning: ${warning}`));
            return detection.config;
    }
}

export function activate(context: vscode.ExtensionContext) {
    const ui = new SandboxUI();
    const ctx: CommandContext = {
        ui,
        binaryPath: findSandboxSyncBinary(context.extensionPath),
        memory: new SideMemory(),
    };

    const register = (id: string, command: SandboxCommand) =>
        vscode.commands.registerCommand(id, async (...args: unknown[]) => {
            const config = resolveSandbox(ui, true);
            if (config) {
                await command(config, ctx, ...args);
            }
        });

    context.subscriptions.push(
        ui,
        register('sandbox.switchWdOpposite', switchWdOpposite),
        register('sandbox.revealPairedFolder', revealPairedFolder),
        register('sandbox.syncNow', syncNow),
        register('sandbox.setupWorkspaceFolders', setupWorkspaceFolders),
        vscode.workspace.onDidChangeWorkspaceFolders(() => {
            resolveSandbox(ui, false);
        })
    );

    // Workspace folders are never changed here: doing so during activation
    // cancels the R runtime startup in Positron.
    const config = resolveSandbox(ui, false);
    if (config) {
        ui.log(`Sandbox detected. Scripts: ${config.scriptsPath}  Data: ${config.dataPath}`);
        ui.log(`sandbox-sync binary: ${ctx.binaryPath}`);
    } else {
        ui.log('No sandbox detected in the open folders.');
    }
}

export function deactivate() {
    // Everything is disposed through context.subscriptions.
}
