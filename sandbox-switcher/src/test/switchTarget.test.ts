import * as assert from 'node:assert/strict';
import { test } from 'node:test';
import { NO_PROJECT_MESSAGE, SideMemory, decideSwitch, setwdCommand } from '../core/switchTarget';

const config = { scriptsPath: '/s/r_script_sandbox', dataPath: '/d/data_sandbox' };
const ROOT = '/s/r_script_sandbox';
const PROJECT_A = '/s/r_script_sandbox/ROSMAP_SRM';

function decide(
    editorFile: string | null,
    workspaceFolders: string[],
    memory = new SideMemory()
) {
    return decideSwitch({ config, editorFile, workspaceFolders, memory });
}

test('saved file in a project: first press goes to the paired Data folder', () => {
    assert.deepEqual(decide(`${PROJECT_A}/analysis/run.R`, [ROOT]), {
        kind: 'switch',
        rel: 'ROSMAP_SRM/analysis',
        side: 'data',
        targetPath: '/d/data_sandbox/ROSMAP_SRM/analysis',
    });
});

test('unsaved tab with Positron opened at a project subfolder: uses that folder', () => {
    assert.deepEqual(decide(null, [PROJECT_A]), {
        kind: 'switch',
        rel: 'ROSMAP_SRM',
        side: 'data',
        targetPath: '/d/data_sandbox/ROSMAP_SRM',
    });
});

test('unsaved tab with Positron opened at the sandbox root: does nothing', () => {
    assert.deepEqual(decide(null, [ROOT]), { kind: 'none', message: NO_PROJECT_MESSAGE });
});

test('never switches to the top of either sandbox', () => {
    // A file directly in the sandbox root is not in a project folder.
    assert.equal(decide(`${ROOT}/.Renviron`, [ROOT]).kind, 'none');
    assert.equal(decide(null, [ROOT, '/d/data_sandbox']).kind, 'none');
    assert.equal(decide(null, []).kind, 'none');
});

test('file outside the sandbox falls back to the open project folder', () => {
    const decision = decide('/somewhere/else/notes.R', [PROJECT_A]);
    assert.equal(decision.kind === 'switch' && decision.targetPath, '/d/data_sandbox/ROSMAP_SRM');
});

test('root-level file falls back to the open project folder', () => {
    const decision = decide(`${ROOT}/README.md`, [PROJECT_A]);
    assert.equal(decision.kind === 'switch' && decision.rel, 'ROSMAP_SRM');
});

test('second press on the same folder toggles back to Scripts, third to Data', () => {
    const memory = new SideMemory();
    const file = `${PROJECT_A}/run.R`;

    const first = decide(file, [ROOT], memory);
    assert.equal(first.kind === 'switch' && first.side, 'data');
    memory.set('ROSMAP_SRM', 'data');

    const second = decide(file, [ROOT], memory);
    assert.deepEqual(second, {
        kind: 'switch',
        rel: 'ROSMAP_SRM',
        side: 'scripts',
        targetPath: '/s/r_script_sandbox/ROSMAP_SRM',
    });
    memory.set('ROSMAP_SRM', 'scripts');

    const third = decide(file, [ROOT], memory);
    assert.equal(third.kind === 'switch' && third.side, 'data');
});

test('toggling also works from an unsaved tab and from a Data-side file', () => {
    const memory = new SideMemory();
    memory.set('ROSMAP_SRM', 'data');

    const unsaved = decide(null, [PROJECT_A], memory);
    assert.equal(unsaved.kind === 'switch' && unsaved.targetPath, '/s/r_script_sandbox/ROSMAP_SRM');

    const dataFile = decide('/d/data_sandbox/ROSMAP_SRM/out.csv', [ROOT], memory);
    assert.equal(dataFile.kind === 'switch' && dataFile.targetPath, '/s/r_script_sandbox/ROSMAP_SRM');
});

test('a different project never inherits the last project', () => {
    const memory = new SideMemory();
    memory.set('ROSMAP_SRM', 'data');

    // Now working in another project: the target is that project, on Data.
    assert.deepEqual(decide(`${ROOT}/OTHER_PROJ/x.R`, [ROOT], memory), {
        kind: 'switch',
        rel: 'OTHER_PROJ',
        side: 'data',
        targetPath: '/d/data_sandbox/OTHER_PROJ',
    });

    // From an unsaved tab at the root there is no project to go to, and the
    // remembered project is not used.
    assert.equal(decide(null, [ROOT], memory).kind, 'none');
});

test('setwdCommand quotes the path for R', () => {
    assert.equal(setwdCommand('/d/My Data/proj'), 'setwd("/d/My Data/proj")');
    assert.equal(setwdCommand('/d/we"ird'), 'setwd("/d/we\\"ird")');
    assert.equal(setwdCommand('/d/中文'), 'setwd("/d/中文")');
});
