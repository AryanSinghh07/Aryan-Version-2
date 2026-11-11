// Seeded random numbers, so every shape looks the same on every visit.
export function createRandom(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export type Random = ReturnType<typeof createRandom>

/** Random point on the surface of a unit sphere */
export function onSphere(rand: Random): [number, number, number] {
  const u = rand() * 2 - 1
  const theta = rand() * Math.PI * 2
  const r = Math.sqrt(1 - u * u)
  return [r * Math.cos(theta), r * Math.sin(theta), u]
}

/** Roughly normal-distributed value (mean 0, sd about 1) */
export function gaussian(rand: Random) {
  return (rand() + rand() + rand() + rand() - 2) * 1.7
}
