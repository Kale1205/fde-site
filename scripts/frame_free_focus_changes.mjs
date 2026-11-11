export const frameFreeFocusChanges = {
  "gallery-ui.css": [
    [
      ":focus-visible { outline: 2px solid var(--focus-ring, #3b926b); outline-offset: 3px; }",
      ":focus-visible { outline: none; text-decoration: underline; text-decoration-thickness: 2px; text-underline-offset: .25em; }"
    ],
    [
      ".source-home a:focus-visible, .source-home button:focus-visible, .source-home summary:focus-visible { outline: 3px solid var(--focus-ring, #3b926b); outline-offset: 4px; }",
      ".source-home a:focus-visible, .source-home button:focus-visible, .source-home summary:focus-visible { outline: none; text-decoration: underline; text-decoration-thickness: 2px; text-underline-offset: .25em; }"
    ],
    [
      ".source-home .comparison-table-scroll:focus-visible { outline: 3px solid var(--focus-ring, #3b926b); outline-offset: 4px; }",
      ".source-home .comparison-table-scroll:focus-visible { outline: none; }"
    ],
    [
      ".source-home .hero a:focus-visible, .source-home .contact-section a:focus-visible { outline-color: var(--focus-ring-on-dark, #dceadf); }",
      ".source-home .hero a:focus-visible, .source-home .contact-section a:focus-visible { text-decoration-color: currentColor; }"
    ],
    [
      "  .mobile-sheet .mobile-nav-item[aria-current=\"page\"] { border-color: #b9cdbd; color: var(--forest); background: #e6eee3; }",
      ".mobile-sheet .mobile-nav-item[aria-current=\"page\"] { color: var(--forest); background: #e6eee3; }"
    ],
    [
      ".inventory-row.selected { box-shadow: inset 2px 0 var(--green); background: rgba(237, 80, 15, 0.055); }",
      ".inventory-row.selected { background: rgba(237, 80, 15, 0.055); }"
    ]
  ],
  "gallery-pages.css": [
    [
      ".refined-page a:focus-visible, .refined-page button:focus-visible,\n.refined-page summary:focus-visible { outline: 3px solid var(--focus-ring, #3b926b); outline-offset: 4px; }",
      ".refined-page a:focus-visible, .refined-page button:focus-visible,\n.refined-page summary:focus-visible { outline: none; text-decoration: underline; text-decoration-thickness: 2px; text-underline-offset: .25em; }"
    ],
    [
      ".visual-story-footer .button:focus-visible { outline: 2px solid var(--focus-ring, #3b926b); outline-offset: 3px; }",
      ".visual-story-footer .button:focus-visible { outline: none; text-decoration: underline; text-decoration-thickness: 2px; text-underline-offset: .25em; }"
    ],
    [
      ".news-open:focus-visible, .latest-card:focus-visible, .wire-row:focus-visible { outline: 2px solid var(--focus-ring, #3b926b); outline-offset: 3px; }",
      ".news-open:focus-visible, .latest-card:focus-visible, .wire-row:focus-visible { outline: none; text-decoration: underline; text-decoration-thickness: 2px; text-underline-offset: .25em; }"
    ],
    [
      ".mission-page .mission-code pre:focus-visible { outline: 2px solid var(--focus-ring-on-dark, #dceadf); outline-offset: -4px; }",
      ".mission-page .mission-code pre:focus-visible { outline: none; filter: brightness(1.3); }"
    ],
    [
      ".faq-search:focus,\n.field input:focus,\n.field select:focus,\n.field textarea:focus { outline: 2px solid var(--focus-ring, #3b926b); outline-offset: 2px; }",
      ".faq-search:focus,\n.field input:focus,\n.field select:focus,\n.field textarea:focus { outline: none; background-color: #d7eadb; color: #073e2c; }"
    ]
  ],
  "quiet-pages.css": [
    [
      ".quiet-page :is(a,button,input,select,textarea,summary,[tabindex]):focus-visible { outline: 3px solid var(--focus-ring, #3b926b); outline-offset: 4px; }",
      ".quiet-page :is(a,button,input,select,textarea,summary,[tabindex]):focus-visible { outline: none; text-decoration: underline; text-decoration-thickness: 2px; text-underline-offset: .25em; }"
    ],
    [
      ".quiet-page :is(input,select,textarea):focus { border-color: var(--forest); }",
      ".quiet-page :is(input,select,textarea):focus { outline: none; background-color: #d7eadb; color: #073e2c; }"
    ],
    [
      ".quiet-page.contact-renewal.contact-page .faq-q:focus-visible { outline-offset: 0; }",
      ".quiet-page.contact-renewal.contact-page .faq-q:focus-visible { text-decoration-thickness: 2px; }"
    ],
    [
      ".quiet-page.demo-renewal .demo-view-switcher button:focus-visible { outline-color: var(--focus-ring-on-dark, #dceadf); outline-offset: -4px; }",
      ".quiet-page.demo-renewal .demo-view-switcher button:focus-visible { outline: none; background-color: #d7eadb; color: #073e2c; }"
    ],
    [
      ".quiet-page.goals-renewal .mission-hero :focus-visible { outline-color: var(--focus-ring-on-dark, #dceadf); }",
      ".quiet-page.goals-renewal .mission-hero :focus-visible { text-decoration-color: currentColor; }"
    ],
    [
      ".quiet-page.admin-renewal .admin-tab.active { background: #ffffff12; border-color: #ffffff40; box-shadow: inset 3px 0 0 #afd7bd; }",
      ".quiet-page.admin-renewal .admin-tab.active { background: #ffffff20; font-weight: 750; }"
    ],
    [
      ".admin-renewal .admin-article-row[aria-pressed=true] { background: #eaf0e8; border-left-color: var(--forest); }",
      ".admin-renewal .admin-article-row[aria-pressed=true] { background: #eaf0e8; font-weight: 750; }"
    ]
  ],
  "quiet-form.css": [
    [
      ".quiet-home :is(a,button,input,select,summary):focus-visible { outline: 3px solid var(--focus-ring, #3b926b); outline-offset: 4px; }",
      ".quiet-home :is(a,button,input,select,summary):focus-visible { outline: none; text-decoration: underline; text-decoration-thickness: 2px; text-underline-offset: .25em; }"
    ],
    [
      ".quiet-home .quiet-hero a:focus-visible { outline-color: var(--focus-ring-on-dark, #dceadf); }",
      ".quiet-home .quiet-hero a:focus-visible { text-decoration-color: currentColor; }"
    ],
    [
      ".quiet-home [data-motion-focus=\"true\"] { outline: 2px solid #47795e; outline-offset: 3px; }",
      ".quiet-home [data-motion-focus=\"true\"] { background-color: #d7eadb; color: #073e2c; }"
    ]
  ],
  "goals-motion.css": [
    [
      ".mission-layered :is(button,summary,pre):focus-visible { outline: 3px solid var(--focus-ring, #3b926b); outline-offset: 5px; }",
      ".mission-layered :is(button,summary,pre):focus-visible { outline: none; text-decoration: underline; text-decoration-thickness: 2px; text-underline-offset: .25em; }\n.mission-layered pre:focus-visible { outline: none; text-decoration: none; filter: brightness(1.3); }"
    ]
  ],
  "cms-admin.css": [
    [
      ".admin-renewal input:focus-visible,.admin-renewal textarea:focus-visible,.admin-renewal select:focus-visible,.admin-renewal button:focus-visible,.admin-renewal a:focus-visible{outline:2px solid var(--green);outline-offset:3px}",
      ".admin-renewal input:focus-visible,.admin-renewal textarea:focus-visible,.admin-renewal select:focus-visible,.admin-renewal button:focus-visible,.admin-renewal a:focus-visible { outline: none; text-decoration: underline; text-decoration-thickness: 2px; text-underline-offset: .25em; }\n/* Frame-free keyboard position, including the operator-only CMS. */\n.admin-renewal :focus { outline: none; }\n.quiet-page.admin-renewal :is(button, input, select, textarea):focus-visible { background-color: #d7eadb !important; color: #073e2c !important; }\n.admin-renewal .field:has(:focus-visible) > label,\n.admin-renewal label:has(input:focus-visible) { text-decoration: underline; text-decoration-thickness: 2px; text-underline-offset: .25em; }\n"
    ],
    [
      ".quiet-page.admin-renewal.cms-menu-layout :is(button,summary):focus-visible{outline:2px solid var(--green);outline-offset:3px}",
      ".quiet-page.admin-renewal.cms-menu-layout :is(button,summary):focus-visible { outline: none; text-decoration: underline; text-decoration-thickness: 2px; text-underline-offset: .25em; }"
    ],
    [
      ".radio-chip:has(input:checked){border-color:var(--green);box-shadow:inset 0 0 0 1px var(--green);background:#f3fbf6}",
      ".radio-chip:has(input:checked) {background:#e1edda;font-weight:750}"
    ]
  ],
  "news-books.css": [
    [
      ".book-news :is(button,a,.reader-copy):focus-visible{outline:2px solid var(--forest);outline-offset:3px}",
      ".book-news :is(button,a,.reader-copy):focus-visible { outline: none; text-decoration: underline; text-decoration-thickness: 2px; text-underline-offset: .25em; }"
    ],
    [
      ".book-news .reader-copy:focus-visible{outline-offset:-2px}",
      ".book-news .reader-copy:focus-visible {outline:none;text-decoration:none;background-color:#e6efdf}\n.book-news .reader-copy:focus-visible h2{text-decoration:underline;text-decoration-thickness:2px;text-underline-offset:.25em}"
    ],
    [
      ".book-news[data-book-input=\"keyboard\"] .news-book:focus-visible{outline:2px solid var(--forest);outline-offset:5px}",
      ".book-news[data-book-input=\"keyboard\"] .news-book:focus-visible {outline:none;filter:brightness(.76) saturate(1.1)}"
    ]
  ],
  "faq-v38.css": [
    [
      ".faq-search:focus{border-color:var(--green,#244f37);box-shadow:0 0 0 3px rgba(36,79,55,.08)}",
      ".faq-search:focus {outline:none;background-color:#d7eadb;color:#073e2c}"
    ]
  ]
};
