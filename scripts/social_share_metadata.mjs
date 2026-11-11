import {readFileSync, writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

export const shareImage = JSON.parse(readFileSync(new URL('./social_share_manifest.json', import.meta.url), 'utf8'));
const marker = /\n<!-- Shared official Instagram image -->\n[\s\S]*?<!-- End shared official Instagram image -->\n/g;
const imageMeta = /<meta\b(?=[^>]*(?:property|name)="(?:og:image(?::(?:url|secure_url|type|width|height|alt))?|twitter:(?:image(?::alt)?|card))")[^>]*>/g;
const alternatives = {
  en: 'Official Baked Kale Instagram profile image: Baked Kale lettering and a cream 3D icon on green.',
  ja: '緑の背景にBaked Kaleの文字と白い立体アイコン。公式Instagramのプロフィール画像。',
  'zh-CN': 'Baked Kale 官方 Instagram 头像：绿色背景上的 Baked Kale 字样与奶白色立体图标。',
};

export function sharedImageBlock(source) {
  const language = source.match(/<html\b[^>]*\blang="([^"]+)"/)?.[1] || 'en';
  const alt = alternatives[language] || alternatives.en;
  return '\n<!-- Shared official Instagram image -->\n' + [
    ['property', 'og:image', shareImage.imageUrl],
    ['property', 'og:image:secure_url', shareImage.imageUrl],
    ['property', 'og:image:type', shareImage.type],
    ['property', 'og:image:width', shareImage.width],
    ['property', 'og:image:height', shareImage.height],
    ['property', 'og:image:alt', alt],
    ['name', 'twitter:card', 'summary_large_image'],
    ['name', 'twitter:image', shareImage.imageUrl],
    ['name', 'twitter:image:alt', alt],
  ].map(([attribute, name, content]) => `<meta ${attribute}="${name}" content="${content}">`).join('\n') +
    '\n<!-- End shared official Instagram image -->\n';
}

// Static head metadata only. The Google ownership file is intentionally plain text.
export function withSharedImage(source) {
  if (!/^<!doctype html>/i.test(source) || !source.includes('<meta charset="utf-8">')) return source;
  const end = source.indexOf('</head>');
  const boundary = end < 0 ? source.indexOf('<main>') : end;
  if (boundary < 0) throw Error('Missing static document head boundary');
  const head = source.slice(0, boundary).replace(marker, '').replace(imageMeta, '').replace(/^[ \t]+(?=\r?$)/gm, '');
  const charset = '<meta charset="utf-8">';
  return head.replace(charset, charset + sharedImageBlock(head)) + source.slice(boundary);
}

// Historical snapshots accept only the exact former image tags for this path.
// Unknown metadata and all body bytes continue to fail the existing guards.
export function applyReviewedShareImage(file, source) {
  if (!Object.hasOwn(shareImage.legacyImageTags, file) || !/^<!doctype html>/i.test(source)) return source;
  if (source.includes('<!-- Shared official Instagram image -->')) return source;
  const allowed = [...shareImage.legacyImageTags[file]];
  for (const tag of source.match(imageMeta) || []) {
    const at = allowed.indexOf(tag);
    if (at < 0) return source;
    allowed.splice(at, 1);
  }
  return withSharedImage(source);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = new URL('../', import.meta.url);
  const files = execFileSync('git', ['ls-files', '*.html'], {cwd: root, encoding: 'utf8'}).trim().split('\n');
  let count = 0;
  for (const file of files) {
    const url = new URL(file, root), source = readFileSync(url, 'utf8'), result = withSharedImage(source);
    if (result === source) continue;
    if (process.argv.includes('--check')) throw Error(`Sharing image metadata is stale: ${file}`);
    writeFileSync(url, result); count++;
  }
  console.log(process.argv.includes('--check') ? 'Shared image metadata is current.' : `Updated sharing metadata in ${count} pages.`);
}
