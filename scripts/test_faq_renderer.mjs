import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {mergeFaqData, renderFaqPage} from '../faq-renderer.js';

const root = new URL('../', import.meta.url);
const read = file => readFileSync(new URL(file, root), 'utf8');
const locales = ['ja', 'en', 'zh-CN'];
const translated = (ja, en, zh) => ({ja, en, 'zh-CN': zh});
const record = (id = 'synthetic-base', overrides = {}) => ({
  id, category: 'synthetic', subcategory: 'usage', highFrequency: false,
  question: translated('合成の質問ですか？', 'Is this a synthetic question?', '这是合成问题吗？'),
  answer: translated('合成回答です。', 'This is a synthetic answer.', '这是合成回答。'),
  keywords: translated(['合成'], ['synthetic'], ['合成']),
  synonyms: translated(['試験'], ['fixture'], ['测试']),
  ...overrides
});
const fixture = () => ({
  base: {
    version: 3, locales: [...locales],
    categories: {synthetic: {order: 1, label: translated('合成分類', 'Synthetic category', '合成分类')}},
    subcategories: {usage: {category: 'synthetic', label: translated('使い方', 'Usage', '使用方法')}},
    faq: [record()]
  },
  policy: {faq: [record('synthetic-policy')]}
});
const source = locale => `<!doctype html>\n<html lang="${locale}">\n<head><meta name="keep" content="exact &amp; unchanged"></head>\n<body>\n<header data-keep="yes">Outside before</header>\n<section>\n        <div id="cmsFaqList">Old fallback must be replaced.\n        </div><div id="faqEmpty" class="faq-empty" hidden>Keep this localized empty label.</div>\n</section>\n<footer>Outside after \" ' &amp; &lt; &gt;</footer>\n</body>\n</html>\n`;
const startAnchor = '<div id="cmsFaqList">';
const endAnchor = '</div><div id="faqEmpty"';
function parts(html) {
  const start = html.indexOf(startAnchor) + startAnchor.length, end = html.indexOf(endAnchor, start);
  assert(start >= startAnchor.length && end >= start, 'test fixture anchors exist');
  return {before: html.slice(0, start), inside: html.slice(start, end), after: html.slice(end)};
}
const renderedIds = html => [...html.matchAll(/<article class="faq-item" data-faq-id="([^"]+)"/g)].map(match => match[1]);
function freeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) freeze(child);
  }
  return value;
}

test('current raw FAQ sources merge in source order without changing either input or pinning an editorial count', () => {
  const base = freeze(JSON.parse(read('content/faq-content.json')));
  const policy = freeze(JSON.parse(read('content/faq-policy-additions.json')));
  const before = JSON.stringify({base, policy});
  const merged = mergeFaqData(base, policy);
  assert.equal(merged.faq.length, base.faq.length + policy.faq.length);
  assert.equal(new Set(merged.faq.map(item => item.id)).size, merged.faq.length);
  assert.deepEqual(merged.faq, [...base.faq, ...policy.faq]);
  assert.deepEqual(merged.categories, base.categories);
  assert.deepEqual(merged.subcategories, base.subcategories);
  assert.equal(JSON.stringify({base, policy}), before);
});

for (const [locale, file] of [['en', 'contact.html'], ['ja', 'ja/contact.html'], ['zh-CN', 'zh/contact.html']]) {
  test(`${file}: raw JSON renders the committed FAQ fallback bytes exactly and is idempotent`, () => {
    const base = freeze(JSON.parse(read('content/faq-content.json')));
    const policy = freeze(JSON.parse(read('content/faq-policy-additions.json')));
    const original = read(file), before = JSON.stringify({base, policy});
    const output = renderFaqPage(original, base, policy, locale);
    assert.equal(output, original);
    assert.equal(renderFaqPage(output, base, policy, locale), output);
    assert.equal(renderedIds(output).length, base.faq.length + policy.faq.length);
    assert.equal(JSON.stringify({base, policy}), before);
  });
}

