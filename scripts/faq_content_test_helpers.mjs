// Historical copy migrations stay pinned; current editable FAQs use schema/render tests.
import {execFileSync} from 'node:child_process';
import {renderStaticFaq} from './multilingual_content_copy.mjs';

const root=new URL('../',import.meta.url);
const approvedFaqRef='4bad916972e570beb2e3e60af22cf461cba43924';
export function readFaqMigrationFixture(file){
 if(!['content/faq-content.json','content/faq-policy-additions.json'].includes(file))throw Error('Not a FAQ migration fixture');
 return execFileSync('git',['show',`${approvedFaqRef}:${file}`],{cwd:root,encoding:'utf8'});
}
export function renderCurrentFaqFixture(file,source){
 return /^(?:ja\/|zh\/)?contact\.html$/.test(file)?renderStaticFaq(source):source;
}
