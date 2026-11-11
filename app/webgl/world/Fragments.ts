import {
  Group,
  IcosahedronGeometry,
  Mesh,
  MeshPhysicalMaterial,
  OctahedronGeometry,
  PMREMGenerator,
  SphereGeometry,
} from 'three'
import type { Object3D, Scene, Texture, WebGLRenderer } from 'three'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { QUALITY } from '../config/quality'
import type { QualityTier } from '../config/quality'
import type { Palette } from '../core/Palette'
import { createRandom } from '../shapes/random'

/**
 * Floating glass shards scattered through the depth of the scene, and a glass orb that travels
 * with the particles. Reflections come from a generated studio environment (no HDR file needed;
 * drop /textures/env.hdr into config/sources.ts later to use a real one).
 *
 * Quality: the orb refracts what is behind it (transmission) only on High; Medium and Low use
 * a cheaper see-through glass. Low hides the shards.
 */
export class Fragments {
  group = new Group()
  orb: Mesh<SphereGeometry, MeshPhysicalMaterial>
  private shards: { mesh: Mesh; spin: number; bob: number; phase: number; baseY: number }[] = []
  private envMap: Texture
  private shardMaterial: MeshPhysicalMaterial

  constructor(
    private scene: Scene,
    renderer: WebGLRenderer,
    orbParent: Object3D
  ) {
    const pmrem = new PMREMGenerator(renderer)
    this.envMap = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
    pmrem.dispose()
    scene.environment = this.envMap

    this.shardMaterial = new MeshPhysicalMaterial({
      roughness: 0.12,
      metalness: 0.05,
      clearcoat: 1,
      clearcoatRoughness: 0.1,
      iridescence: 0.7,
      iridescenceIOR: 1.4,
      transparent: true,
      opacity: 0.55,
      envMapIntensity: 0.7,
    })

    const rand = createRandom(21)
    const shapes = [new OctahedronGeometry(1, 0), new IcosahedronGeometry(1, 0)]
    for (let i = 0; i < 9; i++) {
      const mesh = new Mesh(shapes[i % 2]!, this.shardMaterial)
      const side = i % 2 ? 1 : -1
      // Far behind the text plane, so they read as distant background detail
      mesh.position.set(side * (2.8 + rand() * 3.2), (rand() * 2 - 1) * 2.6, -3.5 - rand() * 4)
      mesh.scale.setScalar(0.08 + rand() * 0.14)
      mesh.rotation.set(rand() * 6, rand() * 6, rand() * 6)
      this.group.add(mesh)
      this.shards.push({
        mesh,
        spin: (rand() - 0.5) * 0.6,
        bob: 0.08 + rand() * 0.12,
        phase: rand() * Math.PI * 2,
        baseY: mesh.position.y,
      })
    }
    this.group.name = 'fragments'
    scene.add(this.group)

    this.orb = new Mesh(
      new SphereGeometry(1, 64, 32),
      new MeshPhysicalMaterial({
        roughness: 0.04,
        metalness: 0,
        ior: 1.45,
        thickness: 0.8,
        iridescence: 0.5,
        clearcoat: 1,
        envMapIntensity: 1.4,
      })
    )
    this.orb.name = 'glassOrb'
    this.orb.scale.setScalar(0.26)
    this.orb.position.set(1.35, 1.15, 0.7)
    orbParent.add(this.orb)
  }

  setQuality(tier: QualityTier) {
    const m = this.orb.material
    if (QUALITY[tier].transmission) {
      // True refraction: three renders what is behind the orb into a texture each frame
      m.transmission = 1
      m.transparent = false
      m.opacity = 1
    } else {
      m.transmission = 0
      m.transparent = true
      m.opacity = 0.35
    }
    m.needsUpdate = true
    this.group.visible = QUALITY[tier].shards
  }

  update(palette: Palette, elapsed: number, delta: number, reducedMotion: boolean) {
    const { colors } = palette
    // Tinted towards the theme violet so they never glow pure white
    this.shardMaterial.color.lerpColors(colors.particleA, colors.particleB, 0.5)
    this.shardMaterial.attenuationColor.copy(colors.particleA)
    this.orb.material.color.copy(colors.particleB)
    this.orb.material.attenuationColor.copy(colors.particleA)
    this.orb.material.attenuationDistance = 1.5
    if (reducedMotion) return
    for (const s of this.shards) {
      s.mesh.rotation.x += s.spin * delta
      s.mesh.rotation.y += s.spin * 0.7 * delta
      s.mesh.position.y = s.baseY + Math.sin(elapsed * 0.4 + s.phase) * s.bob
    }
    this.orb.position.y = 1.15 + Math.sin(elapsed * 0.6) * 0.06
  }

  dispose() {
    this.scene.remove(this.group)
    this.orb.removeFromParent()
    this.orb.geometry.dispose()
    this.orb.material.dispose()
    this.shardMaterial.dispose()
    this.group.children.forEach((c) => (c as Mesh).geometry.dispose())
    this.envMap.dispose()
  }
}
