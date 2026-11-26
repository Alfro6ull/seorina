#!/usr/bin/env node
/** Check translation coverage, stable reading anchors, and static local links. */
import assert from "node:assert/strict";
import { readFile, access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const cache = new Map();
async function read(relative) {
  if (!cache.has(relative)) cache.set(relative, await readFile(path.join(root, relative), "utf8"));
  return cache.get(relative);
}
const unescape = value => value.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
const links = html => [...html.matchAll(/<a\b[^>]*\bhref="([^"]*)"/g)].map(match => unescape(match[1]));
const ids = html => [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
const locales = [
  { code: "zh", suffix: "", htmlLang: "zh-Hans" },
  { code: "ko", suffix: ".ko", htmlLang: "ko" },
  { code: "en", suffix: ".en", htmlLang: "en" },
];
const timeline = await read("life/index.html");
const archive = JSON.parse(timeline.match(/<script id="archive" type="application\/json">([\s\S]*?)<\/script>/)[1]);
const expectedEvents = archive.events.map(event => "name-" + event.id).sort();
let sourceLinks;
let sourceIds;
const pages = ["life/index.html"];

for (const locale of locales) {
  const file = `life/names${locale.suffix}.html`;
  const html = await read(file);
  const external = links(html).filter(href => /^https?:/.test(href));
  const anchors = ids(html).sort();
  assert.deepEqual(anchors.filter(id => /^name-e\d+$/.test(id)), expectedEvents, `${file}: missing or extra event anchors`);
  if (sourceLinks) assert.deepEqual(external, sourceLinks, `${file}: external source links differ from Chinese names`);
  if (sourceIds) assert.deepEqual(anchors, sourceIds, `${file}: reading anchors differ across languages`);
  sourceLinks = external;
  sourceIds = anchors;
  assert.ok(html.includes('href="names.css"'), `${file}: shared index stylesheet missing`);
  assert.ok(!/<style\b/.test(html), `${file}: duplicated inline stylesheet`);
  for (const kind of ["names", "research"]) {
    const page = `life/${kind}${locale.suffix}.html`;
    const content = await read(page);
    pages.push(page);
    assert.ok(content.includes(`<html lang="${locale.htmlLang}">`), `${page}: wrong language`);
    assert.ok(content.includes(`data-archive-language="${locale.code}"`), `${page}: wrong navigation language`);
    assert.equal(new Set(ids(content)).size, ids(content).length, `${page}: duplicate IDs`);
    const switches = [...content.matchAll(/<a\b[^>]*data-language="([^"]+)"[^>]*>/g)];
    assert.deepEqual(switches.map(match => match[1]).sort(), ["en", "ko", "zh"], `${page}: language links missing`);
    const active = switches.filter(match => match[0].includes('aria-current="page"'));
    assert.equal(active.length, 1, `${page}: current-language indicator missing`);
    assert.equal(active[0][1], locale.code, `${page}: current-language indicator incorrect`);
  }
}

for (const file of pages) {
  const html = await read(file);
  for (const href of links(html)) {
    if (/^(?:[a-z]+:|\/\/)/i.test(href)) continue;
    const url = new URL(href, `https://archive.test/${file}`);
    const relative = decodeURIComponent(url.pathname.slice(1));
    await access(path.join(root, relative));
    if (url.hash && relative.endsWith(".html")) {
      const target = await read(relative);
      assert.ok(ids(target).includes(decodeURIComponent(url.hash.slice(1))), `${file}: broken anchor ${href}`);
    }
  }
}
console.log(`Locale checks passed: ${expectedEvents.length} event anchors in each names page; identical source links and reading anchors; ${pages.length} HTML pages with valid local links.`);
