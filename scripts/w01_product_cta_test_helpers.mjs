// Historical copy-only tests still protect every byte except this approved W01 CSS delta.
export const w01CtaCssChanges = [
  ['.quiet-home .plan-top a { display: inline-flex; gap: 10px; align-items: center; min-height: 48px; font-size: 16px; font-weight: 700; color: var(--forest); }', '.quiet-home .plan-top a { display: inline-flex; gap: 24px; align-items: center; justify-content: center; width: 250px; max-width: 100%; min-height: 54px; margin-top: 24px; padding: 12px 20px; border: 1px solid var(--forest); border-radius: 10px; background: var(--forest); color: var(--paper); font-size: 16px; font-weight: 700; line-height: 1.4; text-align: center; text-decoration: none; box-shadow: 0 3px 7px #073e2c0c; transition: background-color 160ms ease, transform 160ms ease; }'],
  ['.quiet-home .plan-top a:hover { text-decoration: underline; text-underline-offset: 5px; }', '.quiet-home .plan-top a:hover { background: var(--green); text-decoration: none; transform: translateY(-1px); }\n.quiet-home .plan-top a:active { transform: none; }'],
  ['  .quiet-home .plan-top a { font-size: 14px; min-height: 44px; }', '  .quiet-home .plan-top a { width: 100%; gap: 10px; font-size: 14px; min-height: 50px; margin-top: 18px; padding: 11px 10px; }'],
  ['  .quiet-home .plan-top { padding-bottom: 8px; }', '  .quiet-home .plan-top { padding-bottom: 24px; }'],
  ['  .quiet-home figure:hover .sculpture, .quiet-home .button:hover { transform: none; }', '  .quiet-home figure:hover .sculpture, .quiet-home .button:hover, .quiet-home .plan-top a:hover { transform: none; }']
];

export function applyW01ProductCta(file, source) {
  if (file !== 'quiet-form.css') return source;
  return w01CtaCssChanges.reduce((value, [before, after]) => value.replace(before, after), source);
}
