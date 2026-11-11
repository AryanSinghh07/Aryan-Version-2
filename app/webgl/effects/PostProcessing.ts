import {
  BlendFunction,
  BloomEffect,
  ChromaticAberrationEffect,
  EffectComposer,
  EffectPass,
  NoiseEffect,
  RenderPass,
  VignetteEffect,
} from 'postprocessing'
import { HalfFloatType, Vector2 } from 'three'
import type { PerspectiveCamera, Scene, WebGLRenderer } from 'three'
import type { QualityTier } from '../config/quality'
import { QUALITY, msaaSamples } from '../config/quality'
import type { Palette } from '../core/Palette'
import { GradeEffect } from './GradeEffect'

interface Effects {
  bloom: BloomEffect | null
  grade: GradeEffect
  chromatic: ChromaticAberrationEffect
  vignette: VignetteEffect
  grain: NoiseEffect
}

/**
 * Bloom, colour grade, subtle chromatic aberration, vignette and film grain, all following
 * the theme palette. Quality: High has everything; Medium drops bloom; Low skips
 * post-processing and renders straight to the screen. Anti-aliasing: see msaaSamples().
 */
export class PostProcessing {
  enabled = false
  composer: EffectComposer | null = null
  effects: Effects | null = null

  private tier: QualityTier | null = null

  constructor(
    private renderer: WebGLRenderer,
    private scene: Scene,
    private camera: PerspectiveCamera
  ) {}

  /** Rebuilds the effect chain for a quality tier (fresh effects each time) */
  setQuality(tier: QualityTier, pixelRatio: number) {
    if (tier === this.tier) return
    this.tier = tier
    this.composer?.dispose() // also disposes the passes and their effects
    this.composer = null
    this.effects = null
    this.enabled = QUALITY[tier].post
    if (!this.enabled) return

    const effects: Effects = {
      bloom: QUALITY[tier].bloom
        ? new BloomEffect({ mipmapBlur: true, luminanceSmoothing: 0.15, radius: 0.7 })
        : null,
      grade: new GradeEffect(),
      chromatic: new ChromaticAberrationEffect({
        offset: new Vector2(0.0006, 0.0004),
        radialModulation: true,
        modulationOffset: 0.35,
      }),
      vignette: new VignetteEffect({ offset: 0.3, darkness: 0.4 }),
      grain: new NoiseEffect({ blendFunction: BlendFunction.OVERLAY, premultiply: false }),
    }

    const composer = new EffectComposer(this.renderer, {
      frameBufferType: HalfFloatType,
      multisampling: msaaSamples(tier, pixelRatio),
    })
    composer.addPass(new RenderPass(this.scene, this.camera))
    const main = [effects.bloom, effects.grade, effects.vignette, effects.grain].filter(
      (e) => e !== null
    )
    composer.addPass(new EffectPass(this.camera, ...main))
    // Chromatic aberration samples neighbouring pixels, so it needs its own pass
    composer.addPass(new EffectPass(this.camera, effects.chromatic))
    const size = this.renderer.getSize(new Vector2())
    composer.setSize(size.x, size.y, false)

    this.composer = composer
    this.effects = effects
  }

  update(palette: Palette, reducedMotion: boolean) {
    const e = this.effects
    if (!e) return
    const v = palette.values
    if (e.bloom) {
      e.bloom.intensity = v.bloomIntensity
      e.bloom.luminanceMaterial.threshold = v.bloomThreshold
    }
    e.grade.sync(palette)
    e.vignette.darkness = v.vignette
    // Moving grain is motion: keep it off for visitors who prefer less
    e.grain.blendMode.opacity.value = reducedMotion ? 0 : v.grain
  }

  resize(width: number, height: number, pixelRatio: number) {
    if (!this.composer || !this.tier) return
    const samples = msaaSamples(this.tier, pixelRatio)
    if (this.composer.multisampling !== samples) this.composer.multisampling = samples
    this.composer.setSize(width, height, false)
  }

  render(delta: number) {
    this.composer?.render(delta)
  }

  dispose() {
    this.composer?.dispose()
  }
}
