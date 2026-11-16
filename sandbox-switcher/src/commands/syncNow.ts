import { SandboxConfig } from '../config/sandbox';
import { runSyncFull } from '../utils/cli';
import { errorMessage } from '../utils/ui';
import { CommandContext } from './context';

/** Runs a full two-way directory sync and reports the result. */
export async function syncNow(config: SandboxConfig, ctx: CommandContext): Promise<void> {
    const { ui } = ctx;
    ui.log('Running sync-full...');

    try {
        const result = await runSyncFull(ctx.binaryPath, config);
        result.warnings.forEach((warning) => ui.log(`  Warning: ${warning}`));

        if (result.ok) {
            ui.status(
                'success',
                `Sync: ${result.created_in_scripts} created in Scripts, ` +
                    `${result.created_in_data} created in Data (${result.duration_ms}ms)`
            );
        } else {
            result.errors.forEach((error) => ui.log(`  Error: ${error}`));
            ui.notifyError(`Sandbox sync failed: ${result.errors[0] ?? 'unknown error'}`);
            ui.showOutput();
        }
    } catch (e) {
        ui.notifyError(`Sandbox sync failed: ${errorMessage(e)}`);
        ui.showOutput();
    }
}
