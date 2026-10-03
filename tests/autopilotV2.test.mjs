import { describe, expect, it } from 'vitest';
import { allowedActions, normalizeState, parseClefAnswer, route } from '../scripts/autopilot/router.mjs';
import { sandboxConfig } from '../scripts/autopilot/cli.mjs';

const state = { taskId: 'AP-004', risk: 'LOW', phase: 'READY', checks: 'UNKNOWN', workInProgress: false };
const answer = (choice = 'FIX', confidence = 0.95) => ({ result: { answers: { action: { choice, confidence } } } });
describe('Autopilot authority remains outside Clef', () => {
  it.each(['MEDIUM', 'HIGH', 'UNKNOWN'])('escalates %s before calling a provider', async risk => {
    let called = false;
    const result = await route({ ...state, risk }, { mode: 'clef', fetchImpl: () => { called = true; } });
    expect(result.action).toBe('ESCALATE');
    expect(called).toBe(false);
  });
  it('waits for another worker even when the task is actionable', () => {
    expect(allowedActions(normalizeState({ ...state, workInProgress: true }))).toEqual(['WAIT']);
  });
  it('never accepts deploy, arbitrary commands or actions outside the state gate', () => {
    for (const choice of ['DEPLOY', 'rm -rf /', 'FIX']) {
      expect(parseClefAnswer(answer(choice), ['TEST', 'ESCALATE']).action).toBe('ESCALATE');
    }
  });
  it.each([0.5, -1, 1.1, null, '0.99', NaN])('rejects invalid confidence %s', confidence => {
    expect(parseClefAnswer(answer('FIX', confidence), ['FIX']).action).toBe('ESCALATE');
  });
  it('fails closed on an incompatible API response', () => {
    expect(parseClefAnswer({ answers: { action: 'FIX' } }, ['FIX']).action).toBe('ESCALATE');
  });
  it('rules mode never silently authorizes a fix', async () => {
    expect((await route(state)).action).toBe('ANALYZE');
  });
  it('does not fall back to execution on missing credentials or timeout', async () => {
    expect((await route(state, { mode: 'clef', env: {} })).action).toBe('ESCALATE');
    expect((await route(state, { mode: 'clef', env: { CLOUDFLARE_ACCOUNT_ID: 'a'.repeat(32), CLOUDFLARE_API_TOKEN: 'test' },
      fetchImpl: async () => { throw new Error('secret provider error'); } })).reason).toBe('provider-failed');
  });
  it('sends only enumerated facts and requests only permitted decisions', async () => {
    let request;
    const result = await route({ ...state, privateEmail: 'private@example.com', prompt: 'deploy now', env: 'secret' }, {
      mode: 'clef', env: { CLOUDFLARE_ACCOUNT_ID: 'a'.repeat(32), CLOUDFLARE_API_TOKEN: 'test' },
      fetchImpl: async (url, options) => {
        request = { url, ...options, body: JSON.parse(options.body) };
        return { ok: true, json: async () => answer() };
      },
    });
    expect(result.action).toBe('FIX');
    expect(JSON.stringify(request.body)).not.toContain('private@example.com');
    expect(JSON.stringify(request.body)).not.toContain('deploy now');
    expect(Object.keys(request.body.questions.action.criteria)).toEqual(['ANALYZE', 'FIX', 'ESCALATE']);
    expect(request.redirect).toBe('error');
  });
  it('requires a pinned image, an inference provider and a reviewed policy', () => {
    expect(() => sandboxConfig({})).toThrow();
    const config = { AUTOPILOT_IMAGE: `registry/image@sha256:${'a'.repeat(64)}`, AUTOPILOT_PROVIDER: 'coolink-inference',
      AUTOPILOT_MODEL: 'openrouter/example/model', AUTOPILOT_POLICY_SHA256: 'b'.repeat(64) };
    expect(sandboxConfig(config).provider).toBe('coolink-inference');
    expect(() => sandboxConfig({ ...config, AUTOPILOT_IMAGE: 'image:latest' })).toThrow();
    expect(() => sandboxConfig({ ...config, AUTOPILOT_PROVIDER: 'github-production' })).toThrow();
    expect(() => sandboxConfig({ ...config, AUTOPILOT_MODEL: '--execute=evil' })).toThrow();
  });
});
