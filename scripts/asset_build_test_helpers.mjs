// Ignore only the repository's automatic JS/CSS cache key, never copy or behavior.
export const normalizeAssetBuildKeys = source => source.replace(/(\.(?:js|css)\?v=)\d{8}-\d{6}/g, '$1BUILD');
