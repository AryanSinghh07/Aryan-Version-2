import { Howl } from 'howler'
import type { DataTexture, Texture, WebGLRenderer } from 'three'
import { TextureLoader } from 'three'
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js'
import type { GLTF } from 'three/addons/loaders/GLTFLoader.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js'
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js'
import type { Source } from '../config/sources'
import { EventEmitter } from './EventEmitter'

export type LoadedAsset = GLTF | Texture | DataTexture | Howl

type TrackLoad = <T>(task: Promise<T>) => Promise<T>

/**
 * Loads every file in config/sources.ts. Eager files count towards the preloader through
 * trackLoad; lazy files load after the visitor enters. A file that fails to load is logged
 * and skipped, so one missing model never blocks the site.
 */
export class Resources extends EventEmitter<{ loaded: { name: string; asset: LoadedAsset } }> {
  items = new Map<string, LoadedAsset>()
  private gltf: GLTFLoader
  private draco: DRACOLoader
  private ktx2: KTX2Loader
  private texture = new TextureLoader()
  private hdr = new HDRLoader()

  constructor(
    private sources: Source[],
    renderer: WebGLRenderer,
    private trackLoad: TrackLoad
  ) {
    super()
    // Decoders are copied into /public on install (scripts/copy-decoders.mjs)
    this.draco = new DRACOLoader().setDecoderPath('/draco/')
    this.ktx2 = new KTX2Loader().setTranscoderPath('/basis/').detectSupport(renderer)
    this.gltf = new GLTFLoader().setDRACOLoader(this.draco).setKTX2Loader(this.ktx2)
  }

  /** Starts loading eager files. Resolves when all of them have finished or failed. */
  loadEager() {
    return Promise.all(
      this.sources.filter((s) => s.priority === 'eager').map((s) => this.trackLoad(this.load(s)))
    )
  }

  /** Loads the remaining files in the background */
  loadLazy() {
    return Promise.all(this.sources.filter((s) => s.priority === 'lazy').map((s) => this.load(s)))
  }

  get<T extends LoadedAsset>(name: string) {
    return this.items.get(name) as T | undefined
  }

  private async load(source: Source) {
    try {
      const asset = await this.loadFile(source)
      this.items.set(source.name, asset)
      this.emit('loaded', { name: source.name, asset })
    } catch (error) {
      console.warn(`[webgl] Could not load ${source.path}`, error)
    }
  }

  private loadFile(source: Source): Promise<LoadedAsset> {
    switch (source.type) {
      case 'gltf':
        return this.gltf.loadAsync(source.path)
      case 'texture':
        return this.texture.loadAsync(source.path)
      case 'ktx2':
        return this.ktx2.loadAsync(source.path)
      case 'hdr':
        return this.hdr.loadAsync(source.path)
      case 'audio':
        return new Promise((resolve, reject) => {
          const sound: Howl = new Howl({
            src: [source.path, source.path.replace(/\.webm$/, '.mp3')],
            preload: true,
            onload: () => resolve(sound),
            onloaderror: (_id, error) => reject(error),
          })
        })
    }
  }

  dispose() {
    this.draco.dispose()
    this.ktx2.dispose()
    this.items.clear()
    this.clearListeners()
  }
}
