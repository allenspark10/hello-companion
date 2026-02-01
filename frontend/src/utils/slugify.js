export function createSlug(title) {
  if (!title) return '';
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_]+/g, '-')  // Replace spaces with hyphens
    .replace(/--+/g, '-')     // Replace multiple hyphens with single
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

export function extractImdbId(params) {
  // Extract IMDB ID from URL params
  // Works for: "21209876-1" or "solo-leveling/21209876-1" or "solo-leveling-21209876-1"
  const combined = params.slug || params.imdbId || '';
  // If params has both slug and imdbId (from route /series/:slug/:imdbId), use imdbId
  if (params.imdbId) return params.imdbId;
  
  const match = combined.match(/(\d+-\d+)/);
  return match ? match[1] : combined;
}
