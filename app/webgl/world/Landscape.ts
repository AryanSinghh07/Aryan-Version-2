import { AnimationMixer, Color, DoubleSide, Group, LoopRepeat, Mesh } from 'three'
import type { BufferGeometry, Material, MeshStandardMaterial, Object3D, Scene } from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import type { GLTF } from 'three/addons/loaders/GLTFLoader.js'
import { FLOOR_Y } from '../config/scenes'
import type { Palette } from '../core/Palette'
import type { Resources } from '../core/Resources'

/**
 * The Blender camera circles the lake centre (0, −15) at a radius of 45 units; our camera
 * orbits the logo at about 8.4. This scale makes the two orbits match, so the logo floats over
 * the middle of the lake with the mountains, grass, rocks and leaves around it.
 */
export const LANDSCAPE_SCALE = 8.4 / 45
const LAKE_CENTER_Z = -15

/** Animation speeds relative to Blender (1 = the 10 s loop) */
const LEAF_SPEED = 0.5
const STAR_SPEED = 0.7
/** Light theme: every landscape colour moves this far towards a pale lavender */
const LIGHT_TINT = new Color('#e7ddff')
const LIGHT_MIX = 0.68

interface Tinted {
  material: MeshStandardMaterial
  dark: Color
  light: Color
}

/**
 * The Digital Atmosphere landscape (public/models/env/environment.glb, made in Blender):
 * terrain, three mountain ranges, grass, rocks, floating leaves, a glowing particle web and a
 * shining star. Loaded lazily after the visitor enters, then faded in. Its own camera is not
 * used: the World's orbit plays that role, driven by the hero scenes. The floating leaves and
 * the star's twinkle keep their Blender animations. Colours follow the theme (the scene was
 * designed for dark; light mode uses pale versions of the same colours).
 */
export class Landscape {
  group = new Group()
  /** 0 → 1 while it fades in after loading */
  appear = 0

  private mixer: AnimationMixer | null = null
  private tinted: Tinted[] = []
  private materials: Material[] = []
  private ready = false
  /** Ground detail the lake doesn't need to mirror (grass, rocks, particle web) */
  private groundDetail: Object3D[] = []

  constructor(
    private scene: Scene,
    resources: Resources
  ) {
    this.group.name = 'landscape'
    this.group.scale.setScalar(LANDSCAPE_SCALE)
    this.group.position.set(0, FLOOR_Y, -LAKE_CENTER_Z * LANDSCAPE_SCALE)
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
    this.mergeRocks(root)

    const seen = new Set<Material>()
    root.traverse((o) => {
      const mesh = o as Mesh
      if (!mesh.isMesh) return
      const m = mesh.material as MeshStandardMaterial
      if (seen.has(m)) return
      seen.add(m)
      // glTF can't carry Blender's node effects (grass gradient, glow strength): restore them
      if (m.name === 'Grass_Mat') {
        m.color.set('#3a2d5c')
        m.side = DoubleSide
      }
      if (m.name === 'Particle_Mat') m.emissiveIntensity = 3
      if (m.name === 'Star_Core_Mat') m.emissiveIntensity = 40
      if (m.name === 'Leaf_Mat') m.side = DoubleSide
      // Matte terrain: the studio reflections meant for the glass would make it look plastic
      m.envMapIntensity = 0.15
      // Fade in after loading
      m.transparent = true
      m.opacity = 0
      this.materials.push(m)
      if (m.isMeshStandardMaterial) {
        const dark = m.color.clone()
        this.tinted.push({ material: m, dark, light: dark.clone().lerp(LIGHT_TINT, LIGHT_MIX) })
      }
    })
    this.group.add(root)
    this.groundDetail = ['Grass_Web', 'Rocks', 'Particles_Web']
      .map((name) => root.getObjectByName(name))
      .filter((o): o is Object3D => !!o)

    this.mixer = new AnimationMixer(root)
    for (const clip of gltf.animations) {
      if (clip.name.startsWith('CameraOrbit')) continue
      const action = this.mixer.clipAction(clip)
      action.setLoop(LoopRepeat, Infinity)
      action.timeScale = clip.name.startsWith('Star') ? STAR_SPEED : LEAF_SPEED
      action.play()
    }
  }

  /**
   * The 110 rocks share one material and never move: one mesh instead of 110 draw calls,
   * which counts three times over on High (screen, mirror and glass passes).
   */
  private mergeRocks(root: Object3D) {
    const rocks: Mesh[] = []
    root.traverse((o) => {
      if ((o as Mesh).isMesh && o.name.startsWith('Rock_')) rocks.push(o as Mesh)
    })
    if (rocks.length < 2) return
    root.updateMatrixWorld(true)
    const toRoot = root.matrixWorld.clone().invert()
    const parts: BufferGeometry[] = rocks.map((rock) =>
      rock.geometry.clone().applyMatrix4(toRoot.clone().multiply(rock.matrixWorld))
    )
    const merged = mergeGeometries(parts)
    parts.forEach((g) => g.dispose())
    if (!merged) return
    const mesh = new Mesh(merged, rocks[0]!.material)
    mesh.name = 'Rocks'
    for (const rock of rocks) {
      rock.removeFromParent()
      rock.geometry.dispose()
    }
    root.add(mesh)
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
      const opacity = this.appear * this.appear * (3 - 2 * this.appear)
      for (const m of this.materials) {
        m.opacity = opacity
        // Fully in: back to opaque rendering (cheaper, and sorts correctly)
        if (this.appear >= 1) m.transparent = false
      }
    }
    for (const t of this.tinted) t.material.color.lerpColors(t.light, t.dark, palette.darkness)
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
