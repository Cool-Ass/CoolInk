import { mkdir, readFile, writeFile, appendFile, rm, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { route } from './router.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const runtime = resolve(root, '.autopilot');
const hash = text => createHash('sha256').update(text).digest('hex');
function command(binary, args, options = {}) {
  const result = spawnSync(binary, args, { cwd: root, encoding: 'utf8', timeout: 60000,
    maxBuffer: 16 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'], ...options });
  if (result.error || result.status !== 0) throw new Error(`${binary} operation failed`);
  return result.stdout;
}

// No arbitrary host command, shell, env passthrough, deployment or push path.
export function sandboxConfig(env) {
  if (!/^[a-z0-9./_-]+@sha256:[a-f0-9]{64}$/.test(env.AUTOPILOT_IMAGE ?? '')) throw new Error('Missing pinned sandbox image');
  if (env.AUTOPILOT_PROVIDER !== 'coolink-inference') throw new Error('Missing inference provider');
  if (!/^[a-f0-9]{64}$/.test(env.AUTOPILOT_POLICY_SHA256 ?? '')) throw new Error('Missing reviewed effective policy hash');
  if (!/^[a-z0-9][a-z0-9/_:.+-]*$/i.test(env.AUTOPILOT_MODEL ?? '')) throw new Error('Missing agent model');
  return { image: env.AUTOPILOT_IMAGE, provider: env.AUTOPILOT_PROVIDER,
    policyHash: env.AUTOPILOT_POLICY_SHA256, model: env.AUTOPILOT_MODEL };
}

async function execute(decision, runId) {
  const config = sandboxConfig(process.env);
  if (!/^OpenShell 0\.1\.2\b/i.test(command('openshell', ['--version']).trim()) &&
      !/^openshell 0\.1\.2\b/i.test(command('openshell', ['--version']).trim())) throw new Error('OpenShell 0.1.2 required');
  if (command('git', ['status', '--porcelain']).trim()) throw new Error('Dirty checkout');
  const branch = command('git', ['branch', '--show-current']).trim();
  if (!branch.startsWith('ai/')) throw new Error('Execution requires ai/* branch');
  const temp = await mkdtemp(resolve(tmpdir(), 'coolink-autopilot-'));
  const name = `coolink-${runId}`;
  let created = false;
  try {
    // Snapshot contains tracked files only. Reject environment files, symlinks
    // and backup artifacts even if accidentally committed.
    const tree = command('git', ['ls-tree', '-r', 'HEAD']);
    if (tree.split('\n').some(line => {
      const path = line.split('\t')[1] ?? '';
      return /^120000 /.test(line) || (/(?:^|\/)(?:\.env[^/]*|[^/]*\.(?:dump|pem|key|p12))$/i.test(path) && path !== '.env.example');
    })) {
      throw new Error('Unsafe snapshot contents');
    }
    command('git', ['archive', '--format=tar', '-o', resolve(temp, 'repo.tar'), 'HEAD']);
    await writeFile(resolve(temp, 'task.json'), JSON.stringify({ action: decision.action, taskId: decision.state.taskId, model: config.model }));
    command('openshell', ['sandbox', 'create', '--name', name, '--from', config.image,
      '--provider', config.provider, '--policy', resolve(root, 'config/autopilot/openshell-policy.yaml'),
      '--env', 'XDG_CONFIG_HOME=/sandbox/config', '--env', 'XDG_DATA_HOME=/sandbox/data',
      '--env', 'XDG_CACHE_HOME=/sandbox/cache', '--env', 'NPM_CONFIG_CACHE=/sandbox/npm-cache',
      '--approval-mode', 'manual', '--cpu', '2', '--memory', '4Gi', '--output', 'json'], { timeout: 300000 });
    created = true;
    const policy = command('openshell', ['sandbox', 'get', name, '--policy-only']);
    if (hash(policy) !== config.policyHash) throw new Error('Effective sandbox policy differs from reviewed policy');
    for (const file of ['repo.tar', 'task.json']) command('openshell', ['sandbox', 'upload', name, resolve(temp, file), `/sandbox/${file}`]);
    command('openshell', ['sandbox', 'upload', name, resolve(root, 'scripts/autopilot/worker.cjs'), '/sandbox/worker.cjs']);
    command('openshell', ['sandbox', 'exec', '-n', name, '--workdir', '/sandbox', '--timeout', '2400',
      '--no-tty', '--no-login-shell', '--', '/usr/local/bin/node', '/sandbox/worker.cjs'], { timeout: 2450000 });
    const destination = resolve(runtime, runId);
    await mkdir(destination);
    command('openshell', ['sandbox', 'download', name, '/sandbox/result.patch', resolve(destination, 'result.patch')]);
    command('openshell', ['sandbox', 'download', name, '/sandbox/result.json', resolve(destination, 'result.json')]);
    // Downloaded patch is untrusted. It is never applied, committed or executed
    // on the host. Review and CI belong to the subsequent PR process.
    return { status: 'WAITING_REVIEW', artifact: `.autopilot/${runId}/result.patch` };
  } finally {
    // Attempt cleanup even when create timed out after allocating a sandbox.
    try { command('openshell', ['sandbox', 'delete', name]); }
    catch { if (created) throw new Error('Sandbox cleanup failed; inspect before next run'); }
    await rm(temp, { recursive: true, force: true });
  }
}

export async function main(args = process.argv.slice(2)) {
  const [operation = 'plan', stateFile, mode = 'rules'] = args;
  if (!['plan', 'run'].includes(operation) || !stateFile || args.length > 3) throw new Error('Usage: cli.mjs plan|run STATE.json [rules|clef]');
  await mkdir(runtime, { recursive: true });
  const lock = resolve(runtime, 'worker.lock');
  try { await mkdir(lock); } catch { throw new Error('Worker lock exists; inspect previous run before removal'); }
  const runId = randomUUID();
  let record = { runId, timestamp: new Date().toISOString(), operation, status: 'BLOCKED' };
  try {
    await writeFile(resolve(lock, 'owner.json'), JSON.stringify({ runId, pid: process.pid, started: record.timestamp }));
    const input = JSON.parse(await readFile(resolve(stateFile), 'utf8'));
    const decision = await route(input, { mode });
    record = { ...record, ...decision, baseSha: command('git', ['rev-parse', 'HEAD']).trim(),
      status: operation === 'plan' ? 'PLANNED' : 'BLOCKED' };
    await appendFile(resolve(runtime, 'history.jsonl'), JSON.stringify({ ...record, event: 'decision' }) + '\n');
    if (operation === 'run' && ['ANALYZE', 'FIX', 'TEST', 'SECURITY_AUDIT'].includes(decision.action)) {
      record = { ...record, ...await execute(decision, runId) };
    } else if (operation === 'run') record.status = decision.action === 'WAIT' ? 'IDLE' : 'BLOCKED';
    console.log(JSON.stringify(record, null, 2));
  } finally {
    await appendFile(resolve(runtime, 'history.jsonl'), JSON.stringify({ ...record, event: 'finish' }) + '\n');
    await rm(lock, { recursive: true });
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(() => { console.error('Autopilot BLOCKED. Check state, runtime configuration and previous run; no deployment performed.'); process.exitCode = 1; });
}
