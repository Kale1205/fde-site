// The compact, same-origin tab icon is limited to the IMS introduction and LP routes.
export const legacySiteTabIcon=prefix=>'<link rel="icon" type="image/svg+xml" href="'+prefix+'assets/baked-kale-mark.svg">';
export const siteTabIcon=prefix=>[
  '<link rel="icon" type="image/svg+xml" sizes="any" href="'+prefix+'assets/bakedkale-character.svg?v=tab-v1">',
  ...[32,16].map(n=>'<link rel="icon" type="image/png" sizes="'+n+'x'+n+'" href="'+prefix+'assets/bakedkale-tab-v1-'+n+'.png">'),
].join('\n');
export function withSiteTabIcon(source,prefix){
  const previous=legacySiteTabIcon(prefix),next=siteTabIcon(prefix);
  if(source.includes(next)&&!source.includes(previous))return source;
  if(source.split(previous).length!==2||source.includes(next))throw Error('Expected one legacy tab icon in site heading');
  return source.replace(previous,next);
}
// Only the exact accepted tab-icon sequence differs from historical snapshots.
export function normalizeSiteTabIcon(source){
  for(const prefix of ['', '../', '../../', '../../../'])
    source=source.replace(siteTabIcon(prefix),legacySiteTabIcon(prefix));
  return source;
}
