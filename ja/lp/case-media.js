import {applyCaseMedia} from './media-runtime.js';
applyCaseMedia().then(()=>window.BakedKaleDisplay?.refresh()).catch(()=>{});
