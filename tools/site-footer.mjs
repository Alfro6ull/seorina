// Single source of truth for the public archive footer and its translations.
import path from 'node:path';
const copy={
  zh:{heading:'版权声明', badge:'非官方 · 粉丝制作。', site:'本站为非营利的薛仁雅粉丝档案，与艺人、经纪公司及相关品牌无隶属关系。', rights:'第三方素材版权归各权利人。', thanks:'开源致谢', contact:'版权问题反馈'},
  en:{heading:'Copyright notice', badge:'Unofficial · Fan-made.', site:'This nonprofit Seorina fan archive is not affiliated with the artist, her agency or any associated brands.', rights:'Third-party materials belong to their respective rights holders.', thanks:'Open-source credits', contact:'Report a copyright issue'},
  ko:{heading:'저작권 안내', badge:'비공식 · 팬 제작.', site:'이 사이트는 설인아의 비영리 팬 아카이브이며 아티스트, 소속사 및 관련 브랜드와 제휴 관계가 없습니다.', rights:'제3자 자료의 저작권은 각 권리자에게 있습니다.', thanks:'오픈소스 감사의 말', contact:'저작권 문제 문의'}
};
function linkFrom(page,to){
  const r=path.posix.relative(path.posix.dirname(page),to);
  return r.startsWith('../')?r:'./'+r;
}
export function renderSiteFooter(page, language='zh'){
  const words=copy[language];
  if(!words)throw new Error(`Unknown footer language ${language}`);
  const filter=['filters/index.html','filters/tool.html'].includes(page);
  const rightsPage='filters/image-rights.html';
  const thanksPage='filters/credits.html';
  const thanks=page===thanksPage?'#open-source':linkFrom(page,thanksPage);
  const contact=page===rightsPage?'#contact':linkFrom(page,rightsPage)+'#contact';
  return [
    '<section class="archive-copyright" aria-labelledby="archive-copyright-title">',
    `  <h2 id="archive-copyright-title">${words.heading}</h2>`,
    `  <p><strong>${words.badge}</strong> ${words.site}</p>`,
    `  <p>${words.rights} <span class="archive-copyright-links"><a href="${thanks}">${words.thanks}</a> · <a href="${contact}">${words.contact}</a></span></p>`,
    ...(filter?['  <p>滤镜仅使用传统图像处理算法，不进行任何 AIGC。照片只在浏览器本地处理，不会上传。</p>']:[]),
    '</section>'
  ].join('\n');
}
export function markedSiteFooter(page,language){
  return '<!-- SITE-FOOTER:START -->\n'+renderSiteFooter(page,language)+'\n<!-- SITE-FOOTER:END -->';
}
