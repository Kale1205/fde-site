// Case IDs pick the original artwork; frame geometry is shared by site and CMS.
export const archiveOnlyFrame=Object.freeze([.85,9/16]);
export const archiveFrames=Object.freeze([[.79,1.57],[.68,.81],[.85,1.34],[.73,1.04],[.81,1.50],[.76,1.17],[.85,1.62],[.74,1.05],[.78,1.30],[.74,1.38]].map(Object.freeze));

// Keep the tall night-train print clear of the row above; other slots retain their frames.
const compactArchive07Frame=Object.freeze([.60,archiveOnlyFrame[1]]);
export function archiveFrameForSlot(slot,caseIndex){
 return archiveFrames[caseIndex]||(Number(slot)===7?compactArchive07Frame:archiveOnlyFrame);
}
