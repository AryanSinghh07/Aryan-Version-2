/** Paths without a trailing slash, so /work and /work/ are the same page (/ stays /) */
export const normalizePath = (path: string) => path.replace(/(.)\/$/, '$1')

/**
 * Pages on their own plain backdrop (About has its own 3D room): the shared 3D world hides.
 * Every project page (/work/<slug>) too.
 */
const WORLD_HIDDEN = ['/about', '/work', '/contact']

/** True when the shared 3D world stays out of sight on this page */
export const hidesWorld = (path: string) => {
  const p = normalizePath(path)
  return WORLD_HIDDEN.includes(p) || p.startsWith('/work/')
}
