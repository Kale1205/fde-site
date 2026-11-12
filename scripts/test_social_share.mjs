import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {shareImage, withSharedImage, applyReviewedShareImage} from './social_share_metadata.mjs';
import {applyReviewedPublicPresentation} from './public_presentation.mjs';

const root = new URL('../', import.meta.url);
const read = file => readFileSync(new URL(file, root), 'utf8');
const baseline = file => execFileSync('git', ['show', `01010c0cc7a4e03594338d6bd6f0c7fd7bf546fa:${file}`], {cwd: root});
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const tags = html => [...html.matchAll(/<meta\b[^>]*>/g)].map(([tag]) => {
  const attrs = Object.fromEntries([...tag.matchAll(/([\w:-]+)="([^"]*)"/g)].map(m => [m[1], m[2]]));
  return {name: attrs.property || attrs.name, content: attrs.content};
});

test('all 35 HTML documents share one explicit, correctly typed official image', () => {
  assert.equal(shareImage.paths.length, 35);
  for (const file of shareImage.paths) {
    const html = read(file), meta = tags(html);
    for (const [name, value] of Object.entries({'og:image': shareImage.imageUrl, 'og:image:secure_url': shareImage.imageUrl, 'og:image:type': 'image/png', 'og:image:width': '1200', 'og:image:height': '630', 'twitter:image': shareImage.imageUrl, 'twitter:card': 'summary_large_image'})) {
      assert.deepEqual(meta.filter(m => m.name === name).map(m => m.content), [value], `${file}: ${name}`);
    }
    for (const name of ['og:image:alt', 'twitter:image:alt']) assert.equal(meta.filter(m => m.name === name && m.content?.includes('Baked Kale')).length, 1, `${file}: ${name}`);
    assert.equal(withSharedImage(html), html, `${file}: idempotent metadata`);
    const firstBody = html.search(/<(?:body|main)\b/);
    assert(html.indexOf('property="og:image"') < firstBody, file);
    assert(html.indexOf('<meta charset="utf-8">') < 1024, file);
  }
});

test('titles, descriptions, canonical, schema, robots, redirects and every body byte stay protected', () => {
  const strip = source => source
    .replace(/\n<!-- Shared official Instagram image -->\n[\s\S]*?<!-- End shared official Instagram image -->\n/g, '')
    .replace(/<meta\b[^>]*>/g, tag => /(?:property|name)="(?:og:image(?::(?:url|secure_url|type|width|height|alt))?|twitter:(?:image(?::alt)?|card))"/.test(tag) ? '' : tag)
    .replace(/(\.(?:js|css)\?v=)\d{8}-\d{6}/g, '$1BUILD')
    .replace(/>\s+</g, '><').trim();
  for (const file of shareImage.paths) assert.equal(strip(read(file)), strip(applyReviewedPublicPresentation(file,baseline(file).toString())), file);
  const ownership = 'google7f844744756e4b18.html';
  assert.equal(read(ownership), baseline(ownership).toString());
});

test('the PNG has a fresh content-hash URL and the complete native source remains embedded', () => {
  const png = readFileSync(new URL(shareImage.imagePath, root));
  assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  assert.equal(png.readUInt32BE(16), 1200); assert.equal(png.readUInt32BE(20), 630);
  assert.equal(hash(png), shareImage.sha256);
  assert(shareImage.imagePath.endsWith(shareImage.sha256.slice(0, 12) + '.png'));
  const native = readFileSync(new URL(shareImage.sourceImagePath, root));
  assert.equal(hash(native), '3b2ad8bff9a086767706118651a0c27758c624d0f454291bffffb640193d7ecf');
  const svg = read(shareImage.compositionSource);
  assert.deepEqual(Buffer.from(svg.match(/data:image\/jpeg;base64,([^"]+)/)[1], 'base64'), native);
  assert(svg.includes('x="375" y="90" width="450" height="450" preserveAspectRatio="xMidYMid meet"'));
  assert(375 >= (1200 - 630) / 2 && 375 + 450 <= (1200 + 630) / 2, 'complete source survives a centered square crop');
  assert.equal(shareImage.sourceProfile, 'https://www.instagram.com/bakedkale/');
});

test('warehouse, site artwork, feed, motion and operational scripts remain byte-identical', () => {
  for (const file of ['assets/warehouse-operations.webp', 'assets/instagram-bakedkale-profile-20261110.jpg', 'assets/instagram-kale1999-profile-20261110.jpg', 'content/instagram-feed.json', 'content/site-content.json', 'gallery-ui.js', 'quiet-form.js', 'demo-v1.js', 'quiet-customer.js', 'contact-direct.js', 'news-books.js', 'sculpture-motion.js', 'motion-preferences.js', 'goals02-scene.js', 'quiet-pages.css', 'quiet-form.css', 'news-books.css']) assert.deepEqual(readFileSync(new URL(file, root)), baseline(file), file);
});

test('historical snapshot adaptation cannot hide unknown metadata or unrelated content', () => {
  const file = 'ja/index.html', source = baseline(file).toString();
  assert.equal(applyReviewedShareImage(file, source), withSharedImage(source));
  const unknown = source.replace('assets/warehouse-operations.webp', 'assets/unapproved.png');
  assert.equal(applyReviewedShareImage(file, unknown), unknown);
  assert.equal(applyReviewedShareImage('unrelated.html', source), source);
  assert.equal(applyReviewedShareImage(file, '<button>Keep this control</button>'), '<button>Keep this control</button>');
  const changedBody = source.replace('id="plans"', 'id="changed-plan-route"');
  assert(applyReviewedShareImage(file, changedBody).includes('id="changed-plan-route"'));
});
