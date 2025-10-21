import * as vscode from 'vscode';
import { detectSandbox, SandboxConfig } from './config/sandbox';
import { findSandboxSyncBinary } from './utils/cli';
import { SessionState } from './utils/state';
import { SandboxUI } from './utils/ui';
import { switchWdOpposite } from './commands/switchWdOpposite';
import { revealPairedFolder } from './commands/revealPairedFolder';
import { syncNow as runSyncNow } from './commands/syncNow';

let sandboxConfig: SandboxConfig | null = null;
let binaryPath: string | null = null;
let state: SessionState;
let ui: SandboxUI;

export function activate(context: vscode.ExtensionContext) {
    ui = new SandboxUI();
    state = new SessionState();

    ui.log('Sandbox Switcher extension activating...');

    // Detect sandbox configuration
    const detection = detectSandbox();

    if (!detection.found) {
        // No sandbox detected - log and disable features
        ui.log('Sandbox not detected:');
        detection.errors.forEach((err) => ui.log(`  Error: ${err}`));
        detection.warnings.forEach((warn) => ui.log(`  Warning: ${warn}`));

        // Show a notification if there were errors
        if (detection.errors.length > 0) {
            ui.showWarningNotification(
                'Sandbox Switcher: r_script_sandbox not detected or .Renviron missing/invalid'
            );
        }

        // Register commands but they will show warnings when invoked
        registerCommandsDisabled(context);
        return;
    }

    sandboxConfig = detection.config!;
    ui.log(`Sandbox detected:`);
    ui.log(`  Scripts path: ${sandboxConfig.scriptsPath}`);
    ui.log(`  Data path: ${sandboxConfig.dataPath}`);
    ui.log(`  Data available: ${sandboxConfig.isDataPathAvailable}`);

    // Log warnings
    detection.warnings.forEach((warn) => ui.log(`  Warning: ${warn}`));

    // Find sandbox-sync binary
    binaryPath = findSandboxSyncBinary(context.extensionPath);
    if (!binaryPath) {
        ui.log('Error: sandbox-sync binary not found');
        ui.showErrorNotification(
            'Sandbox Switcher: sandbox-sync binary not found. Please install it in PATH or extension bin directory.'
        );
        registerCommandsDisabled(context);
        return;
    }

    ui.log(`Binary path: ${binaryPath}`);

    // Add workspace roots
    addWorkspaceRoots(sandboxConfig);

    // Register commands
    registerCommands(context);

    ui.log('Sandbox Switcher activated successfully');
}

function registerCommands(context: vscode.ExtensionContext) {
    // switchWdOpposite command
    const switchCmd = vscode.commands.registerCommand('sandbox.switchWdOpposite', async () => {
        if (!sandboxConfig || !binaryPath) {
            ui.showWarning('Sandbox not configured');
            return;
        }
        await switchWdOpposite(sandboxConfig, binaryPath, state, ui);
    });

    // revealPairedFolder command
    const revealCmd = vscode.commands.registerCommand('sandbox.revealPairedFolder', async () => {
        if (!sandboxConfig || !binaryPath) {
            ui.showWarning('Sandbox not configured');
            return;
        }
        await revealPairedFolder(sandboxConfig, binaryPath, state, ui);
    });

    // syncNow command
    const syncCmd = vscode.commands.registerCommand('sandbox.syncNow', async () => {
        if (!sandboxConfig || !binaryPath) {
            ui.showWarning('Sandbox not configured');
            return;
        }
        await runSyncNow(sandboxConfig, binaryPath, ui);
    });

    context.subscriptions.push(switchCmd, revealCmd, syncCmd, state, ui);
}

function registerCommandsDisabled(context: vscode.ExtensionContext) {
    const disabledMsg = 'Sandbox Switcher is disabled: sandbox not detected or configuration invalid';

    const switchCmd = vscode.commands.registerCommand('sandbox.switchWdOpposite', () => {
        ui.showWarningNotification(disabledMsg);
    });

    const revealCmd = vscode.commands.registerCommand('sandbox.revealPairedFolder', () => {
        ui.showWarningNotification(disabledMsg);
    });

    const syncCmd = vscode.commands.registerCommand('sandbox.syncNow', () => {
        ui.showWarningNotification(disabledMsg);
    });

    context.subscriptions.push(switchCmd, revealCmd, syncCmd, state, ui);
}

function addWorkspaceRoots(config: SandboxConfig) {
    const currentFolders = vscode.workspace.workspaceFolders || [];

    // Check if roots are already present
    const hasScripts = currentFolders.some(
        (f) => f.uri.fsPath === config.scriptsPath
    );
    const hasData = currentFolders.some(
        (f) => f.uri.fsPath === config.dataPath
    );

    const foldersToAdd: { uri: vscode.Uri; name?: string }[] = [];

    if (!hasScripts) {
        const scriptsName = `Scripts: ${config.scriptsPath.split('/').pop() || 'r_script_sandbox'}`;
        foldersToAdd.push({
            uri: vscode.Uri.file(config.scriptsPath),
            name: scriptsName,
        });
    }

    if (!hasData && config.isDataPathAvailable) {
        const dataName = `Data: ${config.dataPath.split('/').pop() || 'data_sandbox'}`;
        foldersToAdd.push({
            uri: vscode.Uri.file(config.dataPath),
            name: dataName,
        });
    }

    if (foldersToAdd.length > 0) {
        const startIndex = currentFolders.length;
        vscode.workspace.updateWorkspaceFolders(startIndex, 0, ...foldersToAdd);
        ui.log(`Added ${foldersToAdd.length} workspace root(s)`);
    }
}

export function deactivate() {
    if (ui) {
        ui.dispose();
    }
    if (state) {
        state.dispose();
    }
}
