/** Paths without a trailing slash, so /work and /work/ are the same page (/ stays /) */
export const normalizePath = (path: string) => path.replace(/(.)\/$/, '$1')

/** Pages on their own plain backdrop (About has its own 3D room): the shared 3D world hides */
const WORLD_HIDDEN = ['/about', '/work', '/contact']

/** True when the shared 3D world stays out of sight on this page */
export const hidesWorld = (path: string) => WORLD_HIDDEN.includes(normalizePath(path))
