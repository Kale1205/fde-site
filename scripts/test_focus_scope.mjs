import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {applyReviewedFocus} from './focus_test_helpers.mjs';

test('focus fixture migrations cannot hide validation, selection or unrelated red styles', () => {
  const unrelated = '.field[aria-invalid="true"] { border: 2px solid red; }\n.selected { outline: 3px solid var(--orange); }\n';
  for (const file of ['quiet-form.css','quiet-pages.css','gallery-pages.css','goals-motion.css','news-books.css','faq-v38.css','cms-admin.css','demo-v1.js']) {
    assert.equal(applyReviewedFocus(file, unrelated), unrelated);
  }
});

test('reviewed focus migrations are idempotent and preserve appended rules', () => {
  for (const file of ['quiet-form.css','quiet-pages.css','gallery-pages.css','goals-motion.css','news-books.css','faq-v38.css','cms-admin.css']) {
    const source = readFileSync(new URL('../'+file,import.meta.url),'utf8');
    const changed = source+'\n.unrelated-error { border-color: #b83a08; }\n';
    assert.equal(applyReviewedFocus(file,source),source);
    assert.equal(applyReviewedFocus(file,changed),changed);
  }
});
