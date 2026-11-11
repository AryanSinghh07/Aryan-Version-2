// Round, softly lit particle: a bright core with a soft glow falling off to the edge.
// Colours arrive already in display (sRGB) values, so no colour-space conversion here.
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform vec3 uSparkColor;
uniform float uOpacity;
// Overall glow strength per theme: lower on dark, where additive blending piles up to white
uniform float uIntensity;

varying float vColorMix;
varying float vSpark;
varying float vDepthFade;

void main() {
  vec2 uv = gl_PointCoord - 0.5;
  float d = length(uv);
  if (d > 0.5) discard;

  float glow = smoothstep(0.5, 0.0, d);
  float core = smoothstep(0.22, 0.0, d);
  float alpha = (glow * 0.55 + core * 0.45) * uOpacity * uIntensity * vDepthFade;

  vec3 color = mix(uColorA, uColorB, vColorMix);
  color = mix(color, uSparkColor, vSpark);
  color += core * 0.15;

  gl_FragColor = vec4(color, alpha);
}
