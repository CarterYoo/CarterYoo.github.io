import { cp, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Liquid } from 'liquidjs';
import { parse } from 'yaml';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputRoot = path.join(projectRoot, 'dist');
const engine = new Liquid({ strictFilters: true, strictVariables: false });

function asObject(value, filename) {
  if (value === null || value === undefined) return {};
  if (typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${filename} must contain a YAML mapping.`);
  }
  return value;
}

async function readYaml(filename) {
  return asObject(parse(await readFile(path.join(projectRoot, filename), 'utf8')), filename);
}

function splitFrontMatter(source, filename) {
  const normalized = source.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
  const match = normalized.match(/^---[ \t]*\n([\s\S]*?)\n---[ \t]*(?:\n|$)/);
  if (!match) return { attributes: {}, body: normalized };
  return {
    attributes: asObject(parse(match[1]), filename),
    body: normalized.slice(match[0].length),
  };
}

function decodeEntities(value) {
  return value.replace(/&(?:amp|quot|apos|lt|gt|#\d+|#x[\da-f]+);/gi, (entity) => {
    const names = { '&amp;': '&', '&quot;': '"', '&apos;': "'", '&lt;': '<', '&gt;': '>' };
    const key = entity.toLowerCase();
    if (names[key]) return names[key];
    const numeric = key.startsWith('&#x')
      ? Number.parseInt(key.slice(3, -1), 16)
      : Number.parseInt(key.slice(2, -1), 10);
    return numeric >= 0 && numeric <= 0x10ffff ? String.fromCodePoint(numeric) : entity;
  });
}

function stripComments(source) {
  return source.replace(/<!--[\s\S]*?-->/g, '');
}

function collectReferences(source) {
  const references = [];
  const html = stripComments(source);
  const attribute = /\b(href|src|poster)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi;
  for (const match of html.matchAll(attribute)) {
    references.push(decodeEntities(match[2] ?? match[3] ?? match[4]).trim());
  }
  return references;
}

function collectIds(source) {
  const ids = new Set();
  const attribute = /\b(?:id|name)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi;
  for (const match of stripComments(source).matchAll(attribute)) {
    ids.add(decodeEntities(match[1] ?? match[2] ?? match[3]));
  }
  return ids;
}

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const filename = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(filename));
    else if (entry.isFile()) files.push(filename);
  }
  return files;
}

async function validateReferences(config) {
  const failures = [];
  const idCache = new Map();
  const baseurl = String(config.baseurl || '').replace(/\/$/, '');
  const siteOrigin = config.url ? new URL(config.url).origin : null;
  let checked = 0;

  async function check(rawReference, fromFile, validateHash = true) {
    if (!rawReference || rawReference === '#') return;
    let reference = rawReference;
    if (reference.startsWith('//')) return;
    if (/^[a-z][a-z\d+.-]*:/i.test(reference)) {
      if (!/^https?:/i.test(reference)) return;
      const absolute = new URL(reference);
      if (!siteOrigin || absolute.origin !== siteOrigin) return;
      reference = absolute.pathname + absolute.search + absolute.hash;
    }

    const hashIndex = reference.indexOf('#');
    const hash = hashIndex < 0 ? '' : reference.slice(hashIndex + 1);
    const pathname = (hashIndex < 0 ? reference : reference.slice(0, hashIndex)).split('?')[0];
    let decodedPath;
    let decodedHash;
    try {
      decodedPath = decodeURIComponent(pathname);
      decodedHash = decodeURIComponent(hash);
    } catch {
      failures.push(`${path.relative(outputRoot, fromFile)}: malformed URL ${rawReference}`);
      return;
    }

    if (baseurl && (decodedPath === baseurl || decodedPath.startsWith(`${baseurl}/`))) {
      decodedPath = decodedPath.slice(baseurl.length) || '/';
    }
    let target = decodedPath === ''
      ? fromFile
      : decodedPath.startsWith('/')
        ? path.resolve(outputRoot, `.${decodedPath}`)
        : path.resolve(path.dirname(fromFile), decodedPath);
    if (target !== outputRoot && !target.startsWith(`${outputRoot}${path.sep}`)) {
      failures.push(`${path.relative(outputRoot, fromFile)}: URL leaves the site: ${rawReference}`);
      return;
    }
    try {
      if ((await stat(target)).isDirectory()) target = path.join(target, 'index.html');
      await stat(target);
    } catch {
      failures.push(`${path.relative(outputRoot, fromFile)}: missing file ${rawReference}`);
      return;
    }
    checked += 1;
    if (validateHash && decodedHash && /\.html?$/i.test(target)) {
      if (!idCache.has(target)) idCache.set(target, collectIds(await readFile(target, 'utf8')));
      if (!idCache.get(target).has(decodedHash)) {
        failures.push(`${path.relative(outputRoot, fromFile)}: missing anchor ${rawReference}`);
      }
    }
  }

  for (const filename of await walk(outputRoot)) {
    if (/\.html?$/i.test(filename)) {
      const html = await readFile(filename, 'utf8');
      if (/\{%[\s\S]*?%\}|\{\{[\s\S]*?\}\}/.test(html)) {
        failures.push(`${path.relative(outputRoot, filename)}: unrendered Liquid syntax`);
      }
      for (const reference of collectReferences(html)) await check(reference, filename);
    } else if (/\.css$/i.test(filename)) {
      const css = (await readFile(filename, 'utf8')).replace(/\/\*[\s\S]*?\*\//g, '');
      for (const match of css.matchAll(/url\(\s*(?:"([^"]*)"|'([^']*)'|([^\s)]+))\s*\)/gi)) {
        const reference = (match[1] ?? match[2] ?? match[3]).trim();
        if (!reference.startsWith('#')) await check(reference, filename, false);
      }
    }
  }
  if (failures.length) throw new Error(`Internal URL validation failed:\n${failures.join('\n')}`);
  return checked;
}

function escapeXml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;',
  })[character]);
}

async function build() {
  const config = await readYaml('_config.yml');
  const data = {};
  for (const entry of await readdir(path.join(projectRoot, '_data'), { withFileTypes: true })) {
    if (entry.isFile() && /\.ya?ml$/i.test(entry.name)) {
      data[path.parse(entry.name).name] = await readYaml(path.join('_data', entry.name));
    }
  }
  const index = splitFrontMatter(await readFile(path.join(projectRoot, 'index.html'), 'utf8'), 'index.html');
  const layoutName = index.attributes.layout || 'default';
  if (!/^[a-z\d_-]+$/i.test(layoutName)) throw new Error('Invalid layout name in index.html.');
  const layoutPath = path.join('_layouts', `${layoutName}.html`);
  const layout = splitFrontMatter(await readFile(path.join(projectRoot, layoutPath), 'utf8'), layoutPath);
  const context = { site: { ...config, data }, page: { url: '/', ...index.attributes } };
  const content = await engine.parseAndRender(index.body, context);
  const html = await engine.parseAndRender(layout.body, { ...context, content });

  await rm(outputRoot, { recursive: true, force: true });
  await mkdir(outputRoot, { recursive: true });
  for (const directory of ['libs', 'assets']) {
    await cp(path.join(projectRoot, directory), path.join(outputRoot, directory), { recursive: true });
  }
  await writeFile(path.join(outputRoot, 'index.html'), html);
  const sitemapLine = config.url ? `Sitemap: ${String(config.url).replace(/\/$/, '')}${String(config.baseurl || '').replace(/\/$/, '')}/sitemap.xml\n` : '';
  await writeFile(path.join(outputRoot, 'robots.txt'), `User-agent: *\nAllow: /\n${sitemapLine}`);
  await writeFile(path.join(outputRoot, '.nojekyll'), '');

  if (config.url) {
    const homepage = new URL(`${String(config.baseurl || '').replace(/\/$/, '')}/`, `${String(config.url).replace(/\/$/, '')}/`);
    const updated = String(config.updated || '');
    const lastmod = /^\d{4}-\d{2}-\d{2}$/.test(updated) ? `<lastmod>${escapeXml(updated)}</lastmod>` : '';
    await writeFile(path.join(outputRoot, 'sitemap.xml'),
      `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${escapeXml(homepage.href)}</loc>${lastmod}</url></urlset>\n`);
  }

  const checked = await validateReferences(config);
  console.log(`Built dist/index.html; validated ${checked} internal URLs.`);
}

build().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
