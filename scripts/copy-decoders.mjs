// Copies the Draco and Basis decoders from the installed three version into /public, so the
// loaders always use decoders that match the three.js version, and detect-gpu's benchmark
// data, so GPU detection never has to fetch it from a CDN.
import { cpSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const libs = join(root, 'node_modules/three/examples/jsm/libs')

const targets = [
  { from: join(libs, 'draco/gltf'), to: join(root, 'public/draco') },
  { from: join(libs, 'basis'), to: join(root, 'public/basis') },
  {
    from: join(root, 'node_modules/detect-gpu/dist/benchmarks'),
    to: join(root, 'public/benchmarks'),
  },
]

for (const { from, to } of targets) {
  mkdirSync(to, { recursive: true })
  cpSync(from, to, { recursive: true, filter: (src) => !src.endsWith('README.md') })
}

console.log(
  'Decoders and GPU benchmarks copied to public/draco, public/basis and public/benchmarks'
)
