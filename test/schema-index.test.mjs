import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { tolerantParse, buildSchemaIndex, listNames, describe } from '../src/schema-index.mjs';
import { isTextFile } from '../src/examples-corpus.mjs';
import { parseSections } from '../src/knowledge.mjs';

function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'schema-index-'));
  const app = join(root, 'catalog', 'demoApp');
  mkdirSync(join(app, 'model'), { recursive: true });
  mkdirSync(join(app, 'presentation'), { recursive: true });
  mkdirSync(join(app, 'orchestration'), { recursive: true });
  writeFileSync(join(app, 'model', 'Thing.businessobject'), JSON.stringify({
    id: 1, name: 'Thing', defaultCollection: { name: 'things' },
    fields: [
      { id: 1, name: 'owner', type: 'SINGLE_INSTANCE', target: 'WORKER', enableReportingFromTarget: false },
      { id: 2, name: 'title', type: 'TEXT', enableIndex: true, enableSearch: false },
      { id: 3, name: 'note', type: 'TEXT', enableIndex: false },
    ],
  }));
  // A PMD whose script string spans lines: invalid JSON until scripts are collapsed.
  writeFileSync(join(app, 'presentation', 'home.pmd'),
    '{ "id": "home", "endPoints": [ { "name": "getThings", "baseUrlType": "workday-app", "url": "<%\n const a = \'things\';\n return a;\n%>" } ],' +
    ' "presentation": { "body": { "type": "section", "children": [ { "type": "grid", "id": "g", "rows": "<% getThings.data %>", "columns": [ { "type": "column", "sortableAndFilterable": true } ] } ] } } }');
  writeFileSync(join(app, 'orchestration', 'load.orchestration'), JSON.stringify({
    flowVersion: '3.4.0', _type: 'Flow',
    _value: { type: { _type: 'FlowType', _value: '.maya.FlowAsync' }, steps: [{ _type: 'BatchLoop', _value: { strategy: { _type: 'SizeBasedBatchStrategy', _value: { size: 100 } } } }] },
  }));
  writeFileSync(join(app, 'presentation', 'broken.pmd'), '{ not json at all');
  return root;
}

test('tolerantParse: strict JSON passes through', () => {
  assert.deepEqual(tolerantParse('{"a":1}'), { a: 1 });
});

test('tolerantParse: multi-line <% %> script strings are collapsed, structure survives', () => {
  const doc = tolerantParse('{ "url": "<%\n return 1;\n%>", "type": "grid" }');
  assert.equal(doc.type, 'grid');
  assert.equal(doc.url, '<%script%>');
});

test('fires on bad: unparseable text returns undefined, never throws', () => {
  assert.equal(tolerantParse('{ nope'), undefined);
  assert.equal(tolerantParse(undefined), undefined);
});

test('index: business-object field attributes are counted per field type with observed values', () => {
  const root = fixture();
  try {
    const index = buildSchemaIndex([{ dir: join(root, 'catalog'), label: 'catalog' }]);
    const text = describe(index, 'businessobject-field', 'TEXT');
    assert.equal(text.occurrences, 2);
    const enableIndex = text.attributes.find((a) => a.attr === 'enableIndex');
    assert.equal(enableIndex.seen_in, 2);
    assert.deepEqual(enableIndex.values.sort(), ['false×1', 'true×1']);
    const inst = describe(index, 'businessobject-field', 'SINGLE_INSTANCE');
    assert.ok(inst.attributes.some((a) => a.attr === 'target' && a.values.includes('"WORKER"×1')));
    assert.deepEqual(inst.examples, ['catalog/demoApp/model/Thing.businessobject']);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('index: PMD widgets and endpoints are found even when the file needed tolerant parsing', () => {
  const root = fixture();
  try {
    const index = buildSchemaIndex([{ dir: join(root, 'catalog'), label: 'catalog' }]);
    assert.deepEqual(listNames(index, 'pmd-widget').map((n) => n.name).sort(), ['column', 'grid', 'section']);
    const grid = describe(index, 'pmd-widget', 'grid');
    assert.ok(grid.attributes.some((a) => a.attr === 'rows'));
    const ep = describe(index, 'pmd-endpoint', 'endPoints');
    assert.ok(ep.attributes.some((a) => a.attr === 'baseUrlType' && a.values.includes('"workday-app"×1')));
    assert.deepEqual(index.unparsed, ['catalog/demoApp/presentation/broken.pmd']);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('index: orchestration nodes are keyed by _type with their _value keys', () => {
  const root = fixture();
  try {
    const index = buildSchemaIndex([{ dir: join(root, 'catalog'), label: 'catalog' }]);
    const names = listNames(index, 'orchestration-node').map((n) => n.name);
    assert.ok(names.includes('BatchLoop') && names.includes('SizeBasedBatchStrategy'));
    assert.ok(describe(index, 'orchestration-node', 'SizeBasedBatchStrategy').attributes.some((a) => a.attr === 'size'));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('silent on good / fires on bad: unknown name or kind yields undefined and [], not an invention', () => {
  const root = fixture();
  try {
    const index = buildSchemaIndex([{ dir: join(root, 'catalog'), label: 'catalog' }]);
    assert.equal(describe(index, 'pmd-widget', 'megaGrid'), undefined);
    assert.deepEqual(listNames(index, 'no-such-kind'), []);
    assert.deepEqual(buildSchemaIndex([{ dir: join(root, 'missing'), label: 'x' }]).files, 0);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('corpus coverage: component types present upstream are text files; binaries are not', () => {
  for (const ok of ['a.wqlquery', 'b.card', 'c.graphquery', 'd.businessprocess', 'e.report', 'f.properties', 'g.attributes', 'h.pmd']) {
    assert.equal(isTextFile(ok), true, ok);
  }
  for (const bad of ['x.png', 'y.zip', 'z.jar']) assert.equal(isTextFile(bad), false, bad);
});

test('parseSections: level option splits on ### and leaves ## lines in bodies; default stays ##', () => {
  const md = '# T\n\n## Group\nintro\n### RuleA\nbody a\n### RuleB\nbody b\n';
  assert.deepEqual(parseSections(md, { level: 3 }).map((s) => s.title), ['_intro', 'RuleA', 'RuleB']);
  assert.deepEqual(parseSections(md).map((s) => s.title), ['_intro', 'Group']);
});
