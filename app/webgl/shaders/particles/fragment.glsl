// Each particle is drawn as a small solid disc, like confetti packed into the shape: a flat
// colour with gentle shading (lighter towards the top left), a soft highlight, a crisp edge and
// a thin darker crescent on the lower right where it sits over the discs behind. Colours run
// between the theme's violet, pink and pale pink, at varied lightness, with a few near-white
// discs. Colours are linear; three.js converts the output.
uniform vec3 uColorA;      // the logo's three colours
uniform vec3 uColorB;
uniform vec3 uColorC;
uniform vec3 uSparkColor;  // the near-white discs
uniform vec3 uRimCool;     // (kept for the debug panel; unused)
uniform vec3 uRimWarm;
uniform vec3 uLightDir;
uniform float uSpecular;   // highlight strength
uniform float uGlow;
uniform float uTime;
uniform float uOpacity;
uniform float uIntensity;

varying float vColorMix;
varying float vSpark;
varying float vCenter;
varying float vDepthFade;
varying float vShade;      // per-disc lightness, 0–1

void main() {
  vec2 p = gl_PointCoord * 2.0 - 1.0;
  p.y = -p.y;
  float r = length(p);
  // A crisp, anti-aliased edge about one pixel wide
  float aa = max(fwidth(r), 0.02);
  float edge = 1.0 - smoothstep(1.0 - aa * 1.5, 1.0, r);
  if (edge <= 0.0) discard;

  // Colour: along violet → pink → pale pink, each disc lighter or deeper than the next
  // (mostly violets, then orchid and pink, a few pale ones)
  vec3 base = vColorMix < 0.6
    ? mix(uColorA, uColorB, vColorMix / 0.6 * 0.55)
    : mix(mix(uColorA, uColorB, 0.55), uColorC, (vColorMix - 0.6) / 0.4 * 0.75);
  base *= mix(0.78, 1.12, vShade);
  // Vivid, like confetti: richer colour and a little brighter than the theme swatches
  float lum = dot(base, vec3(0.2126, 0.7152, 0.0722));
  base = max(mix(vec3(lum), base, 1.5) * 1.18, 0.0);
  base = mix(base, uSparkColor * 1.15, vSpark);

  // Gentle shading across the disc, lit from the top left
  float side = dot(p, vec2(-0.62, 0.62));
  vec3 color = base * (0.9 + 0.2 * side);
  // A soft highlight near the top left
  float hl = 1.0 - smoothstep(0.0, 0.62, length(p - vec2(-0.36, 0.36)));
  color += mix(base, vec3(1.0), 0.65) * hl * hl * uSpecular * 0.45;
  // A thin darker crescent on the lower right (the disc's edge in its own shadow)
  float body = length(p - vec2(-0.09, 0.09));
  color *= mix(1.0, 0.5, smoothstep(0.84, 0.97, body) * smoothstep(-0.2, 0.5, -side));

  float alpha = edge * uOpacity * vDepthFade;
  gl_FragColor = vec4(color * uIntensity, alpha);
  #include <colorspace_fragment>
}