test('merge is pure with frozen synthetic inputs and preserves fields outside the FAQ array', () => {
  const {base, policy} = fixture();
  base.syntheticMetadata = {keep: 'untouched'};
  base.faq[0].translationStatus = 'manually-reviewed';
  policy.faq[0].syntheticMetadata = {keep: 'policy record'};
  const before = structuredClone({base, policy});
  freeze(base); freeze(policy);
  const merged = mergeFaqData(base, policy);
  assert.notEqual(merged, base);
  assert.notEqual(merged.faq, base.faq);
  assert.deepEqual({...merged, faq: null}, {...base, faq: null});
  assert.deepEqual(merged.faq, [...base.faq, ...policy.faq]);
  assert.deepEqual({base, policy}, before);
});

for (const locale of locales) {
  test(`${locale}: synthetic create/edit/delete updates both sources and leaves the page exterior exact`, () => {
    const {base, policy} = fixture();
    const original = source(locale), initial = renderFaqPage(original, base, policy, locale);
    base.faq.push(record('new-unknown-cms-id', {
      question: translated('新規の合成質問', 'New synthetic question', '新建手写问题'),
      answer: translated('新規の合成回答', 'New synthetic answer', '新建手写回答')
    }));
    policy.faq.push(record('new-policy-cms-id'));
    base.faq[0].question = translated('編集後の質問', 'Edited question', '现有条目的手写问题');
    base.faq[0].answer = translated('編集後の回答', 'Edited answer', '现有条目的手写回答');
    policy.faq[0].answer = translated('編集したpolicy回答', 'Edited policy answer', '手写政策回答');
    const expected = structuredClone({base, policy});
    freeze(base); freeze(policy);
    const updated = renderFaqPage(initial, base, policy, locale);
    assert.deepEqual(renderedIds(updated), ['synthetic-base', 'new-unknown-cms-id', 'synthetic-policy', 'new-policy-cms-id']);
    assert(updated.includes(base.faq[0].question[locale]));
    assert(updated.includes(base.faq[0].answer[locale]));
    assert(updated.includes(policy.faq[0].answer[locale]));
    assert(updated.includes(base.faq[1].question[locale]));
    const editedCard = updated.match(/<article class="faq-item" data-faq-id="synthetic-base"[\s\S]*?<\/article>/)?.[0];
    assert(editedCard && !editedCard.includes(record().answer[locale]), 'the edited card does not retain its old answer');
    assert.deepEqual({base, policy}, expected);
    assert.equal(parts(updated).before, parts(original).before);
    assert.equal(parts(updated).after, parts(original).after);
    assert.equal(renderFaqPage(updated, base, policy, locale), updated);

    const deletedBase = structuredClone(base), deletedPolicy = structuredClone(policy);
    deletedBase.faq = deletedBase.faq.filter(item => item.id !== 'synthetic-base');
    deletedPolicy.faq = deletedPolicy.faq.filter(item => item.id !== 'synthetic-policy');
    const removed = renderFaqPage(updated, deletedBase, deletedPolicy, locale);
    assert.deepEqual(renderedIds(removed), ['new-unknown-cms-id', 'new-policy-cms-id']);
    assert(!removed.includes('data-faq-id="synthetic-base"'));
    assert(!removed.includes('data-faq-id="synthetic-policy"'));
    assert.equal(parts(removed).before, parts(original).before);
    assert.equal(parts(removed).after, parts(original).after);
  });
}

test('known existing IDs keep manually edited Chinese and English rather than historical translation-table copy', () => {
  const {base, policy} = fixture();
  base.faq[0] = record('license-updates-difference', {
    question: translated('本人確認済み合成質問', 'Manually reviewed English question', '本人确认的中文问题'),
    answer: translated('本人確認済み合成回答', 'Manually reviewed English answer', '本人确认的中文回答')
  });
  const before = structuredClone({base, policy});
  const merged = mergeFaqData(base, policy);
  assert.deepEqual(merged.faq[0], base.faq[0]);
  for (const locale of ['en', 'zh-CN']) {
    const output = renderFaqPage(source(locale), base, policy, locale);
    assert(output.includes(base.faq[0].question[locale]));
    assert(output.includes(base.faq[0].answer[locale]));
  }
  assert.deepEqual({base, policy}, before);
});

