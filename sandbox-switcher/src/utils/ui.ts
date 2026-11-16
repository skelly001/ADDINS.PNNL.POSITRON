import * as vscode from 'vscode';

type StatusKind = 'success' | 'warning' | 'error';

const STATUS: Record<StatusKind, { icon: string; durationMs: number }> = {
    success: { icon: 'check', durationMs: 4000 },
    warning: { icon: 'warning', durationMs: 5000 },
    error: { icon: 'error', durationMs: 6000 },
};

/** Status bar messages, notifications and the "Sandbox Sync" output log. */
export class SandboxUI {
    private outputChannel = vscode.window.createOutputChannel('Sandbox Sync');
    private statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    private hideTimer: NodeJS.Timeout | undefined;

    /** Appends a timestamped line to the output channel. */
    log(message: string): void {
        this.outputChannel.appendLine(`[${new Date().toISOString()}] ${message}`);
    }

    showOutput(): void {
        this.outputChannel.show(true);
    }

    /** Shows a short message in the status bar for a few seconds, and logs it. */
    status(kind: StatusKind, message: string): void {
        const { icon, durationMs } = STATUS[kind];
        this.log(message);

        if (this.hideTimer) {
            clearTimeout(this.hideTimer);
        }
        this.statusBarItem.text = `$(${icon}) ${message}`;
        this.statusBarItem.show();
        this.hideTimer = setTimeout(() => this.statusBarItem.hide(), durationMs);
    }

    /** Shows a non-blocking warning popup, and logs it. */
    notifyWarning(message: string): void {
        this.log(message);
        void vscode.window.showWarningMessage(message);
    }

    /** Shows a non-blocking error popup, and logs it. */
    notifyError(message: string): void {
        this.log(message);
        void vscode.window.showErrorMessage(message);
    }

    dispose(): void {
        if (this.hideTimer) {
            clearTimeout(this.hideTimer);
        }
        this.outputChannel.dispose();
        this.statusBarItem.dispose();
    }
}

export function errorMessage(e: unknown): string {
    return e instanceof Error ? e.message : String(e);
}
