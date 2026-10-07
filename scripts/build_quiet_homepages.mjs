// Promote the user-approved homepage without copying preview-only SEO or URLs.
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { renderQuietPreview } from './build_quiet_form_preview.mjs';
import { approvedHeadPrefix } from './approved_head_prefix.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const directories = { en: '', ja: 'ja/', zh: 'zh/' };

export async function renderQuietHomepage(locale) {
  const prefix = locale === 'en' ? '' : '../';
  const source = await readFile(path.join(root, directories[locale], 'index.html'), 'utf8');
  const version = (await readFile(path.join(root, 'build-version.txt'), 'utf8')).trim();
  // Keep each existing title, description, canonical, hreflang and entity IDs.
  let head = approvedHeadPrefix(source, {jsonLd: true});
  head = head.replace(/(<script type="application\/ld\+json">)\s*([\s\S]*?)(<\/script>)/, (_, open, json, close) => {
    const data = JSON.parse(json);
    // The approved layout has no FAQ section. Never advertise invisible FAQs.
    data['@graph'] = data['@graph'].filter(node => node['@type'] !== 'FAQPage');
    return `${open}\n${JSON.stringify(data, null, 2)}\n${close}`;
  });
  head += `<link rel="stylesheet" href="${prefix}gallery-ui.css?v=${version}">\n`;
  head += `<link rel="stylesheet" href="${prefix}quiet-form.css?v=${version}">\n`;
  for (const script of ['gallery-ui.js', 'demo-v1.js', 'quiet-form.js']) {
    head += `<script defer src="${prefix}${script}?v=${version}"></script>\n`;
  }
  const preview = await renderQuietPreview(locale);
  const body = preview.slice(preview.indexOf('<body '))
    .replaceAll('quiet-form.html', 'index.html')
    .replace(/href="([^"]*)index\.html"/g, (_, directory) => `href="${directory || './'}"`);
  return `${head}</head>\n${body}\n`;
}

if (path.resolve(process.argv[1] || '') === fileURLToPath(import.meta.url)) {
  let stale = false;
  for (const locale of Object.keys(directories)) {
    const target = path.join(root, directories[locale], 'index.html');
    const output = await renderQuietHomepage(locale);
    if (process.argv.includes('--check')) {
      if ((await readFile(target, 'utf8')) !== output) {
        console.error(`${directories[locale]}index.html is stale; run node scripts/build_quiet_homepages.mjs`);
        stale = true;
      }
    } else {
      await writeFile(target, output);
    }
  }
  if (stale) process.exit(1);
}
