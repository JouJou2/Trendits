/**
 * Swatch colours for the names vendors type ("Black", "Navy", "Olive"…).
 * Products store the colour as a word, so cards need a dot colour for it.
 * Unknown names fall back to a neutral grey rather than guessing.
 */
const SWATCHES: Record<string, string> = {
  black: '#1b2233', white: '#ffffff', grey: '#9aa3b8', gray: '#9aa3b8', silver: '#c8cdd6',
  charcoal: '#3a4150', navy: '#1f2f5c', blue: '#2f5fd0', 'light blue': '#8fb4ef', sky: '#8fc9ef',
  teal: '#1f8a8a', green: '#3f9a5a', olive: '#6b7445', khaki: '#b8a77a', mint: '#a8e0c8',
  red: '#d9413b', burgundy: '#7a1f2e', maroon: '#6e1f2a', pink: '#f29bb8', rose: '#e8a3a3',
  purple: '#7a4fc9', lilac: '#c7b3ec', lavender: '#c9b8f0', orange: '#f08a2c', coral: '#fe7a70',
  yellow: '#f2c230', mustard: '#d4a72c', gold: '#c9a227', beige: '#e6d9c3', cream: '#f3ead8',
  ivory: '#f6f1e3', sand: '#e0cfae', tan: '#c49a6c', camel: '#c19a6b', brown: '#7a5234',
  chocolate: '#5a3a24', oat: '#e8e0d0', nude: '#e3c3a8',
};

export const swatchFor = (name: string): string => {
  const key = name.trim().toLowerCase();
  if (SWATCHES[key]) return SWATCHES[key];
  // "Dark Green", "Navy Blue": match the last word that is a known colour.
  const words = key.split(/[\s-]+/).reverse();
  const known = words.find(w => SWATCHES[w]);
  return known ? SWATCHES[known] : '#c8cdd6';
};

/** White and near-white dots need a visible edge on a white card. */
export const isLightSwatch = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return 0.299 * r + 0.587 * g + 0.114 * b > 220;
};
