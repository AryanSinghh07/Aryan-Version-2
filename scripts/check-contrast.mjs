// Checks every text/background colour pair in both themes against WCAG AA.
// Reads the real compiled theme variables, so it stays in sync with tokens.scss.
// Run: npm run contrast
import { compile } from 'sass'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const { css } = compile(join(root, 'app/assets/styles/themes.scss'))

function readTheme(selector) {
  const block = css.match(new RegExp(`${selector}\\s*\\{([^}]*)\\}`))?.[1] ?? ''
  return Object.fromEntries(
    [...block.matchAll(/--([\w-]+):\s*(#[0-9a-f]{3,6})\s*;/gi)].map((m) => [m[1], m[2]])
  )
}

const themes = {
  light: readTheme(':root,\\s*\\[data-theme=[\'"]?light[\'"]?\\]'),
  dark: readTheme('\\[data-theme=[\'"]?dark[\'"]?\\]'),
}

function luminance(hex) {
  const h = hex.length === 4 ? [...hex.slice(1)].map((c) => c + c).join('') : hex.slice(1)
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = parseInt(h.slice(i, i + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function ratio(a, b) {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (l1 + 0.05) / (l2 + 0.05)
}

// [text, background, minimum ratio, what it is]
const pairs = [
  ['foreground', 'background', 4.5, 'Body text'],
  ['foreground', 'surface', 4.5, 'Text on cards'],
  ['foreground-muted', 'background', 4.5, 'Labels, captions'],
  ['foreground-muted', 'surface', 4.5, 'Labels on cards'],
  ['primary', 'background', 4.5, 'Links'],
  ['primary', 'surface', 4.5, 'Links on cards'],
  ['primary-active', 'background', 4.5, 'Hovered links'],
  ['on-primary', 'primary', 4.5, 'Button text'],
  ['on-primary', 'primary-active', 4.5, 'Hovered button text'],
  ['on-accent', 'accent', 4.5, 'Text on lime pills'],
  ['danger', 'background', 4.5, 'Form errors'],
  ['danger', 'surface', 4.5, 'Form errors on cards'],
  ['success', 'background', 4.5, 'Form success'],
  ['success', 'surface', 4.5, 'Form success on cards'],
  ['border', 'background', 1, 'Dividers (decorative, info only)'],
]

let failures = 0
for (const [name, t] of Object.entries(themes)) {
  console.log(`\n${name.toUpperCase()} THEME`)
  for (const [fg, bg, min, label] of pairs) {
    if (!t[fg] || !t[bg]) {
      console.log(`  MISSING  ${fg} on ${bg}`)
      failures++
      continue
    }
    const r = ratio(t[fg], t[bg])
    const ok = r >= min
    if (!ok) failures++
    console.log(
      `  ${ok ? 'pass' : 'FAIL'}  ${r.toFixed(2).padStart(5)}:1  (min ${min})  ${label.padEnd(32)} ${fg} ${t[fg]} on ${bg} ${t[bg]}`
    )
  }
}

console.log(failures ? `\n${failures} pair(s) fail WCAG AA` : '\nAll pairs pass WCAG AA')
process.exit(failures ? 1 : 0)
