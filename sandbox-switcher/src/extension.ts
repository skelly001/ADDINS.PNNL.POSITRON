import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
    console.log('Sandbox Switcher extension is now active');

    // TODO: Implement commands
    let toggleCommand = vscode.commands.registerCommand('sandbox.toggleRoot', () => {
        vscode.window.showInformationMessage('Toggle Root - To be implemented');
    });

    let focusScriptsCommand = vscode.commands.registerCommand('sandbox.focusScripts', () => {
        vscode.window.showInformationMessage('Focus Scripts - To be implemented');
    });

    let focusDataCommand = vscode.commands.registerCommand('sandbox.focusData', () => {
        vscode.window.showInformationMessage('Focus Data - To be implemented');
    });

    let openBothCommand = vscode.commands.registerCommand('sandbox.openBoth', () => {
        vscode.window.showInformationMessage('Open Both - To be implemented');
    });

    let syncNowCommand = vscode.commands.registerCommand('sandbox.syncNow', () => {
        vscode.window.showInformationMessage('Sync Now - To be implemented');
    });

    context.subscriptions.push(
        toggleCommand,
        focusScriptsCommand,
        focusDataCommand,
        openBothCommand,
        syncNowCommand
    );
}

export function deactivate() {}
