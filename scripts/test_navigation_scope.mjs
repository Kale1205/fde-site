import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { applyReviewedHeaderOwnership } from './navigation_test_helpers.mjs';
import {applyReviewedSiteRefinement} from './site_refinement_test_helpers.mjs';

test('the shared header remains independent from the now-manual embedded demo', () => {
  const root = new URL('../', import.meta.url);
  const before = execFileSync('git', ['show', 'd537dffa34b889eac4a9a7c546e47f0a0ea96f41:quiet-form.js'], { cwd: root, encoding: 'utf8' });
  const current = readFileSync(new URL('quiet-form.js', root), 'utf8');
  assert.equal(current, applyReviewedSiteRefinement('quiet-form.js',applyReviewedHeaderOwnership('quiet-form.js', before)));
  assert.equal(applyReviewedHeaderOwnership('quiet-form.js', current), current);
  assert.doesNotMatch(current, /\.inert\s*=|requestSubmit|IntersectionObserver|function start|function tick/);
});

test('the historical exception cannot hide a different runtime or a new demo mutation', () => {
  const unrelated = "document.querySelector('.locale-picker').inert = open;\n// unrelated change\n";
  assert.equal(applyReviewedHeaderOwnership('quiet-form.js', unrelated), unrelated);
  assert.equal(applyReviewedHeaderOwnership('demo-v1.js', unrelated), unrelated);
  const changedOperation = "quantity.value = '999';\nform.requestSubmit();\n";
  assert.equal(applyReviewedHeaderOwnership('quiet-form.js', changedOperation), changedOperation);
  assert.equal(applyReviewedSiteRefinement('quiet-form.js',changedOperation),changedOperation);
  const unknown='.unreviewed-card { border: 2px solid red; }';
  for(const file of['quiet-form.css','quiet-pages.css','news-books.css'])assert.equal(applyReviewedSiteRefinement(file,unknown),unknown);
  const control='<button class="motion-toggle" type="button" data-unreviewed="true">Different control</button>';
  assert.equal(applyReviewedSiteRefinement('ja/index.html',control),control);
});
