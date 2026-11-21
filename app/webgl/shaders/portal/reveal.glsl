// The smoke portal (drawn over the page with plain WebGL, see utils/portalReveal.ts): an
// opening that grows from a point until it passes the edges of the screen. Inside it is the new
// view (uInside: a colour, or see-through to what is underneath), outside it the old one
// (uOutside). Its edge is a band of drifting smoke, white with darker billows, that swirls
// slowly and frays the rim of the opening. Colours are sRGB, premultiplied by their alpha.
precision highp float;

uniform vec2 uResolution;
uniform vec2 uCenter;     // 0–1 screen coordinates (y up)
uniform float uRadius;    // opening radius, in screen heights
uniform float uTime;
uniform float uFade;      // the smoke's visibility, 0–1
uniform vec4 uInside;
uniform vec4 uOutside;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  mat2 turn = mat2(0.8, -0.6, 0.6, 0.8);
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p = turn * p * 2.03 + 11.7;
    a *= 0.5;
  }
  return v;
}

mat2 rotate(float a) {
  float c = cos(a);
  float s = sin(a);
  return mat2(c, -s, s, c);
}

void main() {
  vec2 uv = gl_FragCoord.xy / uResolution;
  float aspect = uResolution.x / uResolution.y;
  vec2 p = (uv - uCenter) * vec2(aspect, 1.0);
  float d = length(p);
  float r = uRadius;
  float t = uTime;

  // The smoke's own space: it twists around the opening and grows with it, so the wisps keep
  // their size on screen as the opening widens
  float scale = 2.6 / (0.25 + r * 0.9);
  vec2 q = rotate(t * 0.12 + d * 1.4) * p * scale;
  // Domain warp: the noise pushes itself around, which reads as curling smoke
  vec2 warp = vec2(fbm(q + vec2(0.0, t * 0.18)), fbm(q + vec2(5.2, -t * 0.15)));
  float smoke = fbm(q + warp * 1.6 + vec2(t * 0.05, 0.0));

  // The rim of the opening frays with the smoke
  float edge = r * (1.0 + (smoke - 0.5) * 0.22);
  float soft = 0.015 + r * 0.05;
  float inside = 1.0 - smoothstep(edge - soft, edge + soft * 0.4, d);
  vec4 base = mix(uOutside, uInside, inside);

  // The band of smoke around the rim, thicker as it grows, with wisps reaching further out
  float width = 0.05 + r * 0.16;
  float x = (d - edge) / width;
  float band = exp(-x * x * 1.6) + exp(-max(x, 0.0) * 1.8) * 0.35 * smoothstep(0.45, 0.8, smoke);
  float density = band * smoothstep(0.3, 0.75, smoke + warp.x * 0.25);
  float alpha = clamp(density * 1.25, 0.0, 1.0) * uFade * smoothstep(0.0, 0.02, r);

  // White smoke with darker, shadowed billows where it is thin
  float light = smoothstep(0.35, 0.85, smoke + (warp.y - 0.5) * 0.4);
  vec3 smokeColor = mix(vec3(0.07, 0.07, 0.09), vec3(0.97, 0.96, 1.0), light);

  vec3 color = base.rgb * (1.0 - alpha) + smokeColor * alpha;
  float outA = base.a * (1.0 - alpha) + alpha;
  gl_FragColor = vec4(min(color, vec3(outA)), outA);
}
