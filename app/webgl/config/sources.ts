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
  // The landscape around the logo (Digital Atmosphere, exported from Blender, Draco-compressed).
  // Lazy: it loads after the visitor enters and fades in, keeping the first load small.
  { name: 'environment', type: 'gltf', path: '/models/env/environment.glb', priority: 'lazy' },
  // A model named shape:<name> replaces that generated particle shape, for example:
  // { name: 'shape:letter-a', type: 'gltf', path: '/models/shapes/letter-a.glb', priority: 'eager' },
]
