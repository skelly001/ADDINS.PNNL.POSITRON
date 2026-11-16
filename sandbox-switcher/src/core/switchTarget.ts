import * as path from 'path';
import { SandboxConfig, Side, locate, otherSide, sidePath } from '../config/sandbox';

export const NO_PROJECT_MESSAGE = 'Open a file in a project folder to switch';

/**
 * Remembers, per project folder, which side the working directory was last
 * switched to. It is only ever used to pick the side for the same folder,
 * never to pick the folder.
 */
export class SideMemory {
    private lastSide = new Map<string, Side>();

    private key(rel: string): string {
        return process.platform === 'win32' ? rel.toLowerCase() : rel;
    }

    get(rel: string): Side | undefined {
        return this.lastSide.get(this.key(rel));
    }

    set(rel: string, side: Side): void {
        this.lastSide.set(this.key(rel), side);
    }
}

export interface SwitchInput {
    config: SandboxConfig;
    /** Path of the active editor's file if it is saved on disk, else null. */
    editorFile: string | null;
    /** Paths of the open workspace folders, in order. */
    workspaceFolders: string[];
    memory: SideMemory;
}

export type SwitchDecision =
    | { kind: 'switch'; rel: string; side: Side; targetPath: string }
    | { kind: 'none'; message: string };

/**
 * Picks the project folder (relative to the sandbox roots) to switch within:
 * the active file's folder if that is inside a project folder of the sandbox,
 * otherwise the first open workspace folder that is one. The sandbox roots
 * themselves never qualify.
 */
function chooseProjectFolder(input: SwitchInput): string | null {
    const candidates = [
        ...(input.editorFile ? [path.dirname(input.editorFile)] : []),
        ...input.workspaceFolders,
    ];
    for (const candidate of candidates) {
        const located = locate(candidate, input.config);
        if (located && located.rel !== '') {
            return located.rel;
        }
    }
    return null;
}

/**
 * Decides where the R working directory should go:
 * - folder: see chooseProjectFolder;
 * - side: the opposite of the side last set for that same folder, or Data
 *   if the folder has not been switched in this session.
 */
export function decideSwitch(input: SwitchInput): SwitchDecision {
    const rel = chooseProjectFolder(input);
    if (rel === null) {
        return { kind: 'none', message: NO_PROJECT_MESSAGE };
    }

    const last = input.memory.get(rel);
    const side: Side = last ? otherSide(last) : 'data';

    return { kind: 'switch', rel, side, targetPath: sidePath(input.config, side, rel) };
}

/** Builds an R `setwd()` call with the path safely quoted. */
export function setwdCommand(dirPath: string): string {
    // R accepts forward slashes on Windows, where backslash is only a separator.
    const forward = process.platform === 'win32' ? dirPath.replace(/\\/g, '/') : dirPath;
    const escaped = forward.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    return `setwd("${escaped}")`;
}
