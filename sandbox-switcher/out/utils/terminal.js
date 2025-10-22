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
exports.findRTerminals = findRTerminals;
exports.getActiveRTerminal = getActiveRTerminal;
exports.sendSetwd = sendSetwd;
exports.sendCommand = sendCommand;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
/**
 * Utilities for interacting with R terminals
 */
/**
 * Finds R terminals in the workspace.
 * Returns an array of terminals that appear to be R sessions.
 */
function findRTerminals() {
    const terminals = vscode.window.terminals;
    // Log all available terminals for debugging
    console.log('[findRTerminals] Available terminals:');
    terminals.forEach((t, idx) => {
        console.log(`  [${idx}] Name: "${t.name}"`);
    });
    const rTerminals = terminals.filter((t) => {
        const name = t.name.toLowerCase();
        // Skip known non-R terminals
        if (name.includes('powershell') || name.includes('cmd') || name.includes('bash') || name === 'pwsh') {
            console.log(`  Terminal "${t.name}": SKIPPED (known non-R terminal)`);
            return false;
        }
        // Match R console patterns
        const isRConsole = name === 'r' ||
            name.startsWith('r ') ||
            name.includes('r console') ||
            name.includes('r 4.') ||
            name.includes('console') ||
            !!name.match(/^r\s*\d+\.\d+/) ||
            !!name.match(/r-\d+/);
        console.log(`  Terminal "${t.name}": isRConsole=${isRConsole}`);
        return isRConsole;
    });
    console.log(`[findRTerminals] Found ${rTerminals.length} R terminals`);
    return rTerminals;
}
/**
 * Gets the active R terminal, or prompts the user to select one if multiple exist.
 * Returns null if no R terminals are found.
 */
async function getActiveRTerminal() {
    const rTerminals = findRTerminals();
    if (rTerminals.length === 0) {
        vscode.window.showWarningMessage('No R terminal found');
        return null;
    }
    if (rTerminals.length === 1) {
        return rTerminals[0];
    }
    // Multiple terminals - prompt user to select
    const items = rTerminals.map((t) => ({
        label: t.name,
        terminal: t,
    }));
    const selected = await vscode.window.showQuickPick(items, {
        placeHolder: 'Select R terminal',
    });
    return selected ? selected.terminal : null;
}
/**
 * Sends setwd() command to R console using Positron's executeCode.console command.
 * Uses forward slashes even on Windows per CLAUDE.md spec.
 */
async function sendSetwd(dirPath) {
    // Convert to forward slashes (R prefers this even on Windows)
    const forwardSlashPath = dirPath.split(path.sep).join('/');
    // Quote the path to handle spaces
    const command = `setwd("${forwardSlashPath}")`;
    console.log(`[sendSetwd] Original path: ${dirPath}`);
    console.log(`[sendSetwd] Forward slash path: ${forwardSlashPath}`);
    console.log(`[sendSetwd] Command to send: ${command}`);
    try {
        await vscode.commands.executeCommand('workbench.action.executeCode.console', {
            code: command,
            languageId: 'r'
        });
        console.log(`[sendSetwd] Command executed successfully`);
    }
    catch (error) {
        console.error(`[sendSetwd] Failed to execute command:`, error);
        throw error;
    }
}
/**
 * Sends a command to the R terminal
 */
async function sendCommand(terminal, command) {
    terminal.show();
    terminal.sendText(command);
}
//# sourceMappingURL=terminal.js.map