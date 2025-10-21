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
    return terminals.filter((t) => {
        const name = t.name.toLowerCase();
        return name.includes('r') || name.includes('positron');
    });
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
 * Sends setwd() command to R terminal.
 * Uses forward slashes even on Windows per CLAUDE.md spec.
 */
export async function sendSetwd(terminal: vscode.Terminal, dirPath: string): Promise<void> {
    // Convert to forward slashes (R prefers this even on Windows)
    const forwardSlashPath = dirPath.split(path.sep).join('/');

    // Quote the path to handle spaces
    const command = `setwd("${forwardSlashPath}")`;

    terminal.show();
    terminal.sendText(command);
}

/**
 * Sends a command to the R terminal
 */
export async function sendCommand(terminal: vscode.Terminal, command: string): Promise<void> {
    terminal.show();
    terminal.sendText(command);
}
