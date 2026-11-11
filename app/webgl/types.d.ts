/// <reference types="vite-plugin-glsl/ext" />
// Lets TypeScript import .glsl, .vert and .frag shader files as strings (vite-plugin-glsl)

// stats.js ships without TypeScript types
declare module 'stats.js' {
  export default class Stats {
    dom: HTMLDivElement
    showPanel(panel: number): void
    begin(): void
    end(): number
    update(): void
  }
}
