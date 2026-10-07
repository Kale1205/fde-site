import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {execApprovedNamingBaseline as execFileSync} from './approved_product_naming.mjs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import test from 'node:test';
import { renderQuietHomepage } from './build_quiet_homepages.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const baseline = 'e13457ad75068fa753b3f6dc6705d1aa1de2a61c';
for (const [locale, directory] of Object.entries({en:'', ja:'ja/', zh:'zh/'})) {
  test(`${locale}: normal homepage matches the approved layout and preserves SEO`, async () => {
    const name = `${directory}index.html`;
    const html = await readFile(path.join(root, name), 'utf8');
    const preview = await readFile(path.join(root, directory, 'quiet-form.html'), 'utf8');
    const approvedBody = preview.slice(preview.indexOf('<body ')).replaceAll('quiet-form.html','index.html').replace(/href="([^"]*)index\.html"/g,(_,dir)=>`href="${dir||'./'}"`).trim();
    assert.equal(html.slice(html.indexOf('<body ')).trim(), approvedBody);
    assert.equal(html, await renderQuietHomepage(locale), 'generation is idempotent');
    assert.doesNotMatch(html, /noindex|quiet-form\.html|source-home|night-lab/);
    const original = execFileSync('git', ['show', `${baseline}:${name}`], {cwd:root,encoding:'utf8'});
    for (const pattern of [/<title>[\s\S]*?<\/title>/, /<meta name="description"[^>]+>/, /<meta name="robots"[^>]+>/, /<link rel="canonical"[^>]+>/]) assert.equal(html.match(pattern)?.[0], original.match(pattern)?.[0]);
    assert.deepEqual([...html.matchAll(/<link rel="alternate"[^>]+>/g)].map(m=>m[0]), [...original.matchAll(/<link rel="alternate"[^>]+>/g)].map(m=>m[0]));
    const graph = value => JSON.parse(value.match(/<script type="application\/ld\+json">\s*([\s\S]*?)<\/script>/)[1])['@graph'];
    assert.deepEqual(graph(html),graph(original).filter(n=>n['@type']!=='FAQPage'));
    assert.equal((html.match(/<h1\b/g)||[]).length,1);
    assert.match(html,/quiet-form\.css\?v=/);
    assert.match(html,/demo-v1\.js\?v=/);
    assert.match(html,/quiet-form\.js\?v=/);
    for(const value of ['¥49,800','¥99,800','¥4,900','¥9,800','2026']) assert(html.includes(value));
    for(const page of ['license','demo','goals','news','contact']) assert(html.includes(`${page}.html`));
    assert.doesNotMatch(html,/buy-button|stripe|checkout\.html|data-buy/);
  });
}
