import { createRandom, gaussian, onSphere } from './random'
import type { Random } from './random'

// Particle shapes built in code. Each returns exactly `count` points (x, y, z, x, y, z, ...),
// centred and scaled to the same size, so the shader can morph between any two of them.
// A GLB in /public/models/shapes/ with the same name replaces the generated shape
// (see ShapeLibrary.ts).

export type ShapeGenerator = (count: number) => Float32Array | Promise<Float32Array>

/** Half-size of the largest side after normalising, in world units */
export const SHAPE_RADIUS = 1.7

/** Centres the points and scales them so the largest half-extent is SHAPE_RADIUS */
export function normalize(points: Float32Array, radius = SHAPE_RADIUS) {
  const min = [Infinity, Infinity, Infinity]
  const max = [-Infinity, -Infinity, -Infinity]
  for (let i = 0; i < points.length; i += 3) {
    for (let a = 0; a < 3; a++) {
      const v = points[i + a]!
      if (v < min[a]!) min[a] = v
      if (v > max[a]!) max[a] = v
    }
  }
  const center = [0, 1, 2].map((a) => (min[a]! + max[a]!) / 2)
  const extent = Math.max(...[0, 1, 2].map((a) => (max[a]! - min[a]!) / 2)) || 1
  const scale = radius / extent
  for (let i = 0; i < points.length; i += 3) {
    for (let a = 0; a < 3; a++) points[i + a] = (points[i + a]! - center[a]!) * scale
  }
  return points
}

function writer(count: number) {
  const points = new Float32Array(count * 3)
  let i = 0
  return {
    points,
    get full() {
      return i >= count
    },
    push(x: number, y: number, z: number) {
      if (i >= count) return
      points[i * 3] = x
      points[i * 3 + 1] = y
      points[i * 3 + 2] = z
      i++
    },
  }
}

/** Splits `count` into parts by share, making sure the parts add up exactly */
function split(count: number, shares: number[]) {
  const parts = shares.map((s) => Math.floor(count * s))
  parts[0]! += count - parts.reduce((a, b) => a + b, 0)
  return parts
}

function lerpPoint(
  rand: Random,
  a: number[],
  b: number[],
  jitter: number
): [number, number, number] {
  const t = rand()
  return [
    a[0]! + (b[0]! - a[0]!) * t + gaussian(rand) * jitter,
    a[1]! + (b[1]! - a[1]!) * t + gaussian(rand) * jitter,
    a[2]! + (b[2]! - a[2]!) * t + gaussian(rand) * jitter,
  ]
}

// ---------------------------------------------------------------- Scene 1: the letter A
/** The letter A in the display font, sampled from a canvas and given a little depth */
export const letterA: ShapeGenerator = async (count) => {
  const family = '"Instrument Serif", "Times New Roman", serif'
  try {
    await document.fonts.load(`400 400px ${family}`, 'A')
  } catch {
    // Fall back to whatever serif is available
  }

  const size = 512
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!
  ctx.fillStyle = '#fff'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  ctx.font = `400 470px ${family}`
  const metrics = ctx.measureText('A')
  const height = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent
  ctx.fillText('A', size / 2, size / 2 + height / 2 - metrics.actualBoundingBoxDescent)

  const data = ctx.getImageData(0, 0, size, size).data
  const filled: number[] = []
  for (let p = 0; p < size * size; p++) if (data[p * 4 + 3]! > 128) filled.push(p)

  const rand = createRandom(1)
  const out = writer(count)
  if (!filled.length) return normalize(out.points)
  while (!out.full) {
    const p = filled[Math.floor(rand() * filled.length)]!
    const x = (p % size) + rand() - 0.5
    const y = Math.floor(p / size) + rand() - 0.5
    out.push(x - size / 2, size / 2 - y, (rand() - 0.5) * 60)
  }
  return normalize(out.points)
}

