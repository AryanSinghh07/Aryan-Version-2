import {
  AdditiveBlending,
  AnimationMixer,
  Color,
  CylinderGeometry,
  DoubleSide,
  Group,
  LoopRepeat,
  Mesh,
  PointLight,
  ShaderMaterial,
} from 'three'
import type { BufferGeometry, Material, MeshStandardMaterial, Object3D, Scene } from 'three'
import type { GLTF } from 'three/addons/loaders/GLTFLoader.js'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { lookColor, lookNumber } from '../config/landscape'
import { FLOOR_Y } from '../config/scenes'
import type { Palette } from '../core/Palette'
import type { Resources } from '../core/Resources'
import beamFragment from '../shaders/beam/fragment.glsl'
import beamVertex from '../shaders/beam/vertex.glsl'

/**
 * The Blender camera circles the lake centre (0, −15) at a radius of 45 units; our camera
 * orbits the logo at about 8.4. This scale makes the two orbits match, so the logo floats over
 * the middle of the lake with the mountains, tree, lighthouse and clouds around it.
 */
export const LANDSCAPE_SCALE = 8.4 / 45
const S = LANDSCAPE_SCALE
const LAKE_CENTER_Z = -15

/** Animation speeds relative to Blender (1 = the 10 s loop) */
const LOOP_SPEED = 0.5
const BEAM_SPEED = 0.35
const STAR_SPEED = 0.7
/** Static meshes merged by material: hundreds of rocks and stones become two draw calls */
const MERGE = /^(Rock|Stone)_/
/** Ground detail the lake doesn't need to mirror */
const NOT_MIRRORED = ['Grass_Web', 'Particles_Web', 'Merged_Rock_Mat', 'Merged_Stone_Mat']

/** Materials whose look changes between night and day */
interface Themed {
  grass: MeshStandardMaterial[]
  cloud: MeshStandardMaterial[]
  particle: MeshStandardMaterial[]
  star: MeshStandardMaterial[]
}

/**
 * The Digital Atmosphere landscape (public/models/env/environment.glb, made in Blender):
 * terrain, three mountain ranges, grass, rocks, a blossom tree, a fox by a lamp and a
 * keeper's cottage, a lighthouse with a turning beam, drifting clouds, floating leaves, a
 * glowing particle web and a shining star. Loaded lazily after the visitor enters, then faded
 * in. Its own camera is not used: the World's orbit plays that role, driven by the hero
 * scenes. Everything else keeps its Blender animation. Dark mode is a night (glowing lamp,
 * lighthouse beam, star), light mode a pastel day (config/landscape.ts), cross-faded with
 * the theme.
 */
export class Landscape {
  group = new Group()
  /** 0 → 1 while it fades in after loading */
  appear = 0

  private mixer: AnimationMixer | null = null
  private themed: Themed = { grass: [], cloud: [], particle: [], star: [] }
  /** Each material with the opacity it settles at (clouds stay see-through) */
  private faded: { material: Material; opacity: number }[] = []
  private lamp = new PointLight('#ffb86b', 0, 8 * S, 2)
  private lantern = new PointLight('#ffdcae', 0, 30 * S, 2)
  private beam: ShaderMaterial | null = null
  private ready = false
  private groundDetail: Object3D[] = []

  constructor(
    private scene: Scene,
    resources: Resources
  ) {
    this.group.name = 'landscape'
    this.group.scale.setScalar(S)
    this.group.position.set(0, FLOOR_Y, -LAKE_CENTER_Z * S)
    this.group.visible = false
    scene.add(this.group)

    const existing = resources.get<GLTF>('environment')
    if (existing) this.setup(existing)
    resources.on('loaded', ({ name, asset }) => {
      if (name === 'environment' && !this.ready) this.setup(asset as GLTF)
    })
  }

  private setup(gltf: GLTF) {
    this.ready = true
    const root = gltf.scene
    // Its camera is replaced by the World's orbit
    root.getObjectByName('Camera_Hero')?.removeFromParent()
    this.mergeStatic(root)

    const seen = new Set<Material>()
    root.traverse((o) => {
      const mesh = o as Mesh
      if (!mesh.isMesh) return
      const m = mesh.material as MeshStandardMaterial
      if (seen.has(m)) return
      seen.add(m)
      // glTF can't carry Blender's node effects (grass gradient, glow strengths): restore them
      let opacity = 1
      switch (m.name) {
        case 'Grass_Mat':
          m.side = DoubleSide
          this.themed.grass.push(m)
          break
        case 'Leaf_Mat':
          m.side = DoubleSide
          break
        case 'Particle_Mat':
          this.themed.particle.push(m)
          break
        case 'Star_Core_Mat':
          this.themed.star.push(m)
          break
        case 'Lamp_Glow_Mat':
          m.emissiveIntensity = 25
          break
        case 'LH_Lamp_Mat':
          m.emissiveIntensity = 20
          break
        case 'Cloud_Mat':
          m.fog = false
          opacity = 0.9
          this.themed.cloud.push(m)
          break
      }
      // Matte surfaces: the studio reflections meant for the glass would make them look plastic
      m.envMapIntensity = 0.15
      // Fade in after loading
      m.transparent = true
      m.opacity = 0
      this.faded.push({ material: m, opacity })
    })

    // The lamp by the fox and the lighthouse lantern light their surroundings (point lights
    // work in world units: range and strength are scaled with the landscape)
    root.getObjectByName('Lamp_Bulb')?.add(this.lamp)
    root.getObjectByName('Lighthouse_Beam_Pivot')?.add(this.lantern, this.makeBeam())

    this.group.add(root)
    this.groundDetail = NOT_MIRRORED.map((name) => root.getObjectByName(name)).filter(
      (o): o is Object3D => !!o
    )

    this.mixer = new AnimationMixer(root)
    for (const clip of gltf.animations) {
      // The camera clips belong to Blender's camera, which the World's orbit replaces
      if (clip.tracks.some((t) => t.name.startsWith('Camera_Hero'))) continue
      const action = this.mixer.clipAction(clip)
      action.setLoop(LoopRepeat, Infinity)
      action.timeScale = clip.name.startsWith('Lighthouse')
        ? BEAM_SPEED
        : clip.name.startsWith('Star')
          ? STAR_SPEED
          : LOOP_SPEED
      action.play()
    }
  }

