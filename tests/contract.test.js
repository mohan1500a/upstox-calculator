/**
 * Project-level checks. These read the files as text and make sure the pieces
 * that have to agree with each other still do: markup and scripts, CSS and
 * markup, config and docs, and the security rules the project promises.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { IDS } from '../public/js/ui/dom.js';
import { BROKERAGE_PLANS, DATA_REVIEWED_ON, TARIFF } from '../public/js/config/tariff.js';
import { INSTRUMENTS } from '../public/js/config/instruments.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC = path.join(ROOT, 'public');
const JS_DIR = path.join(PUBLIC, 'js');
const read = (...parts) => readFileSync(path.join(ROOT, ...parts), 'utf8');
const rel = (file) => path.relative(ROOT, file).split(path.sep).join('/');

function listFiles(dir, keep = () => true) {
  const found = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.git') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) found.push(...listFiles(full, keep));
    else if (keep(full)) found.push(full);
  }
  return found;
}

const html = read('public', 'index.html');
const jsFiles = listFiles(JS_DIR, (f) => f.endsWith('.js'));
const cssFiles = listFiles(path.join(PUBLIC, 'css'), (f) => f.endsWith('.css'));
const duplicates = (list) => list.filter((item, i) => list.indexOf(item) !== i);

/* ---------- index.html ---------- */

const htmlIds = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);

test('html: ids are unique', () => {
  assert.deepEqual(duplicates(htmlIds), []);
});

test('html: every element the scripts look up exists, and the id list has no duplicates', () => {
  assert.deepEqual(duplicates([...IDS]), []);
  assert.deepEqual(IDS.filter((id) => !htmlIds.includes(id)), []);
});

test('html: every id is used by a script, a label, an ARIA relationship or a fragment link', () => {
  const referenced = new Set(IDS);
  for (const m of html.matchAll(/\s(?:for|aria-controls|aria-labelledby|aria-describedby)="([^"]+)"/g)) {
    for (const id of m[1].split(/\s+/)) referenced.add(id);
  }
  for (const m of html.matchAll(/href="#([^"]+)"/g)) referenced.add(m[1]);
  assert.deepEqual(htmlIds.filter((id) => !referenced.has(id)), [], 'ids nothing refers to');
  for (const m of html.matchAll(/\s(?:for|aria-controls|aria-labelledby|aria-describedby)="([^"]+)"/g)) {
    for (const id of m[1].split(/\s+/)) assert.ok(htmlIds.includes(id), `${id} is referenced but does not exist`);
  }
});

test('html: no inline styles, inline event handlers or javascript: URLs', () => {
  assert.doesNotMatch(html, /\sstyle\s*=/);
  assert.doesNotMatch(html, /\son[a-z]+\s*=/i);
  assert.doesNotMatch(html, /javascript:/i);
  assert.doesNotMatch(html, /<script(?![^>]*\bsrc=)/i, 'no inline script blocks');
  assert.doesNotMatch(html, /<style[\s>]/i, 'no inline style blocks');
});

test('html: a strict Content-Security-Policy with no unsafe escapes', () => {
  const csp = /http-equiv="Content-Security-Policy"\s+content="([^"]+)"/.exec(html)?.[1];
  assert.ok(csp, 'CSP meta tag present');
  assert.match(csp, /default-src 'none'/);
  assert.match(csp, /script-src 'self'(;|$)/);
  assert.doesNotMatch(csp, /unsafe-inline|unsafe-eval|\*/);
  for (const directive of ['base-uri', 'form-action', 'img-src', 'style-src', 'font-src']) assert.ok(csp.includes(directive), directive);
});

