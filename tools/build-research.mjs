#!/usr/bin/env node
/**
 * Build the three browser-readable research pages from their Markdown sources.
 * Generated HTML is committed, so GitHub Pages needs no Node runtime.
 * Run npm run build:research after editing the Markdown or shared template.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { Marked, Renderer } from 'marked';
import { markedSiteFooter } from './site-footer.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const check = process.argv.includes('--check');
const template = await readFile(path.join(root, 'life/templates/research.html'), 'utf8');
const languages = [
  {
    language: 'zh', htmlLang: 'zh-Hans', label: '中文', menuLabel: '语言', suffix: '',
    description: '薛仁雅生平与作品的公开资料考据、日期核对、待考线索及多语种出处。',
    siteIndexLabel: '站点索引', navLabel: '档案导航', archiveLabel: '← 生平档案', namesLabel: '语名索引',
    topLabel: '返回页首 ↑', sourceLabel: 'Markdown 原文', 
    tableLabel: '资料表，可横向滚动',
  },
  {
    language: 'ko', htmlLang: 'ko', label: '한국어', menuLabel: '언어', suffix: '.ko',
    description: '설인아의 생애와 작품에 관한 공개 자료, 날짜 검증, 확인 대기 항목 및 다국어 출처.',
    siteIndexLabel: '사이트 목록 (중문)', navLabel: '아카이브 탐색', archiveLabel: '← 생애·활동 기록 (중문)', namesLabel: '이름·작품명 색인',
    topLabel: '맨 위로 ↑', sourceLabel: 'Markdown 원문', 
    tableLabel: '자료 표, 가로로 스크롤 가능',
  },
  {
    language: 'en', htmlLang: 'en', label: 'English', menuLabel: 'Language', suffix: '.en',
    description: 'Public-source research on Seorina’s life and career, date checks, unresolved leads and multilingual references.',
    siteIndexLabel: 'Site index (Chinese)', navLabel: 'Archive navigation', archiveLabel: '← Life archive (Chinese)', namesLabel: 'Names & Titles Index',
    topLabel: 'Back to top ↑', sourceLabel: 'Markdown source', 
    tableLabel: 'Research table, scroll horizontally',
  },
];

function escape(value) {
  return value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}

function createParser() {
  const parser = new Marked({ gfm: true, breaks: false });
  // Chinese and Korean prose joins emphasized punctuation directly to the next
  // word. Treat that authored **text** as strong without changing the source.
  parser.use({ extensions: [{
    name: 'cjkStrong',
    level: 'inline',
    start(source) { return source.indexOf('**'); },
    tokenizer(source) {
      const match = /^\*\*([^*\n]+)\*\*(?=[\p{Script=Han}\p{Script=Hangul}])/u.exec(source);
      if (match) return { type: 'cjkStrong', raw: match[0], tokens: this.lexer.inlineTokens(match[1]) };
    },
    renderer(token) { return `<strong>${this.parser.parseInline(token.tokens)}</strong>`; },
  }] });
  return parser;
}

function markdownLinks(tokens) {
  const result = [];
  const walk = token => {
    if (token.type === 'link') result.push(token.href);
    if (token.type === 'table') {
      for (const cell of [...token.header, ...token.rows.flat()]) for (const child of cell.tokens) walk(child);
    } else if (token.type === 'list') {
      for (const item of token.items) for (const child of item.tokens) walk(child);
    } else if (token.tokens) for (const child of token.tokens) walk(child);
  };
  for (const token of tokens) walk(token);
  return result;
}

let failed = false;
let expectedStructure;
let expectedExternalLinks;
for (const locale of languages) {
  const source = `research${locale.suffix}.md`;
  const output = `research${locale.suffix}.html`;
  const markdown = await readFile(path.join(root, 'life', source), 'utf8');
  const parser = createParser();
  const tokens = parser.lexer(markdown);
  const titleToken = tokens.find(token => token.type === 'heading' && token.depth === 1);
  if (!titleToken) throw new Error(`${source}: missing title`);
  const bodyTokens = tokens;

  let sectionCount = 0;
  let tableCount = 0;
  let recordCount = 0;
  let headingId = 'research-title';
  const tableRows = [];
  const renderer = new Renderer();
  renderer.link = function (token) {
    const title = token.title ? ` title="${escape(token.title)}"` : '';
    return `<a href="${escape(token.href)}"${title}>${this.parser.parseInline(token.tokens)}</a>`;
  };
  renderer.heading = function (token) {
    if (token.depth === 1) headingId = 'research-title';
    else headingId = `section-${String(++sectionCount).padStart(2, '0')}`;
    return `<h${token.depth} id="${headingId}" data-reading-anchor>${this.parser.parseInline(token.tokens)}</h${token.depth}>\n`;
  };
  renderer.table = function (token) {
    tableCount++;
    tableRows.push(token.rows.length);
    const header = token.header.map(cell => `<th scope="col">${this.parser.parseInline(cell.tokens)}</th>`).join('');
    const rows = token.rows.map(cells => {
      const id = `record-${String(++recordCount).padStart(3, '0')}`;
      return `<tr id="${id}" data-reading-anchor>${cells.map(cell => `<td>${this.parser.parseInline(cell.tokens)}</td>`).join('')}</tr>`;
    }).join('\n');
    return `<div class="research-table" role="region" tabindex="0" aria-label="${escape(locale.tableLabel)}" aria-describedby="${headingId}">\n<table>\n<thead><tr>${header}</tr></thead>\n<tbody>\n${rows}\n</tbody>\n</table>\n</div>\n`;
  };
  parser.use({ renderer });
  const body = parser.parser(bodyTokens);
  const copyright = markedSiteFooter('life/'+output, locale.language);
  const structure = { sections: sectionCount, tables: tableCount, rows: tableRows };
  if (expectedStructure && JSON.stringify(structure) !== JSON.stringify(expectedStructure)) {
    throw new Error(`${source}: heading/table structure differs across translations`);
  }
  expectedStructure = structure;

  // Verify that the renderer keeps every original Markdown link in its order.
  const renderedLinks = [...body.matchAll(/href="([^"]*)"/g)].map(match => match[1].replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'"));
  const sourceLinks = markdownLinks(tokens);
  if (JSON.stringify(sourceLinks) !== JSON.stringify(renderedLinks)) {
    const mismatch = sourceLinks.findIndex((link, index) => link !== renderedLinks[index]);
    throw new Error(`${source}: rendered links do not match Markdown sources at ${mismatch}: ${sourceLinks[mismatch]} / ${renderedLinks[mismatch]}`);
  }
  const externalLinks = sourceLinks.filter(link => /^https?:\/\//.test(link));
  if (expectedExternalLinks && JSON.stringify(externalLinks) !== JSON.stringify(expectedExternalLinks)) {
    throw new Error(`${source}: external source URLs differ across translations`);
  }
  expectedExternalLinks = externalLinks;

  const languageLinks = languages.map(item => {
    const current = locale.language === item.language ? ' aria-current="page"' : '';
    return `        <a href="research${item.suffix}.html" data-language="${item.language}" lang="${item.htmlLang}" hreflang="${item.htmlLang}"${current}>${item.label}</a>`;
  }).join('\n');
  const values = { ...locale, title: titleToken.text, source, namesPath: `names${locale.suffix}.html`, body, copyright, languageLinks };
  const html = template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    if (!(key in values)) throw new Error(`Unknown template value: ${key}`);
    return ['body', 'copyright', 'languageLinks'].includes(key) ? values[key] : escape(values[key]);
  });
  if (check) {
    const current = await readFile(path.join(root, 'life', output), 'utf8').catch(() => null);
    if (current !== html) {
      failed = true;
      console.error(`${output} is stale; run npm run build:research`);
    } else console.log(`${output}: current; ${recordCount} rows, ${sourceLinks.length} source links preserved`);
  } else {
    await writeFile(path.join(root, 'life', output), html);
    console.log(`${output}: built; ${recordCount} rows, ${sourceLinks.length} source links preserved`);
  }
}
if (failed) process.exitCode = 1;
