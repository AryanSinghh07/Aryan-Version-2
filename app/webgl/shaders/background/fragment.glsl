// Vertical gradient (top → bottom) with a soft glow that follows the particles
uniform vec3 uTop;
uniform vec3 uBottom;
uniform vec3 uGlow;
uniform vec2 uGlowCenter;
uniform float uAspect;

varying vec2 vUv;

void main() {
  vec3 color = mix(uBottom, uTop, smoothstep(0.0, 1.0, vUv.y));

  vec2 d = vUv - uGlowCenter;
  d.x *= uAspect;
  float glow = smoothstep(0.75, 0.0, length(d));
  color = mix(color, uGlow, glow * 0.6);

  gl_FragColor = vec4(color, 1.0);
  #include <colorspace_fragment>
}
