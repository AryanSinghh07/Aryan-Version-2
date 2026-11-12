import { Effect } from 'postprocessing'
import { Uniform, Vector3 } from 'three'
import type { Palette } from '../core/Palette'
import fragmentShader from '../shaders/post/fluid.glsl'
import type { Fluid } from './Fluid'

/** Tints the scene with the fluid smoke (light: lavender at 35%, dark: violet at 45%) */
export class FluidEffect extends Effect {
  constructor() {
    super('FluidEffect', fragmentShader, {
      uniforms: new Map<string, Uniform>([
        ['uDye', new Uniform(null)],
        ['uTint', new Uniform(new Vector3())],
        ['uOpacity', new Uniform(0)],
      ]),
    })
  }

  sync(fluid: Fluid, palette: Palette) {
    const u = this.uniforms
    const texture = fluid.visible ? fluid.texture : null
    u.get('uDye')!.value = texture
    u.get('uOpacity')!.value = texture ? palette.values.fluidOpacity : 0
    const tint = palette.colors.fluid
    ;(u.get('uTint')!.value as Vector3).set(tint.r, tint.g, tint.b)
  }
}
