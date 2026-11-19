import { gsap } from 'gsap'
import fragmentSource from '~/webgl/shaders/portal/reveal.glsl'

/** Values the entry timeline animates; the portal reads them every frame */
export interface PortalRevealState {
  /** Centre in CSS pixels from the top left */
  x: number
  y: number
  /** Core and hole radii, in screen heights */
  radius: number
  hole: number
  /** 0–1 */
  glitch: number
}

const VERTEX = `
attribute vec2 position;
void main() { gl_Position = vec4(position, 0.0, 1.0); }
`

/**
 * Draws the entry portal (shaders/portal/reveal.glsl) into a canvas with plain WebGL: no
 * three.js scene for a three-second effect. Returns null when WebGL isn't available, so the
 * caller can fall back to a simple fade.
 */
export function createPortalReveal(canvas: HTMLCanvasElement, state: PortalRevealState) {
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
  const uHole = u('uHole')
  const uTime = u('uTime')
  const uGlitch = u('uGlitch')
  // The hero portal's colours (linear values of #0c0418 and #f4efff)
  gl.uniform3f(u('uCore'), 0.0037, 0.0012, 0.0091)
  gl.uniform3f(u('uHalo'), 0.905, 0.863, 1.0)

  const pixelRatio = Math.min(window.devicePixelRatio, 1.5)
  const start = performance.now()

  function draw() {
    const width = Math.round(canvas.clientWidth * pixelRatio)
    const height = Math.round(canvas.clientHeight * pixelRatio)
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
    gl!.uniform1f(uHole, state.hole)
    gl!.uniform1f(uTime, (performance.now() - start) / 1000)
    gl!.uniform1f(uGlitch, state.glitch)
    gl!.drawArrays(gl!.TRIANGLES, 0, 3)
  }

  function dispose() {
    gl!.deleteBuffer(buffer)
    gl!.deleteProgram(program)
    gl!.deleteShader(vs)
    gl!.deleteShader(fs)
    gl!.getExtension('WEBGL_lose_context')?.loseContext()
  }

  return { draw, dispose }
}

/**
 * Resolves once the frames run smoothly again: at least `min` ms, then several smooth frames
 * in a row (or after `max` ms at the latest). Used to hold the portal closed while the page
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
 * Tears the hole open in the middle of the portal, with a glitch flare as it starts. It runs
 * on its own clock, which never steps more than a frame at a time: if the page behind stalls
 * the browser, the hole pauses instead of jumping open. Resolves true when fully open, or
 * false if `alive()` turned false on the way (the portal went away).
 */
export function openPortalHole(
  state: PortalRevealState,
  alive: () => boolean = () => true,
  duration = 1.3
) {
  return new Promise<boolean>((resolve) => {
    const ease = gsap.parseEase('power3.inOut')
    let t = 0
    let last = performance.now()
    const step = () => {
      if (!alive()) {
        gsap.ticker.remove(step)
        return resolve(false)
      }
      const now = performance.now()
      t = Math.min(duration, t + Math.min((now - last) / 1000, 1 / 30))
      last = now
      state.hole = 1.65 * ease(t / duration)
      state.glitch = t < 0.08 ? (t / 0.08) * 0.8 : Math.max(0, 0.8 * (1 - (t - 0.08) / 0.6))
      if (t < duration) return
      gsap.ticker.remove(step)
      resolve(true)
    }
    gsap.ticker.add(step)
  })
}
