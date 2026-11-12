/**
 * True on devices with a precise pointer that can hover (mouse or trackpad).
 * Hover-only effects (custom cursor, magnetic buttons, follow-the-cursor cards) use this,
 * so touch screens keep their normal behaviour. Always false on the server.
 */
export function hasFinePointer() {
  return import.meta.client && window.matchMedia('(hover: hover) and (pointer: fine)').matches
}
