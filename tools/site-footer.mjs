// Single source of truth for the public archive footer and its translations.
import path from 'node:path';
const copy={
  zh:{heading:'版权声明', badge:'非官方 · 粉丝制作。', site:'本站为非营利的薛仁雅粉丝档案，与艺人、经纪公司及相关品牌无隶属关系。', rights:'第三方素材版权归各权利人。', source:'图片来源与署名', contact:'版权问题反馈'},
  en:{heading:'Copyright notice', badge:'Unofficial · Fan-made.', site:'This nonprofit Seorina fan archive is not affiliated with the artist, her agency or any associated brands.', rights:'Third-party materials belong to their respective rights holders.', source:'Image sources and credits', contact:'Report a copyright issue'},
  ko:{heading:'저작권 안내', badge:'비공식 · 팬 제작.', site:'이 사이트는 설인아의 비영리 팬 아카이브이며 아티스트, 소속사 및 관련 브랜드와 제휴 관계가 없습니다.', rights:'제3자 자료의 저작권은 각 권리자에게 있습니다.', source:'이미지 출처 및 크레딧', contact:'저작권 문제 문의'}
};
function linkFrom(page,to){
  const r=path.posix.relative(path.posix.dirname(page),to);
  return r.startsWith('../')?r:'./'+r;
}
export function renderSiteFooter(page, language='zh'){
  const words=copy[language];
  if(!words)throw new Error(`Unknown footer language ${language}`);
  const filter=page.startsWith('filters/'), museum=page.startsWith('muse/');
  const rightsPage='filters/image-rights.html';
  const sourcePage=museum?'muse/credits.html':rightsPage;
  const source=page===sourcePage?(museum?'#photo-sources':'#demo-photo'):linkFrom(page,sourcePage);
  const contact=page===rightsPage?'#contact':linkFrom(page,rightsPage)+'#contact';
  return [
    '<section class="archive-copyright" aria-labelledby="archive-copyright-title">',
    `  <h2 id="archive-copyright-title">${words.heading}</h2>`,
    `  <p><strong>${words.badge}</strong> ${words.site}</p>`,
    `  <p>${words.rights} <span class="archive-copyright-links"><a href="${source}">${words.source}</a> · <a href="${contact}">${words.contact}</a></span></p>`,
    ...(filter?['  <p>滤镜效果由浏览器在本地计算，不使用生成式 AI，照片也不会上传。</p>']:[]),
    '</section>'
  ].join('\n');
}
export function markedSiteFooter(page,language){
  return '<!-- SITE-FOOTER:START -->\n'+renderSiteFooter(page,language)+'\n<!-- SITE-FOOTER:END -->';
}
