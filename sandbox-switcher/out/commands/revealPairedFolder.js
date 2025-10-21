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
exports.revealPairedFolder = revealPairedFolder;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const sandbox_1 = require("../config/sandbox");
const cli_1 = require("../utils/cli");
/**
 * Implements the revealPairedFolder command per CLAUDE.md spec.
 *
 * Computes the paired folder path and reveals it in the explorer.
 * Runs ensure-path to guarantee the paired folder exists.
 */
async function revealPairedFolder(config, binaryPath, state, ui, contextPath) {
    // Use provided context or get from active editor
    let sourcePath = contextPath;
    if (!sourcePath) {
        const activeEditor = vscode.window.activeTextEditor;
        if (activeEditor) {
            sourcePath = path.dirname(activeEditor.document.uri.fsPath);
        }
    }
    if (!sourcePath) {
        ui.showWarning('No active file or folder');
        return;
    }
    // Get paired path
    const paired = (0, sandbox_1.getPairedPath)(sourcePath, config);
    if (!paired) {
        ui.showWarning('Path is outside sandbox boundaries');
        ui.log(`revealPairedFolder: ${sourcePath} is outside sandboxes`);
        return;
    }
    const { pairedPath, relativePath } = paired;
    // Ensure the path exists
    if (!state.isPathEnsured(relativePath)) {
        try {
            ui.log(`Ensuring path for reveal: ${relativePath}`);
            const result = await (0, cli_1.runEnsurePath)(binaryPath, config.scriptsPath, config.dataPath, relativePath);
            if (result.ok) {
                state.markPathEnsured(relativePath);
                ui.log(`Path ensured: ${relativePath}`);
            }
            else {
                ui.showError(`Failed to ensure path: ${result.errors[0]}`);
                ui.log(`Ensure path failed: ${result.errors.join(', ')}`);
                return;
            }
        }
        catch (e) {
            ui.showError('Failed to ensure path');
            ui.log(`Ensure path error: ${e instanceof Error ? e.message : String(e)}`);
            return;
        }
    }
    // Reveal in explorer
    try {
        const uri = vscode.Uri.file(pairedPath);
        await vscode.commands.executeCommand('revealInExplorer', uri);
        ui.showSuccess('Revealed paired folder');
        ui.log(`Revealed: ${pairedPath}`);
    }
    catch (e) {
        ui.showError('Failed to reveal folder');
        ui.log(`Reveal error: ${e instanceof Error ? e.message : String(e)}`);
    }
}
//# sourceMappingURL=revealPairedFolder.js.map