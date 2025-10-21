import * as vscode from 'vscode';
import * as path from 'path';
import { detectSandbox, SandboxConfig } from './config/sandbox';
import { findSandboxSyncBinary } from './utils/cli';
import { SessionState } from './utils/state';
import { SandboxUI } from './utils/ui';
import { switchWdOpposite } from './commands/switchWdOpposite';
import { revealPairedFolder } from './commands/revealPairedFolder';
import { syncNow as runSyncNow } from './commands/syncNow';
import { addDataRoot } from './commands/addDataRoot';

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

    // Register commands
    registerCommands(context);

    // Automatically setup workspace folders for any folder in r_script_sandbox (including root)
    const currentFolders = vscode.workspace.workspaceFolders || [];

    // Check if any current folder is within SCRIPT_PATH (including the base itself)
    for (const folder of currentFolders) {
        const normalized = path.normalize(folder.uri.fsPath);
        const scriptsNormalized = path.normalize(sandboxConfig.scriptsPath);
        const normalizedLower = process.platform === 'win32' ? normalized.toLowerCase() : normalized;
        const scriptsNormalizedLower = process.platform === 'win32' ? scriptsNormalized.toLowerCase() : scriptsNormalized;

        // Check if this folder is within or is SCRIPT_PATH
        const isWithinScripts = normalizedLower === scriptsNormalizedLower ||
                                normalizedLower.startsWith(scriptsNormalizedLower + path.sep);

        if (isWithinScripts) {
            ui.log('Detected folder within r_script_sandbox, automatically setting up paired workspace folders');
            addWorkspaceRoots(sandboxConfig);
            break;
        }
    }

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

    // addDataRoot command
    const addDataCmd = vscode.commands.registerCommand('sandbox.addDataRoot', async () => {
        if (!sandboxConfig) {
            ui.showWarning('Sandbox not configured');
            return;
        }
        await addDataRoot(sandboxConfig, ui);
    });

    // setupWorkspaceFolders command - manually add paired workspace folders
    const setupWorkspaceCmd = vscode.commands.registerCommand('sandbox.setupWorkspaceFolders', async () => {
        if (!sandboxConfig) {
            ui.showWarning('Sandbox not configured');
            return;
        }
        addWorkspaceRoots(sandboxConfig);
        ui.showInfo('Workspace folders have been set up');
    });

    context.subscriptions.push(switchCmd, revealCmd, syncCmd, addDataCmd, setupWorkspaceCmd, state, ui);
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

    // Find the active folder within the sandbox
    // Look for existing workspace folders that are under SCRIPT_PATH
    let activeFolderPath: string | null = null;
    let relativePath = '';

    ui.log(`Detecting active folder from ${currentFolders.length} workspace folders`);
    ui.log(`SCRIPT_PATH: ${config.scriptsPath}`);

    for (const folder of currentFolders) {
        const normalized = path.normalize(folder.uri.fsPath);
        const scriptsNormalized = path.normalize(config.scriptsPath);

        ui.log(`  Checking folder: ${normalized}`);
        ui.log(`    Normalized scripts path: ${scriptsNormalized}`);

        // Check if this folder is within SCRIPT_PATH
        // On Windows, use case-insensitive comparison
        const normalizedLower = process.platform === 'win32' ? normalized.toLowerCase() : normalized;
        const scriptsNormalizedLower = process.platform === 'win32' ? scriptsNormalized.toLowerCase() : scriptsNormalized;

        ui.log(`    Comparing: "${normalizedLower}" starts with "${scriptsNormalizedLower + path.sep}"`);

        const isUnderScripts = normalizedLower === scriptsNormalizedLower ||
                               normalizedLower.startsWith(scriptsNormalizedLower + path.sep);

        ui.log(`    Result: ${isUnderScripts}`);

        if (isUnderScripts) {
            activeFolderPath = normalized;
            relativePath = path.relative(scriptsNormalized, normalized);
            ui.log(`  -> Found active folder under scripts with relative path: "${relativePath}"`);
            break;
        }
    }

    // If no active folder found within sandbox, use the base paths
    if (!activeFolderPath) {
        activeFolderPath = config.scriptsPath;
        relativePath = '';
        ui.log(`No active folder found within sandbox, using base paths`);
    }

    // Compute the paired paths
    const scriptsTargetPath = path.join(config.scriptsPath, relativePath);
    const dataTargetPath = path.join(config.dataPath, relativePath);

    ui.log(`Scripts target path: ${scriptsTargetPath}`);
    ui.log(`Data target path: ${dataTargetPath}`);

    // Get the basename for naming
    const folderBasename = relativePath ? path.basename(scriptsTargetPath) : path.basename(config.scriptsPath);

    // Find existing folders that match our target paths (case-insensitive on Windows)
    let scriptsIndex = -1;
    let dataIndex = -1;

    for (let i = 0; i < currentFolders.length; i++) {
        const normalized = path.normalize(currentFolders[i].uri.fsPath);
        const scriptsNorm = path.normalize(scriptsTargetPath);
        const dataNorm = path.normalize(dataTargetPath);

        const normalizedLower = process.platform === 'win32' ? normalized.toLowerCase() : normalized;
        const scriptsNormLower = process.platform === 'win32' ? scriptsNorm.toLowerCase() : scriptsNorm;
        const dataNormLower = process.platform === 'win32' ? dataNorm.toLowerCase() : dataNorm;

        if (normalizedLower === scriptsNormLower) {
            scriptsIndex = i;
        }
        if (normalizedLower === dataNormLower) {
            dataIndex = i;
        }
    }

    ui.log(`Existing folder indices - Scripts: ${scriptsIndex}, Data: ${dataIndex}`);

    const scriptsName = `Scripts: ${folderBasename}`;
    const dataName = `Data: ${folderBasename}`;

    // Build a single workspace folder update operation
    // VS Code API requires all changes to be made in a single updateWorkspaceFolders call

    // Determine what we need to do for Scripts
    let scriptsOp: { start: number, deleteCount: number, folder: {uri: vscode.Uri, name: string} } | null = null;

    if (scriptsIndex >= 0) {
        // Replace existing Scripts folder
        ui.log(`Will replace existing Scripts folder at index ${scriptsIndex}`);
        scriptsOp = {
            start: scriptsIndex,
            deleteCount: 1,
            folder: {uri: vscode.Uri.file(scriptsTargetPath), name: scriptsName}
        };
    } else {
        // Add new Scripts folder at the end
        ui.log(`Will add new Scripts folder at index ${currentFolders.length}`);
        scriptsOp = {
            start: currentFolders.length,
            deleteCount: 0,
            folder: {uri: vscode.Uri.file(scriptsTargetPath), name: scriptsName}
        };
    }

    // Determine what we need to do for Data
    let dataOp: { start: number, deleteCount: number, folder: {uri: vscode.Uri, name: string} } | null = null;

    if (config.isDataPathAvailable) {
        if (dataIndex >= 0) {
            // Replace existing Data folder
            ui.log(`Will replace existing Data folder at index ${dataIndex}`);
            dataOp = {
                start: dataIndex,
                deleteCount: 1,
                folder: {uri: vscode.Uri.file(dataTargetPath), name: dataName}
            };
        } else {
            // Add new Data folder
            // Calculate the correct index based on whether Scripts was added or replaced
            let dataAddIndex = currentFolders.length;
            if (scriptsIndex < 0) {
                // Scripts is being added, so Data goes after it
                dataAddIndex = currentFolders.length + 1;
            }
            ui.log(`Will add new Data folder at index ${dataAddIndex}`);
            dataOp = {
                start: dataAddIndex,
                deleteCount: 0,
                folder: {uri: vscode.Uri.file(dataTargetPath), name: dataName}
            };
        }
    }

    // Execute all operations in a single updateWorkspaceFolders call
    // The API signature is: updateWorkspaceFolders(start, deleteCount, ...workspaceFoldersToAdd)
    if (scriptsOp && dataOp) {
        // Both Scripts and Data operations needed
        if (scriptsIndex >= 0 && dataIndex >= 0) {
            // Both exist - need to do two separate calls since we're replacing
            if (scriptsIndex < dataIndex) {
                ui.log(`Replacing Scripts at ${scriptsIndex}, then Data at ${dataIndex}`);
                vscode.workspace.updateWorkspaceFolders(scriptsIndex, 1, scriptsOp.folder);
                // After first replace, data index shifts if it was after scripts
                vscode.workspace.updateWorkspaceFolders(dataIndex, 1, dataOp.folder);
            } else {
                ui.log(`Replacing Data at ${dataIndex}, then Scripts at ${scriptsIndex}`);
                vscode.workspace.updateWorkspaceFolders(dataIndex, 1, dataOp.folder);
                vscode.workspace.updateWorkspaceFolders(scriptsIndex, 1, scriptsOp.folder);
            }
        } else if (scriptsIndex >= 0 && dataIndex < 0) {
            // Replace Scripts, add Data - can do in one call
            ui.log(`Replacing Scripts at ${scriptsIndex}, adding Data at ${dataOp.start}`);
            vscode.workspace.updateWorkspaceFolders(
                scriptsOp.start, scriptsOp.deleteCount, scriptsOp.folder, dataOp.folder
            );
        } else if (scriptsIndex < 0 && dataIndex >= 0) {
            // Add Scripts, replace Data - need two calls
            ui.log(`Adding Scripts at ${scriptsOp.start}, replacing Data at ${dataIndex}`);
            vscode.workspace.updateWorkspaceFolders(scriptsOp.start, 0, scriptsOp.folder);
            // Data index may have shifted
            const newDataIndex = dataIndex >= scriptsOp.start ? dataIndex + 1 : dataIndex;
            vscode.workspace.updateWorkspaceFolders(newDataIndex, 1, dataOp.folder);
        } else {
            // Add both - can do in one call
            ui.log(`Adding Scripts at ${scriptsOp.start}, adding Data at ${dataOp.start}`);
            vscode.workspace.updateWorkspaceFolders(
                scriptsOp.start, 0, scriptsOp.folder, dataOp.folder
            );
        }
    } else if (scriptsOp) {
        // Only Scripts operation
        ui.log(`Only updating Scripts at ${scriptsOp.start}`);
        vscode.workspace.updateWorkspaceFolders(
            scriptsOp.start, scriptsOp.deleteCount, scriptsOp.folder
        );
    } else if (dataOp) {
        // Only Data operation
        ui.log(`Only updating Data at ${dataOp.start}`);
        vscode.workspace.updateWorkspaceFolders(
            dataOp.start, dataOp.deleteCount, dataOp.folder
        );
    }

    ui.log(`Updated workspace folders for subfolder: ${relativePath || '(base)'}`);
}

export function deactivate() {
    if (ui) {
        ui.dispose();
    }
    if (state) {
        state.dispose();
    }
}
