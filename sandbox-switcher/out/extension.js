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
const sandbox_1 = require("./config/sandbox");
const cli_1 = require("./utils/cli");
const state_1 = require("./utils/state");
const ui_1 = require("./utils/ui");
const switchWdOpposite_1 = require("./commands/switchWdOpposite");
const revealPairedFolder_1 = require("./commands/revealPairedFolder");
const syncNow_1 = require("./commands/syncNow");
let sandboxConfig = null;
let binaryPath = null;
let state;
let ui;
function activate(context) {
    ui = new ui_1.SandboxUI();
    state = new state_1.SessionState();
    ui.log('Sandbox Switcher extension activating...');
    // Detect sandbox configuration
    const detection = (0, sandbox_1.detectSandbox)();
    if (!detection.found) {
        // No sandbox detected - log and disable features
        ui.log('Sandbox not detected:');
        detection.errors.forEach((err) => ui.log(`  Error: ${err}`));
        detection.warnings.forEach((warn) => ui.log(`  Warning: ${warn}`));
        // Show a notification if there were errors
        if (detection.errors.length > 0) {
            ui.showWarningNotification('Sandbox Switcher: r_script_sandbox not detected or .Renviron missing/invalid');
        }
        // Register commands but they will show warnings when invoked
        registerCommandsDisabled(context);
        return;
    }
    sandboxConfig = detection.config;
    ui.log(`Sandbox detected:`);
    ui.log(`  Scripts path: ${sandboxConfig.scriptsPath}`);
    ui.log(`  Data path: ${sandboxConfig.dataPath}`);
    ui.log(`  Data available: ${sandboxConfig.isDataPathAvailable}`);
    // Log warnings
    detection.warnings.forEach((warn) => ui.log(`  Warning: ${warn}`));
    // Find sandbox-sync binary
    binaryPath = (0, cli_1.findSandboxSyncBinary)(context.extensionPath);
    if (!binaryPath) {
        ui.log('Error: sandbox-sync binary not found');
        ui.showErrorNotification('Sandbox Switcher: sandbox-sync binary not found. Please install it in PATH or extension bin directory.');
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
function registerCommands(context) {
    // switchWdOpposite command
    const switchCmd = vscode.commands.registerCommand('sandbox.switchWdOpposite', async () => {
        if (!sandboxConfig || !binaryPath) {
            ui.showWarning('Sandbox not configured');
            return;
        }
        await (0, switchWdOpposite_1.switchWdOpposite)(sandboxConfig, binaryPath, state, ui);
    });
    // revealPairedFolder command
    const revealCmd = vscode.commands.registerCommand('sandbox.revealPairedFolder', async () => {
        if (!sandboxConfig || !binaryPath) {
            ui.showWarning('Sandbox not configured');
            return;
        }
        await (0, revealPairedFolder_1.revealPairedFolder)(sandboxConfig, binaryPath, state, ui);
    });
    // syncNow command
    const syncCmd = vscode.commands.registerCommand('sandbox.syncNow', async () => {
        if (!sandboxConfig || !binaryPath) {
            ui.showWarning('Sandbox not configured');
            return;
        }
        await (0, syncNow_1.syncNow)(sandboxConfig, binaryPath, ui);
    });
    context.subscriptions.push(switchCmd, revealCmd, syncCmd, state, ui);
}
function registerCommandsDisabled(context) {
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
function addWorkspaceRoots(config) {
    const currentFolders = vscode.workspace.workspaceFolders || [];
    // Check if roots are already present
    const hasScripts = currentFolders.some((f) => f.uri.fsPath === config.scriptsPath);
    const hasData = currentFolders.some((f) => f.uri.fsPath === config.dataPath);
    const foldersToAdd = [];
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
function deactivate() {
    if (ui) {
        ui.dispose();
    }
    if (state) {
        state.dispose();
    }
}
//# sourceMappingURL=extension.js.map