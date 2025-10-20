"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const child_process_1 = require("child_process");
const util_1 = require("util");
const path = __importStar(require("path"));
const execAsync = (0, util_1.promisify)(child_process_1.exec);
let watchProcess = null;
function activate(context) {
    console.log('Sandbox Switcher extension is now active');
    // Load configuration
    const config = loadConfig();
    // Auto-sync on startup if enabled
    if (config.autoSyncOnStartup && config.scriptsPath && config.dataPath) {
        runSync(config, false);
    }
    // Start watch mode if enabled
    if (config.watchDuringSession && config.scriptsPath && config.dataPath) {
        startWatchMode(config);
    }
    // Register commands
    context.subscriptions.push(vscode.commands.registerCommand('sandbox.toggleRoot', () => toggleRoot(config)), vscode.commands.registerCommand('sandbox.focusScripts', () => focusScripts(config)), vscode.commands.registerCommand('sandbox.focusData', () => focusData(config)), vscode.commands.registerCommand('sandbox.openBoth', () => openBoth(config)), vscode.commands.registerCommand('sandbox.syncNow', () => runSync(config, true)));
}
function deactivate() {
    // Stop watch process if running
    if (watchProcess) {
        watchProcess.kill();
        watchProcess = null;
    }
}
function loadConfig() {
    const config = vscode.workspace.getConfiguration('sandbox');
    return {
        scriptsPath: config.get('scriptsPath') || '',
        dataPath: config.get('dataPath') || '',
        syncBinaryPath: config.get('syncBinaryPath') || 'sandbox-sync',
        gitkeep: config.get('gitkeep') || true,
        excludes: config.get('excludes') || [],
        autoSyncOnStartup: config.get('autoSyncOnStartup') !== false,
        watchDuringSession: config.get('watchDuringSession') || false,
    };
}
async function toggleRoot(config) {
    if (!config.scriptsPath || !config.dataPath) {
        vscode.window.showErrorMessage('Sandbox paths not configured. Please set sandbox.scriptsPath and sandbox.dataPath in settings.');
        return;
    }
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
        // No workspace open, open scripts by default
        await focusScripts(config);
        return;
    }
    const currentRoot = workspaceFolders[0].uri.fsPath;
    // Toggle between scripts and data
    if (currentRoot === config.scriptsPath) {
        await focusData(config);
    }
    else {
        await focusScripts(config);
    }
}
async function focusScripts(config) {
    if (!config.scriptsPath) {
        vscode.window.showErrorMessage('Scripts path not configured. Please set sandbox.scriptsPath in settings.');
        return;
    }
    const scriptsUri = vscode.Uri.file(config.scriptsPath);
    // Update workspace to single root
    const success = vscode.workspace.updateWorkspaceFolders(0, vscode.workspace.workspaceFolders?.length || 0, { uri: scriptsUri, name: `Scripts: ${path.basename(config.scriptsPath)}` });
    if (success) {
        vscode.window.showInformationMessage(`Switched to Scripts: ${config.scriptsPath}`);
        await updateRWorkingDirectory(config.scriptsPath);
    }
    else {
        vscode.window.showErrorMessage('Failed to switch workspace');
    }
}
async function focusData(config) {
    if (!config.dataPath) {
        vscode.window.showErrorMessage('Data path not configured. Please set sandbox.dataPath in settings.');
        return;
    }
    const dataUri = vscode.Uri.file(config.dataPath);
    // Update workspace to single root
    const success = vscode.workspace.updateWorkspaceFolders(0, vscode.workspace.workspaceFolders?.length || 0, { uri: dataUri, name: `Data: ${path.basename(config.dataPath)}` });
    if (success) {
        vscode.window.showInformationMessage(`Switched to Data: ${config.dataPath}`);
        await updateRWorkingDirectory(config.dataPath);
    }
    else {
        vscode.window.showErrorMessage('Failed to switch workspace');
    }
}
async function openBoth(config) {
    if (!config.scriptsPath || !config.dataPath) {
        vscode.window.showErrorMessage('Sandbox paths not configured. Please set sandbox.scriptsPath and sandbox.dataPath in settings.');
        return;
    }
    const scriptsUri = vscode.Uri.file(config.scriptsPath);
    const dataUri = vscode.Uri.file(config.dataPath);
    // Add both as workspace folders
    const success = vscode.workspace.updateWorkspaceFolders(0, vscode.workspace.workspaceFolders?.length || 0, { uri: scriptsUri, name: `Scripts: ${path.basename(config.scriptsPath)}` }, { uri: dataUri, name: `Data: ${path.basename(config.dataPath)}` });
    if (success) {
        vscode.window.showInformationMessage('Opened both Scripts and Data sandboxes');
    }
    else {
        vscode.window.showErrorMessage('Failed to open both sandboxes');
    }
}
async function updateRWorkingDirectory(newPath) {
    try {
        // Find the active R terminal
        const terminals = vscode.window.terminals;
        let rTerminal;
        for (const terminal of terminals) {
            const name = terminal.name.toLowerCase();
            if (name.includes('r') || name.includes('positron')) {
                rTerminal = terminal;
                break;
            }
        }
        if (!rTerminal) {
            console.log('No R terminal found, skipping setwd');
            return;
        }
        // Send setwd command to R terminal
        // Normalize path for R (use forward slashes)
        const rPath = newPath.replace(/\\/g, '/');
        rTerminal.sendText(`setwd("${rPath}")`);
        console.log(`Sent setwd("${rPath}") to R terminal`);
    }
    catch (error) {
        console.error('Error updating R working directory:', error);
    }
}
async function runSync(config, showProgress) {
    if (!config.scriptsPath || !config.dataPath) {
        vscode.window.showErrorMessage('Sandbox paths not configured. Please set sandbox.scriptsPath and sandbox.dataPath in settings.');
        return;
    }
    // Helper function to quote paths if they contain spaces
    const quotePath = (p) => {
        if (p.includes(' ')) {
            return `"${p}"`;
        }
        return p;
    };
    const args = [
        'sync',
        '--scripts', quotePath(config.scriptsPath),
        '--data', quotePath(config.dataPath),
        '--log-level', 'info'
    ];
    if (config.gitkeep) {
        args.push('--gitkeep');
    }
    for (const exclude of config.excludes) {
        args.push('--exclude', quotePath(exclude));
    }
    const command = `${quotePath(config.syncBinaryPath)} ${args.join(' ')}`;
    if (showProgress) {
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Syncing sandbox directories...',
            cancellable: false
        }, async () => {
            try {
                const { stdout, stderr } = await execAsync(command);
                if (stderr && !stderr.includes('[INFO]')) {
                    vscode.window.showErrorMessage(`Sync error: ${stderr}`);
                }
                else {
                    vscode.window.showInformationMessage('Sandbox sync completed successfully');
                }
                console.log('Sync output:', stdout);
            }
            catch (error) {
                vscode.window.showErrorMessage(`Sync failed: ${error.message}`);
            }
        });
    }
    else {
        // Run in background without progress dialog
        try {
            const { stdout, stderr } = await execAsync(command);
            console.log('Background sync completed:', stdout);
        }
        catch (error) {
            console.error('Background sync failed:', error);
        }
    }
}
function startWatchMode(config) {
    if (watchProcess) {
        console.log('Watch mode already running');
        return;
    }
    const args = [
        'watch',
        '--scripts', config.scriptsPath,
        '--data', config.dataPath,
        '--log-level', 'info'
    ];
    for (const exclude of config.excludes) {
        args.push('--exclude', exclude);
    }
    const command = `${config.syncBinaryPath} ${args.join(' ')}`;
    try {
        const { spawn } = require('child_process');
        watchProcess = spawn(config.syncBinaryPath, args.slice(1), {
            stdio: 'pipe'
        });
        watchProcess.stdout?.on('data', (data) => {
            console.log(`Watch: ${data.toString()}`);
        });
        watchProcess.stderr?.on('data', (data) => {
            console.error(`Watch error: ${data.toString()}`);
        });
        watchProcess.on('exit', (code) => {
            console.log(`Watch process exited with code ${code}`);
            watchProcess = null;
        });
        console.log('Watch mode started');
    }
    catch (error) {
        console.error('Failed to start watch mode:', error);
    }
}
//# sourceMappingURL=extension.js.map