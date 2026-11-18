// The entry portal (drawn over the entry screen with plain WebGL, see utils/portalReveal.ts):
// the same dark core, ragged smoky rim and white halo as the hero's portal, opening from the
// AS mark. uRadius grows the core until it covers the screen; then uHole tears a hole in its
// middle (with a glowing rim of its own) that reveals the site behind. uGlitch shifts thin
// horizontal bands sideways and splits the colours of the rims while it lasts.
precision highp float;

#import ../includes/curl.glsl;

uniform vec2 uResolution;
uniform vec2 uCenter;     // 0–1 screen coordinates (y up)
uniform float uRadius;    // core radius, in screen heights
uniform float uHole;      // hole radius, in screen heights
uniform float uTime;
uniform float uGlitch;    // 0–1
uniform vec3 uCore;
uniform vec3 uHalo;

float hash(float n) { return fract(sin(n) * 43758.5453123); }

// Coverage of the portal at p (distance from the centre in screen heights): x = core, y = glow
vec2 portal(vec2 p) {
  float d = length(p);
  vec2 dir = d > 0.0 ? p / d : vec2(1.0, 0.0);
  float n = snoise(vec3(dir * 2.2, uTime * 0.25)) * 0.6
          + snoise(vec3(dir * 6.0, uTime * 0.45 + d * 3.0)) * 0.3;

  // Core with a soft smoky rim, and its halo outside
  float edge = uRadius * (1.0 + 0.07 * n);
  float soft = 0.06 * uRadius + 0.012;
  float core = 1.0 - smoothstep(edge - soft, edge + soft * 0.4, d);
  float outside = max(d - edge, 0.0);
  float halo = exp(-outside / (0.32 * uRadius + 0.03)) * (1.0 - core) * step(0.0005, uRadius);

  // The hole: the core and its halo give way inside it, with a bright rim along its edge
  if (uHole > 0.0) {
    float hEdge = uHole * (1.0 + 0.09 * n);
    float hSoft = 0.05 * uHole + 0.01;
    float open = 1.0 - smoothstep(hEdge - hSoft, hEdge + hSoft * 0.5, d);
    float rim = exp(-max(d - hEdge, 0.0) / (0.12 * uHole + 0.02)) * (1.0 - open);
    core *= 1.0 - open;
    halo = max(halo * (1.0 - open), rim * 0.85);
  }
  return vec2(core, halo);
}

void main() {
  vec2 uv = gl_FragCoord.xy / uResolution;
  float aspect = uResolution.x / uResolution.y;

  // Glitch: thin bands jump sideways for a frame or two
  float band = floor(uv.y * 34.0);
  float tick = floor(uTime * 18.0);
  float jump = step(0.72, hash(band * 1.37 + tick * 7.13)) * (hash(band + tick) - 0.5);
  uv.x += jump * 0.09 * uGlitch;

  vec2 p = (uv - uCenter) * vec2(aspect, 1.0);
  // Colour split while glitching: the rims drift apart in red and cyan
  vec2 split = vec2(0.012 * uGlitch, 0.0);
  vec2 g = portal(p);
  vec2 r = portal(p + split);
  vec2 b = portal(p - split);

  vec3 glow = vec3(r.y * uHalo.r, g.y * uHalo.g, b.y * uHalo.b);
  glow *= 0.9 + 0.1 * snoise(vec3(p * 5.0, uTime * 0.3));
  float alpha = clamp(g.x + max(max(r.y, g.y), b.y) * 0.95, 0.0, 1.0);
  vec3 color = mix(glow, uCore, g.x);
  // A faint scanline flicker in the glitch
  color *= 1.0 - 0.18 * uGlitch * step(0.5, fract(gl_FragCoord.y * 0.5));
  gl_FragColor = vec4(color * alpha, alpha);
}
