import { readFile, writeFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { markedSiteFooter } from './site-footer.mjs';

const root=fileURLToPath(new URL('..',import.meta.url));
const check=process.argv.includes('--check');
const opening=await readFile(path.join(root,'index.html'),'utf8');
if(opening.includes('SITE-FOOTER:START')) throw new Error('The opening scene must not have a shared visible footer.');
const marker=/<!-- SITE-FOOTER:START -->[\s\S]*?<!-- SITE-FOOTER:END -->/g;
let count=0;
for(const section of ['filters','index','life','muse']){
 const dir=path.join(root,section);
 for(const name of await readdir(dir,{recursive:true})){
  if(!name.endsWith('.html')||name.startsWith('templates/'))continue;
  const page=section+'/'+name, full=path.join(root,page),prev=await readFile(full,'utf8');
  const language=/\.en\.html$/.test(name)?'en':/\.ko\.html$/.test(name)?'ko':'zh';
  const mid=[...prev.matchAll(marker)];
  if(mid.length!==1)throw new Error(`${page}: expected exactly one shared footer`);
  if(!prev.includes('/assets/copyright.css'))throw new Error(`${page}: missing shared footer stylesheet`);
  const next=prev.replace(marker,()=>markedSiteFooter(page,language));
  if(next!==prev){
    if(check){console.error(`${page}: shared footer is stale; run npm run build:footers`);process.exitCode=1;}
    else await writeFile(full,next);
  }
  count++;
 }
}
console.log(`Shared footer checked on ${count} pages; opening scene excluded`);
