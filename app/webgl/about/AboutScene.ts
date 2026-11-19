import * as THREE from 'three'
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

/**
 * The About page room (public/models/about-room.glb, Blender scene "About" in
 * Digital-Atmosphere.blend): a large study and lounge with a big window onto the lake.
 *
 * Scroll story: hallway → the door swings open → walk in (the window reveal) → lounge and
 * neon → bookshelf and reading nook → desk → push into the right monitor until its screen fills
 * the whole window. `onScreenFill` (0 → 1) says how far into the screen the camera is, so the
 * page can take over from there.
 *
 * Its own renderer and canvas, separate from the shared 3D world (which pauses meanwhile).
 */

export type AboutTheme = 'dark' | 'light'

interface Look {
  skyHorizon: string
  skyMid: string
  sky: string
  skyTop: string
  fog: string
  fogNear: number
  fogFar: number
  outdoorAmbient: string
  outdoorAmbientI: number
  sun: string
  sunI: number
  /** Soft ceiling light */
  roomFill: string
  roomFillI: number
  /** Warm lamps: desk, pendants, arc, nook, hallway */
  lampI: number
  /** Monitor glow */
  screenI: number
  /** Neon, cove, LED strips, PC RGB */
  ledI: number
  wall: string
  exposure: number
  bloomStrength: number
  bloomThreshold: number
  lighthouseI: number
  beam: number
  /** The view through the window: grass, blossom (tint and glow), clouds, fireflies, star */
  grass: string
  leaf: string
  leafGlow: number
  cloud: string
  cloudGlow: number
  particleGlow: number
  starGlow: number
  /** The lake: deep water, the sky it mirrors at a glance, and the glints on its ripples */
  lakeDeep: string
  lakeShine: string
  lakeGlint: string
}
type ColorKey = { [K in keyof Look]: Look[K] extends string ? K : never }[keyof Look]
type NumberKey = { [K in keyof Look]: Look[K] extends number ? K : never }[keyof Look]

export const ABOUT_LOOKS: Record<AboutTheme, Look> = {
  dark: {
    skyHorizon: '#8a4fa8',
    skyMid: '#4b2f8c',
    sky: '#24185a',
    skyTop: '#0a0720',
    fog: '#2e2260',
    fogNear: 40,
    fogFar: 260,
    outdoorAmbient: '#8a74c8',
    outdoorAmbientI: 0.45,
    sun: '#b9a2ff',
    sunI: 0.6,
    roomFill: '#9a86d6',
    roomFillI: 0.35,
    lampI: 1,
    screenI: 1,
    ledI: 1,
    wall: '#3e3260',
    exposure: 1.0,
    bloomStrength: 0.45,
    bloomThreshold: 0.7,
    lighthouseI: 40,
    beam: 0.7,
    grass: '#3d2a78',
    leaf: '#7a4ad8',
    leafGlow: 0.45,
    cloud: '#5b4794',
    cloudGlow: 0.18,
    particleGlow: 4,
    starGlow: 40,
    lakeDeep: '#120a2e',
    lakeShine: '#5a46a6',
    lakeGlint: '#d9b8ff',
  },
  light: {
    skyHorizon: '#ffc8dc',
    skyMid: '#dcb0f2',
    sky: '#a585ea',
    skyTop: '#6c50d0',
    fog: '#c4a8ee',
    fogNear: 70,
    fogFar: 420,
    outdoorAmbient: '#fff1fa',
    outdoorAmbientI: 0.65,
    sun: '#fff0e0',
    sunI: 2.2,
    roomFill: '#fff4fb',
    roomFillI: 1.2,
    lampI: 0.35,
    screenI: 0.55,
    ledI: 0.25,
    wall: '#b8a6e0',
    exposure: 0.9,
    bloomStrength: 0.15,
    bloomThreshold: 0.97,
    lighthouseI: 6,
    beam: 0.15,
    grass: '#c9b6f0',
    leaf: '#b88af0',
    leafGlow: 0.08,
    cloud: '#ffffff',
    cloudGlow: 0.6,
    particleGlow: 0.8,
    starGlow: 6,
    lakeDeep: '#6f5ac4',
    lakeShine: '#efe6ff',
    lakeGlint: '#ffffff',
  },
}