test('high-frequency sorting is stable across base and policy while merge and inputs retain source order', () => {
  const {base, policy} = fixture();
  base.faq = [record('regular-1'), record('frequent-1', {highFrequency: true}), record('regular-2')];
  policy.faq = [record('frequent-2', {highFrequency: true}), record('regular-3'), record('frequent-3', {highFrequency: true})];
  const before = structuredClone({base, policy});
  assert.deepEqual(mergeFaqData(base, policy).faq.map(item => item.id), [...base.faq, ...policy.faq].map(item => item.id));
  for (const locale of locales) assert.deepEqual(renderedIds(renderFaqPage(source(locale), base, policy, locale)),
    ['frequent-1', 'frequent-2', 'frequent-3', 'regular-1', 'regular-2', 'regular-3']);
  assert.deepEqual({base, policy}, before);
});

test('new taxonomy keys and empty keyword/synonym arrays work without a historical Chinese lookup', () => {
  const {base, policy} = fixture();
  base.categories = {'new-category': {order: 8, label: translated('新分類', 'New category', '新分类')}};
  base.subcategories = {'new-subcategory': {category: 'new-category', label: translated('新小分類', 'New subcategory', '新子分类')}};
  base.faq[0] = record('new-record', {category: 'new-category', subcategory: 'new-subcategory',
    keywords: translated([], [], []), synonyms: translated([], [], [])});
  policy.faq = [];
  for (const locale of locales) {
    const output = renderFaqPage(source(locale), base, policy, locale);
    assert(output.includes('data-faq-terms=""'));
    assert(output.includes(base.categories['new-category'].label[locale]));
    assert(output.includes(base.subcategories['new-subcategory'].label[locale]));
  }
});

test('empty datasets render a valid empty FAQ region rather than requiring a fixed count', () => {
  const {base, policy} = fixture(); base.faq = []; policy.faq = [];
  assert.deepEqual(mergeFaqData(base, policy).faq, []);
  for (const locale of locales) {
    const original = source(locale), output = renderFaqPage(original, base, policy, locale);
    assert.deepEqual(renderedIds(output), []);
    assert(!output.includes('Old fallback'));
    assert.equal(parts(output).before, parts(original).before);
    assert.equal(parts(output).after, parts(original).after);
  }
});

test('text, search terms and taxonomy attributes are escaped; answer newlines alone become br markup', () => {
  const {base, policy} = fixture();
  const category = 'cat" data-injected="x', subcategory = 'sub\'&<x>';
  base.categories = {[category]: {order: 1, label: translated('分類<&"\'', 'Category<&"\'', '分类<&"\'')}};
  base.subcategories = {[subcategory]: {category, label: translated('小分類<&"\'', 'Usage<&"\'', '子分类<&"\'')}};
  base.faq = [record('A_safe-1', {category, subcategory,
    question: translated('<script>ja</script> & "\'', '<script>en</script> & "\'', '<script>zh</script> & "\''),
    answer: translated('先頭<&>\n次行"\'\n\n末尾', 'First<&>\nNext"\'\n\nLast', '首行<&>\n次行"\'\n\n末行'),
    keywords: translated(['a"&<'], ['a"&<'], ['a"&<']),
    synonyms: translated(["b'>"], ["b'>"], ["b'>"])
  })];
  policy.faq = [];
  const output = renderFaqPage(source('en'), base, policy, 'en'), inside = parts(output).inside;
  assert(inside.includes('data-faq-id="A_safe-1"'));
  assert(inside.includes('aria-controls="faq-answer-A_safe-1"'));
  assert(inside.includes('id="faq-answer-A_safe-1"'));
  assert(inside.includes('data-faq-category-key="cat&quot; data-injected=&quot;x"'));
  assert(inside.includes('data-faq-subcategory="sub&#39;&amp;&lt;x&gt;"'));
  assert(inside.includes('data-faq-terms="a&quot;&amp;&lt; b&#39;&gt;"'));
  assert(inside.includes('&lt;script&gt;en&lt;/script&gt; &amp; &quot;&#39;'));
  assert(inside.includes('First&lt;&amp;&gt;<br>Next&quot;&#39;<br><br>Last'));
  assert(!inside.includes('<script>'));
  assert(!inside.includes(' data-injected="x"'));
  assert.equal((inside.match(/<article /g) || []).length, 1);
});

