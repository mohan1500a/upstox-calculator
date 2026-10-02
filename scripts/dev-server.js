#!/usr/bin/env node
/**
 * Minimal static server for local development. No dependencies.
 *
 * Serves only the public/ folder, binds to 127.0.0.1, and applies the catch-all
 * block from public/_headers, so local responses carry the same headers as production.
 *
 *   npm start                 http://127.0.0.1:8080
 *   PORT=3000 npm start
 */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const PUBLIC_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'public');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
};

/** Read the "/*" block of a Netlify-style _headers file into a plain object. */
export function parseHeaders(text) {
  const headers = {};
  let inCatchAll = false;
  for (const line of text.split(/\r?\n/)) {
    if (line.trim() === '' || line.trim().startsWith('#')) continue;
    if (!/^\s/.test(line)) {
      inCatchAll = line.trim() === '/*';
      continue;
    }
    const colon = line.indexOf(':');
    if (inCatchAll && colon > 0) headers[line.slice(0, colon).trim()] = line.slice(colon + 1).trim();
  }
  return headers;
}

/**
 * Map a request URL to a file inside `root`, or null if it is not allowed.
 * Rejects traversal, dotfiles, NUL bytes, backslashes and malformed escapes.
 */
export function resolveRequestPath(root, rawUrl) {
  let pathname;
  try {
    pathname = decodeURIComponent(rawUrl.split(/[?#]/, 1)[0]);
  } catch {
    return null;
  }
  if (pathname.includes('\0')) return null;
  const segments = pathname.split('/').filter(Boolean);
  if (segments.some((s) => s === '..' || s.startsWith('.') || s.includes('\\'))) return null;
  const target = path.join(root, ...segments);
  return target === root || target.startsWith(root + path.sep) ? target : null;
}

export function createStaticServer({ root = PUBLIC_DIR, headers = {} } = {}) {
  const base = path.resolve(root);

  return createServer(async (req, res) => {
    const reply = (status, body, type = 'text/plain; charset=utf-8', extra = {}) => {
      res.writeHead(status, { ...headers, 'Content-Type': type, 'Content-Length': Buffer.byteLength(body), ...extra });
      res.end(req.method === 'HEAD' ? undefined : body);
    };

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      reply(405, 'Method not allowed', undefined, { Allow: 'GET, HEAD' });
      return;
    }

    let file = resolveRequestPath(base, req.url ?? '/');
    if (!file) {
      reply(404, 'Not found');
      return;
    }

    try {
      if ((await stat(file)).isDirectory()) file = path.join(file, 'index.html');
      const body = await readFile(file);
      const type = MIME_TYPES[path.extname(file).toLowerCase()] ?? 'application/octet-stream';
      res.writeHead(200, { ...headers, 'Content-Type': type, 'Content-Length': body.length });
      res.end(req.method === 'HEAD' ? undefined : body);
    } catch {
      reply(404, 'Not found');
    }
  });
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  const port = Number(process.env.PORT ?? 8080);
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    console.error(`PORT must be a whole number from 0 to 65535, got "${process.env.PORT}".`);
    process.exit(1);
  }
  const headersText = await readFile(path.join(PUBLIC_DIR, '_headers'), 'utf8').catch(() => '');
  const server = createStaticServer({ headers: parseHeaders(headersText) });
  server.on('error', (error) => {
    console.error(error.code === 'EADDRINUSE' ? `Port ${port} is busy. Try PORT=${port + 1} npm start.` : error.message);
    process.exit(1);
  });
  server.listen(port, '127.0.0.1', () => {
    console.log(`Serving public/ at http://127.0.0.1:${port}  (Ctrl+C to stop)`);
  });
}
