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
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
function activate(context) {
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
    context.subscriptions.push(toggleCommand, focusScriptsCommand, focusDataCommand, openBothCommand, syncNowCommand);
}
function deactivate() { }
//# sourceMappingURL=extension.js.map