"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncNow = syncNow;
const cli_1 = require("../utils/cli");
/**
 * Implements the syncNow command per CLAUDE.md spec.
 *
 * Runs sync-full with JSON output and displays results.
 */
async function syncNow(config, binaryPath, ui) {
    ui.log('Running sync-full...');
    ui.showInfo('Syncing directories...');
    try {
        const result = await (0, cli_1.runSyncFull)(binaryPath, config.scriptsPath, config.dataPath);
        if (result.ok) {
            const message = `Synced ${result.created_total + result.existing_total} directories (${result.created_total} created, ${result.existing_total} existing) in ${result.duration_ms}ms`;
            ui.showSuccess(message);
            ui.log(message);
            // Log details to output channel
            ui.log(`  Created in scripts: ${result.created_in_scripts}`);
            ui.log(`  Created in data: ${result.created_in_data}`);
            ui.log(`  Existing total: ${result.existing_total}`);
            if (result.warnings.length > 0) {
                ui.log(`  Warnings: ${result.warnings.join(', ')}`);
            }
        }
        else {
            const errorMsg = `Sync failed: ${result.errors.join(', ')}`;
            ui.showErrorNotification(errorMsg);
            ui.log(errorMsg);
            ui.showOutput();
        }
    }
    catch (e) {
        const errorMsg = `Sync error: ${e instanceof Error ? e.message : String(e)}`;
        ui.showErrorNotification(errorMsg);
        ui.log(errorMsg);
        ui.showOutput();
    }
}
//# sourceMappingURL=syncNow.js.map