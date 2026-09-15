// Tiny static server for the spike test page. No dependencies.
// Usage: node serve.mjs   ->   http://localhost:8080/  (and http://<LAN-IP>:8080/ from your phone/iPad)
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = join(dirname(fileURLToPath(import.meta.url)), 'web');
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.wasm': 'application/wasm',
  '.riv': 'application/octet-stream',
  '.png': 'image/png',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
};
const port = Number(process.env.PORT || 8080);

http.createServer(async (req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p === '/' || p === '') p = '/index.html';
  const file = normalize(join(rootDir, p));
  if (!file.startsWith(rootDir)) { res.writeHead(403); res.end('forbidden'); return; }
  try {
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': types[extname(file).toLowerCase()] || 'application/octet-stream' });
    res.end(body);
    console.log('200', p);
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('not found: ' + p);
    console.log('404', p);
  }
}).listen(port, '0.0.0.0', () => {
  console.log(`spike server: http://localhost:${port}/  (LAN: http://<this-PC-ip>:${port}/)`);
});
