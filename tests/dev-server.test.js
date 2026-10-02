import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { readdirSync, readFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createStaticServer, parseHeaders, resolveRequestPath } from '../scripts/dev-server.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const headers = parseHeaders(readFileSync(path.join(ROOT, 'public', '_headers'), 'utf8'));

const servers = [];
let tmp;

function start(options) {
  return new Promise((resolve) => {
    const server = createStaticServer(options);
    servers.push(server);
    server.listen(0, '127.0.0.1', () => resolve(server.address().port));
  });
}

/** Raw request, so paths like /../x reach the server exactly as written (fetch would tidy them). */
function request(port, rawPath, method = 'GET') {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port, path: rawPath, method }, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks).toString('utf8') }));
    });
    req.on('error', reject);
    req.end();
  });
}

let publicPort;
let tmpPort;

before(async () => {
  publicPort = await start({ headers });
  tmp = await mkdtemp(path.join(os.tmpdir(), 'dev-server-'));
  await mkdir(path.join(tmp, 'assets'));
  await writeFile(path.join(tmp, 'index.html'), '<h1>temp</h1>');
  await writeFile(path.join(tmp, '.secret'), 'nope');
  await writeFile(path.join(tmp, 'assets', 'data.bin'), 'x');
  tmpPort = await start({ root: tmp, headers });
});

after(async () => {
  for (const server of servers) {
    server.closeAllConnections();
    server.close();
  }
  await rm(tmp, { recursive: true, force: true });
});

test('serves the app with the right types and the production headers', async () => {
  const page = await request(publicPort, '/');
  assert.equal(page.status, 200);
  assert.match(page.headers['content-type'], /^text\/html/);
  assert.match(page.body, /<title>Options Suite/);
  assert.equal(page.headers['cache-control'], 'no-cache');
  assert.equal(page.headers['x-content-type-options'], 'nosniff');
  assert.match(page.headers['content-security-policy'], /frame-ancestors 'none'/);

  assert.match((await request(publicPort, '/js/main.js')).headers['content-type'], /^text\/javascript/);
  assert.match((await request(publicPort, '/css/tokens.css')).headers['content-type'], /^text\/css/);
  assert.match((await request(publicPort, '/favicon.svg')).headers['content-type'], /^image\/svg\+xml/);
  assert.equal((await request(publicPort, '/index.html?tab=compounding')).status, 200, 'query strings are ignored');
});

test('every file the page references is served', async () => {
  const html = readFileSync(path.join(ROOT, 'public', 'index.html'), 'utf8');
  const local = [...html.matchAll(/(?:href|src)="([^":#]+)"/g)].map((m) => m[1]).filter((p) => !p.startsWith('http'));
  assert.ok(local.length >= 7);
  for (const asset of local) assert.equal((await request(publicPort, `/${asset}`)).status, 200, asset);
});

test('every module is served, and every module on disk is reachable from main.js', async () => {
  const seen = new Set();
  const queue = ['/js/main.js'];
  while (queue.length > 0) {
    const url = queue.pop();
    if (seen.has(url)) continue;
    seen.add(url);
    const res = await request(publicPort, url);
    assert.equal(res.status, 200, url);
    for (const match of res.body.matchAll(/from\s+'(\.{1,2}\/[^']+)'/g)) {
      queue.push(new URL(match[1], `http://x${url}`).pathname);
    }
  }

  // Reachable from main.js and present on disk must be the same set: no missing file, no orphan.
  const onDisk = readdirSync(path.join(ROOT, 'public', 'js'), { recursive: true })
    .filter((file) => file.endsWith('.js'))
    .map((file) => `/js/${file.split(path.sep).join('/')}`);
  assert.deepEqual([...seen].sort(), onDisk.sort());
});

test('path traversal, dotfiles and odd escapes are refused', async () => {
  for (const evil of ['/../package.json', '/js/../../package.json', '/%2e%2e/package.json', '/..%2fpackage.json', '/%2e%2e%2fpackage.json', '/js/%2e%2e/%2e%2e/package.json', '/..%5cpackage.json', '/%00', '/%E0%A4%A', '/.env', '/.git/config']) {
    const res = await request(publicPort, evil);
    assert.equal(res.status, 404, evil);
    assert.ok(!res.body.includes('"name"'), `${evil} leaked package.json`);
  }
  assert.equal((await request(tmpPort, '/.secret')).status, 404);
  assert.equal((await request(tmpPort, '/assets/../.secret')).status, 404);
});

test('directories fall back to index.html, unknown files give 404, unknown types stay opaque', async () => {
  assert.match((await request(tmpPort, '/')).body, /temp/);
  assert.equal((await request(tmpPort, '/assets')).status, 404, 'a directory without index.html');
  assert.equal((await request(tmpPort, '/missing.js')).status, 404);
  const bin = await request(tmpPort, '/assets/data.bin');
  assert.equal(bin.headers['content-type'], 'application/octet-stream');
  assert.equal(bin.headers['x-content-type-options'], 'nosniff');
});

test('only GET and HEAD are accepted', async () => {
  const head = await request(publicPort, '/', 'HEAD');
  assert.equal(head.status, 200);
  assert.equal(head.body, '');
  assert.ok(Number(head.headers['content-length']) > 0);

  for (const method of ['POST', 'PUT', 'DELETE']) {
    const res = await request(publicPort, '/', method);
    assert.equal(res.status, 405, method);
    assert.equal(res.headers.allow, 'GET, HEAD');
  }
});

test('resolveRequestPath', () => {
  const root = path.resolve('/srv/public');
  assert.equal(resolveRequestPath(root, '/css/base.css?v=1#x'), path.join(root, 'css', 'base.css'));
  assert.equal(resolveRequestPath(root, '/'), root);
  for (const bad of ['/..', '/a/../../b', '/%2e%2e/x', '/.hidden', '/a/.hidden/b', '/a%00b', '/%zz', '/a\\b', '/..\\x']) {
    assert.equal(resolveRequestPath(root, bad), null, bad);
  }
});

test('parseHeaders reads only the catch-all block', () => {
  const parsed = parseHeaders(
    ['# comment', '/*', '  X-A: 1', '  Content-Security-Policy: frame-ancestors \'none\'', '', '/api/*', '  X-B: 2', '/*', '  X-C: three: with colon'].join('\n'),
  );
  assert.deepEqual(parsed, { 'X-A': '1', 'Content-Security-Policy': "frame-ancestors 'none'", 'X-C': 'three: with colon' });
  assert.deepEqual(parseHeaders(''), {});
  for (const name of ['X-Content-Type-Options', 'Content-Security-Policy', 'Cache-Control', 'Strict-Transport-Security']) {
    assert.ok(headers[name], `public/_headers sets ${name}`);
  }
});
