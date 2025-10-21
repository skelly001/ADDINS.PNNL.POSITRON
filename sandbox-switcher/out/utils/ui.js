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
exports.SandboxUI = void 0;
const vscode = __importStar(require("vscode"));
/**
 * UI utilities for status messages and logging
 */
class SandboxUI {
    constructor() {
        this.outputChannel = vscode.window.createOutputChannel('Sandbox Sync');
        this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    }
    /**
     * Logs a message to the output channel
     */
    log(message) {
        const timestamp = new Date().toISOString();
        this.outputChannel.appendLine(`[${timestamp}] ${message}`);
    }
    /**
     * Shows the output channel
     */
    showOutput() {
        this.outputChannel.show();
    }
    /**
     * Shows a success message in the status bar (temporary)
     */
    showSuccess(message, durationMs = 3000) {
        this.statusBarItem.text = `$(check) ${message}`;
        this.statusBarItem.show();
        setTimeout(() => {
            this.statusBarItem.hide();
        }, durationMs);
    }
    /**
     * Shows an error message in the status bar (temporary)
     */
    showError(message, durationMs = 5000) {
        this.statusBarItem.text = `$(error) ${message}`;
        this.statusBarItem.show();
        setTimeout(() => {
            this.statusBarItem.hide();
        }, durationMs);
    }
    /**
     * Shows a warning message in the status bar (temporary)
     */
    showWarning(message, durationMs = 4000) {
        this.statusBarItem.text = `$(warning) ${message}`;
        this.statusBarItem.show();
        setTimeout(() => {
            this.statusBarItem.hide();
        }, durationMs);
    }
    /**
     * Shows a non-blocking information message
     */
    showInfo(message) {
        vscode.window.showInformationMessage(message);
    }
    /**
     * Shows a non-blocking warning notification
     */
    showWarningNotification(message) {
        vscode.window.showWarningMessage(message);
    }
    /**
     * Shows a non-blocking error notification
     */
    showErrorNotification(message) {
        vscode.window.showErrorMessage(message);
    }
    /**
     * Disposes UI resources
     */
    dispose() {
        this.outputChannel.dispose();
        this.statusBarItem.dispose();
    }
}
exports.SandboxUI = SandboxUI;
//# sourceMappingURL=ui.js.map