import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const css = await readFile(new URL('quiet-form.css', root), 'utf8');
const base = process.env.W01_CTA_BASE_REF || '3343014e60860d85afe21baed955122c71d1b6e1';

test('W01: both conditions links use the selected forest button treatment', () => {
  const rule = css.match(/\.quiet-home \.plan-top a \{([^}]+)\}/)[1];
  for (const declaration of ['justify-content: center', 'width: 250px', 'max-width: 100%', 'min-height: 54px', 'margin-top: 24px', 'border-radius: 10px', 'background: var(--forest)', 'color: var(--paper)', 'text-decoration: none']) assert.ok(rule.includes(declaration), declaration);
});

test('W01: mobile CTA is full-column, readable and at least 50px high', () => {
  const mobile = css.slice(css.indexOf('@media (max-width: 650px)'));
  const rule = mobile.match(/\.quiet-home \.plan-top a \{([^}]+)\}/)[1];
  for (const declaration of ['width: 100%', 'min-height: 50px', 'font-size: 14px', 'margin-top: 18px']) assert.ok(rule.includes(declaration), declaration);
});

test('W01: reduced motion prevents CTA translation and keyboard focus is retained', () => {
  assert.match(css, /:is\(a,button,input,select,summary\):focus-visible/);
  assert.match(css.slice(css.indexOf('@media (prefers-reduced-motion: reduce)')), /\.quiet-home \.plan-top a:hover \{ transform: none; \}/);
});

for (const directory of ['', 'ja/', 'zh/']) {
  test(`W01 ${directory || 'en/'}: copy, prices, links, semantics and SEO stay unchanged`, async () => {
    for (const name of ['index.html', 'quiet-form.html']) {
      const file = directory + name;
      const html = await readFile(new URL(file, root), 'utf8');
      const before = execFileSync('git', ['show', `${base}:${file}`], {cwd:root,encoding:'utf8'});
      const normalize = value => value.replace(/\?v=\d{8}-\d{6}/g, '?v=BUILD');
      assert.equal(normalize(html), normalize(before), file);
      assert.equal((html.match(/href="license.html#comparison"/g) || []).length, 2);
      assert.match(html, /<caption\b/);
      assert.match(html, /<th scope="col"/);
    }
  });
}
