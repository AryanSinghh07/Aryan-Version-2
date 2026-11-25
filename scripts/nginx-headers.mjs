// Turns the site-wide block of the build's _headers file (Netlify's format, written by
// nuxt.config.ts) into nginx add_header lines, so the container sends the same security headers.
// Used by the Dockerfile: node scripts/nginx-headers.mjs .output/public/_headers
import { readFileSync } from 'node:fs'

const file = process.argv[2]
if (!file) {
  console.error('Usage: node scripts/nginx-headers.mjs <path to _headers>')
  process.exit(1)
}

const lines = readFileSync(file, 'utf8').split('\n')
const start = lines.findIndex((line) => line.trim() === '/*')
if (start < 0) {
  console.error('No "/*" block found in', file)
  process.exit(1)
}

const out = []
for (const line of lines.slice(start + 1)) {
  if (!line.startsWith(' ')) break
  const i = line.indexOf(':')
  const name = line.slice(0, i).trim()
  let value = line.slice(i + 1).trim()
  // The container is usually reached over plain http (localhost, or behind a proxy that adds
  // https), where upgrading every request to https would break the page
  if (name === 'Content-Security-Policy') value = value.replace(/;\s*upgrade-insecure-requests/, '')
  out.push(`add_header ${name} "${value.replace(/"/g, '\\"')}" always;`)
}
process.stdout.write(out.join('\n') + '\n')
