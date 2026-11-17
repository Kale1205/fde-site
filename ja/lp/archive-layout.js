// Case IDs pick the original artwork; frame geometry is shared by site and CMS.
export const archiveOnlyFrame=Object.freeze([.85,9/16]);
export const archiveFrames=Object.freeze([[.79,1.57],[.68,.81],[.85,1.34],[.73,1.04],[.81,1.50],[.76,1.17],[.85,1.62],[.74,1.05],[.78,1.30],[.74,1.38]].map(Object.freeze));

// Keep the tall night-train print clear of the row above; other slots retain their frames.
const compactArchive07Frame=Object.freeze([.60,archiveOnlyFrame[1]]);
// Match the preview proportions for the four approved Archive-only materials.
const approvedPortraitFrame=Object.freeze([.50,9/16]);
const approvedFountainFrame=Object.freeze([.65,3/4]);
export function archiveFrameForSlot(slot,caseIndex){
 if(archiveFrames[caseIndex])return archiveFrames[caseIndex];
 const id=Number(slot);
 if(id===7)return compactArchive07Frame;
 if(id===13)return approvedFountainFrame;
 if(id===4||id===18||id===21)return approvedPortraitFrame;
 return archiveOnlyFrame;
}
