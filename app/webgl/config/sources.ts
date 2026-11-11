// Every file the WebGL Experience loads. Swap a file in /public with your own and keep the
// name and format, and nothing in the code needs to change.
//
// priority 'eager': loaded before the preloader finishes (needed for the first scene).
// priority 'lazy': loaded quietly after the visitor enters (keeps first load small).

export type SourceType = 'gltf' | 'texture' | 'ktx2' | 'hdr' | 'audio'

export interface Source {
  name: string
  type: SourceType
  path: string
  priority: 'eager' | 'lazy'
}

export const sources: Source[] = [
  // Phase 6 adds the particle shapes, for example:
  // { name: 'letterA', type: 'gltf', path: '/models/shapes/letter-a.glb', priority: 'eager' },
  // { name: 'neuralNet', type: 'gltf', path: '/models/shapes/neural-net.glb', priority: 'lazy' },
]