  /** Two soft light cones, back to back, sweeping round with the lighthouse lamp */
  private makeBeam() {
    const geometry = new CylinderGeometry(4.5, 0.4, 30, 24, 1, true)
    geometry.translate(0, 15, 0)
    geometry.rotateX(-Math.PI / 2)
    this.beam = new ShaderMaterial({
      vertexShader: beamVertex,
      fragmentShader: beamFragment,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      side: DoubleSide,
      fog: false,
      uniforms: {
        uColor: { value: new Color('#ffe9c4') },
        uOpacity: { value: 0 },
      },
    })
    const group = new Group()
    group.name = 'Lighthouse_Beam'
    const a = new Mesh(geometry, this.beam)
    const b = new Mesh(geometry, this.beam)
    b.rotation.y = Math.PI
    group.add(a, b)
    return group
  }

  /**
   * Rocks and stones never move: merge them per material, one mesh instead of 164 draw calls
   * (which counts three times over on High: screen, mirror and glass passes).
   */
  private mergeStatic(root: Object3D) {
    const byMaterial = new Map<Material, Mesh[]>()
    root.traverse((o) => {
      const mesh = o as Mesh
      if (!mesh.isMesh || !MERGE.test(o.name)) return
      const m = mesh.material as Material
      byMaterial.set(m, [...(byMaterial.get(m) ?? []), mesh])
    })
    root.updateMatrixWorld(true)
    const toRoot = root.matrixWorld.clone().invert()
    for (const [material, meshes] of byMaterial) {
      if (meshes.length < 2) continue
      const parts: BufferGeometry[] = meshes.map((mesh) =>
        mesh.geometry.clone().applyMatrix4(toRoot.clone().multiply(mesh.matrixWorld))
      )
      const merged = mergeGeometries(parts)
      parts.forEach((g) => g.dispose())
      if (!merged) continue
      const mesh = new Mesh(merged, material)
      mesh.name = `Merged_${material.name}`
      for (const part of meshes) {
        part.removeFromParent()
        part.geometry.dispose()
      }
      root.add(mesh)
    }
  }

  /** Objects to leave out of the lake's mirror image */
  get hiddenInReflection(): Object3D[] {
    return this.groundDetail
  }

  update(palette: Palette, delta: number, reduced: boolean) {
    if (!this.ready) return
    this.group.visible = true
    if (this.appear < 1) {
      this.appear = Math.min(1, this.appear + delta / (reduced ? 0.01 : 1.6))
      const t = this.appear * this.appear * (3 - 2 * this.appear)
      for (const { material, opacity } of this.faded) {
        material.opacity = opacity * t
        // Fully in: back to opaque rendering where possible (cheaper, and sorts correctly)
        if (this.appear >= 1 && opacity === 1) material.transparent = false
      }
    }
    // Night or day, blended with the theme (lights and beam also fade in with the landscape)
    const d = palette.darkness
    const fade = this.appear * this.appear * (3 - 2 * this.appear)
    for (const m of this.themed.grass) lookColor('grass', d, m.color)
    for (const m of this.themed.cloud) {
      lookColor('cloud', d, m.color)
      m.emissiveIntensity = lookNumber('cloudEmissive', d)
    }
    for (const m of this.themed.particle) m.emissiveIntensity = lookNumber('particleGlow', d)
    for (const m of this.themed.star) m.emissiveIntensity = lookNumber('starGlow', d)
    this.lamp.intensity = lookNumber('lampI', d) * S * S * fade
    this.lantern.intensity = lookNumber('lighthouseI', d) * S * S * fade
    if (this.beam) this.beam.uniforms.uOpacity!.value = lookNumber('beam', d) * fade
    this.mixer?.update(reduced ? 0 : delta)
  }

  dispose() {
    this.mixer?.stopAllAction()
    this.scene.remove(this.group)
    this.group.traverse((o) => {
      const mesh = o as Mesh
      if (!mesh.isMesh) return
      mesh.geometry.dispose()
      ;(mesh.material as Material).dispose()
    })
  }
}
