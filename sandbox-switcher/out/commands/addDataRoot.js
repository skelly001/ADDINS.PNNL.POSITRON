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
exports.addDataRoot = addDataRoot;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
/**
 * Manually adds the Data workspace root.
 * Useful if DATA_PATH wasn't available at extension activation.
 */
async function addDataRoot(config, ui) {
    // Check if DATA_PATH exists now
    if (!fs.existsSync(config.dataPath)) {
        ui.showErrorNotification(`DATA_PATH does not exist: ${config.dataPath}`);
        ui.log(`addDataRoot: DATA_PATH not found: ${config.dataPath}`);
        return;
    }
    if (!fs.statSync(config.dataPath).isDirectory()) {
        ui.showErrorNotification(`DATA_PATH is not a directory: ${config.dataPath}`);
        ui.log(`addDataRoot: DATA_PATH is not a directory: ${config.dataPath}`);
        return;
    }
    // Check if already added
    const currentFolders = vscode.workspace.workspaceFolders || [];
    const hasData = currentFolders.some((f) => f.uri.fsPath === config.dataPath);
    if (hasData) {
        ui.showInfo('Data workspace root is already added');
        ui.log('addDataRoot: Data root already present');
        return;
    }
    // Add the root
    const dataName = `Data: ${config.dataPath.split(/[/\\]/).pop() || 'data_sandbox'}`;
    const success = vscode.workspace.updateWorkspaceFolders(currentFolders.length, 0, {
        uri: vscode.Uri.file(config.dataPath),
        name: dataName,
    });
    if (success) {
        ui.showSuccess('Data workspace root added');
        ui.log(`addDataRoot: Added Data root: ${config.dataPath}`);
    }
    else {
        ui.showError('Failed to add Data workspace root');
        ui.log('addDataRoot: Failed to add Data root');
    }
}
//# sourceMappingURL=addDataRoot.js.map