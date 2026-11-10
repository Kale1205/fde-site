import {normalizeAssetBuildKeys} from './asset_build_test_helpers.mjs';

// Historical copy/SEO snapshots predate the approved decorative motion layer.
// Ignore only its two asset tags; retain every content and operational byte.
// Current composition checks and test_sculpture_motion cover asset loading.
export function normalizeHistoricalPresentation(source) {
  return normalizeAssetBuildKeys(source)
    .replace(/[ \t]*<link rel="stylesheet" href="(?:\.\.\/)?sculpture-motion\.css(?:\?v=BUILD)?">[ \t]*\n?/g, '')
    .replace(/[ \t]*<script type="module" src="(?:\.\.\/)?sculpture-motion\.js(?:\?v=BUILD)?"><\/script>[ \t]*\n?/g, '');
}
