/**
 * Draws the app's icons from the Trendit mark.
 *
 * The mark is rebuilt as vector art rather than scaled from the website's PNG,
 * so every size stays crisp and the white circle can be punched through to let
 * the background show — which is what makes the icon readable at 48px.
 *
 * Run: node tools/make-icons.mjs
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, '..', 'assets', 'images');

/** Brand colours, matching the website's logo and src/constants/theme.ts. */
const GRADIENT_FROM = '#2e67ec';
const GRADIENT_TO = '#7888f7';
const BRAND_BLUE = '#0452c8';

/** Proportions measured from frontend/public/logo-1024.png. */
const CORNER = 0.31;   // radius on the two rounded corners
const HOLE = 0.205;    // radius of the white circle

/**
 * The mark: a square with the top-right and bottom-left corners rounded and
 * the other two square, with a circular hole through the middle.
 */
const markPath = (size, inset = 0) => {
  const s = size - inset * 2;
  const r = s * CORNER;
  const hole = s * HOLE;
  const cx = inset + s / 2;
  const cy = inset + s / 2;
  const x0 = inset;
  const y0 = inset;
  const x1 = inset + s;
  const y1 = inset + s;
  return [
    `M${x0},${y0}`,
    `H${x1 - r}`,
    `A${r},${r} 0 0 1 ${x1},${y0 + r}`,
    `V${y1}`,
    `H${x0 + r}`,
    `A${r},${r} 0 0 1 ${x0},${y1 - r}`,
    'Z',
    // Second subpath, punched out by fill-rule="evenodd".
    `M${cx - hole},${cy}`,
    `a${hole},${hole} 0 1 0 ${hole * 2},0`,
    `a${hole},${hole} 0 1 0 ${-hole * 2},0`,
    'Z',
  ].join(' ');
};

const gradientDef = (id, from = GRADIENT_FROM, to = GRADIENT_TO) => `
    <linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${from}"/>
      <stop offset="1" stop-color="${to}"/>
    </linearGradient>`;

const svg = (size, body, defs = '') =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>${defs}</defs>
  ${body}
</svg>`;

/** The store icon: white mark on the brand gradient, the hole showing through. */
const appIcon = size => {
  const inset = size * 0.2;
  return svg(size,
    `<rect width="${size}" height="${size}" fill="url(#bg)"/>
     <path d="${markPath(size, inset)}" fill="#ffffff" fill-rule="evenodd"/>`,
    gradientDef('bg'));
};

/**
 * Android draws the foreground inside a mask that can crop up to a third of
 * it, so the mark sits well within the safe centre.
 */
const adaptiveForeground = size => {
  const inset = size * 0.28;
  return svg(size, `<path d="${markPath(size, inset)}" fill="#ffffff" fill-rule="evenodd"/>`);
};

const adaptiveBackground = size =>
  svg(size, `<rect width="${size}" height="${size}" fill="url(#bg)"/>`, gradientDef('bg'));

/** Themed icons take only the shape, so this is a plain silhouette. */
const monochrome = size => {
  const inset = size * 0.3;
  return svg(size, `<path d="${markPath(size, inset)}" fill="#ffffff" fill-rule="evenodd"/>`);
};

/** Splash: the mark alone on the blue the splash screen paints. */
const splashMark = size =>
  svg(size, `<path d="${markPath(size, size * 0.06)}" fill="#ffffff" fill-rule="evenodd"/>`);

/** The browser tab icon keeps the website's look: gradient mark, no backdrop. */
const favicon = size =>
  svg(size,
    `<path d="${markPath(size, size * 0.04)}" fill="url(#mark)" fill-rule="evenodd"/>`,
    gradientDef('mark'));

const render = async (name, markup, size) => {
  const file = path.join(outDir, name);
  await sharp(Buffer.from(markup)).resize(size, size).png().toFile(file);
  console.log(`${name}  ${size}x${size}`);
};

await mkdir(outDir, { recursive: true });
await render('icon.png', appIcon(1024), 1024);
await render('android-icon-foreground.png', adaptiveForeground(1024), 1024);
await render('android-icon-background.png', adaptiveBackground(1024), 1024);
await render('android-icon-monochrome.png', monochrome(1024), 1024);
await render('splash-icon.png', splashMark(512), 512);
await render('favicon.png', favicon(96), 96);

// A flat colour for anywhere the background image is not used.
await writeFile(path.join(outDir, 'brand.txt'), `${BRAND_BLUE}\n`);
console.log('done');
