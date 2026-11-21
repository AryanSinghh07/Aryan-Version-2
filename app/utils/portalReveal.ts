import { gsap } from 'gsap'
import fragmentSource from '~/webgl/shaders/portal/reveal.glsl'

// The smoke portal used across the site (the entrance, the page change into About, the end of
// the About room): an opening ringed with white and dark smoke, growing from a point until it
// passes the edges of the screen, the new view inside it and the old one outside. One opening,
// no cover-then-hole. Drawn into its own canvas with plain WebGL (shaders/portal/reveal.glsl).

/** Values the caller animates; the portal reads them every frame */
export interface PortalRevealState {
  /** Centre in CSS pixels from the top left */
  x: number
  y: number
  /** Ring radius, in screen heights (about 1.6 passes every corner of any screen) */
  radius: number
  /** The ring's visibility, 0–1 */
  fade: number
}

/** A colour inside or outside the ring: a CSS hex colour, or 'clear' to see what's underneath */
export type PortalFill = string | 'clear'

export interface PortalColors {
  inside: PortalFill
  outside: PortalFill
}

/** Radius at which the ring has passed the corners of any screen */
export const RING_COVER = 1.6

const VERTEX = `
attribute vec2 position;
void main() { gl_Position = vec4(position, 0.0, 1.0); }
`

function rgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  const full = h.length === 3 ? [...h].map((c) => c + c).join('') : h.slice(0, 6)
  const n = parseInt(full, 16)
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
}

/** The page's own background colour right now (theme aware) */
export function pageColor() {
  return (
    getComputedStyle(document.documentElement).getPropertyValue('--background').trim() || '#120a1f'
  )
}

/**
 * Draws the ring portal into a canvas. Returns null when WebGL isn't available, so the caller
 * can fall back to a simple fade.
 */
export function createPortalReveal(
  canvas: HTMLCanvasElement,
  state: PortalRevealState,
  colors: PortalColors
) {
  const gl = canvas.getContext('webgl', { premultipliedAlpha: true, alpha: true, antialias: false })
  if (!gl) return null

  const compile = (type: number, source: string) => {
    const shader = gl.createShader(type)!
    gl.shaderSource(shader, source)
    gl.compileShader(shader)
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.warn(gl.getShaderInfoLog(shader))
      return null
    }
    return shader
  }
  const vs = compile(gl.VERTEX_SHADER, VERTEX)
  const fs = compile(gl.FRAGMENT_SHADER, fragmentSource)
  if (!vs || !fs) return null
  const program = gl.createProgram()!
  gl.attachShader(program, vs)
  gl.attachShader(program, fs)
  gl.linkProgram(program)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null
  gl.useProgram(program)

  // One triangle that covers the screen
  const buffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
  const position = gl.getAttribLocation(program, 'position')
  gl.enableVertexAttribArray(position)
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0)

  const u = (name: string) => gl.getUniformLocation(program, name)
  const uResolution = u('uResolution')
  const uCenter = u('uCenter')
  const uRadius = u('uRadius')
  const uTime = u('uTime')
  const uFade = u('uFade')

  const fill = (name: string, value: PortalFill) => {
    if (value === 'clear') gl.uniform4f(u(name), 0, 0, 0, 0)
    else gl.uniform4f(u(name), ...rgb(value), 1)
  }
  /** Inside and outside colours */
  function setColors(next: PortalColors) {
    fill('uInside', next.inside)
    fill('uOutside', next.outside)
  }
  setColors(colors)

  const pixelRatio = Math.min(window.devicePixelRatio, 1.5)
  const start = performance.now()

  function draw() {
    const width = Math.round(canvas.clientWidth * pixelRatio)
    const height = Math.round(canvas.clientHeight * pixelRatio)
    if (!width || !height) return
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width
      canvas.height = height
      gl!.viewport(0, 0, width, height)
    }
    gl!.clearColor(0, 0, 0, 0)
    gl!.clear(gl!.COLOR_BUFFER_BIT)
    gl!.uniform2f(uResolution, width, height)
    gl!.uniform2f(uCenter, state.x / canvas.clientWidth, 1 - state.y / canvas.clientHeight)
    gl!.uniform1f(uRadius, state.radius)
    gl!.uniform1f(uTime, (performance.now() - start) / 1000)
    gl!.uniform1f(uFade, state.fade)
    gl!.drawArrays(gl!.TRIANGLES, 0, 3)
  }

  function dispose() {
    gl!.deleteBuffer(buffer)
    gl!.deleteProgram(program)
    gl!.deleteShader(vs)
    gl!.deleteShader(fs)
    gl!.getExtension('WEBGL_lose_context')?.loseContext()
  }

  return { draw, dispose, setColors }
}

/**
 * Resolves once the frames run smoothly again: at least `min` ms, then several smooth frames
 * in a row (or after `max` ms at the latest). Used to hold back the portal while the page
 * behind it does its heavy start-up work.
 */
export function whenSettled(min = 350, max = 3000) {
  return new Promise<void>((resolve) => {
    const start = performance.now()
    let last = start
    let smooth = 0
    const frame = () => {
      const now = performance.now()
      smooth = now - last < 50 ? smooth + 1 : 0
      last = now
      if ((smooth >= 8 && now - start > min) || now - start > max) resolve()
      else requestAnimationFrame(frame)
    }
    requestAnimationFrame(frame)
  })
}

/**
 * Opens the ring: it appears and grows from a point until it has passed the edges of the
 * screen, then fades. It runs on its own clock, which never steps more than 0.1 s at a time:
 * if the page stalls the browser, the ring pauses instead of jumping. Resolves true when done,
 * or false if `alive()` turned false on the way (the portal went away).
 */
export function openRing(
  state: PortalRevealState,
  { duration = 2.4, alive = () => true }: { duration?: number; alive?: () => boolean } = {}
) {
  return new Promise<boolean>((resolve) => {
    const ease = gsap.parseEase('power3.inOut')
    let t = 0
    let last = performance.now()
    state.radius = 0
    state.fade = 0
    const step = () => {
      if (!alive()) {
        gsap.ticker.remove(step)
        return resolve(false)
      }
      const now = performance.now()
      // Steps of at most 0.1 s: normal speed even at a low frame rate, a pause through a stall
      t = Math.min(duration, t + Math.min((now - last) / 1000, 0.1))
      last = now
      const k = t / duration
      state.radius = RING_COVER * ease(k)
      // In quickly, out as it passes the edges
      state.fade = Math.min(1, k / 0.06) * (1 - Math.max(0, (k - 0.82) / 0.18))
      if (t < duration) return
      gsap.ticker.remove(step)
      resolve(true)
    }
    gsap.ticker.add(step)
  })
}
