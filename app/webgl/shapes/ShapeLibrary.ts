import { Mesh, Vector3 } from 'three'
import type { BufferGeometry, Object3D } from 'three'
import type { GLTF } from 'three/addons/loaders/GLTFLoader.js'
import { MeshSurfaceSampler } from 'three/addons/math/MeshSurfaceSampler.js'
import type { Resources } from '../core/Resources'
import { GENERATORS, normalize } from './generators'
import { createRandom } from './random'

export const FALLBACK_SHAPE = 'constellation'

/**
 * Point clouds for every particle shape, cached per particle count.
 * A loaded model named "shape:<name>" (see config/sources.ts) wins over the generated
 * version, so a Blender model can replace any shape without code changes.
 */
export class ShapeLibrary {
  private cache = new Map<string, Promise<Float32Array>>()

  constructor(private resources: Resources) {}

  get(name: string, count: number): Promise<Float32Array> {
    const key = `${name}:${count}`
    let points = this.cache.get(key)
    if (!points) {
      points = this.build(name, count)
      this.cache.set(key, points)
    }
    return points
  }

  /** Forget cached shapes (after a model finishes loading, or when the count changes) */
  clear() {
    this.cache.clear()
  }

  private async build(name: string, count: number) {
    const model = this.resources.get<GLTF>(`shape:${name}`)
    if (model) return sampleModel(model.scene, count)
    const generate = GENERATORS[name] ?? GENERATORS[FALLBACK_SHAPE]!
    return generate(count)
  }
}

/** Evenly samples points over every mesh surface in a model */
function sampleModel(root: Object3D, count: number) {
  root.updateMatrixWorld(true)
  const meshes: Mesh[] = []
  root.traverse((o) => {
    if (o instanceof Mesh) meshes.push(o)
  })
  const points = new Float32Array(count * 3)
  if (!meshes.length) return points

  // Share points between meshes by surface area, so small parts don't get crowded
  const geometries = meshes.map((m) => {
    const g = (m.geometry as BufferGeometry).clone().applyMatrix4(m.matrixWorld)
    return g.index ? g.toNonIndexed() : g
  })
  const areas = geometries.map(surfaceArea)
  const total = areas.reduce((a, b) => a + b, 0) || 1
  const rand = createRandom(7)
  let written = 0
  geometries.forEach((g, k) => {
    const n =
      k === geometries.length - 1 ? count - written : Math.round((areas[k]! / total) * count)
    const sampler = new MeshSurfaceSampler(new Mesh(g))
    // Seeded, so a model gives the same points every visit (missing from three's type file)
    ;(sampler as unknown as { setRandomGenerator(fn: () => number): void }).setRandomGenerator(rand)
    sampler.build()
    const p = new Vector3()
    for (let i = 0; i < n && written < count; i++, written++) {
      sampler.sample(p)
      points.set([p.x, p.y, p.z], written * 3)
    }
    g.dispose()
  })
  return normalize(points)
}

function surfaceArea(g: BufferGeometry) {
  const pos = g.attributes.position!
  let area = 0
  for (let i = 0; i < pos.count; i += 3) {
    const ax = pos.getX(i),
      ay = pos.getY(i),
      az = pos.getZ(i)
    const ux = pos.getX(i + 1) - ax,
      uy = pos.getY(i + 1) - ay,
      uz = pos.getZ(i + 1) - az
    const vx = pos.getX(i + 2) - ax,
      vy = pos.getY(i + 2) - ay,
      vz = pos.getZ(i + 2) - az
    area += Math.hypot(uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx) / 2
  }
  return area
}
