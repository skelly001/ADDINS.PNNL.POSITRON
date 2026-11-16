import * as assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { test } from 'node:test';
import { parseRenviron, loadRenviron } from '../config/renviron';
import {
    cleanPath,
    detectSandbox,
    detectSandboxBase,
    locate,
    relativeWithin,
    sidePath,
} from '../config/sandbox';

function tempDir(): string {
    return fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'sandbox-test-')));
}

test('parseRenviron handles quotes, spaces, comments and non-ASCII', () => {
    const env = parseRenviron(
        [
            '# a comment',
            '',
            'SCRIPT_PATH="/Users/me/My Documents/r_script_sandbox"',
            "DATA_PATH='/Users/me/Cloud Drive/données 中文'",
            '  PLAIN = /no/quotes  ',
            'not a key value line',
            'WINDOWS=C:/Users/me/x\r',
        ].join('\n')
    );

    assert.equal(env.get('SCRIPT_PATH'), '/Users/me/My Documents/r_script_sandbox');
    assert.equal(env.get('DATA_PATH'), '/Users/me/Cloud Drive/données 中文');
    assert.equal(env.get('PLAIN'), '/no/quotes');
    assert.equal(env.get('WINDOWS'), 'C:/Users/me/x');
    assert.equal(env.size, 4);
});

test('loadRenviron requires DATA_PATH but not SCRIPT_PATH', () => {
    const dir = tempDir();

    assert.throws(() => loadRenviron(dir), /\.Renviron not found/);

    fs.writeFileSync(path.join(dir, '.Renviron'), 'SCRIPT_PATH="/a/b"\n');
    assert.throws(() => loadRenviron(dir), /must define DATA_PATH/);

    fs.writeFileSync(path.join(dir, '.Renviron'), 'DATA_PATH=relative/path\n');
    assert.throws(() => loadRenviron(dir), /absolute/);

    fs.writeFileSync(path.join(dir, '.Renviron'), 'DATA_PATH="/data sandbox"\n');
    assert.deepEqual(loadRenviron(dir), { scriptPath: undefined, dataPath: '/data sandbox' });
});

test('cleanPath strips trailing separators', () => {
    assert.equal(cleanPath('/a/b/'), '/a/b');
    assert.equal(cleanPath('/a/b///'), '/a/b');
    assert.equal(cleanPath('/a/./b'), '/a/b');
    assert.equal(cleanPath('/'), '/');
});

test('relativeWithin finds descendants only', () => {
    assert.equal(relativeWithin('/s/box', '/s/box'), '');
    assert.equal(relativeWithin('/s/box/', '/s/box/proj/sub'), 'proj/sub');
    assert.equal(relativeWithin('/s/box', '/s/box/v1..2/run'), 'v1..2/run');
    assert.equal(relativeWithin('/s/box', '/s/box2/proj'), null);
    assert.equal(relativeWithin('/s/box', '/s'), null);
    assert.equal(relativeWithin('/s/box', '/other'), null);
});

test('locate and sidePath map between the two sides', () => {
    // Trailing slashes in the configured paths must not matter.
    const config = { scriptsPath: cleanPath('/s/r_script_sandbox/'), dataPath: cleanPath('/d/data/') };

    assert.deepEqual(locate('/s/r_script_sandbox/proj/a', config), { side: 'scripts', rel: 'proj/a' });
    assert.deepEqual(locate('/d/data/proj', config), { side: 'data', rel: 'proj' });
    assert.deepEqual(locate('/s/r_script_sandbox', config), { side: 'scripts', rel: '' });
    assert.equal(locate('/elsewhere/proj', config), null);
    assert.equal(locate('.', config), null);

    assert.equal(sidePath(config, 'data', 'proj/a'), '/d/data/proj/a');
    assert.equal(sidePath(config, 'scripts', ''), '/s/r_script_sandbox');
});

test('detectSandboxBase matches a case-sensitive name prefix', () => {
    assert.equal(detectSandboxBase('/u/me/r_script_sandbox/proj/sub'), '/u/me/r_script_sandbox');
    assert.equal(detectSandboxBase('/u/me/r_script_sandbox'), '/u/me/r_script_sandbox');
    assert.equal(detectSandboxBase('/u/me/r_script_sandbox2/proj'), '/u/me/r_script_sandbox2');
    assert.equal(detectSandboxBase('/u/me/R_Script_Sandbox/proj'), null);
    assert.equal(detectSandboxBase('/u/me/my_r_script_sandbox/proj'), null);
    assert.equal(detectSandboxBase('/u/me/projects'), null);
});

test('detectSandbox: not a sandbox, invalid sandbox, valid sandbox', () => {
    const root = tempDir();
    const scripts = path.join(root, 'r_script_sandbox');
    const project = path.join(scripts, 'proj');
    const data = path.join(root, 'data sandbox');
    fs.mkdirSync(project, { recursive: true });
    fs.mkdirSync(data);

    assert.deepEqual(detectSandbox([]), { kind: 'none' });
    assert.deepEqual(detectSandbox([root]), { kind: 'none' });

    const invalid = detectSandbox([project]);
    assert.equal(invalid.kind, 'invalid');

    // DATA_PATH alone is enough; the scripts root is derived from the folder.
    fs.writeFileSync(path.join(scripts, '.Renviron'), `DATA_PATH="${data}/"\n`);
    assert.deepEqual(detectSandbox([root, project]), {
        kind: 'ok',
        config: { scriptsPath: scripts, dataPath: data },
        warnings: [],
    });

    // A matching SCRIPT_PATH (even with a trailing slash) gives no warning.
    fs.writeFileSync(
        path.join(scripts, '.Renviron'),
        `SCRIPT_PATH="${scripts}/"\nDATA_PATH="${data}"\n`
    );
    const matching = detectSandbox([project]);
    assert.equal(matching.kind, 'ok');
    assert.deepEqual(matching.kind === 'ok' && matching.warnings, []);

    // A different SCRIPT_PATH wins, with a warning.
    fs.writeFileSync(
        path.join(scripts, '.Renviron'),
        `SCRIPT_PATH="/somewhere/else"\nDATA_PATH="${data}"\n`
    );
    const mismatch = detectSandbox([project]);
    assert.equal(mismatch.kind, 'ok');
    if (mismatch.kind === 'ok') {
        assert.equal(mismatch.config.scriptsPath, '/somewhere/else');
        assert.equal(mismatch.warnings.length, 1);
    }
});