test('reject duplicate IDs within either source and across sources instead of silently picking a winner', async t => {
  for (const where of ['base', 'policy', 'across']) await t.test(where, () => {
    const {base, policy} = fixture();
    if (where === 'base') base.faq.push(structuredClone(base.faq[0]));
    if (where === 'policy') policy.faq.push(structuredClone(policy.faq[0]));
    if (where === 'across') policy.faq[0].id = base.faq[0].id;
    assert.throws(() => mergeFaqData(base, policy));
    assert.throws(() => renderFaqPage(source('en'), base, policy, 'en'));
  });
});

test('safe IDs accept the 200-character boundary and reject attribute injection or unsafe identifiers', async t => {
  for (const id of ['A', 'a_B-9', 'a'.repeat(200)]) {
    const {base, policy} = fixture(); base.faq[0].id = id;
    assert(renderFaqPage(source('en'), base, policy, 'en').includes(`data-faq-id="${id}"`));
  }
  for (const id of ['', ' ', '-leading', '_leading', 'two words', 'a/b', 'a.b', 'a" onclick="x', '<tag>', '中文', 'a'.repeat(201), null, 7]) {
    await t.test(String(id), () => {
      const {base, policy} = fixture(); base.faq[0].id = id;
      const before = structuredClone({base, policy});
      assert.throws(() => mergeFaqData(base, policy));
      assert.deepEqual({base, policy}, before);
    });
  }
});

test('reject malformed document, version and three-locale declarations', async t => {
  const mutations = [
    ['base null', f => {f.base = null;}], ['policy null', f => {f.policy = null;}],
    ['base FAQ missing', f => {delete f.base.faq;}], ['policy FAQ missing', f => {delete f.policy.faq;}],
    ['base FAQ object', f => {f.base.faq = {};}], ['policy FAQ object', f => {f.policy.faq = {};}],
    ['wrong version', f => {f.base.version = 2;}], ['string version', f => {f.base.version = '3';}],
    ['version missing', f => {delete f.base.version;}], ['locales missing', f => {delete f.base.locales;}],
    ['locales string', f => {f.base.locales = 'ja,en,zh-CN';}],
    ['duplicate locale', f => {f.base.locales = ['ja', 'en', 'zh-CN', 'ja'];}],
    ...locales.map(locale => [`undeclared ${locale}`, f => {f.base.locales = locales.filter(value => value !== locale);}])
  ];
  for (const [name, mutate] of mutations) await t.test(name, () => {
    const f = fixture(); mutate(f);
    assert.throws(() => mergeFaqData(f.base, f.policy));
  });
});

test('reject missing/non-string/blank three-locale questions and answers in either source', async t => {
  for (const where of ['base', 'policy']) for (const field of ['question', 'answer']) for (const locale of locales) {
    for (const value of [undefined, '', ' \n\t ', 0, null, ['text']]) await t.test(`${where} ${field} ${locale} ${JSON.stringify(value)}`, () => {
      const f = fixture(); f[where].faq[0][field][locale] = value;
      assert.throws(() => mergeFaqData(f.base, f.policy));
    });
  }
});

test('reject non-array or non-string members in each locale of keywords and synonyms', async t => {
  for (const field of ['keywords', 'synonyms']) for (const locale of locales) {
    for (const value of [undefined, null, 'keyword', {}, [1], [null], ['valid', {}]]) await t.test(`${field} ${locale} ${JSON.stringify(value)}`, () => {
      const f = fixture(); f.policy.faq[0][field][locale] = value;
      assert.throws(() => mergeFaqData(f.base, f.policy));
    });
  }
});

