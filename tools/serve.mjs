// A tiny static server for the site (it has no build step).
//   node site/tools/serve.mjs [port]      → http://localhost:8080
// Also imported by build-pdfs.mjs, which serves on a random port.
import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { dirname, extname, join, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml', '.pdf': 'application/pdf', '.mp4': 'video/mp4', '.vtt': 'text/vtt; charset=utf-8', '.ico': 'image/x-icon', '.wasm': 'application/wasm', '.woff2': 'font/woff2',
};

export function serve(port = 0, host = '127.0.0.1') {
  const server = createServer((req, res) => {
    let file = join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
    if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
    if (!(file === ROOT || file.startsWith(ROOT + sep)) || !existsSync(file)) { res.writeHead(404); res.end('Not found'); return; }
    const head = { 'Content-Type': TYPES[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store', 'Accept-Ranges': 'bytes' };
    // Byte ranges, so a video can seek (browsers ask for "bytes=start-" when you jump ahead).
    const size = statSync(file).size;
    const m = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || '');
    if (m && (m[1] || m[2])) {
      const start = m[1] ? Number(m[1]) : Math.max(0, size - Number(m[2]));
      const end = m[1] && m[2] ? Math.min(Number(m[2]), size - 1) : size - 1;
      if (start > end || start >= size) { res.writeHead(416, { 'Content-Range': `bytes */${size}` }); res.end(); return; }
      res.writeHead(206, { ...head, 'Content-Range': `bytes ${start}-${end}/${size}`, 'Content-Length': end - start + 1 });
      createReadStream(file, { start, end }).pipe(res);
      return;
    }
    res.writeHead(200, { ...head, 'Content-Length': size });
    createReadStream(file).pipe(res);
  });
  return new Promise((ok) => server.listen(port, host, () => ok(server)));
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.argv[2]) || 8080;
  await serve(port);
  console.log(`Serving ${ROOT} at http://localhost:${port}/  (Ctrl+C to stop)`);
}
