import * as vscode from 'vscode';
import * as path from 'path';

/**
 * Utilities for interacting with R terminals
 */

/**
 * Finds R terminals in the workspace.
 * Returns an array of terminals that appear to be R sessions.
 */
export function findRTerminals(): vscode.Terminal[] {
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
        const isRConsole =
            name === 'r' ||
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
export async function getActiveRTerminal(): Promise<vscode.Terminal | null> {
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
export async function sendSetwd(dirPath: string): Promise<void> {
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
    } catch (error) {
        console.error(`[sendSetwd] Failed to execute command:`, error);
        throw error;
    }
}

/**
 * Sends a command to the R terminal
 */
export async function sendCommand(terminal: vscode.Terminal, command: string): Promise<void> {
    terminal.show();
    terminal.sendText(command);
}
