// Soft round sparkle; fireflies get a bright core and a wide glow. Colours are linear.
uniform vec3 uColor;     // most sparkles
uniform vec3 uAccent;    // a few sparkles and the fireflies
uniform float uOpacity;
uniform float uAccentRatio;

varying float vFirefly;
varying float vTwinkle;
varying float vRand;

void main() {
  float d = length(gl_PointCoord - 0.5);
  if (d > 0.5) discard;
  float glow = smoothstep(0.5, 0.0, d);
  float core = smoothstep(0.18, 0.0, d);
  float accent = max(vFirefly, step(1.0 - uAccentRatio, vRand));
  vec3 color = mix(uColor, uAccent, accent);
  float a = mix(glow * glow, glow * 0.45 + core * 0.8, vFirefly);
  gl_FragColor = vec4(color + core * 0.25, a * vTwinkle * uOpacity);
  #include <colorspace_fragment>
}
