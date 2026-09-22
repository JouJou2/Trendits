/**
 * The Trendit app's look, lifted from the app design (claude.ai artifact
 * "Trendit Customer App"): exact colours, the Poppins type ramp and the
 * corner radii its screens use. Screens should reach for these rather than
 * literal values, so a change here reaches every screen.
 */

export const Colors = {
  /** Headings, prices, primary text. */
  ink: '#101a2e',
  /** Body copy and secondary labels. */
  body: '#43506b',
  muted: '#6b7690',
  faint: '#9aa3b8',
  /** Hairlines and input borders. */
  line: '#e6e9ef',

  /** Everything actionable: buttons, active tabs, links. */
  blue: '#0452c8',
  bluePressed: '#0341a3',
  blueTint: '#e7efff',
  /** Money and urgency: discounts, badges, favourites. */
  coral: '#fe5750',
  /** Rating stars. */
  amber: '#ffae1f',

  surface: '#ffffff',
  /** Muted fills: search field, icon wells. */
  fill: '#f2f4f7',
} as const;

/** The periwinkle page wash behind every screen. */
export const PageGradient = {
  colors: ['#e4ebfb', '#f4f6fd', '#eef1fc'] as const,
  locations: [0, 0.38, 1] as const,
};

/** The hero banner's blue-to-violet gradient. */
export const HeroGradient = ['#1e4fd8', '#5a6ff2', '#8b73f0'] as const;

/**
 * Photo wells are tinted per category rather than grey, so every card has
 * its own tone behind the product. Picked by a stable hash of the category.
 */
export const CategoryTints = ['#dbe6ff', '#ffdedb', '#ffe9c9', '#d3f0e2', '#e7ddfb'] as const;

export const tintFor = (key: string | undefined) => {
  let hash = 0;
  for (const ch of key || '') hash = (hash * 31 + ch.charCodeAt(0)) | 0;
  return CategoryTints[Math.abs(hash) % CategoryTints.length];
};

export const Radius = {
  /** Product cards. */
  card: 18,
  /** Photo wells inside cards. */
  well: 14,
  /** Square icon buttons in headers. */
  button: 13,
  /** Hero banner. */
  hero: 22,
  /** Floating tab bar. */
  tabBar: 24,
  pill: 999,
} as const;

export const Space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
} as const;

/** Loaded in the root layout; names match @expo-google-fonts/poppins. */
export const Font = {
  regular: 'Poppins_400Regular',
  medium: 'Poppins_500Medium',
  semibold: 'Poppins_600SemiBold',
  bold: 'Poppins_700Bold',
} as const;

/**
 * Soft lift used under cards and the tab bar. boxShadow is the current React
 * Native shadow (the older shadow* props are deprecated) and renders the same
 * on Android, iPhone and web.
 */
export const Shadow = {
  card: { boxShadow: '0px 4px 16px rgba(16, 26, 46, 0.06)' },
  tabBar: { boxShadow: '0px 6px 22px rgba(16, 26, 46, 0.09)' },
} as const;

/** Room the floating tab bar takes at the bottom of a scrolling screen. */
export const TabBarClearance = 110;
