/** Project domains on the Work page, each with its glow colour (panel rims and filter dots) */
export const DOMAINS = ['Computer Vision', 'NLP', 'Full Stack', 'Data & ML', 'Hackathon'] as const
export type Domain = (typeof DOMAINS)[number]

/** Used for glows and dots only, never for text, so they don't need text contrast */
export const DOMAIN_COLORS: Record<Domain, string> = {
  'Computer Vision': '#45d4ff',
  NLP: '#ff6fd0',
  'Full Stack': '#9b6bff',
  'Data & ML': '#ffb84d',
  Hackathon: '#d4ff3a',
}
