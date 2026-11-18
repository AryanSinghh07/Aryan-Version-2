import { Effect } from 'postprocessing'
import { Uniform, Vector3 } from 'three'
import type { Palette } from '../core/Palette'
import fragmentShader from '../shaders/post/grade.glsl'

/**
 * Per-theme colour grade (light: soft, airy, lifted shadows; dark: deep, contrasty, violet
 * shadows). Built from uniforms rather than a LUT image, so it fades smoothly between themes.
 */
export class GradeEffect extends Effect {
  constructor() {
    super('GradeEffect', fragmentShader, {
      uniforms: new Map<string, Uniform>([
        ['uLift', new Uniform(0)],
        ['uContrast', new Uniform(1)],
        ['uSaturation', new Uniform(1)],
        ['uShadowTint', new Uniform(new Vector3())],
        ['uShadowTintAmount', new Uniform(0)],
      ]),
    })
  }

  /** `neutral` 0 → 1 eases the grade off (the plain page backdrop past the hero's portal) */
  sync(palette: Palette, neutral = 0) {
    const u = this.uniforms
    const v = palette.values
    const k = 1 - neutral
    u.get('uLift')!.value = v.lift * k
    u.get('uContrast')!.value = 1 + (v.contrast - 1) * k
    u.get('uSaturation')!.value = 1 + (v.saturation - 1) * k
    u.get('uShadowTintAmount')!.value = v.shadowTintAmount * k
    const tint = palette.colors.shadowTint
    ;(u.get('uShadowTint')!.value as Vector3).set(tint.r, tint.g, tint.b)
  }
}