test('html: local assets exist and external URLs are the expected ones', () => {
  const local = [...html.matchAll(/(?:href|src)="([^"#]+)"/g)].map((m) => m[1]).filter((u) => !/^https?:/.test(u));
  assert.ok(local.length >= 7);
  for (const asset of local) assert.ok(existsSync(path.join(PUBLIC, asset)), `${asset} exists`);

  const external = [...html.matchAll(/(?:href|src)="(https?:[^"]+)"/g)].map((m) => m[1].replace(/&amp;/g, '&'));
  for (const url of external) {
    assert.match(url, /^https:\/\/(fonts\.googleapis\.com|upstox\.com)\//, `unexpected host: ${url}`);
  }
  for (const tag of html.match(/<a\s[^>]*target="_blank"[^>]*>/g) ?? []) assert.match(tag, /rel="noopener noreferrer"/);
});

test('html: buttons declare a type, inputs have labels, tabs point at panels', () => {
  assert.doesNotMatch(html, /<button(?![^>]*\btype=)/);
  for (const m of html.matchAll(/<input\b[^>]*\sid="([^"]+)"/g)) {
    const wrapped = m[1] === 'include-fee'; // the switch input sits inside its <label>
    assert.ok(wrapped || html.includes(`for="${m[1]}"`), `input #${m[1]} has a label`);
  }
  for (const m of html.matchAll(/role="tab"[^>]*aria-controls="([^"]+)"/g)) {
    assert.match(html, new RegExp(`id="${m[1]}"[^>]*role="tabpanel"`), `${m[1]} is a tabpanel`);
  }
  assert.match(html, /<html lang="en">/);
  assert.match(html, /<meta name="viewport"[^>]*width=device-width/);
  assert.match(html, /<title>[^<]+<\/title>/);
});

test('html: nothing user-facing hard-codes a rate, lot size or default', () => {
  const body = html.replace(/<svg[\s\S]*?<\/svg>/g, '').replace(/<head>[\s\S]*?<\/head>/, '');
  for (const number of ['0.03553', '0.0325', '0.15%', '1800', '0.003']) assert.ok(!body.includes(number), `${number} belongs in config`);
  assert.doesNotMatch(body, /\svalue="/, 'inputs take their starting values from config/defaults.js');
});

/* ---------- scripts ---------- */

test('scripts: every file parses', () => {
  const files = [...jsFiles, ...listFiles(path.join(ROOT, 'scripts')), ...listFiles(path.join(ROOT, 'tests'))].filter((f) => f.endsWith('.js'));
  for (const file of files) {
    const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
    assert.equal(result.status, 0, `${rel(file)}: ${result.stderr}`);
  }
});

test('scripts: no HTML injection or dynamic code in the browser code', () => {
  for (const file of jsFiles) {
    const source = readFileSync(file, 'utf8');
    for (const banned of [/\.innerHTML\b/, /\.outerHTML\b/, /insertAdjacentHTML/, /document\.write/, /\beval\s*\(/, /new\s+Function\b/, /setTimeout\s*\(\s*['"`]/]) {
      assert.doesNotMatch(source, banned, `${rel(file)} uses ${banned}`);
    }
  }
});

function importsOf(source) {
  return [...source.matchAll(/(?:^|\n)\s*(?:import|export)\b[^;]*?\bfrom\s+['"]([^'"]+)['"]/g)].map((m) => m[1]);
}

test('scripts: imports are relative and only point "downhill" (config, engine, ui, main)', () => {
  const rank = { config: 0, engine: 1, ui: 2, main: 3 };
  const layer = (file) => (path.basename(file) === 'main.js' && path.dirname(file) === JS_DIR ? 'main' : path.basename(path.dirname(file)));
  for (const file of jsFiles) {
    for (const spec of importsOf(readFileSync(file, 'utf8'))) {
      assert.ok(spec.startsWith('.'), `${rel(file)} imports ${spec}: only relative imports`);
      const target = path.resolve(path.dirname(file), spec);
      assert.ok(existsSync(target), `${rel(file)} imports a missing file: ${spec}`);
      assert.ok(target.startsWith(JS_DIR + path.sep), `${rel(file)} reaches outside public/js`);
      assert.ok(rank[layer(target)] <= rank[layer(file)], `${rel(file)} (${layer(file)}) must not import ${layer(target)}`);
    }
  }
});

test('scripts: the engine and config never touch the page', () => {
  for (const file of jsFiles.filter((f) => /[\\/](engine|config)[\\/]/.test(f))) {
    assert.doesNotMatch(readFileSync(file, 'utf8'), /\b(document|window|localStorage|navigator)\b/, rel(file));
  }
});

test('scripts: nothing is exported without being used somewhere else', () => {
  const others = [...jsFiles, ...listFiles(path.join(ROOT, 'scripts')), ...listFiles(path.join(ROOT, 'tests'))].filter((f) => f.endsWith('.js'));
  const sources = new Map(others.map((f) => [f, readFileSync(f, 'utf8')]));
  const unused = [];
  for (const file of [...jsFiles, path.join(ROOT, 'scripts', 'dev-server.js'), path.join(ROOT, 'scripts', 'verify-live.js')]) {
    const source = sources.get(file);
    for (const m of source.matchAll(/export\s+(?:async\s+)?(?:function|const|class|let)\s+([A-Za-z0-9_$]+)/g)) {
      const name = m[1];
      const used = [...sources].some(([other, text]) => other !== file && new RegExp(`\\b${name}\\b`).test(text));
      if (!used) unused.push(`${rel(file)}: ${name}`);
    }
  }
  assert.deepEqual(unused, []);
});

/* ---------- CSS ---------- */

const stripComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');
const cssText = new Map(cssFiles.map((f) => [f, stripComments(readFileSync(f, 'utf8'))]));

function selectorsOf(css) {
  const preludes = [];
  for (const m of css.matchAll(/([^{}]+)\{/g)) {
    const prelude = m[1].trim();
    if (!prelude.startsWith('@')) preludes.push(prelude);
  }
  return preludes;
}

const cssClasses = new Set();
for (const css of cssText.values()) {
  for (const selector of selectorsOf(css)) for (const m of selector.matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)) cssClasses.add(m[1]);
}

const usedClasses = new Set();
for (const m of html.matchAll(/\sclass="([^"]+)"/g)) m[1].split(/\s+/).forEach((c) => usedClasses.add(c));
for (const file of jsFiles) {
  const source = readFileSync(file, 'utf8');
  for (const m of source.matchAll(/\bclass:\s*(['"`])([^'"`]+)\1/g)) m[2].split(/\s+/).forEach((c) => usedClasses.add(c));
  for (const m of source.matchAll(/\bclassName\s*=\s*(['"`])([^'"`]+)\1/g)) m[2].split(/\s+/).forEach((c) => usedClasses.add(c));
}

test('css: every class the markup or scripts use is styled', () => {
  assert.deepEqual([...usedClasses].filter((c) => !cssClasses.has(c)).sort(), []);
});

test('css: every class in the stylesheets is used (no dead rules)', () => {
  assert.deepEqual([...cssClasses].filter((c) => !usedClasses.has(c)).sort(), []);
});

test('css: every variable is defined and every definition is used', () => {
  const all = [...cssText.values()].join('\n');
  const defined = new Set([...cssText.get(path.join(PUBLIC, 'css', 'tokens.css')).matchAll(/(--[\w-]+)\s*:/g)].map((m) => m[1]));
  const used = new Set([...all.matchAll(/var\((--[\w-]+)/g)].map((m) => m[1]));
  assert.deepEqual([...used].filter((v) => !defined.has(v)).sort(), [], 'used but never defined');
  assert.deepEqual([...defined].filter((v) => !used.has(v)).sort(), [], 'defined but never used');
});

test('css: !important only where it is needed (base.css), no @import, no id selectors, colours only in tokens', () => {
  for (const [file, css] of cssText) {
    const name = path.basename(file);
    if (name !== 'base.css') assert.doesNotMatch(css, /!important/, `${name} uses !important`);
    assert.doesNotMatch(css, /@import/, `${name} uses @import, which serialises requests`);
    for (const selector of selectorsOf(css)) assert.doesNotMatch(selector, /(^|[\s,>+~])#[a-z_-]/i, `${name}: id selector in "${selector}"`);
    if (name !== 'tokens.css') assert.doesNotMatch(css, /#[0-9a-f]{3,8}\b/i, `${name} hard-codes a hex colour`);
  }
  assert.equal((cssText.get(path.join(PUBLIC, 'css', 'base.css')).match(/!important/g) ?? []).length, 5, 'base.css: [hidden] (1) and the reduced-motion block (4), nothing else');
});

test('css: honours reduced motion and shows keyboard focus', () => {
  const base = cssText.get(path.join(PUBLIC, 'css', 'base.css'));
  assert.match(base, /prefers-reduced-motion:\s*reduce/);
  assert.match(base, /:focus-visible/);
  assert.match(base, /\[hidden\]/);
});

/* ---------- contrast ---------- */

const tokens = new Map([...cssText.get(path.join(PUBLIC, 'css', 'tokens.css')).matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]));

function rgbOf(value) {
  const hex = /^#([0-9a-f]{6})$/i.exec(value);
  if (hex) return [0, 2, 4].map((i) => parseInt(hex[1].slice(i, i + 2), 16));
  const fn = /^rgb\(\s*(\d+)\s+(\d+)\s+(\d+)(?:\s*\/\s*(\d+)%)?\s*\)$/.exec(value);
  if (fn) return [Number(fn[1]), Number(fn[2]), Number(fn[3]), fn[4] === undefined ? 1 : Number(fn[4]) / 100];
  throw new Error(`cannot read colour: ${value}`);
}
const color = (name) => rgbOf(tokens.get(name));
const luminance = ([r, g, b]) => {
  const lin = (c) => ((c /= 255) <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
};
const contrast = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};
const over = ([r, g, b, a], [br, bg, bb]) => [r * a + br * (1 - a), g * a + bg * (1 - a), b * a + bb * (1 - a)];

test('contrast: text pairs meet WCAG AA (4.5:1)', () => {
  const pairs = [
    ['--text', '--surface'], ['--text', '--canvas'], ['--text', '--surface-muted'], ['--text', '--accent'], ['--text', '--accent-soft'],
    ['--text-muted', '--surface'], ['--text-muted', '--canvas'], ['--text-muted', '--surface-muted'], ['--text-muted', '--line'],
    ['--accent-strong', '--surface'], ['--accent-strong', '--accent-soft'], ['--danger', '--surface'], ['--surface', '--text'],
  ];
  for (const [fg, bg] of pairs) {
    const ratio = contrast(color(fg), color(bg));
    assert.ok(ratio >= 4.5, `${fg} on ${bg} is ${ratio.toFixed(2)}:1`);
  }
  const panel = over(color('--on-accent-panel'), color('--accent'));
  assert.ok(contrast(color('--text'), panel) >= 4.5, 'text on the stat tiles inside the hero');
});

test('contrast: interface boundaries and focus rings meet 3:1', () => {
  for (const [fg, bg] of [['--line-strong', '--surface'], ['--focus', '--canvas'], ['--focus', '--surface'], ['--danger', '--surface'], ['--accent-strong', '--surface']]) {
    const ratio = contrast(color(fg), color(bg));
    assert.ok(ratio >= 3, `${fg} on ${bg} is ${ratio.toFixed(2)}:1`);
  }
});

/* ---------- headers, secrets, hygiene ---------- */

test('headers: the deploy headers carry what a meta tag cannot', () => {
  const headers = read('public', '_headers');
  for (const expected of [/frame-ancestors 'none'/, /X-Content-Type-Options:\s*nosniff/, /Referrer-Policy:/, /Strict-Transport-Security:/, /Cache-Control:\s*no-cache/, /Permissions-Policy:/]) {
    assert.match(headers, expected);
  }
});

test('secrets: .env stays out of git and out of the deploy folder, and no credentials are committed', () => {
  const ignore = read('.gitignore').split(/\r?\n/);
  assert.ok(ignore.includes('.env') && ignore.includes('.env.*') && ignore.includes('!.env.example'));
  assert.deepEqual(listFiles(PUBLIC).map((f) => path.basename(f)).filter((n) => n.startsWith('.')), [], 'no dotfiles under public/');

  for (const line of read('.env.example').split(/\r?\n/)) {
    if (line.trim() === '' || line.startsWith('#')) continue;
    assert.match(line, /^[A-Z_]+=$/, `.env.example must hold names only: ${line}`);
  }

  const jwt = /eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/;
  const assignment = /(api[_-]?secret|api[_-]?key|access[_-]?token|client[_-]?secret)\s*[:=]\s*['"]?[A-Za-z0-9_\-.]{16,}/i;
  const skip = /\.(png|jpe?g|gif|ico|woff2?|zip)$/i;
  for (const file of listFiles(ROOT, (f) => !skip.test(f) && path.basename(f) !== '.env')) {
    const text = readFileSync(file, 'utf8');
    assert.doesNotMatch(text, jwt, `${rel(file)} contains a token-shaped string`);
    if (rel(file) !== 'tests/verify-live.test.js') assert.doesNotMatch(text, assignment, `${rel(file)} assigns a credential`);
  }
});

test('package.json and CI are set up for a private static project', () => {
  const pkg = JSON.parse(read('package.json'));
  assert.equal(pkg.private, true);
  assert.equal(pkg.type, 'module');
  assert.ok(pkg.engines?.node);
  assert.equal(pkg.scripts.test, 'node --test');
  assert.equal(pkg.dependencies, undefined);
  assert.equal(pkg.devDependencies, undefined);

  const ci = read('.github', 'workflows', 'ci.yml');
  for (const expected of [/permissions:\s*\n\s+contents:\s*read/, /timeout-minutes:/, /concurrency:/, /cancel-in-progress:\s*true/, /npm test/]) assert.match(ci, expected);
  assert.ok(existsSync(path.join(ROOT, 'LICENSE')));
  assert.ok(existsSync(path.join(ROOT, '.editorconfig')));
});

/* ---------- docs stay in step with config ---------- */

test('docs: TARIFF.md lists the rates and contract sizes the code uses', () => {
  const doc = read('docs', 'TARIFF.md');
  assert.ok(doc.includes(DATA_REVIEWED_ON), 'review date');
  const percent = (fraction) => `${Number((fraction * 100).toPrecision(6))}%`;
  for (const expected of [percent(TARIFF.sttSellRate), percent(TARIFF.exchangeRate.NSE), percent(TARIFF.exchangeRate.BSE), percent(TARIFF.stampBuyRate), percent(TARIFF.gstRate), `₹${TARIFF.tick}`]) {
    assert.ok(doc.includes(expected), `TARIFF.md should mention ${expected}`);
  }
  assert.ok(doc.includes(`₹${Math.round(TARIFF.sebiRate * 1e7)} per crore`));
  for (const plan of Object.values(BROKERAGE_PLANS)) assert.ok(doc.includes(`₹${plan.perOrder}`), `${plan.label} brokerage`);
  for (const spec of Object.values(INSTRUMENTS)) {
    const row = new RegExp(`\\|\\s*${spec.label}\\s*\\|\\s*${spec.exchange}\\s*\\|\\s*${spec.lotSize}\\s*\\|\\s*${spec.freezeQty}\\s*\\|\\s*${spec.maxLots}\\s*\\|`);
    assert.match(doc, row, `${spec.label} row in TARIFF.md`);
  }
});

test('docs: the README describes the layout that exists', () => {
  const readme = read('README.md');
  for (const listed of ['index.html', 'dev-server.js', 'verify-live.js', 'ARCHITECTURE.md', 'TARIFF.md', '_headers']) {
    assert.ok(readme.includes(listed), `README mentions ${listed}`);
    assert.ok(listFiles(ROOT).some((f) => path.basename(f) === listed), `${listed} exists`);
  }
  assert.doesNotMatch(readme, /Antigravity|Lumos|zero dependencies/i);
});
