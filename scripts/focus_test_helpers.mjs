import { applyReviewedBusinessCopy } from './business_copy_test_helpers.mjs';
import { frameFreeFocusChanges } from './frame_free_focus_changes.mjs';
import { applyReviewedHeaderOwnership } from './navigation_test_helpers.mjs';

// Exact focus-rule migrations only. Layout, validation and error rules remain pinned.
const focusChanges = {
  "gallery-pages.css": [
    [
      "\n.mission-page .mission-code pre:focus-visible { outline: 2px solid #ffac81; outline-offset: -4px; }",
      "\n.mission-page .mission-code pre:focus-visible { outline: 2px solid var(--focus-ring-on-dark, #dceadf); outline-offset: -4px; }"
    ],
    [
      "\n.refined-page a:focus-visible, .refined-page button:focus-visible,\n.refined-page summary:focus-visible { outline: 3px solid var(--orange); outline-offset: 4px; }",
      "\n.refined-page a:focus-visible, .refined-page button:focus-visible,\n.refined-page summary:focus-visible { outline: 3px solid var(--focus-ring, #3b926b); outline-offset: 4px; }"
    ],
    [
      "\n.visual-story-footer .button:focus-visible { outline: 2px solid var(--orange); outline-offset: 3px; }",
      "\n.visual-story-footer .button:focus-visible { outline: 2px solid var(--focus-ring, #3b926b); outline-offset: 3px; }"
    ],
    [
      "\n.news-open:focus-visible, .latest-card:focus-visible, .wire-row:focus-visible { outline: 2px solid var(--orange); outline-offset: 3px; }",
      "\n.news-open:focus-visible, .latest-card:focus-visible, .wire-row:focus-visible { outline: 2px solid var(--focus-ring, #3b926b); outline-offset: 3px; }"
    ],
    [
      "\n.faq-search:focus,\n.field input:focus,\n.field select:focus,\n.field textarea:focus { outline: 2px solid var(--orange); outline-offset: 2px; }",
      "\n.faq-search:focus,\n.field input:focus,\n.field select:focus,\n.field textarea:focus { outline: 2px solid var(--focus-ring, #3b926b); outline-offset: 2px; }"
    ]
  ],
  "quiet-pages.css": [
    [
      "\n.quiet-page :is(a,button,input,select,textarea,summary,[tabindex]):focus-visible { outline: 3px solid var(--orange); outline-offset: 4px; }",
      "\n.quiet-page :is(a,button,input,select,textarea,summary,[tabindex]):focus-visible { outline: 3px solid var(--focus-ring, #3b926b); outline-offset: 4px; }"
    ],
    [
      "\n.quiet-page.demo-renewal .demo-view-switcher button:focus-visible { outline-color: #fdb88d; outline-offset: -4px; }",
      "\n.quiet-page.demo-renewal .demo-view-switcher button:focus-visible { outline-color: var(--focus-ring-on-dark, #dceadf); outline-offset: -4px; }"
    ],
    [
      "\n.quiet-page.goals-renewal .mission-hero :focus-visible { outline-color: #ffb08a; }",
      "\n.quiet-page.goals-renewal .mission-hero :focus-visible { outline-color: var(--focus-ring-on-dark, #dceadf); }"
    ]
  ],
  "quiet-form.css": [
    [
      "\n.quiet-home :is(a,button,input,select,summary):focus-visible { outline: 3px solid var(--orange); outline-offset: 4px; }",
      "\n.quiet-home :is(a,button,input,select,summary):focus-visible { outline: 3px solid var(--focus-ring, #3b926b); outline-offset: 4px; }"
    ],
    [
      "\n.quiet-home .quiet-hero a:focus-visible { outline-color: #f6cba8; }",
      "\n.quiet-home .quiet-hero a:focus-visible { outline-color: var(--focus-ring-on-dark, #dceadf); }"
    ]
  ],
  "goals-motion.css": [
    [
      "\n.mission-layered :is(button,summary,pre):focus-visible { outline: 3px solid #b65223; outline-offset: 5px; }",
      "\n.mission-layered :is(button,summary,pre):focus-visible { outline: 3px solid var(--focus-ring, #3b926b); outline-offset: 5px; }"
    ]
  ]
};

export function applyReviewedFocus(file, source) {
  const migrated = (focusChanges[file] || []).reduce((value, [before, after]) => value.replace(before, after), source);
  return (frameFreeFocusChanges[file] || []).reduce((value, [before, after]) => before ? value.replace(before, after) : value.endsWith(after) ? value : value + after, migrated);
}

export function applyReviewedUiChanges(file, source) {
  return applyReviewedBusinessCopy(file, applyReviewedHeaderOwnership(file, applyReviewedFocus(file, source)));
}