// ---------------------------------------------------------------- Scene 2: neural network
/** Layers of nodes joined by connections, like a small neural network diagram */
export const neuralNet: ShapeGenerator = (count) => {
  const rand = createRandom(2)
  const layers = [4, 6, 6, 3]
  const nodes: number[][][] = layers.map((n, l) => {
    const x = (l / (layers.length - 1) - 0.5) * 4
    return Array.from({ length: n }, (_, k) => [
      x,
      (n === 1 ? 0 : k / (n - 1) - 0.5) * (0.6 + n * 0.45),
      (rand() - 0.5) * 0.8,
    ])
  })
  const [nodePoints, edgePoints] = split(count, [0.4, 0.6])
  const out = writer(count)
  const all = nodes.flat()

  for (let i = 0; i < nodePoints!; i++) {
    const node = all[Math.floor(rand() * all.length)]!
    const [sx, sy, sz] = onSphere(rand)
    const r = 0.16 * Math.cbrt(rand())
    out.push(node[0]! + sx * r, node[1]! + sy * r, node[2]! + sz * r)
  }
  for (let i = 0; i < edgePoints!; i++) {
    const l = Math.floor(rand() * (layers.length - 1))
    const a = nodes[l]![Math.floor(rand() * nodes[l]!.length)]!
    const b = nodes[l + 1]![Math.floor(rand() * nodes[l + 1]!.length)]!
    out.push(...lerpPoint(rand, a, b, 0.012))
  }
  return normalize(out.points)
}

// ---------------------------------------------------------------- Scene 3: leaf
/** A curved leaf with a midrib, side veins and a short stem */
export const leaf: ShapeGenerator = (count) => {
  const rand = createRandom(3)
  const length = 3.4
  const halfWidth = (u: number) => 0.8 * Math.pow(Math.sin(Math.PI * u), 0.85) * (1 - 0.3 * u)
  const place = (u: number, v: number): [number, number, number] => {
    const x = (u - 0.5) * length
    const z = -0.55 * v * v + 0.25 * Math.sin(Math.PI * u)
    return [x, v, z]
  }

  const [blade, veins, edge, stem] = split(count, [0.62, 0.22, 0.12, 0.04])
  const out = writer(count)
  for (let i = 0; i < blade!; i++) {
    const u = rand()
    out.push(...place(u, (rand() * 2 - 1) * halfWidth(u)))
  }
  for (let i = 0; i < veins!; i++) {
    if (rand() < 0.35) {
      out.push(...place(rand(), gaussian(rand) * 0.008))
    } else {
      const k = Math.floor(rand() * 8)
      const u0 = 0.12 + k * 0.1
      const side = rand() < 0.5 ? -1 : 1
      const t = rand()
      const u = u0 + t * 0.16
      out.push(...place(u, side * t * halfWidth(u) * 0.9 + gaussian(rand) * 0.006))
    }
  }
  for (let i = 0; i < edge!; i++) {
    const u = rand()
    out.push(...place(u, (rand() < 0.5 ? -1 : 1) * halfWidth(u)))
  }
  for (let i = 0; i < stem!; i++) {
    const [x, y, z] = place(-0.14 * rand(), gaussian(rand) * 0.01)
    out.push(x, y, z)
  }

  // Tilt the leaf diagonally
  const angle = 0.6
  const c = Math.cos(angle)
  const s = Math.sin(angle)
  const p = out.points
  for (let i = 0; i < p.length; i += 3) {
    const x = p[i]!
    const y = p[i + 1]!
    p[i] = x * c - y * s
    p[i + 1] = x * s + y * c
  }
  return normalize(p)
}

