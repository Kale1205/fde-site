import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);

function option(name, fallback) {
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
}

const host = option('--host', '0.0.0.0');
const port = Number(option('--port', '4173'));
const types = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.gif', 'image/gif'],
  ['.html', 'text/html; charset=utf-8'],
  ['.ico', 'image/x-icon'],
  ['.jpeg', 'image/jpeg'],
  ['.jpg', 'image/jpeg'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.mp4', 'video/mp4'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml'],
  ['.txt', 'text/plain; charset=utf-8'],
  ['.webp', 'image/webp'],
  ['.xml', 'application/xml; charset=utf-8']
]);

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url || '/', `http://${request.headers.host || 'terminal.local'}`);
    let relative = decodeURIComponent(url.pathname).replace(/^\/+/, '');
    if (!relative || relative.endsWith('/')) relative += 'index.html';
    let target = path.resolve(root, relative);
    if (target !== root && !target.startsWith(`${root}${path.sep}`)) throw new Error('Invalid path');
    const targetStat = await stat(target);
    if (targetStat.isDirectory()) target = path.join(target, 'index.html');
    const body = await readFile(target);
    const headers = {
      'Cache-Control': 'no-store',
      'Accept-Ranges': 'bytes',
      'Content-Type': types.get(path.extname(target).toLowerCase()) || 'application/octet-stream'
    };
    const rangeHeader = request.headers.range;
    if (rangeHeader) {
      const range = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader);
      const suffix = range && !range[1] && range[2] ? Number(range[2]) : null;
      const start = suffix !== null ? Math.max(0, body.length - suffix) : Number(range?.[1] || 0);
      const end = suffix !== null || !range?.[2] ? body.length - 1 : Math.min(Number(range[2]), body.length - 1);
      if (!range || (!range[1] && !range[2]) || start > end || start >= body.length || suffix === 0) {
        response.writeHead(416, { ...headers, 'Content-Range': 'bytes */' + body.length });
        response.end();
        return;
      }
      response.writeHead(206, { ...headers, 'Content-Range': 'bytes ' + start + '-' + end + '/' + body.length, 'Content-Length': end - start + 1 });
      response.end(request.method === 'HEAD' ? undefined : body.subarray(start, end + 1));
      return;
    }
    response.writeHead(200, { ...headers, 'Content-Length': body.length });
    response.end(request.method === 'HEAD' ? undefined : body);
  } catch {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Not found');
  }
});

server.listen(port, host, () => {
  process.stdout.write(`Baked Kale preview running on http://${host}:${port}\n`);
});
