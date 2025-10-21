import { SandboxConfig } from '../config/sandbox';
import { runSyncFull } from '../utils/cli';
import { SandboxUI } from '../utils/ui';

/**
 * Implements the syncNow command per CLAUDE.md spec.
 *
 * Runs sync-full with JSON output and displays results.
 */
export async function syncNow(
    config: SandboxConfig,
    binaryPath: string,
    ui: SandboxUI
): Promise<void> {
    ui.log('Running sync-full...');
    ui.showInfo('Syncing directories...');

    try {
        const result = await runSyncFull(
            binaryPath,
            config.scriptsPath,
            config.dataPath
        );

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
        } else {
            const errorMsg = `Sync failed: ${result.errors.join(', ')}`;
            ui.showErrorNotification(errorMsg);
            ui.log(errorMsg);
            ui.showOutput();
        }
    } catch (e) {
        const errorMsg = `Sync error: ${e instanceof Error ? e.message : String(e)}`;
        ui.showErrorNotification(errorMsg);
        ui.log(errorMsg);
        ui.showOutput();
    }
}
