import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readdirSync, readFileSync } from 'fs';

// Hard rule: `wdcli config show`, `wdcli auth token`, and `wdcli tenant token`
// all print live bearer tokens in plaintext, so no tool may ever invoke them.
// This scans every source file for those argv sequences.

const SRC = join(dirname(fileURLToPath(import.meta.url)), '..', 'src');

// Matches the arg pair in either argv-array form ('config', 'show') or a
// space-joined string form (config show / "auth token").
const FORBIDDEN = [
  ['config', 'show'],
  ['auth', 'token'],
  ['tenant', 'token'],
].map(([a, b]) => new RegExp(`'${a}'\\s*,\\s*'${b}'|"${a}"\\s*,\\s*"${b}"|\\b${a} ${b}\\b`));

function* sourceFiles(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) yield* sourceFiles(full);
    else if (entry.name.endsWith('.mjs')) yield full;
  }
}

test('fires on bad: the scanner itself detects a planted violation', () => {
  const planted = "await wdcliRaw(['auth', 'token'])";
  assert.ok(FORBIDDEN.some((re) => re.test(planted)), 'a rule that cannot fail is dead code');
  const plantedText = 'run wdcli config show to see it';
  assert.ok(FORBIDDEN.some((re) => re.test(plantedText)));
});

test('silent on good: no source file invokes a token-printing wdcli command', () => {
  for (const file of sourceFiles(SRC)) {
    const text = readFileSync(file, 'utf8');
    for (const re of FORBIDDEN) {
      assert.ok(!re.test(text), `${file} matches forbidden pattern ${re}`);
    }
  }
});
