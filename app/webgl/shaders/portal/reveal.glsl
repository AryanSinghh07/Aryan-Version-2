// The ring portal (drawn over the page with plain WebGL, see utils/portalReveal.ts): the home
// hero's particle ring, growing from a point until it passes the edges of the screen. It is
// one opening: inside the ring is the new view (uInside: a colour, or see-through to what is
// underneath), outside it the old one (uOutside), and the ring itself is a band of small
// glossy balls in the logo colours, in three layers, that twinkle and drift slowly, with a
// faint violet glow along it. Colours are sRGB, premultiplied by their alpha.
precision highp float;

uniform vec2 uResolution;
uniform vec2 uCenter;     // 0–1 screen coordinates (y up)
uniform float uRadius;    // ring radius, in screen heights
uniform float uTime;
uniform float uFade;      // the ring's visibility, 0–1
uniform vec4 uInside;
uniform vec4 uOutside;
uniform vec3 uColorA;     // the three logo colours
uniform vec3 uColorB;
uniform vec3 uColorC;

float hash(float n) { return fract(sin(n) * 43758.5453123); }

// One layer of balls: `count` slots around the circle, each holding a small glossy ball
// somewhere across the band (spread: how far from radius r, as a fraction of it)
vec4 ring(vec2 p, float r, float count, float seed, float spread, float size) {
  float angle = atan(p.y, p.x);
  float slot = floor((angle / 6.2831853 + 0.5) * count);
  vec3 color = vec3(0.0);
  float cover = 0.0;
  for (int k = -1; k <= 1; k++) {
    float i = mod(slot + float(k), count);
    float h1 = hash(i * 1.37 + seed);
    float h2 = hash(i * 7.11 + seed * 3.1);
    float h3 = hash(i * 3.31 + seed * 5.7);
    float a = ((i + 0.5 + (h1 - 0.5) * 0.8) / count - 0.5) * 6.2831853
            + uTime * 0.05 * (seed - 2.0);
    vec2 c = vec2(cos(a), sin(a)) * r * (1.0 + (h2 - 0.5) * spread);
    float s = size * (0.6 + h3 * 0.8);
    vec2 q = (p - c) / s;
    float d = length(q);
    // A solid ball with a soft edge, lit from the top left: a bright spot and a darker rim
    float ball = 1.0 - smoothstep(0.75, 1.0, d);
    float light = clamp(1.0 - length(q - vec2(-0.35, 0.35)) * 0.9, 0.0, 1.0);
    vec3 tint = h3 < 0.45 ? uColorA : (h3 < 0.8 ? uColorB : uColorC);
    float twinkle = 0.85 + 0.15 * sin(uTime * 2.6 + i * 1.9 + seed);
    vec3 lit = tint * (0.7 + 0.55 * light) * twinkle + vec3(1.0) * pow(light, 8.0) * 0.35;
    color = mix(color, lit, ball * (1.0 - cover));
    cover = max(cover, ball);
  }
  return vec4(color * cover, cover);
}

void main() {
  vec2 uv = gl_FragCoord.xy / uResolution;
  float aspect = uResolution.x / uResolution.y;
  vec2 p = (uv - uCenter) * vec2(aspect, 1.0);
  float d = length(p);
  float r = uRadius;

  // Inside the ring the new view, outside the old (a soft edge just inside the balls)
  float edge = 0.003 + r * 0.008;
  float inside = 1.0 - smoothstep(r - edge * 2.0, r, d);
  vec4 base = mix(uOutside, uInside, inside);

  // The ring: a band of small glossy balls in three layers, larger as it grows
  float size = 0.0035 + r * 0.011;
  vec4 r1 = ring(p, r, 260.0, 1.0, 0.1, size);
  vec4 r2 = ring(p, r * 1.015, 210.0, 2.0, 0.18, size * 0.9);
  vec4 r3 = ring(p, r * 0.99, 160.0, 3.0, 0.26, size * 0.8);
  // Front to back: each layer covers the ones after it
  vec3 ballColor = r1.rgb + r2.rgb * (1.0 - r1.a);
  float cover = r1.a + r2.a * (1.0 - r1.a);
  ballColor += r3.rgb * (1.0 - cover);
  cover += r3.a * (1.0 - cover);
  float balls = cover * uFade;
  ballColor *= uFade;

  // A faint violet glow along the ring
  float w = 0.015 + r * 0.05;
  float glow = exp(-((d - r) * (d - r)) / (w * w)) * 0.4 * uFade;

  vec3 color = base.rgb * (1.0 - balls) * (1.0 - glow) + uColorA * glow * (1.0 - balls) + ballColor;
  float alpha = clamp(base.a + (1.0 - base.a) * max(balls, glow), 0.0, 1.0);
  gl_FragColor = vec4(min(color, vec3(alpha)), alpha);
}
