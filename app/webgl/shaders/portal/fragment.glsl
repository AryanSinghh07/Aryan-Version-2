// The portal at the end of the home hero: a dark core with a ragged, smoky edge and a soft
// white halo around it, centred on the ring. uRadius grows with the outro (in screen heights)
// until the core covers the screen. Colours are linear; three.js converts the output.
#import ../includes/curl.glsl;

uniform vec2 uCenter;     // portal centre, 0–1 screen coordinates
uniform float uAspect;    // width / height
uniform float uRadius;    // core radius, in screen heights
uniform float uTime;
uniform float uOpacity;
uniform vec3 uCore;       // the dark inside
uniform vec3 uHalo;       // the glow around it

varying vec2 vUv;

void main() {
  vec2 p = (vUv - uCenter) * vec2(uAspect, 1.0);
  float d = length(p);
  float angle = atan(p.y, p.x);

  // A ragged, slowly churning edge: noise around the circle and along the radius
  vec2 dir = vec2(cos(angle), sin(angle));
  float n = snoise(vec3(dir * 2.2, uTime * 0.25)) * 0.6
          + snoise(vec3(dir * 6.0, uTime * 0.45 + d * 3.0)) * 0.3;
  float edge = uRadius * (1.0 + 0.07 * n);

  // Core: solid inside, with a soft smoky rim
  float soft = 0.06 * uRadius + 0.012;
  float core = 1.0 - smoothstep(edge - soft, edge + soft * 0.4, d);

  // Halo: a glow just outside the rim that fades out over about half a radius
  float outside = max(d - edge, 0.0);
  float halo = exp(-outside / (0.32 * uRadius + 0.03)) * (1.0 - core);
  halo *= 0.9 + 0.1 * snoise(vec3(p * 5.0, uTime * 0.3));

  vec3 color = mix(uHalo * halo, uCore, core);
  float alpha = clamp(core + halo * 0.95, 0.0, 1.0) * uOpacity;
  gl_FragColor = vec4(color * alpha, alpha);
  #include <colorspace_fragment>
}
