import * as vscode from 'vscode';

/**
 * UI utilities for status messages and logging
 */
export class SandboxUI {
    private outputChannel: vscode.OutputChannel;
    private statusBarItem: vscode.StatusBarItem;

    constructor() {
        this.outputChannel = vscode.window.createOutputChannel('Sandbox Sync');
        this.statusBarItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Left,
            100
        );
    }

    /**
     * Logs a message to the output channel
     */
    log(message: string): void {
        const timestamp = new Date().toISOString();
        this.outputChannel.appendLine(`[${timestamp}] ${message}`);
    }

    /**
     * Shows the output channel
     */
    showOutput(): void {
        this.outputChannel.show();
    }

    /**
     * Shows a success message in the status bar (temporary)
     */
    showSuccess(message: string, durationMs: number = 3000): void {
        this.statusBarItem.text = `$(check) ${message}`;
        this.statusBarItem.show();

        setTimeout(() => {
            this.statusBarItem.hide();
        }, durationMs);
    }

    /**
     * Shows an error message in the status bar (temporary)
     */
    showError(message: string, durationMs: number = 5000): void {
        this.statusBarItem.text = `$(error) ${message}`;
        this.statusBarItem.show();

        setTimeout(() => {
            this.statusBarItem.hide();
        }, durationMs);
    }

    /**
     * Shows a warning message in the status bar (temporary)
     */
    showWarning(message: string, durationMs: number = 4000): void {
        this.statusBarItem.text = `$(warning) ${message}`;
        this.statusBarItem.show();

        setTimeout(() => {
            this.statusBarItem.hide();
        }, durationMs);
    }

    /**
     * Shows a non-blocking information message
     */
    showInfo(message: string): void {
        vscode.window.showInformationMessage(message);
    }

    /**
     * Shows a non-blocking warning notification
     */
    showWarningNotification(message: string): void {
        vscode.window.showWarningMessage(message);
    }

    /**
     * Shows a non-blocking error notification
     */
    showErrorNotification(message: string): void {
        vscode.window.showErrorMessage(message);
    }

    /**
     * Disposes UI resources
     */
    dispose(): void {
        this.outputChannel.dispose();
        this.statusBarItem.dispose();
    }
}
