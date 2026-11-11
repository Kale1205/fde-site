import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { applyReviewedHeaderOwnership } from './navigation_test_helpers.mjs';

test('moving navigation ownership preserves all existing demo operations and pause behavior', () => {
  const root = new URL('../', import.meta.url);
  const before = execFileSync('git', ['show', 'd537dffa34b889eac4a9a7c546e47f0a0ea96f41:quiet-form.js'], { cwd: root, encoding: 'utf8' });
  const current = readFileSync(new URL('quiet-form.js', root), 'utf8');
  assert.equal(current, applyReviewedHeaderOwnership('quiet-form.js', before));
  assert.equal(applyReviewedHeaderOwnership('quiet-form.js', current), current);
  assert.match(current, /if \(open\) pause\(\);/);
});

test('the historical exception cannot hide a different runtime or a new demo mutation', () => {
  const unrelated = "document.querySelector('.locale-picker').inert = open;\n// unrelated change\n";
  assert.equal(applyReviewedHeaderOwnership('quiet-form.js', unrelated), unrelated);
  assert.equal(applyReviewedHeaderOwnership('demo-v1.js', unrelated), unrelated);
  const changedOperation = "quantity.value = '999';\nform.requestSubmit();\n";
  assert.equal(applyReviewedHeaderOwnership('quiet-form.js', changedOperation), changedOperation);
});
