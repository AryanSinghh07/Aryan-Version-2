/** Paths without a trailing slash, so /work and /work/ are the same page (/ stays /) */
export const normalizePath = (path: string) => path.replace(/(.)\/$/, '$1')
