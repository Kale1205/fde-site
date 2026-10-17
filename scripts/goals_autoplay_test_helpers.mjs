// Adapt this one reviewed controller exclusion in historical scope fixtures.
// Every other gallery runtime byte remains part of their original contract.
export function applyApprovedGoalsAutoplay(file, source) {
  return file === 'gallery-ui.js'
    ? source.replace('document.querySelector(".mission-recording video")', 'document.querySelector(".mission-recording video:not([data-motion-video])")')
    : source;
}
