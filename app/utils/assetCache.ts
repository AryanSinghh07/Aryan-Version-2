/**
 * Files fetched once, early (during the preloader), and kept in memory for whoever needs them
 * later: the About room model is downloaded with everything else at the start, so the About
 * page opens straight onto it.
 */
const cache = new Map<string, Promise<ArrayBuffer>>()

/** Starts (or reuses) the download of a file */
export function preloadAsset(url: string) {
  let task = cache.get(url)
  if (!task) {
    task = fetch(url).then((res) => {
      if (!res.ok) throw new Error(`${url}: ${res.status}`)
      return res.arrayBuffer()
    })
    // A failed download is forgotten, so a later visit can try again
    task.catch(() => cache.delete(url))
    cache.set(url, task)
  }
  return task
}
