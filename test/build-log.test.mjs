import { test } from 'node:test';
import assert from 'node:assert/strict';
import { diagnoseBuildLog } from '../src/build-log.mjs';

test('fires on bad: log stopping after "Downloading source code" flags a parse error', () => {
  const d = diagnoseBuildLog('Starting build 4821...\nDownloading source code\n');
  assert.equal(d.signature, 'parse_error_empty_log');
  assert.match(d.hint, /parse error/i);
});

test('silent on good: a log that reaches Validating/Compiling is not flagged', () => {
  assert.equal(diagnoseBuildLog('Downloading source code\nValidating...\nCompiling...\nBUILD SUCCESS'), null);
  assert.equal(diagnoseBuildLog('Downloading source code\nCompiling 42 files\nError: bad widget'), null);
});

test('silent on good: output that never mentions the build pipeline is not flagged', () => {
  assert.equal(diagnoseBuildLog('wdcli: unknown command'), null);
  assert.equal(diagnoseBuildLog(''), null);
  assert.equal(diagnoseBuildLog(undefined), null);
});
