import {execFileSync as runFile} from 'node:child_process';
import {applyReviewedBusinessCopy} from './business_copy_test_helpers.mjs';

// Historical Git snapshots acquire only the reviewed, file-scoped copy delta.
// All commands, unknown files, routes, prices and other source bytes remain exact.
export function execFileSync(command, args, options) {
 const result=runFile(command,args,options);
 if(command!=='git'||args?.[0]!=='show'||typeof args[1]!=='string')return result;
 const match=args[1].match(/^[^:]+:(.+)$/);
 if(!match)return result;
 const changed=applyReviewedBusinessCopy(match[1],String(result));
 return typeof result==='string'?changed:Buffer.from(changed);
}
