import { applyApprovedGoalsAutoplay } from './goals_autoplay_test_helpers.mjs';

// Historical snapshots retain every demo-operation byte. Only the obsolete
// navigation observer assignments move to the shared header controller.
export function applyReviewedHeaderOwnership(file, source) {
  const previous = applyApprovedGoalsAutoplay(file, source);
  if (file !== 'quiet-form.js') return previous;
  return previous
    .replace('// The gallery script owns sheet behavior; prevent background tabbing while open.',
      '// The gallery script owns navigation interaction; this observer only pauses the demo.')
    .replace("    document.querySelector('main').inert = open;\n    document.querySelector('footer').inert = open;\n    document.querySelector('.brand').inert = open;\n    document.querySelector('.locale-picker').inert = open;\n", '');
}
