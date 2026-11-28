// CI compatibility entry: the standalone demo is retired, not generated.
import {existsSync, readFileSync} from 'node:fs';

const root=new URL('../', import.meta.url);
export const retiredDemoRoutes=['demo.html','ja/demo.html','zh/demo.html'];
const destination=/\bdemo\.html(?:\b|$)/;
export function assertStandaloneDemoRetired() {
  for(const path of retiredDemoRoutes) {
    if(existsSync(new URL(path,root))) throw Error(path+': the standalone IMS demo must stay removed');
  }
  const files=['sitemap.xml','sitemap-lastmod.json','gallery-ui.js','site.js','content/site-content.json','scripts/social_share_manifest.json',
    ...['','ja/','zh/'].flatMap(prefix=>['index','quiet-form','customer','order','news'].map(page=>prefix+page+'.html'))];
  for(const file of files) {
    if(destination.test(readFileSync(new URL(file,root),'utf8'))) throw Error(file+': contains a link to the retired standalone demo');
  }
}
assertStandaloneDemoRetired();
