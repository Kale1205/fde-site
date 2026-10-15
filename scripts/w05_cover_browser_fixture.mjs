// Browser QA only. No credentials, external writes, or published fixture data.
// Import to create a DevTools initScript, never load on a public page.
import {readFileSync} from 'node:fs';
export function coverBrowserFixture(){
 const data=JSON.parse(readFileSync(new URL('../content/site-content.json',import.meta.url),'utf8'));
 return `(() => {
 const originalFetch=window.fetch.bind(window),api='https://api.github.com',state={data:${JSON.stringify(data)},writes:[],failNext:false};
 window.__w05CoverQA=state;
 const encode=x=>btoa(unescape(encodeURIComponent(JSON.stringify(x))));
 window.fetch=async(input,options={})=>{
  const url=typeof input==='string'?input:input.url;
  if(url===api+'/user')return Response.json({login:'TEST_FIXTURE_NOT_A_REAL_ACCOUNT'});
  if(url.startsWith(api+'/repos/Kale1205/fde-site/contents/')){
   if(options.method==='PUT'){
    const body=JSON.parse(options.body);state.writes.push({url,body});
    if(state.failNext){state.failNext=false;return Response.json({message:'TEST_FIXTURE_SAVE_FAILURE'},{status:409});}
    if(url.endsWith('/content/site-content.json'))state.data=JSON.parse(decodeURIComponent(escape(atob(body.content))));
    return Response.json({content:{sha:'TEST_FIXTURE_SHA'}});
   }
   return Response.json({sha:'TEST_FIXTURE_SHA',content:encode(state.data)});
  }
  if(url.startsWith('http')&&!url.startsWith(location.origin))throw Error('TEST_FIXTURE: outbound fetch blocked');
  return originalFetch(input,options);
 };
})();`;
}
if(process.argv[1]===new URL(import.meta.url).pathname)process.stdout.write(coverBrowserFixture());