export interface AboutSceneOptions {
  modelUrl?: string
  /** Element whose scroll length drives the whole story */
  trigger: Element
  theme?: AboutTheme
  /** Camera smoothing: lower = floatier */
  damping?: number
  /** 0 → 1: how far the camera is "inside" the monitor (1 = the screen fills the window) */
  onScreenFill?: (fill: number) => void
  onProgress?: (p: number) => void
  onLoad?: () => void
  onError?: (error: unknown) => void
}

const smooth = (a: number, b: number, x: number) => {
  const t = THREE.MathUtils.clamp((x - a) / (b - a), 0, 1)
  return t * t * (3 - 2 * t)
}

/** Blender lens keys (glTF can't store an animated lens): frame → focal length in mm */
const LENS: [number, number][] = [
  [1, 24],
  [100, 22],
  [180, 16],
  [265, 18],
  [350, 18],
  [440, 22],
  [520, 30],
  [600, 35],
]
function lensAt(p: number) {
  const f = 1 + p * 599
  for (let i = 0; i < LENS.length - 1; i++) {
    const [f0, l0] = LENS[i]!
    const [f1, l1] = LENS[i + 1]!
    if (f <= f1) return l0 + (l1 - l0) * smooth(f0, f1, f)
  }
  return LENS[LENS.length - 1]![1]
}
/** Vertical field of view for a lens on Blender's 36 mm sensor (fit to width) */
const vfovFromLens = (lens: number, aspect: number) => 2 * Math.atan(18 / lens / aspect)

/** Head turn towards the pointer: radians at the screen edge, and how fast it follows */
const PARALLAX_YAW = 0.013
const PARALLAX_PITCH = 0.008
const PARALLAX_FOLLOW = 1

const LED_MATS = [
  'Desk_LED_Mat',
  'Shelf_LED_Mat',
  'CPU_RGB_Mat',
  'CPU_RGB2_Mat',
  'Neon_Pink_Mat',
  'Neon_Violet_Mat',
  'Room_Cove_Mat',
]
const BULB_MATS = ['Desk_LampBulb_Mat', 'Pendant_Bulb_Mat', 'Room_Sconce_Mat']

