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
exports.switchWdOpposite = switchWdOpposite;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const sandbox_1 = require("../config/sandbox");
const cli_1 = require("../utils/cli");
/**
 * Gets the current working directory path for switching.
 * Uses last set working directory from state, or falls back to active editor.
 */
function getCurrentContextPath(state) {
    // Use the last working directory we set (tracks R's actual working directory)
    const lastWd = state.getLastWorkingDirectory();
    if (lastWd) {
        return lastWd;
    }
    // Fallback to active editor file on first use
    const activeEditor = vscode.window.activeTextEditor;
    if (activeEditor) {
        const filePath = activeEditor.document.uri.fsPath;
        const dirPath = path.dirname(filePath);
        return dirPath;
    }
    return null;
}
/**
 * Implements the switchWdOpposite command per CLAUDE.md spec.
 *
 * If current context is under SCRIPT_PATH:
 * - Compute relative path
 * - Run ensure-path
 * - Send setwd(DATA_PATH/rel) to R terminal
 * - Reveal paired Data folder
 *
 * If current context is under DATA_PATH:
 * - Compute relative path
 * - Optionally run ensure-path
 * - Send setwd(SCRIPT_PATH/rel) to R terminal
 * - Reveal paired Scripts folder
 */
async function switchWdOpposite(config, binaryPath, state, ui) {
    // Get current context
    const contextPath = getCurrentContextPath(state);
    if (!contextPath) {
        ui.showWarning('No active file or folder to switch from');
        ui.log('switchWdOpposite: No context path found');
        return;
    }
    // Determine which sandbox we're in
    const context = (0, sandbox_1.determinePathContext)(contextPath, config);
    if (context === null) {
        ui.showWarning('Current path is outside sandbox boundaries');
        ui.log(`switchWdOpposite: Path ${contextPath} is outside sandboxes`);
        return;
    }
    // Get the paired path
    const paired = (0, sandbox_1.getPairedPath)(contextPath, config);
    if (!paired) {
        ui.showError('Failed to compute paired path');
        ui.log(`switchWdOpposite: Could not compute paired path for ${contextPath}`);
        return;
    }
    const { pairedPath, relativePath } = paired;
    ui.log(`switchWdOpposite: Context=${context}, Relative=${relativePath}`);
    // Check if we need to ensure the path
    const needsEnsure = !state.isPathEnsured(relativePath);
    if (needsEnsure) {
        // Run ensure-path with debouncing
        state.debounce(`ensure:${relativePath}`, async () => {
            try {
                ui.log(`Ensuring path: ${relativePath}`);
                const result = await (0, cli_1.runEnsurePath)(binaryPath, config.scriptsPath, config.dataPath, relativePath);
                if (result.ok) {
                    state.markPathEnsured(relativePath);
                    ui.log(`Path ensured: ${relativePath} (${result.duration_ms}ms)`);
                }
                else {
                    ui.log(`Ensure path failed: ${result.errors.join(', ')}`);
                }
            }
            catch (e) {
                ui.log(`Ensure path error: ${e instanceof Error ? e.message : String(e)}`);
            }
        }, 500);
    }
    // Handle DATA_PATH availability for scripts->data switch
    if (context === 'scripts' && !config.isDataPathAvailable) {
        ui.showWarningNotification('DATA_PATH is not available. Cannot switch to data sandbox.');
        ui.log('switchWdOpposite: DATA_PATH unavailable, aborting switch');
        return;
    }
    // Send setwd command to R console using Positron's executeCode.console
    try {
        // Convert to forward slashes (R prefers this even on Windows)
        const forwardSlashPath = pairedPath.split(path.sep).join('/');
        const command = `setwd("${forwardSlashPath}")`;
        ui.log(`Executing command: ${command}`);
        await vscode.commands.executeCommand('workbench.action.executeCode.console', {
            code: command,
            languageId: 'r'
        });
        // Track the new working directory in state so next switch uses it
        state.setLastWorkingDirectory(pairedPath);
        ui.showSuccess(`Switched to ${context === 'scripts' ? 'data' : 'scripts'} sandbox`);
        ui.log(`setwd sent: ${pairedPath}`);
    }
    catch (e) {
        ui.showError('Failed to send setwd command');
        ui.log(`setwd error: ${e instanceof Error ? e.message : String(e)}`);
        return;
    }
    // Reveal paired folder in explorer
    try {
        const uri = vscode.Uri.file(pairedPath);
        await vscode.commands.executeCommand('revealInExplorer', uri);
        ui.log(`Revealed in explorer: ${pairedPath}`);
    }
    catch (e) {
        // Non-critical error
        ui.log(`Failed to reveal in explorer: ${e instanceof Error ? e.message : String(e)}`);
    }
}
//# sourceMappingURL=switchWdOpposite.js.map