import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, mkdirSync, copyFileSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const fixtures = [];
afterEach(() => { for (const dir of fixtures.splice(0)) rmSync(dir, { recursive: true, force: true }); });
function fixture() {
  const root = mkdtempSync(resolve(tmpdir(), 'autopilot-test-'));
  fixtures.push(root);
  mkdirSync(resolve(root, 'scripts/autopilot'), { recursive: true });
  mkdirSync(resolve(root, 'config/autopilot'), { recursive: true });
  for (const file of ['cli.mjs', 'router.mjs', 'worker.cjs']) {
    copyFileSync(resolve('scripts/autopilot', file), resolve(root, 'scripts/autopilot', file));
  }
  writeFileSync(resolve(root, 'config/autopilot/openshell-policy.yaml'), 'version: 1\n');
  writeFileSync(resolve(root, '.gitignore'), '.autopilot/\nstate.json\nbin/\ncommands.jsonl\n');
  writeFileSync(resolve(root, 'state.json'), JSON.stringify({ taskId: 'AP-004', risk: 'LOW', phase: 'READY', checks: 'UNKNOWN' }));
  for (const args of [['init', '-q', '-b', 'ai/test'], ['config', 'user.name', 'test'],
    ['config', 'user.email', 'test@localhost'], ['add', '.'], ['commit', '-qm', 'fixture']]) {
    expect(spawnSync('git', args, { cwd: root }).status).toBe(0);
  }
  mkdirSync(resolve(root, 'bin'));
  // A local fake exercises CLI protocol only, not OpenShell isolation.
  writeFileSync(resolve(root, 'bin/openshell'), `#!/usr/bin/env node
const fs = require('node:fs');
const args = process.argv.slice(2);
fs.appendFileSync('commands.jsonl', JSON.stringify(args)+'\\n');
if (args[0] === '--version') console.log('openshell 0.1.2');
if (args[1] === 'get') process.stdout.write('version: 1\\n');
if (args[1] === 'download') fs.writeFileSync(args[4], 'untrusted result');
`, { mode: 0o755 });
  const env = { ...process.env, PATH: `${resolve(root, 'bin')}:${process.env.PATH}`,
    AUTOPILOT_IMAGE: `registry/image@sha256:${'a'.repeat(64)}`, AUTOPILOT_PROVIDER: 'coolink-inference',
    AUTOPILOT_MODEL: 'openrouter/example/model',
    AUTOPILOT_POLICY_SHA256: createHash('sha256').update('version: 1\n').digest('hex') };
  const invoke = (args, overrides = {}) => spawnSync(process.execPath, ['scripts/autopilot/cli.mjs', ...args],
    { cwd: root, env: { ...env, ...overrides }, encoding: 'utf8', timeout: 10000 });
  return { root, invoke, commands: () => readFileSync(resolve(root, 'commands.jsonl'), 'utf8').trim().split('\n').map(JSON.parse) };
}
describe('Autopilot runner protocol and lifecycle', () => {
  it('planning records the exact base SHA without creating a sandbox', () => {
    const f = fixture();
    const result = f.invoke(['plan', 'state.json']);
    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout).baseSha).toMatch(/^[a-f0-9]{40}$/);
    expect(existsSync(resolve(f.root, 'commands.jsonl'))).toBe(false);
    expect(existsSync(resolve(f.root, '.autopilot/worker.lock'))).toBe(false);
  });
  it('a mutex blocks the next worker without deleting the previous lock', () => {
    const f = fixture();
    mkdirSync(resolve(f.root, '.autopilot/worker.lock'), { recursive: true });
    expect(f.invoke(['plan', 'state.json']).status).toBe(1);
    expect(existsSync(resolve(f.root, '.autopilot/worker.lock'))).toBe(true);
  });
  it('policy mismatch stops execution and cleans up only this sandbox', () => {
    const f = fixture();
    expect(f.invoke(['run', 'state.json'], { AUTOPILOT_POLICY_SHA256: 'b'.repeat(64) }).status).toBe(1);
    expect(f.commands().some(args => args[1] === 'exec')).toBe(false);
    expect(f.commands().at(-1)[1]).toBe('delete');
    expect(existsSync(resolve(f.root, '.autopilot/worker.lock'))).toBe(false);
    const history = readFileSync(resolve(f.root, '.autopilot/history.jsonl'), 'utf8');
    expect(history).toContain('BLOCKED');
  });
  it('returns an untrusted patch for review without host apply, push or deployment', () => {
    const f = fixture();
    const result = f.invoke(['run', 'state.json']);
    expect(result.status).toBe(0);
    const record = JSON.parse(result.stdout);
    expect(record.status).toBe('WAITING_REVIEW');
    expect(readFileSync(resolve(f.root, record.artifact), 'utf8')).toBe('untrusted result');
    expect(f.commands().filter(args => args[1] === 'exec')).toHaveLength(1);
    const create = f.commands().find(args => args[1] === 'create');
    expect(create).toContain('manual');
    const envValues = create.filter((_, index) => create[index - 1] === '--env');
    expect(envValues).toHaveLength(4);
    expect(envValues.every(value => /^(XDG_(CONFIG|DATA|CACHE)_HOME|NPM_CONFIG_CACHE)=\/sandbox\//.test(value))).toBe(true);
    expect(f.commands().at(-1)[1]).toBe('delete');
  });
  it('rejects committed env files before sandbox creation', () => {
    const f = fixture();
    writeFileSync(resolve(f.root, '.env.production'), 'SECRET=fixture');
    spawnSync('git', ['add', '.env.production'], { cwd: f.root });
    spawnSync('git', ['commit', '-qm', 'unsafe fixture'], { cwd: f.root });
    expect(f.invoke(['run', 'state.json']).status).toBe(1);
    expect(f.commands().some(args => args[1] === 'create')).toBe(false);
  });
});