// ---------------------------------------------------------------- Scene 4: chat bubble
/** A rounded speech bubble with a tail and three "typing" dots */
export const chatBubble: ShapeGenerator = (count) => {
  const rand = createRandom(4)
  const w = 1.6
  const h = 1.05
  const r = 0.5
  const depth = 0.24
  const tail = [
    [-0.95, -h + 0.02],
    [-0.35, -h + 0.02],
    [-1.3, -h - 0.55],
  ] as const

  const inRoundRect = (x: number, y: number) => {
    const dx = Math.max(Math.abs(x) - (w - r), 0)
    const dy = Math.max(Math.abs(y) - (h - r), 0)
    return dx * dx + dy * dy <= r * r
  }
  const inTail = (x: number, y: number) => {
    const [[ax, ay], [bx, by], [cx, cy]] = tail
    const d = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax)
    const u = ((bx - x) * (cy - y) - (by - y) * (cx - x)) / d
    const v = ((cx - x) * (ay - y) - (cy - y) * (ax - x)) / d
    return u >= 0 && v >= 0 && u + v <= 1
  }
  const inside = (x: number, y: number) => inRoundRect(x, y) || inTail(x, y)

  const [faces, rim, dots] = split(count, [0.5, 0.3, 0.2])
  const out = writer(count)
  for (let i = 0; i < faces!;) {
    const x = (rand() * 2 - 1) * (w + 0.1) - 0.1
    const y = (rand() * 2 - 1) * (h + 0.6) - 0.3
    if (!inside(x, y)) continue
    out.push(x, y, rand() < 0.5 ? depth : -depth)
    i++
  }
  // Rim: points just inside the outline, spread through the bubble's thickness
  for (let i = 0; i < rim!;) {
    const x = (rand() * 2 - 1) * (w + 0.1) - 0.1
    const y = (rand() * 2 - 1) * (h + 0.6) - 0.3
    if (!inside(x, y)) continue
    const nearEdge =
      !inside(x + 0.06, y) || !inside(x - 0.06, y) || !inside(x, y + 0.06) || !inside(x, y - 0.06)
    if (!nearEdge) continue
    out.push(x, y, (rand() * 2 - 1) * depth)
    i++
  }
  for (let i = 0; i < dots!; i++) {
    const cx = [-0.65, 0, 0.65][Math.floor(rand() * 3)]!
    const [sx, sy, sz] = onSphere(rand)
    const rr = 0.2 * Math.cbrt(rand())
    out.push(cx + sx * rr, sy * rr, depth + 0.15 + sz * rr)
  }
  return normalize(out.points)
}

// ---------------------------------------------------------------- Scene 5: constellation
/** Bright stars joined into a constellation, with a burst of dust around them */
export const constellation: ShapeGenerator = (count) => {
  const rand = createRandom(5)
  const stars = Array.from({ length: 14 }, () => [
    (rand() * 2 - 1) * 2.2,
    (rand() * 2 - 1) * 1.4,
    (rand() * 2 - 1) * 0.7,
  ])
  // Join each star to its two nearest neighbours
  const links: [number[], number[]][] = []
  stars.forEach((a, i) => {
    stars
      .map((b, j) => ({ j, d: Math.hypot(a[0]! - b[0]!, a[1]! - b[1]!, a[2]! - b[2]!) }))
      .filter((n) => n.j !== i)
      .sort((p, q) => p.d - q.d)
      .slice(0, 2)
      .forEach((n) => links.push([a, stars[n.j]!]))
  })

  const [cores, lines, dust] = split(count, [0.3, 0.35, 0.35])
  const out = writer(count)
  for (let i = 0; i < cores!; i++) {
    const s = stars[Math.floor(rand() * stars.length)]!
    out.push(
      s[0]! + gaussian(rand) * 0.05,
      s[1]! + gaussian(rand) * 0.05,
      s[2]! + gaussian(rand) * 0.05
    )
  }
  for (let i = 0; i < lines!; i++) {
    const [a, b] = links[Math.floor(rand() * links.length)]!
    out.push(...lerpPoint(rand, a, b, 0.01))
  }
  for (let i = 0; i < dust!; i++) {
    const [sx, sy, sz] = onSphere(rand)
    const rr = 2.8 * Math.pow(rand(), 0.6)
    out.push(sx * rr * 1.3, sy * rr * 0.9, sz * rr * 0.6)
  }
  return normalize(out.points, SHAPE_RADIUS * 1.15)
}

export const GENERATORS: Record<string, ShapeGenerator> = {
  'letter-a': letterA,
  'neural-net': neuralNet,
  leaf,
  'chat-bubble': chatBubble,
  constellation,
}
