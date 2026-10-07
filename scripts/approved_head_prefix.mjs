// Recompose a known static document, rather than trying to sanitize HTML.
// Metadata precedes the generated asset suffix in the approved pages.
// Unexpected layouts or executable scripts fail closed for human review.
export function approvedHeadPrefix(source, {jsonLd = false} = {}) {
  const boundary = source.indexOf('<link rel="stylesheet"');
  const end = source.indexOf('</head>');
  if (boundary < 0 || end < boundary) throw Error('Approved asset suffix missing');
  const prefix = source.slice(0, boundary);
  const openings = [...prefix.matchAll(/<script\b/gi)];
  const blocks = [...prefix.matchAll(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi)];
  if (!jsonLd && openings.length) throw Error('Unexpected script in static metadata');
  if (jsonLd) {
    if (openings.length !== 1 || blocks.length !== 1 ||
        !blocks[0][0].startsWith('<script type="application/ld+json">')) {
      throw Error('Only the approved JSON-LD block may precede generated assets');
    }
    const content = blocks[0][0].slice('<script type="application/ld+json">'.length);
    JSON.parse(content.slice(0, content.lastIndexOf('</')));
  }
  return prefix;
}