export function createAboutScene(canvas: HTMLCanvasElement, opts: AboutSceneOptions) {
  const o = {
    modelUrl: '/models/about-room.glb',
    theme: 'dark' as AboutTheme,
    damping: 2.5,
    ...opts,
  }

  // ---------------------------------------------------------------- Renderer and scene
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: 'high-performance',
  })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping

  const scene = new THREE.Scene()
  const fog = new THREE.Fog('#000', 40, 300)
  scene.fog = fog
  let camera = new THREE.PerspectiveCamera(50, 1, 0.02, 1200)

  const ambient = new THREE.AmbientLight()
  const sun = new THREE.DirectionalLight()
  sun.position.set(60, 80, -120)
  scene.add(ambient, sun)

  // ---------------------------------------------------------------- Room lights
  type Kind = 'warm' | 'led' | 'screen' | 'fill'
  const roomLights: { light: THREE.Light; base: number; kind: Kind }[] = []
  const P = (color: string, base: number, dist: number, kind: Kind) => {
    const l = new THREE.PointLight(color, base, dist, 2)
    roomLights.push({ light: l, base, kind })
    return l
  }
  const roomFill = P('#9a86d6', 6, 16, 'fill')
  const deskLamp = new THREE.SpotLight('#ffbf80', 7, 4, Math.PI / 3.2, 0.6, 1.6)
  roomLights.push({ light: deskLamp, base: 7, kind: 'warm' })
  const deskLampGlow = P('#ffb070', 1.5, 2.2, 'warm')
  const lighthouseLight = new THREE.PointLight('#ffdcae', 30, 30, 2)
  // Blender room-local positions (x, y, z), y towards the window
  const placements: [THREE.Light, number, number, number][] = [
    [roomFill, 0, -1, 3.0],
    [P('#ffb878', 4, 6, 'warm'), 2.4, -1.15, 2.0], // pendants
    [P('#ffb878', 4, 6, 'warm'), 3.0, -1.7, 2.2],
    [P('#ffb878', 4, 6, 'warm'), -3.2, 0.9, 2.1],
    [P('#ffc08a', 3.5, 5, 'warm'), 3.25, -0.65, 1.9], // arc lamp
    [P('#ffc08a', 3, 5, 'warm'), -4.05, 1.95, 1.55], // reading lamp
    [P('#ffb070', 4, 6, 'warm'), 2.8, -6.0, 2.2], // hallway sconce
    [P('#ff7ad9', 3, 4, 'led'), 4.2, -1.5, 2.05], // neon
    [P('#a66bff', 2.5, 6, 'led'), -4.2, -1.0, 3.0], // cove glow
    [P('#a66bff', 2.5, 6, 'led'), 4.2, -1.0, 3.0],
    [P('#ffb0e0', 1.6, 3, 'led'), -4.1, -0.65, 2.0], // bookcase LED
    [P('#b37bff', 1.6, 2.5, 'led'), 0, 1.9, 0.75], // desk LED
    [P('#b37bff', 1.0, 1.5, 'led'), 0.74, 1.47, 0.3], // PC RGB
    [P('#b499ff', 1.6, 2.5, 'screen'), -0.34, 1.6, 1.1], // monitors
    [P('#d59bf0', 1.6, 2.5, 'screen'), 0.34, 1.6, 1.1],
  ]

  // ---------------------------------------------------------------- Sky
  const skyU = {
    horizon: { value: new THREE.Color() },
    mid: { value: new THREE.Color() },
    sky: { value: new THREE.Color() },
    top: { value: new THREE.Color() },
  }
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(1000, 32, 16),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: skyU,
      vertexShader: /* glsl */ `
        varying vec3 vDir;
        void main() { vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: /* glsl */ `
        uniform vec3 horizon, mid, sky, top; varying vec3 vDir;
        void main() {
          float h = clamp((vDir.y + 0.05) / 0.65, 0.0, 1.0);
          vec3 c = mix(horizon, mid, smoothstep(0.0, 0.12, h));
          c = mix(c, sky, smoothstep(0.12, 0.45, h));
          c = mix(c, top, smoothstep(0.45, 1.0, h));
          gl_FragColor = vec4(c, 1.0);
        }`,
    })
  )
  sky.renderOrder = -1
  scene.add(sky)

  // ---------------------------------------------------------------- Lake seen through the window
  const lakeU = {
    time: { value: 0 },
    deep: { value: new THREE.Color() },
    shine: { value: new THREE.Color() },
    glint: { value: new THREE.Color() },
    fogColor: { value: new THREE.Color() },
    fogNear: { value: 40 },
    fogFar: { value: 260 },
  }
  const lake = new THREE.Mesh(
    new THREE.CircleGeometry(60, 96),
    new THREE.ShaderMaterial({
      uniforms: lakeU,
      fog: false,
      vertexShader: /* glsl */ `
        varying vec3 vW;
        void main() { vW = (modelMatrix * vec4(position, 1.0)).xyz; gl_Position = projectionMatrix * viewMatrix * vec4(vW, 1.0); }`,
      fragmentShader: /* glsl */ `
        // Dark water that mirrors a little of the sky at a glance, a few glints moving on its
        // ripples, melting into the fog far away
        uniform float time; uniform vec3 deep; uniform vec3 shine; uniform vec3 glint;
        uniform vec3 fogColor; uniform float fogNear; uniform float fogFar;
        varying vec3 vW;
        void main() {
          vec2 p = vW.xz;
          float w = sin(p.x * 0.9 + time * 0.8) * 0.5 + sin(p.y * 1.3 - time * 0.6) * 0.5 + sin((p.x + p.y) * 2.1 + time * 1.2) * 0.25;
          vec3 v = normalize(cameraPosition - vW);
          float fres = pow(1.0 - clamp(v.y, 0.0, 1.0), 4.0);
          vec3 c = mix(deep, shine, 0.06 + 0.5 * fres + 0.04 * w);
          float g = smoothstep(0.97, 1.0, sin(p.x * 1.7 + time * 1.2) * sin(p.y * 0.6 - time * 0.7));
          // Glints: sparse, and only towards the horizon where the water catches the light
          c += glint * g * fres * 0.35;
          c = mix(c, fogColor, smoothstep(fogNear, fogFar, length(vW - cameraPosition)));
          gl_FragColor = vec4(c, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    })
  )
  lake.rotation.x = -Math.PI / 2
  lake.position.set(0, -0.02, -15)
  scene.add(lake)

  // ---------------------------------------------------------------- Post-processing
  const composer = new EffectComposer(renderer)
  const renderPass = new RenderPass(scene, camera)
  composer.addPass(renderPass)
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.7, 0.5, 0.6)
  composer.addPass(bloom)
  composer.addPass(new OutputPass())

  // ---------------------------------------------------------------- References
  const mixer = new THREE.AnimationMixer(scene)
  const mats = {
    screens: [] as THREE.MeshStandardMaterial[],
    leds: [] as THREE.MeshStandardMaterial[],
    walls: [] as THREE.MeshStandardMaterial[],
    bulbs: [] as THREE.MeshStandardMaterial[],
    grass: [] as THREE.MeshStandardMaterial[],
    leaves: [] as THREE.MeshStandardMaterial[],
    clouds: [] as THREE.MeshStandardMaterial[],
    particles: [] as THREE.MeshStandardMaterial[],
    stars: [] as THREE.MeshStandardMaterial[],
  }
  let heroScreenMat: THREE.MeshStandardMaterial | null = null
  const beamU = { color: { value: new THREE.Color('#ffe9c4') }, strength: { value: 0.5 } }
  /** Camera and door: driven by the scroll */
  const scrubbed: THREE.AnimationAction[] = []
  let blenderCam: THREE.PerspectiveCamera | null = null
  let heroScreen: THREE.Mesh | null = null
  let otherMonitor: THREE.Object3D | null = null
  let roomRoot: THREE.Object3D | null = null
  let target = 0
  let smoothed = 0
  let current = 0
  let disposed = false

  // ---------------------------------------------------------------- Theme blending
  const theme = { mix: o.theme === 'light' ? 1 : 0 }
  const A = new THREE.Color()
  const B = new THREE.Color()
  const col = (k: ColorKey, out: THREE.Color) =>
    out.copy(A.set(ABOUT_LOOKS.dark[k])).lerp(B.set(ABOUT_LOOKS.light[k]), theme.mix)
  const num = (k: NumberKey) =>
    THREE.MathUtils.lerp(ABOUT_LOOKS.dark[k], ABOUT_LOOKS.light[k], theme.mix)
  let flicker = 1
  let fill = 0

  function applyTheme() {
    col('skyHorizon', skyU.horizon.value)
    col('skyMid', skyU.mid.value)
    col('sky', skyU.sky.value)
    col('skyTop', skyU.top.value)
    col('fog', fog.color)
    fog.near = num('fogNear')
    fog.far = num('fogFar')
    col('outdoorAmbient', ambient.color)
    ambient.intensity = num('outdoorAmbientI')
    col('sun', sun.color)
    sun.intensity = num('sunI')
    col('roomFill', roomFill.color)
    for (const r of roomLights) {
      const k =
        r.kind === 'warm'
          ? num('lampI') * flicker
          : r.kind === 'led'
            ? num('ledI')
            : r.kind === 'screen'
              ? num('screenI')
              : num('roomFillI') / 0.35
      r.light.intensity = r.base * k
    }
    mats.screens.forEach((m) => (m.emissiveIntensity = num('screenI')))
    if (heroScreenMat)
      heroScreenMat.emissiveIntensity = THREE.MathUtils.lerp(num('screenI'), 1, fill)
    mats.leds.forEach((m) => (m.emissiveIntensity = 6 * num('ledI')))
    mats.bulbs.forEach((m) => (m.emissiveIntensity = 15 * num('lampI')))
    mats.walls.forEach((m) => col('wall', m.color))
    renderer.toneMappingExposure = num('exposure')
    bloom.strength = num('bloomStrength') * (1 - fill)
    bloom.threshold = num('bloomThreshold')
    lighthouseLight.intensity = num('lighthouseI')
    beamU.strength.value = num('beam')
    // The view through the window
    mats.grass.forEach((m) => col('grass', m.color))
    mats.leaves.forEach((m) => {
      col('leaf', m.color)
      col('leaf', m.emissive)
      m.emissiveIntensity = num('leafGlow')
    })
    mats.clouds.forEach((m) => {
      col('cloud', m.color)
      col('cloud', m.emissive)
      m.emissiveIntensity = num('cloudGlow')
    })
    mats.particles.forEach((m) => (m.emissiveIntensity = num('particleGlow')))
    mats.stars.forEach((m) => (m.emissiveIntensity = num('starGlow')))
    col('lakeDeep', lakeU.deep.value)
    col('lakeShine', lakeU.shine.value)
    col('lakeGlint', lakeU.glint.value)
    lakeU.fogColor.value.copy(fog.color)
    lakeU.fogNear.value = fog.near
    lakeU.fogFar.value = fog.far
  }
  applyTheme()
  function setTheme(next: AboutTheme, duration = 1.2) {
    gsap.to(theme, {
      mix: next === 'light' ? 1 : 0,
      duration,
      ease: 'power2.inOut',
      overwrite: true,
      onUpdate: applyTheme,
    })
  }

  // ---------------------------------------------------------------- Lighthouse beam
  function makeBeam() {
    const geo = new THREE.CylinderGeometry(4.5, 0.4, 30, 24, 1, true)
    geo.translate(0, 15, 0)
    geo.rotateX(-Math.PI / 2)
    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      fog: false,
      uniforms: beamU,
      vertexShader: /* glsl */ `varying float vT; void main(){ vT = uv.y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: /* glsl */ `uniform vec3 color; uniform float strength; varying float vT;
        void main(){ float a = pow(1.0 - vT, 2.2) * strength; gl_FragColor = vec4(color * a, a); }`,
    })
    const g = new THREE.Group()
    const b = new THREE.Mesh(geo, mat)
    b.rotation.y = Math.PI
    g.add(new THREE.Mesh(geo, mat), b)
    return g
  }

  // ---------------------------------------------------------------- Load
  const draco = new DRACOLoader().setDecoderPath('/draco/')
  const loader = new GLTFLoader().setDRACOLoader(draco)

  loader.load(
    o.modelUrl,
    (gltf) => {
      if (disposed) return
      const root = gltf.scene
      const add = <T>(arr: T[], v: T) => {
        if (!arr.includes(v)) arr.push(v)
      }
      root.traverse((obj) => {
        const mesh = obj as THREE.Mesh
        if (!mesh.isMesh) return
        const m = mesh.material as THREE.MeshStandardMaterial
        if (m.name.startsWith('Screen_')) {
          m.toneMapped = false
          if (mesh.name.startsWith('Desk_Monitor_R_Screen')) heroScreenMat = m
          else add(mats.screens, m)
        } else if (LED_MATS.includes(m.name)) add(mats.leds, m)
        else if (BULB_MATS.includes(m.name)) add(mats.bulbs, m)
        else if (m.name === 'Room_Wall_Mat') add(mats.walls, m)
        else if (m.name === 'CPU_Glass_Mat') {
          m.transparent = true
          m.depthWrite = false
        } else if (m.name === 'Grass_Mat') {
          m.side = THREE.DoubleSide
          add(mats.grass, m)
        } else if (m.name === 'Tree_Leaf_Mat') {
          m.side = THREE.DoubleSide
          add(mats.leaves, m)
        } else if (m.name === 'Particle_Mat') add(mats.particles, m)
        else if (m.name === 'Star_Core_Mat') add(mats.stars, m)
        else if (m.name === 'Cloud_Soft_Mat') {
          add(mats.clouds, m)
          m.fog = false
          m.transparent = true
          m.depthWrite = false
          m.side = THREE.DoubleSide
        } else if (m.name === 'LH_Lamp_Mat') m.emissiveIntensity = 20
      })

      roomRoot = root.getObjectByName('Room_Root') ?? null
      if (roomRoot) {
        for (const [l, x, y, z] of placements) {
          l.position.set(x, z, -y)
          roomRoot.add(l)
        }
      }
      const bulb = root.getObjectByName('Desk_Lamp_Bulb')
      if (bulb) {
        bulb.add(deskLampGlow)
        const t = new THREE.Object3D()
        t.position.set(0, -1, 0.3)
        bulb.add(t)
        bulb.add(deskLamp)
        deskLamp.target = t
      }
      root.getObjectByName('Lighthouse_Beam_Pivot')?.add(lighthouseLight, makeBeam())
      root.traverse((obj) => {
        if (
          !heroScreen &&
          obj.name.startsWith('Desk_Monitor_R_Screen') &&
          (obj as THREE.Mesh).isMesh
        )
          heroScreen = obj as THREE.Mesh
      })
      otherMonitor = root.getObjectByName('Desk_Monitor_L') ?? null

      scene.add(root)
      applyTheme()

      const cam = gltf.cameras.find((c) => c.name.includes('Camera_About')) ?? gltf.cameras[0]
      if (cam instanceof THREE.PerspectiveCamera) {
        blenderCam = cam
        camera = cam
        renderPass.camera = cam
        cam.near = 0.02
        cam.far = 1200
        resize()
      }
      for (const clip of gltf.animations) {
        const action = mixer.clipAction(clip)
        const scroll = clip.tracks.some(
          (t) => t.name.startsWith('Camera_About') || t.name.startsWith('Room_Door_Hinge')
        )
        if (scroll) {
          action.setLoop(THREE.LoopOnce, 1)
          action.clampWhenFinished = true
          action.play()
          action.paused = true
          scrubbed.push(action)
        } else {
          action.setLoop(THREE.LoopRepeat, Infinity)
          action.timeScale = clip.name.startsWith('Lighthouse') ? 0.35 : 0.5
          action.play()
        }
      }
      // Compile every shader now, so the first scroll doesn't stutter
      renderer.compile(scene, camera)
      o.onLoad?.()
    },
    (e) => {
      if (e.total) o.onProgress?.(e.loaded / e.total)
    },
    (err) => o.onError?.(err)
  )

  // ---------------------------------------------------------------- Scroll
  const st = ScrollTrigger.create({
    trigger: o.trigger,
    start: 'top top',
    end: 'bottom bottom',
    onUpdate: (self) => (target = self.progress),
  })

  // ---------------------------------------------------------------- Pointer parallax (a subtle head turn)
  const pointer = new THREE.Vector2()
  const look = new THREE.Vector2()
  const isTouch = window.matchMedia('(pointer: coarse)').matches
  const onMove = (e: PointerEvent) =>
    pointer.set((e.clientX / window.innerWidth) * 2 - 1, (e.clientY / window.innerHeight) * 2 - 1)
  if (!isTouch) window.addEventListener('pointermove', onMove)

  // ---------------------------------------------------------------- Resize
  function resize() {
    const w = canvas.clientWidth || window.innerWidth
    const h = canvas.clientHeight || window.innerHeight
    renderer.setSize(w, h, false)
    composer.setSize(w, h)
    bloom.setSize(w, h)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
  }
  const ro = new ResizeObserver(resize)
  ro.observe(canvas)
  resize()

  // ---------------------------------------------------------------- "Screen fills the window" pose
  const fitPos = new THREE.Vector3()
  const fitQuat = new THREE.Quaternion()
  const fitM = new THREE.Matrix4()
  const sc = new THREE.Vector3()
  const size = new THREE.Vector3()
  const ax = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()]
  const roomCenter = new THREE.Vector3()
  const UP = new THREE.Vector3(0, 1, 0)
  function computeFit(aspect: number, vfov: number) {
    const s = heroScreen
    if (!s) return false
    s.updateWorldMatrix(true, false)
    if (!s.geometry.boundingBox) s.geometry.computeBoundingBox()
    const bb = s.geometry.boundingBox!
    bb.getSize(size)
    bb.getCenter(sc).applyMatrix4(s.matrixWorld)
    const e = s.matrixWorld.elements
    ax[0]!.set(e[0]!, e[1]!, e[2]!).multiplyScalar(size.x)
    ax[1]!.set(e[4]!, e[5]!, e[6]!).multiplyScalar(size.y)
    ax[2]!.set(e[8]!, e[9]!, e[10]!).multiplyScalar(size.z)
    const [thin, mid, wide] = [...ax].sort((a, b) => a.length() - b.length()) as [
      THREE.Vector3,
      THREE.Vector3,
      THREE.Vector3,
    ]
    const normal = thin.clone().normalize()
    const hgt = mid.length()
    const wid = wide.length()
    if (roomRoot) {
      roomRoot.getWorldPosition(roomCenter)
      if (normal.dot(roomCenter.sub(sc)) < 0) normal.negate()
    }
    const tanV = Math.tan(vfov / 2)
    const tanHz = tanV * aspect
    // "Cover": the screen overflows the window slightly
    const d = Math.min(wid / (2 * tanHz), hgt / (2 * tanV)) * 0.97
    fitPos.copy(sc).addScaledVector(normal, d)
    fitM.lookAt(fitPos, sc, UP)
    fitQuat.setFromRotationMatrix(fitM)
    return true
  }

  // ---------------------------------------------------------------- Loop
  const timer = new THREE.Timer()
  const tmpQ = new THREE.Quaternion()
  const tmpE = new THREE.Euler()
  let lastFill = -1

  renderer.setAnimationLoop(() => {
    timer.update()
    const dt = Math.min(timer.getDelta(), 0.1)
    smoothed = THREE.MathUtils.damp(smoothed, target, o.damping * 2.2, dt)
    current = THREE.MathUtils.damp(current, smoothed, o.damping, dt)
    const p = Math.min(current, 0.9999)
    for (const a of scrubbed) a.time = p * a.getClip().duration
    mixer.update(dt)

    if (blenderCam) {
      const aspect = blenderCam.aspect
      const vfov = vfovFromLens(lensAt(p), aspect)
      blenderCam.fov = THREE.MathUtils.radToDeg(vfov)

      // Final push: blend from the authored path into an exact "screen fills the window" pose
      fill = smooth(0.84, 0.995, p)
      if (fill > 0 && computeFit(aspect, vfov)) {
        blenderCam.position.lerp(fitPos, fill)
        blenderCam.quaternion.slerp(fitQuat, fill)
      }
      if (otherMonitor) otherMonitor.visible = fill < 0.85

      // A gentle head turn towards the pointer: small and slow, so it drifts rather than
      // shakes (close to the hallway door even a little turn shows); it fades out on the way
      // into the screen
      look.x = THREE.MathUtils.damp(look.x, pointer.x, PARALLAX_FOLLOW, dt)
      look.y = THREE.MathUtils.damp(look.y, pointer.y, PARALLAX_FOLLOW, dt)
      const k = 1 - fill
      tmpE.set(-look.y * PARALLAX_PITCH * k, -look.x * PARALLAX_YAW * k, 0, 'YXZ')
      blenderCam.quaternion.multiply(tmpQ.setFromEuler(tmpE))
      blenderCam.updateProjectionMatrix()

      if (Math.abs(fill - lastFill) > 0.002) {
        lastFill = fill
        applyTheme()
        o.onScreenFill?.(fill)
      }
    }

    const t = timer.getElapsed()
    flicker = 0.96 + 0.04 * Math.sin(t * 7.3) * Math.sin(t * 3.1)
    deskLamp.intensity = 7 * num('lampI') * flicker
    lakeU.time.value = t
    composer.render()
  })

  // ---------------------------------------------------------------- Cleanup
  function dispose() {
    disposed = true
    gsap.killTweensOf(theme)
    renderer.setAnimationLoop(null)
    timer.dispose()
    window.removeEventListener('pointermove', onMove)
    st.kill()
    ro.disconnect()
    mixer.stopAllAction()
    draco.dispose()
    scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh
      if (mesh.geometry) mesh.geometry.dispose()
      const ms = Array.isArray(mesh.material) ? mesh.material : mesh.material ? [mesh.material] : []
      ms.forEach((m) => m.dispose())
    })
    composer.dispose()
    renderer.dispose()
  }

  /** Re-measure the scroll story (the page above it changed height) */
  const refresh = () => st.refresh()

  return { dispose, setTheme, refresh }
}