test('reject missing or non-boolean highFrequency and malformed FAQ records', async t => {
  for (const value of [undefined, null, 0, 1, 'true', []]) await t.test(`highFrequency ${JSON.stringify(value)}`, () => {
    const f = fixture(); f.base.faq[0].highFrequency = value;
    assert.throws(() => mergeFaqData(f.base, f.policy));
  });
  for (const value of [null, 'record', 7, []]) await t.test(`record ${JSON.stringify(value)}`, () => {
    const f = fixture(); f.policy.faq[0] = value;
    assert.throws(() => mergeFaqData(f.base, f.policy));
  });
});

test('taxonomy references, subcategory parent and all used labels must be valid', async t => {
  const mutations = [
    ['unknown category', f => {f.base.faq[0].category = 'missing';}],
    ['unknown subcategory', f => {f.base.faq[0].subcategory = 'missing';}],
    ['missing category map', f => {delete f.base.categories;}],
    ['missing subcategory map', f => {delete f.base.subcategories;}],
    ['parent mismatch', f => {f.base.subcategories.usage.category = 'different';}],
    ['parent missing', f => {delete f.base.subcategories.usage.category;}]
  ];
  for (const taxonomy of ['categories', 'subcategories']) for (const locale of locales) {
    for (const value of [undefined, '', '  ', null, 3]) mutations.push([
      `${taxonomy} label ${locale} ${JSON.stringify(value)}`,
      f => {f.base[taxonomy][taxonomy === 'categories' ? 'synthetic' : 'usage'].label[locale] = value;}
    ]);
  }
  for (const [name, mutate] of mutations) await t.test(name, () => {
    const f = fixture(); mutate(f);
    assert.throws(() => mergeFaqData(f.base, f.policy));
  });
});

test('reject unsupported or mismatching render locale and missing page language', async t => {
  for (const locale of ['zh', 'fr', '', undefined]) await t.test(`unsupported ${String(locale)}`, () => {
    const {base, policy} = fixture();
    assert.throws(() => renderFaqPage(source('en'), base, policy, locale));
  });
  for (const locale of locales) for (const pageLocale of locales.filter(value => value !== locale)) await t.test(`${locale} / ${pageLocale}`, () => {
    const {base, policy} = fixture();
    assert.throws(() => renderFaqPage(source(pageLocale), base, policy, locale));
  });
  const {base, policy} = fixture();
  assert.throws(() => renderFaqPage(source('en').replace(' lang="en"', ''), base, policy, 'en'));
  assert.throws(() => renderFaqPage(null, base, policy, 'en'));
});

test('refuse missing, repeated or reversed fallback anchors instead of replacing an ambiguous region', async t => {
  const original = source('en');
  const badPages = [
    ['missing start', original.replace(startAnchor, '<div id="differentFaqList">')],
    ['missing end', original.replace('id="faqEmpty"', 'id="differentEmpty"')],
    ['duplicate start', original.replace('</body>', `${startAnchor}duplicate</div>\n</body>`)],
    ['duplicate end', original.replace('</body>', `${endAnchor}>duplicate</div>\n</body>`)],
    ['no anchors', '<html lang="en"><body>No FAQ region</body></html>'],
    ['reversed anchors', `<html lang="en">${endAnchor}></div>${startAnchor}broken</html>`]
  ];
  for (const [name, html] of badPages) await t.test(name, () => {
    const {base, policy} = fixture();
    assert.throws(() => renderFaqPage(html, base, policy, 'en'));
    assert.equal(original, source('en'));
  });
});

test('renderer module has no Node file access, network, DOM or persistent-storage dependency', () => {
  const code = read('faq-renderer.js').replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '');
  assert.doesNotMatch(code, /(?:from\s*|import\s*(?:\(\s*)?|require\s*\(\s*)['"](?:node:|fs(?:\/promises)?['"])/);
  assert.doesNotMatch(code, /\b(?:readFileSync|readFile|writeFileSync|writeFile|fetch|XMLHttpRequest|sendBeacon|DOMParser)\s*\(/);
  assert.doesNotMatch(code, /\b(?:document|window|navigator|localStorage|sessionStorage|indexedDB)\s*(?:\.|\[)/);
});
