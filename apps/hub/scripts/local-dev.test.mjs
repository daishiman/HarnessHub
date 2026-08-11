import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { main, parseEnvFile, renderLaunchdPlist, serializeEnv, serviceLabel } from './local-dev.mjs';
import { appendRotatedLog } from './local-dev-supervisor.mjs';

test('env parser accepts export and quoted values without evaluating shell code', () => {
  const parsed = parseEnvFile('export A=\'plain value\'\nB="quoted\\nvalue"\nEMPTY=\n# comment\n');
  assert.deepEqual(parsed, { A: 'plain value', B: 'quoted\nvalue', EMPTY: '' });
  assert.equal(parseEnvFile(serializeEnv(parsed)).B, 'quoted\nvalue');
});

test('service label is deterministic and worktree-specific', () => {
  assert.equal(serviceLabel('/repo/wt-5'), serviceLabel('/repo/wt-5'));
  assert.notEqual(serviceLabel('/repo/wt-5'), serviceLabel('/repo/wt-6'));
});

test('launchd plist contains absolute program arguments and automatic restart', () => {
  const plist = renderLaunchdPlist({ label: 'com.example.test', nodePath: '/usr/bin/node', stateRoot: '/tmp/hub' });
  assert.match(plist, /<key>KeepAlive<\/key><true\/>/);
  assert.match(plist, /<key>ExitTimeOut<\/key><integer>15<\/integer>/);
  assert.match(plist, /<key>LimitLoadToSessionType<\/key><string>Aqua<\/string>/);
  assert.match(plist, /<key>SessionCreate<\/key><true\/>/);
  assert.match(plist, /<string>\/usr\/bin\/node<\/string>/);
  assert.match(plist, /<string>supervise<\/string>/);
  assert.match(plist, /<string>\/tmp\/hub<\/string>/);
});

test('package-manager argument separator is accepted', async () => {
  await assert.doesNotReject(() => main(['paths', '--', '--state', '/tmp/harnesshub-local-dev-test']));
});

test('running child output rotates at the configured size without waiting for a restart', () => {
  const root = mkdtempSync(join(tmpdir(), 'harnesshub-local-log-'));
  const log = join(root, 'next.log');
  try {
    writeFileSync(log, 'old!');
    appendRotatedLog(log, 'new', { maxBytes: 4, retention: 2 });
    assert.equal(readFileSync(`${log}.1`, 'utf8'), 'old!');
    assert.equal(readFileSync(log, 'utf8'), 'new');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
